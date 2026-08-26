"use client";

import { useState } from "react";

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
 * a separate UI flag — the same two values the gate routes themselves guard
 * on (src/app/api/workflow/confirm-lease-{match,extraction}/route.ts):
 *   - `ready_for_triage` → Gate 1, entity reconciliation (which locale is this?)
 *   - `attached`         → Gate 2, extraction accuracy (are these clauses right?)
 * Anything else (uploaded / extracting / failed) is still in flight or dead,
 * so it renders as a status line with no form to act on.
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
  failed: "Falló la extracción",
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

export function LegalDocumentsPanel({
  documents,
  allUnits,
  onResolved,
}: {
  documents: DocumentRow[];
  allUnits: UnitOption[];
  onResolved: () => void;
}) {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);

  async function openViewer(documentId: string) {
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

  if (documents.length === 0) {
    return (
      <p className="text-xs text-ink-500 font-medium">
        Aún no hay contratos digitalizados en el pipeline. Sube uno arriba para comenzar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {viewerError && (
        <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {viewerError}
        </p>
      )}

      {documents.map((doc) => {
        const fields = parseExtractedFields(doc.extractedFields);
        return (
          <div key={doc.id} className="border border-hairline rounded-xl p-3.5 bg-white space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-xs text-ink">{doc.originalFilename}</p>
                <p className="text-[11px] text-ink-500 font-medium mt-0.5">
                  {STATUS_LABELS[doc.status] ?? doc.status}
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

            <button
              type="button"
              onClick={() => openViewer(doc.id)}
              className="text-xs font-semibold text-ink-700 underline cursor-pointer"
            >
              Ver documento
            </button>

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
          </div>
        );
      })}

      {viewerUrl && (
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
            {u.unitCode} — {u.tenantEntity}
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
  const [pendingAction, setPendingAction] = useState<"confirm" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm(confirmed: boolean) {
    setPendingAction(confirmed ? "confirm" : "reject");
    setError(null);
    try {
      const res = await fetch("/api/workflow/confirm-lease-extraction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // A rejection discards whatever's in the form — it means "this whole
        // extraction is wrong," not "here are my edits," so correctedFields
        // stays undefined and the workflow re-runs extraction from scratch.
        body: JSON.stringify({ documentId, confirmed, correctedFields: confirmed ? fields : undefined }),
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
          onClick={() => confirm(true)}
          className="bg-ink text-white px-3 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50"
        >
          {pendingAction === "confirm" ? "Confirmando..." : "Confirmar extracción"}
        </button>
        <button
          type="button"
          disabled={pendingAction !== null}
          onClick={() => confirm(false)}
          title="Descarta esta lectura y vuelve a extraer el contrato desde cero (máx. 3 reintentos)."
          className="border border-hairline text-ink-700 px-3 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-50"
        >
          {pendingAction === "reject" ? "Rechazando..." : "Rechazar y volver a extraer"}
        </button>
      </div>
      {error && <p className="font-bold text-red-700">{error}</p>}
    </div>
  );
}
