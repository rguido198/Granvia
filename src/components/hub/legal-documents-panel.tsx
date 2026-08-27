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

export type UnitOption = {
  id: string;
  unitCode: string;
  tenantEntity: string;
  /** `locales.status` verbatim — groups Gate 1's correction picker into
   *  "Inquilinos existentes" vs "Locales vacantes" and feeds the
   *  overwrite-warning check, which needs the real status, not a
   *  tenantEntity-nullness guess (a locale can carry a stale tenant_entity
   *  while not actually being OCCUPIED — see isNewTenancy in
   *  lease-digitization.ts). */
  status: string;
};

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
/** Bare document-outline glyph — no icon library in this codebase, so this
 *  stays a plain inline SVG like every other icon here (see RentRollThumbnail
 *  etc.) rather than adding a dependency for one glyph. */
function DocumentIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true">
      <path
        d="M5 2.5h6.5L15 6v11a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 5 17V3a.5.5 0 0 1 .5-.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M11.5 2.5V6H15" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7.25 10h5.5M7.25 12.5h5.5M7.25 15h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function DocumentViewerButton({
  documentId,
  label = "Ver documento",
  iconOnly = false,
}: {
  documentId: string;
  label?: string;
  /** Renders a bare document glyph (title=label for the tooltip) instead of
   *  the underlined text link — for tight spaces like the Rent Roll's SSOT
   *  column, where a text link per row read as cluttered next to
   *  "Desocupar." The Legal tab's own document cards keep the text form. */
  iconOnly?: boolean;
}) {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  // The signed-URL fetch is the only feedback between click and modal — with
  // no state change in between, a click on a document sitting off-screen
  // (or over a slow connection) reads as "nothing happened" rather than
  // "loading."
  const [loading, setLoading] = useState(false);

  async function openViewer() {
    setViewerError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/signed-url`);
      const json = await res.json();
      if (res.ok) setViewerUrl(json.url);
      else setViewerError(json.error ?? "No se pudo abrir el documento.");
    } catch {
      setViewerError("No se pudo abrir el documento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openViewer}
        disabled={loading}
        title={iconOnly ? label : undefined}
        aria-label={iconOnly ? label : undefined}
        aria-busy={loading}
        className={
          iconOnly
            ? "inline-flex items-center justify-center w-7 h-7 rounded-lg border border-hairline text-ink-500 hover:text-ink-700 hover:bg-slate-50 cursor-pointer transition-colors shrink-0 disabled:opacity-50 disabled:cursor-wait"
            : "text-xs font-semibold text-ink-700 underline cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        }
      >
        {iconOnly ? <DocumentIcon /> : loading ? "Cargando…" : label}
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
              extractedAreaSqm={fields.area_sqm}
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
       *  what happened.
       *
       *  fetchActiveLeaseDocuments now caps the resolved set it fetches
       *  (RESOLVED_DOCUMENT_HISTORY_LIMIT) — `resolved.length` is however
       *  many came back, not the plaza's true lifetime total, so the label
       *  says "reciente" rather than implying this is the full record. The
       *  actual full record per lease already lives in the rent roll's SSOT
       *  view via source_document_id. */}
      {resolved.length > 0 && (
        <div className="border-t border-hairline pt-3">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs font-semibold text-ink-700 underline cursor-pointer"
          >
            {showHistory ? "Ocultar historial" : `Ver historial reciente (${resolved.length})`}
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

export function LeaseUploadZone({
  onUploaded,
  onAllSucceeded,
}: {
  onUploaded: () => void;
  /** Called only when every file in a batch uploaded cleanly — distinct from
   *  `onUploaded` (which fires regardless, to refresh the queue below even on
   *  a partial failure). Previously nothing told the modal a batch fully
   *  succeeded, so it just sat open with no feedback: the drop zone silently
   *  reverted to its idle prompt and a landlord had no way to tell "it
   *  worked" from "nothing happened" short of closing it themselves and
   *  scrolling down to check. */
  onAllSucceeded?: () => void;
}) {
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
      if (failed > 0) {
        setError(`${failed} de ${results.length} archivo(s) no se pudieron subir.`);
      } else {
        onAllSucceeded?.();
      }
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
              <LeaseUploadZone onUploaded={onUploaded} onAllSucceeded={() => setOpen(false)} />
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
  extractedAreaSqm,
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
  /** The contract's own stated GLA, already OCR'd by the same extraction pass
   *  that produced documentTenantName — prefills the new-local form's m² field
   *  so the landlord isn't retyping a number the pipeline already read.
   *  Nullable: not every contract states a GLA cleanly enough to extract. */
  extractedAreaSqm: number | null;
  allUnits: UnitOption[];
  onResolved: () => void;
}) {
  const [selectedLocaleId, setSelectedLocaleId] = useState<string>("");
  // Requires an explicit second click before an overwrite-risk confirm goes
  // through — see isOverwriteRisk below. Reset whenever the selection
  // changes so acknowledging one locale's risk can never silently carry
  // over to a different one.
  const [overwriteAcknowledged, setOverwriteAcknowledged] = useState(false);
  const [pendingAction, setPendingAction] = useState<"confirm" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedUnit = selectedLocaleId ? allUnits.find((u) => u.id === selectedLocaleId) : undefined;
  // A manual correction overrides the auto-suggestion as the confirm target.
  // Auto-suggested candidates are always drawn from OCCUPIED locales
  // (loadDocumentContext in lease-digitization.ts filters on that status),
  // so an unmodified suggestion is always implicitly targeting an occupied
  // unit — no lookup needed for that case.
  const targetTenant = selectedUnit
    ? selectedUnit.status === "OCCUPIED"
      ? selectedUnit.tenantEntity
      : null
    : suggestedTenant;
  // Same strict trim+lowercase comparison promoteExtraction's isNewTenancy
  // uses (lease-digitization.ts) to decide a swap, not the fuzzy matcher —
  // this warning has to agree with what Gate 2 is about to independently
  // decide, not offer a second opinion that could disagree with it. This is
  // the exact seam the MINT Boutique/Sushi Central incident happened at:
  // confirming a match onto a still-OCCUPIED locale silently overwrote the
  // recorded tenant's lease because nothing surfaced the mismatch before
  // the click.
  const isOverwriteRisk =
    !!targetTenant && !!documentTenantName && targetTenant.trim().toLowerCase() !== documentTenantName.trim().toLowerCase();

  // "This unit isn't in the rent roll at all yet" — distinct from
  // correctedLocaleId picking an existing wrong suggestion. Before this,
  // Gate 1's dropdown only ever listed the units that already exist, so a
  // genuinely new local had no correct answer to pick; the landlord was
  // stuck with no path forward and no message explaining why. Creating the
  // locale here (via /api/locales/create) and feeding its id into the same
  // correctedLocaleId flow below reuses promoteMatch/promoteExtraction
  // exactly as-is — the new locale has no leases row yet, so Gate 2 lands on
  // its existing needs_new_lease path once this confirms.
  const [creatingNewUnit, setCreatingNewUnit] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const [newUnitAreaSqm, setNewUnitAreaSqm] = useState(
    extractedAreaSqm !== null ? String(extractedAreaSqm) : "",
  );
  const [createdUnit, setCreatedUnit] = useState<{ id: string; unitNumber: string } | null>(null);
  const [creatingUnitPending, setCreatingUnitPending] = useState(false);
  // selectedLocaleId (and therefore isOverwriteRisk) can hold a stale
  // occupied-locale pick from before "+ Es un local nuevo" was clicked —
  // this has no business arming the warning or the confirm button while
  // that unrelated create-new-local form is what's actually on screen.
  const showOverwriteWarning = isOverwriteRisk && !creatingNewUnit && !createdUnit;

  async function createNewUnit() {
    setError(null);
    const trimmed = newUnitNumber.trim();
    const sqm = Number(newUnitAreaSqm);
    if (!trimmed) {
      setError("El número de local es requerido.");
      return;
    }
    if (!newUnitAreaSqm || !Number.isFinite(sqm) || sqm <= 0) {
      setError("La superficie (m²) debe ser un número positivo.");
      return;
    }
    setCreatingUnitPending(true);
    try {
      const res = await fetch("/api/locales/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitNumber: trimmed, areaSqm: sqm }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "No se pudo crear el local.");
        return;
      }
      setCreatedUnit({ id: json.id, unitNumber: json.unitNumber });
      setSelectedLocaleId(json.id);
      setOverwriteAcknowledged(false);
      setCreatingNewUnit(false);
    } finally {
      setCreatingUnitPending(false);
    }
  }

  async function confirm(confirmed: boolean) {
    setPendingAction(confirmed ? "confirm" : "reject");
    setError(null);
    try {
      const res = await fetch("/api/workflow/confirm-lease-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          confirmed,
          // A reject discards the document outright — ignore whatever
          // happens to be sitting in the local picker so it can never be
          // read as a correction instead.
          correctedLocaleId: confirmed ? selectedLocaleId || undefined : undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "No se pudo confirmar la coincidencia.");
        return;
      }
      onResolved();
    } finally {
      setPendingAction(null);
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
                {suggestedTenant ?? "(local sin inquilino registrado)"} — {suggestedUnit}
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
      {createdUnit ? (
        <p className="text-emerald-700 font-bold">
          Local nuevo creado: {createdUnit.unitNumber} — listo para confirmar la coincidencia.
        </p>
      ) : creatingNewUnit ? (
        <div className="border border-hairline rounded-lg p-2.5 space-y-1.5 bg-slate-50">
          <p className="text-ink-700 font-bold">Crear un local nuevo</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Número de local"
              value={newUnitNumber}
              onChange={(e) => setNewUnitNumber(e.target.value)}
              className="border border-hairline rounded-lg px-2 py-1 flex-1"
            />
            <input
              type="number"
              min="1"
              placeholder="m²"
              value={newUnitAreaSqm}
              onChange={(e) => setNewUnitAreaSqm(e.target.value)}
              className="border border-hairline rounded-lg px-2 py-1 w-20"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={creatingUnitPending}
              onClick={createNewUnit}
              className="bg-ink text-white px-2.5 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50"
            >
              {creatingUnitPending ? "Creando..." : "Crear local"}
            </button>
            <button
              type="button"
              onClick={() => setCreatingNewUnit(false)}
              className="text-ink-600 font-bold px-2 py-1 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selectedLocaleId}
            onChange={(e) => {
              setSelectedLocaleId(e.target.value);
              setOverwriteAcknowledged(false);
            }}
            className="border border-hairline rounded-lg px-2 py-1 cursor-pointer"
          >
            <option value="">-- corregir local --</option>
            {/* Grouped by occupancy rather than one flat alphabetical list of
             *  every local in the plaza — the landlord has to be able to tell
             *  at a glance whether they're correcting toward another existing
             *  tenant's renewal or picking a genuinely vacant space, not
             *  discover it only after confirming. */}
            <optgroup label="Inquilinos existentes">
              {allUnits
                .filter((u) => u.status === "OCCUPIED")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.tenantEntity} — {u.unitCode}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Locales vacantes">
              {allUnits
                .filter((u) => u.status !== "OCCUPIED")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.tenantEntity} — {u.unitCode}
                  </option>
                ))}
            </optgroup>
          </select>
          <button
            type="button"
            onClick={() => setCreatingNewUnit(true)}
            className="text-ink-700 underline font-bold cursor-pointer whitespace-nowrap"
          >
            + Es un local nuevo
          </button>
        </div>
      )}
      {showOverwriteWarning && (
        <p className="text-amber-900 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          Este local está ocupado actualmente por <strong>{targetTenant}</strong> — el documento indica un inquilino
          distinto (<strong>{documentTenantName}</strong>). Confirmar sobrescribirá el contrato vigente de{" "}
          {targetTenant}.
        </p>
      )}
      <div className="flex gap-2">
        {/* With neither a suggestion nor a correction there is no locale to
         *  promote — promoteMatch has nothing to write. Block the click
         *  rather than send a request that can only fail. */}
        <button
          type="button"
          disabled={pendingAction !== null || (!suggestedUnit && !selectedLocaleId)}
          onClick={() => {
            // First click on an overwrite-risk target only arms the button —
            // the warning above is already visible by then, but requiring a
            // second, differently-labeled click is the actual friction that
            // stops a misclick from silently overwriting someone's lease.
            if (showOverwriteWarning && !overwriteAcknowledged) {
              setOverwriteAcknowledged(true);
              return;
            }
            confirm(true);
          }}
          className={
            showOverwriteWarning && overwriteAcknowledged
              ? "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              : "bg-ink text-white px-3 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          }
        >
          {pendingAction === "confirm"
            ? "Confirmando..."
            : showOverwriteWarning && overwriteAcknowledged
              ? `Sí, sobrescribir contrato de ${targetTenant}`
              : "Confirmar"}
        </button>
        <RejectDocumentButton
          disabled={pendingAction !== null}
          pending={pendingAction === "reject"}
          onConfirmReject={() => confirm(false)}
          body="No se promoverá ningún dato a la plaza — este documento nunca llegó a asignarse a un local. Esta acción no reintenta la extracción; si la lectura del contrato parece mal hecha, vuelve a subirlo en vez de rechazarlo."
        />
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

/** Modal-confirm gate for the irreversible reject action at either gate —
 *  mirrors TerminateTenantButton's pattern (rent-roll-tools.tsx) rather than
 *  a bare `window.confirm`, so it looks and behaves like the rest of this
 *  console's destructive actions. Presentational only: the parent form owns
 *  the submit/pending/error state and just gets told when the landlord
 *  actually confirmed inside the dialog. */
function RejectDocumentButton({
  disabled,
  pending,
  onConfirmReject,
  body,
}: {
  disabled: boolean;
  pending: boolean;
  onConfirmReject: () => void;
  /** Gate-specific explanation of what rejecting actually discards — Gate 1
   *  has never written anything yet (no locale, no lease), Gate 2 has a
   *  confirmed match and a "Re-escanear contrato" alternative that doesn't
   *  exist at Gate 1, so the two can't share one body. */
  body: string;
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
              <p className="text-xs text-slate-600 leading-relaxed">{body}</p>
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
            ? `${targetTenant ?? "(local sin inquilino registrado)"} — ${targetUnit}`
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
          body="No se promoverá ningún dato a la plaza — ni la matriz de responsabilidad, ni un contrato nuevo. Esta acción no reintenta la extracción; para eso usa “Re-escanear contrato” en vez de esto."
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
        <strong className="text-ink">{targetUnit ?? "(local no resuelto)"}</strong> no tiene contrato activo
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
          body="No se promoverá ningún dato a la plaza — ni la matriz de responsabilidad, ni un contrato nuevo. Esta acción no reintenta la extracción; para eso usa “Re-escanear contrato” en vez de esto."
        />
      </div>
      {error && <p className="font-bold text-red-700">{error}</p>}
    </div>
  );
}
