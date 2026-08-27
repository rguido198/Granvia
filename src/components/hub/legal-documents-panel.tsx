"use client";

import { useState } from "react";

import { ConsoleModal } from "@/components/hub/console-modal";
import {
  LeaseExtractedFieldsSchema,
  type LeaseExtractedFields,
} from "@/lib/ingest/lease-extraction-schema";

/**
 * Legal-tab UI for the active-lease document pipeline: bulk upload, the
 * signed-URL viewer, and the two human gates leaseDigitizationWorkflow
 * suspends on (src/workflows/lease-digitization.ts).
 *
 * Which gate a document is sitting at is read off `documents.status`, not off
 * a separate UI flag — the same values the gate routes themselves guard on
 * (src/app/api/workflow/confirm-lease-{match,extraction}/route.ts):
 *   - `ready_for_triage` → Gate 1, entity reconciliation (which locale is this?)
 *   - `attached`         → Gate 2, extraction accuracy (are these clauses right?)
 *   - `needs_new_lease`  → Gate 2's follow-up when the matched locale has no
 *                          active lease yet (a vacant unit being newly
 *                          occupied) — tenant name / term / rent, not clauses.
 * Anything else (uploaded / extracting / failed / rejected) is still in
 * flight or dead, so it renders as a status line with no form to act on.
 */

export type DocumentRow = {
  id: string;
  originalFilename: string;
  status: string;
  suggestedLocaleUnit: string | null;
  suggestedLocaleTenant: string | null;
  documentTenantName: string | null;
  matchConfidence: number | null;
  localeUnit: string | null;
  localeTenant: string | null;
  extractedFields: Record<string, unknown> | null;
  extractionVerifiedAt: string | null;
  errorMessage: string | null;
};

export type UnitOption = { id: string; unitCode: string; tenantEntity: string };

/** Gate 2's three landlord decisions — see lease-digitization.ts's
 *  extractionHook. "rescan" re-reads this same document; "reject" discards
 *  it with nothing promoted. Landlords conflated those two under one button
 *  before this split. */
type GateTwoAction = "confirm" | "rescan" | "reject";

const RESPONSIBILITY_SYSTEMS = ["hvac", "roof", "plumbing", "electrical", "storefront_glass"] as const;

const SYSTEM_LABELS: Record<(typeof RESPONSIBILITY_SYSTEMS)[number], string> = {
  hvac: "Clima / HVAC",
  roof: "Techo / Impermeabilización",
  plumbing: "Plomería",
  electrical: "Instalación eléctrica",
  storefront_glass: "Cristalería de fachada",
};

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Recibido",
  extracting: "Extrayendo…",
  ready_for_triage: "Pendiente: confirmar local",
  attached: "Pendiente: validar extracción",
  needs_new_lease: "Local vacante — falta registrar al nuevo inquilino",
  failed: "Falló la extracción",
  rejected: "Rechazado — sin datos promovidos",
};

/** `extracted_fields` is a bare jsonb column, so the DB guarantees nothing
 *  about its shape. Validated with the same schema the Gate 2 route enforces
 *  before the form is allowed to bind inputs to it — an incomplete extraction
 *  renders as a notice instead of crashing on a missing key. */
function parseExtractedFields(value: Record<string, unknown> | null): LeaseExtractedFields | null {
  if (!value) return null;
  const parsed = LeaseExtractedFieldsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Signed-URL viewer for a digitized contract, usable anywhere a documentId
 * is known — the digitization queue below, and the SSOT contracts table's
 * expanded row (landlord-dashboard.tsx), which has no other way to resurface
 * the actual scan a lease's terms came from.
 *
 * Portaled via ConsoleModal: this was previously an inline `fixed inset-0`
 * div, which inherited the same containing-block bug RejectDocumentButton's
 * dialog had (see ConsoleModal's own doc comment) — it just hadn't been
 * clicked from far enough down the page to surface it yet.
 */
export function DocumentViewerButton({
  documentId,
  label = "Ver documento",
}: {
  documentId: string;
  label?: string;
}) {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);

  async function openViewer() {
    setViewerError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/signed-url`);
      const json = await res.json();
      if (res.ok) setViewerUrl(json.url);
      else setViewerError(json.error ?? "No se pudo abrir el documento.");
    } catch {
      setViewerError("No se pudo abrir el documento.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openViewer}
        className="text-xs font-semibold text-ink-700 underline cursor-pointer"
      >
        {label}
      </button>
      {viewerError && <p className="text-xs font-bold text-red-700 mt-1">{viewerError}</p>}
      {viewerUrl && (
        <ConsoleModal>
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setViewerUrl(null)}
          >
            <iframe
              title="Contrato"
              src={viewerUrl}
              className="w-3/4 h-3/4 bg-white rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </ConsoleModal>
      )}
    </>
  );
}

/** A document still needing a human decision — the only kind shown by
 *  default. Everything else (verified, rejected, failed) is done, one way
 *  or another, and collapses into history instead of accumulating forever
 *  at the top of the queue. */
function isActionable(doc: DocumentRow): boolean {
  return (
    doc.status === "ready_for_triage" ||
    doc.status === "needs_new_lease" ||
    (doc.status === "attached" && !doc.extractionVerifiedAt)
  );
}

function DocumentCard({
  doc,
  allUnits,
  onResolved,
}: {
  doc: DocumentRow;
  allUnits: UnitOption[];
  onResolved: () => void;
}) {
  const fields = parseExtractedFields(doc.extractedFields);
  return (
    <div className="border border-hairline rounded-xl p-3.5 bg-white space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-xs text-ink">{doc.originalFilename}</p>
          <p className="text-[11px] text-ink-500 font-medium mt-0.5">
            {/* STATUS_LABELS['attached'] is "Pendiente: validar extracción"
             *  regardless of whether it's actually been validated yet —
             *  accurate for the review-pending state, but confusingly
             *  identical to what a landlord sees right after confirming.
             *  The badge above already keys off extractionVerifiedAt;
             *  this line has to agree with it instead of always reading
             *  the raw status. */}
            {doc.status === "attached" && doc.extractionVerifiedAt
              ? "Contrato actualizado ✓"
              : (STATUS_LABELS[doc.status] ?? doc.status)}
          </p>
        </div>
        {!doc.extractionVerifiedAt && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
            EXTRACCIÓN NO VERIFICADA
          </span>
        )}
      </div>

      {/* Written by promoteExtraction when the confirmed locale has no
       *  `leases` row to promote onto (and by the failure paths). The
       *  whole point of not throwing there is that a human reads this,
       *  so it has to actually render. */}
      {doc.errorMessage && (
        <p className="text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          {doc.errorMessage}
        </p>
      )}

      <DocumentViewerButton documentId={doc.id} />

      {doc.status === "ready_for_triage" && (
        <div className="border-t border-hairline pt-2.5">
          {/* `ready_for_triage` is written twice on the way here: once by the
           *  ingest route's after() callback the moment raw text lands, and
           *  again by the workflow's recordSuggestion step. Only the second
           *  one means Gate 1's hook exists — resuming it before then 404s.
           *
           *  `extracted_fields` is the discriminator: it stays at its `{}`
           *  column default (which fails the schema parse) until
           *  recordSuggestion writes the real extraction, and both extraction
           *  paths already validate against this exact schema before
           *  returning, so a successful parse here means the workflow reached
           *  the point of having a suggestion recorded.
           *
           *  Deliberately NOT keyed off `suggestedLocaleUnit` — a document
           *  whose tenant name matched nothing has a null suggestion and is
           *  still a legitimate thing to review, just with no unit to show. */}
          {fields ? (
            <MatchReviewForm
              documentId={doc.id}
              suggestedUnit={doc.suggestedLocaleUnit}
              suggestedTenant={doc.suggestedLocaleTenant}
              documentTenantName={doc.documentTenantName}
              confidence={doc.matchConfidence}
              allUnits={allUnits}
              onResolved={onResolved}
            />
          ) : (
            <p className="text-xs text-ink-500 font-medium">
              Procesando el contrato — la sugerencia de local todavía no está lista. Vuelve a
              cargar la vista en unos momentos.
            </p>
          )}
        </div>
      )}

      {doc.status === "attached" && !doc.extractionVerifiedAt && (
        <div className="border-t border-hairline pt-2.5">
          {fields ? (
            <ExtractionReviewForm
              documentId={doc.id}
              extractedFields={fields}
              targetUnit={doc.localeUnit}
              targetTenant={doc.localeTenant}
              onResolved={onResolved}
            />
          ) : (
            <p className="text-xs text-ink-500 font-medium">
              La extracción está incompleta o no cumple el esquema esperado — revisa el documento antes de validar.
            </p>
          )}
        </div>
      )}

      {/* Gate 2 confirmed the extraction, but promoteExtraction found no
       *  active `leases` row for the matched locale — a vacant unit
       *  being newly occupied. That's a separate decision from "are
       *  these clauses right" (already answered), so it gets its own
       *  form instead of folding tenant/term/rent inputs into
       *  ExtractionReviewForm for every document. */}
      {doc.status === "needs_new_lease" && (
        <div className="border-t border-hairline pt-2.5">
          {fields ? (
            <NewLeaseForm
              documentId={doc.id}
              extractedFields={fields}
              targetUnit={doc.localeUnit}
              targetTenant={doc.localeTenant}
              onResolved={onResolved}
            />
          ) : (
            <p className="text-xs text-ink-500 font-medium">
              Los datos del contrato no están disponibles — revisa el documento antes de continuar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function LegalDocumentsPanel({
  documents,
  allUnits,
  onResolved,
}: {
  documents: DocumentRow[];
  allUnits: UnitOption[];
  onResolved: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);

  if (documents.length === 0) {
    return (
      <p className="text-xs text-ink-500 font-medium">
        Aún no hay contratos digitalizados en el pipeline. Sube uno arriba para comenzar.
      </p>
    );
  }

  const active = documents.filter(isActionable);
  const resolved = documents.filter((d) => !isActionable(d));

  return (
    <div className="space-y-3">
      {active.length === 0 && (
        <p className="text-xs text-ink-500 font-medium">Nada pendiente de revisión.</p>
      )}
      {active.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} allUnits={allUnits} onResolved={onResolved} />
      ))}

      {/* Verified/rejected/failed documents were previously listed
       *  unconditionally forever — fetchActiveLeaseDocuments has no status
       *  filter, so the queue only ever grew. Collapsed by default instead:
       *  nothing here needs a landlord's attention, it's just a record of
       *  what happened. */}
      {resolved.length > 0 && (
        <div className="border-t border-hairline pt-3">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs font-semibold text-ink-700 underline cursor-pointer"
          >
            {showHistory ? "Ocultar historial" : `Ver historial (${resolved.length})`}
          </button>
          {showHistory && (
            <div className="space-y-3 mt-3">
              {resolved.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} allUnits={allUnits} onResolved={onResolved} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LeaseUploadZone({ onUploaded }: { onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError(null);
    try {
      const results = await Promise.all(
        Array.from(files).map((file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("kind", "active_lease");
          return fetch("/api/ingest", { method: "POST", body: formData });
        }),
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) setError(`${failed} de ${results.length} archivo(s) no se pudieron subir.`);
      onUploaded();
    } catch {
      setError("No se pudo completar la subida.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-hairline-strong rounded-xl p-8 text-center text-xs text-ink-500 font-medium"
      >
        <p>
          {uploading
            ? "Subiendo..."
            : "Arrastra aquí uno o varios contratos (PDF) — o reemplaza uno existente arrastrándolo de nuevo."}
        </p>
        <label className="inline-block mt-2 text-xs font-semibold text-ink-700 underline cursor-pointer">
          o selecciona archivos
          <input
            type="file"
            multiple
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {error && <p className="text-xs font-bold text-red-700">{error}</p>}
    </div>
  );
}

/**
 * Prominent, always-visible entry point for the upload flow. Previously the
 * only way in was LeaseUploadZone's inline drop-zone, rendered at the bottom
 * of a card below an 85-row contracts table — reachable, but only after
 * scrolling well past the table, which read as "hidden." This is a plain
 * button at the top of the tab; the drop-zone itself is unchanged, just
 * relocated into a modal opened from here instead of sitting inline.
 */
export function UploadContractButton({ onUploaded }: { onUploaded: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-[var(--console-accent)] hover:bg-[var(--console-accent-dark)] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
      >
        Subir contrato(s)
      </button>
      {open && (
        <ConsoleModal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 max-w-lg w-full space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">Subir contratos escaneados</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="text-slate-400 hover:text-slate-700 cursor-pointer text-lg leading-none"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cada documento requiere dos confirmaciones humanas: el local al que corresponde, y la exactitud de
                las cláusulas extraídas. Revísalos en la lista de abajo una vez subidos.
              </p>
              <LeaseUploadZone onUploaded={onUploaded} />
            </div>
          </div>
        </ConsoleModal>
      )}
    </>
  );
}

export function MatchReviewForm({
  documentId,
  suggestedUnit,
  suggestedTenant,
  documentTenantName,
  confidence,
  allUnits,
  onResolved,
}: {
  documentId: string;
  suggestedUnit: string | null;
  suggestedTenant: string | null;
  /** The tenant name the document itself states, from the same helper the
   *  matcher scored on. Shown beside the suggestion because a unit code and a
   *  percentage cannot separate "Derma Club" from "Derma Club 2". */
  documentTenantName: string | null;
  confidence: number | null;
  allUnits: UnitOption[];
  onResolved: () => void;
}) {
  const [selectedLocaleId, setSelectedLocaleId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(confirmed: boolean) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow/confirm-lease-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          confirmed,
          correctedLocaleId: selectedLocaleId || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "No se pudo confirmar la coincidencia.");
        return;
      }
      onResolved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 text-xs">
      {/* Gate 1 is a comparison, not an assertion: the name the document
       *  states, against the tenant of record on the suggested unit. Both are
       *  needed to tell "Derma Club" and "Derma Club 2" apart. */}
      <dl className="space-y-1">
        <div className="flex gap-2">
          <dt className="text-ink-500 font-medium shrink-0">Nombre en el documento:</dt>
          <dd className="text-ink font-bold">
            {documentTenantName ?? "(no se encontró en el contrato)"}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-500 font-medium shrink-0">Coincidencia sugerida:</dt>
          <dd className="text-ink font-bold">
            {suggestedUnit ? (
              <>
                {suggestedTenant ?? "(local sin inquilino registrado)"} — Local {suggestedUnit}
              </>
            ) : (
              "(ninguna)"
            )}
            {confidence !== null && (
              <span className="text-ink-500 font-medium">
                {" "}
                (confianza {(confidence * 100).toFixed(0)}%)
              </span>
            )}
          </dd>
        </div>
      </dl>
      <select
        value={selectedLocaleId}
        onChange={(e) => setSelectedLocaleId(e.target.value)}
        className="border border-hairline rounded-lg px-2 py-1 cursor-pointer"
      >
        <option value="">-- corregir local --</option>
        {allUnits.map((u) => (
          <option key={u.id} value={u.id}>
            {u.tenantEntity} — {u.unitCode}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        {/* With neither a suggestion nor a correction there is no locale to
         *  promote: the route would still pass its status guard and consume
         *  Gate 1's single-use hook, then promoteMatch would resolve
         *  finalLocaleId to null and write nothing — stranding the document at
         *  `ready_for_triage` with its hook already spent, unrecoverable short
         *  of re-uploading. Block the click instead. */}
        <button
          type="button"
          disabled={submitting || (!suggestedUnit && !selectedLocaleId)}
          onClick={() => confirm(true)}
          className="bg-ink text-white px-3 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Confirmando..." : "Confirmar"}
        </button>
      </div>
      {!suggestedUnit && !selectedLocaleId && (
        <p className="text-ink-500 font-medium">
          No hubo coincidencia automática — elige el local correcto arriba para poder confirmar.
        </p>
      )}
      {error && <p className="font-bold text-red-700">{error}</p>}
    </div>
  );
}

/** Modal-confirm gate for the one irreversible Gate 2 action — mirrors
 *  TerminateTenantButton's pattern (rent-roll-tools.tsx) rather than a bare
 *  `window.confirm`, so it looks and behaves like the rest of this console's
 *  destructive actions. Presentational only: the parent form owns the
 *  submit/pending/error state and just gets told when the landlord actually
 *  confirmed inside the dialog. */
function RejectDocumentButton({
  disabled,
  pending,
  onConfirmReject,
}: {
  disabled: boolean;
  pending: boolean;
  onConfirmReject: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        title="Descarta este documento por completo — no se promueve ningún dato."
        className="border border-red-200 bg-red-50 text-red-700 px-3 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50 hover:bg-red-100 hover:border-red-300 transition-colors"
      >
        {pending ? "Rechazando..." : "Rechazar documento"}
      </button>
      {open && (
        <ConsoleModal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 max-w-sm w-full space-y-3">
              <p className="text-sm font-bold text-slate-900">¿Rechazar este documento?</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                No se promoverá ningún dato a la plaza — ni la matriz de responsabilidad, ni un contrato nuevo. Esta
                acción no reintenta la extracción; para eso usa &ldquo;Re-escanear contrato&rdquo; en vez de esto.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-slate-600 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onConfirmReject();
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
                >
                  Rechazar documento
                </button>
              </div>
            </div>
          </div>
        </ConsoleModal>
      )}
    </>
  );
}

export function ExtractionReviewForm({
  documentId,
  extractedFields,
  targetUnit,
  targetTenant,
  onResolved,
}: {
  documentId: string;
  extractedFields: LeaseExtractedFields;
  /** The locale Gate 1 confirmed — this confirmation writes onto its current
   *  lease row, so the form has to say which one before asking for a click. */
  targetUnit: string | null;
  targetTenant: string | null;
  onResolved: () => void;
}) {
  const [fields, setFields] = useState<LeaseExtractedFields>(extractedFields);
  const [pendingAction, setPendingAction] = useState<GateTwoAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: GateTwoAction) {
    setPendingAction(action);
    setError(null);
    try {
      const res = await fetch("/api/workflow/confirm-lease-extraction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // "rescan"/"reject" both discard whatever's in the form — they mean
        // "this extraction is wrong" or "discard this document," not "here
        // are my edits" — so correctedFields only rides along on confirm.
        body: JSON.stringify({ documentId, action, correctedFields: action === "confirm" ? fields : undefined }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "No se pudo registrar la decisión.");
        return;
      }
      onResolved();
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-2 text-xs">
      <p className="text-ink-700 font-medium">
        Se escribirá sobre el contrato vigente de:{" "}
        <strong className="text-ink">
          {targetUnit
            ? `${targetTenant ?? "(local sin inquilino registrado)"} — Local ${targetUnit}`
            : "(local no resuelto)"}
        </strong>
      </p>

      {RESPONSIBILITY_SYSTEMS.map((system) => (
        <div key={system} className="flex items-center justify-between gap-3">
          <span className="text-ink-700 font-medium">{SYSTEM_LABELS[system]}</span>
          <select
            value={fields.responsibility_matrix[system]}
            onChange={(e) =>
              setFields({
                ...fields,
                responsibility_matrix: {
                  ...fields.responsibility_matrix,
                  [system]: e.target.value as "landlord" | "tenant" | "shared",
                },
              })
            }
            className="border border-hairline rounded-lg px-2 py-1 cursor-pointer"
          >
            <option value="landlord">Arrendador</option>
            <option value="tenant">Arrendatario</option>
            <option value="shared">Compartido</option>
          </select>
        </div>
      ))}

      <div className="flex items-center justify-between gap-3">
        <span className="text-ink-700 font-medium">Días de aviso de terminación</span>
        <input
          type="number"
          min={1}
          value={fields.notice_period_days}
          onChange={(e) => setFields({ ...fields, notice_period_days: Number(e.target.value) })}
          className="border border-hairline rounded-lg px-2 py-1 w-24"
        />
      </div>

      {/* `special_clauses` is submitted as part of `correctedFields` whether or
       *  not it is shown, so confirming without seeing it means confirming
       *  something unread. Read-only rather than editable: the five selects and
       *  the notice-days input are the fields that promote onto `leases`; the
       *  clauses ride along unchanged, and free-text editing them here would
       *  invite rewriting the contract's own words. */}
      <div className="border-t border-hairline pt-2">
        <p className="text-ink-700 font-bold mb-1">Cláusulas especiales extraídas</p>
        {fields.special_clauses.length === 0 ? (
          <p className="text-ink-500 font-medium">
            La extracción no encontró cláusulas especiales en este contrato.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {fields.special_clauses.map((clause, index) => (
              <li key={`${clause.label}-${index}`} className="text-ink-700">
                <span className="font-bold text-ink">{clause.label}:</span>{" "}
                <span className="font-medium">{clause.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pendingAction !== null}
          onClick={() => submit("confirm")}
          className="bg-ink text-white px-3 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50"
        >
          {pendingAction === "confirm" ? "Confirmando..." : "Confirmar extracción"}
        </button>
        <button
          type="button"
          disabled={pendingAction !== null}
          onClick={() => submit("rescan")}
          title="Vuelve a extraer este mismo contrato desde cero — usa esto si la lectura parece mal hecha, no si el documento en sí está mal (máx. 3 reintentos)."
          className="border border-hairline text-ink-700 px-3 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50"
        >
          {pendingAction === "rescan" ? "Re-escaneando..." : "Re-escanear contrato"}
        </button>
        <RejectDocumentButton
          disabled={pendingAction !== null}
          pending={pendingAction === "reject"}
          onConfirmReject={() => submit("reject")}
        />
      </div>
      {error && <p className="font-bold text-red-700">{error}</p>}
    </div>
  );
}

export function NewLeaseForm({
  documentId,
  extractedFields,
  targetUnit,
  targetTenant,
  onResolved,
}: {
  documentId: string;
  /** Read-only source for tenant_entity/start_date/end_date/base_rent_monthly
   *  prefill — the matrix/notice/clauses in here were already confirmed by
   *  ExtractionReviewForm and are not re-collected. */
  extractedFields: LeaseExtractedFields;
  targetUnit: string | null;
  targetTenant: string | null;
  onResolved: () => void;
}) {
  const [tenantEntity, setTenantEntity] = useState(extractedFields.tenant_entity);
  const [startDate, setStartDate] = useState(extractedFields.start_date);
  const [endDate, setEndDate] = useState(extractedFields.end_date);
  const [baseRent, setBaseRent] = useState(
    extractedFields.base_rent_monthly !== null ? String(extractedFields.base_rent_monthly) : "",
  );
  const [pendingAction, setPendingAction] = useState<GateTwoAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: GateTwoAction) {
    setPendingAction(action);
    setError(null);
    try {
      let newLeaseDetails;
      if (action === "confirm") {
        const rent = baseRent.trim() === "" ? null : Number(baseRent);
        if (rent !== null && (!Number.isFinite(rent) || rent <= 0)) {
          setError("La renta debe ser un número positivo, o déjala vacía si el contrato no la fija.");
          return;
        }
        newLeaseDetails = {
          tenant_entity: tenantEntity,
          start_date: startDate,
          end_date: endDate,
          base_rent_monthly: rent,
        };
      }
      const res = await fetch("/api/workflow/confirm-lease-extraction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, action, newLeaseDetails }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "No se pudo registrar la decisión.");
        return;
      }
      onResolved();
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-2 text-xs">
      <p className="text-ink-700 font-medium">
        <strong className="text-ink">Local {targetUnit ?? "(no resuelto)"}</strong> no tiene contrato activo
        {targetTenant && targetTenant !== "Vacante" ? ` (registrado como ${targetTenant})` : ""} — completa los
        datos del nuevo inquilino para crear su contrato. La matriz de responsabilidad y los días de aviso ya
        confirmados se aplicarán a este contrato.
      </p>

      <div className="flex items-center justify-between gap-3">
        <span className="text-ink-700 font-medium">Inquilino (nombre legal)</span>
        <input
          type="text"
          value={tenantEntity}
          onChange={(e) => setTenantEntity(e.target.value)}
          className="border border-hairline rounded-lg px-2 py-1 flex-1 max-w-xs"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-ink-700 font-medium">Fecha de inicio</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-hairline rounded-lg px-2 py-1"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-ink-700 font-medium">Fecha de vencimiento</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border border-hairline rounded-lg px-2 py-1"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-ink-700 font-medium">Renta base mensual (MXN)</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={baseRent}
          onChange={(e) => setBaseRent(e.target.value)}
          placeholder="(sin dato)"
          className="border border-hairline rounded-lg px-2 py-1 w-32"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pendingAction !== null || !tenantEntity.trim() || !startDate || !endDate}
          onClick={() => submit("confirm")}
          className="bg-ink text-white px-3 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pendingAction === "confirm" ? "Creando..." : "Crear contrato y confirmar"}
        </button>
        <button
          type="button"
          disabled={pendingAction !== null}
          onClick={() => submit("rescan")}
          title="Vuelve a extraer este mismo contrato desde cero — usa esto si la lectura parece mal hecha, no si el documento en sí está mal (máx. 3 reintentos)."
          className="border border-hairline text-ink-700 px-3 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50"
        >
          {pendingAction === "rescan" ? "Re-escaneando..." : "Re-escanear contrato"}
        </button>
        <RejectDocumentButton
          disabled={pendingAction !== null}
          pending={pendingAction === "reject"}
          onConfirmReject={() => submit("reject")}
        />
      </div>
      {error && <p className="font-bold text-red-700">{error}</p>}
    </div>
  );
}
