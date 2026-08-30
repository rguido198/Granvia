"use client";

export type DocumentKindFilter = "all" | "match" | "extraction" | "new_lease";
export type DocumentSortBy = "oldest" | "newest" | "confidence_asc" | "confidence_desc";

const KIND_LABELS: Record<Exclude<DocumentKindFilter, "all">, string> = {
  match: "Coincidencia de local",
  extraction: "Validar extracción",
  new_lease: "Local nuevo",
};

/**
 * Filter/sort/hide controls + the Gate-1-only bulk-confirm action, for
 * LegalDocumentsPanel's "Digitalización de Contratos" queue. Presentational
 * only — all state lives in LegalDocumentsPanel (same pattern as its
 * existing showHistory), passed down as props.
 *
 * Bulk-confirm's eligible count is computed by the caller from the FULL
 * active Gate-1 set, not whatever kind/text filter is currently applied —
 * it's a distinct backlog-clearing action, not scoped to what happens to be
 * on screen. See LegalDocumentsPanel for the eligibility rule itself
 * (confidence threshold + not an overwrite risk).
 */
export function DocumentTriageToolbar({
  counts,
  kindFilter,
  setKindFilter,
  textFilter,
  setTextFilter,
  sortBy,
  setSortBy,
  hasGate1,
  hiddenCount,
  showHidden,
  setShowHidden,
  bulkThreshold,
  setBulkThreshold,
  bulkEligibleCount,
  bulkRunning,
  bulkProgress,
  bulkResult,
  onBulkConfirm,
}: {
  counts: { match: number; extraction: number; newLease: number; resolvedRecent: number };
  kindFilter: DocumentKindFilter;
  setKindFilter: (v: DocumentKindFilter) => void;
  textFilter: string;
  setTextFilter: (v: string) => void;
  sortBy: DocumentSortBy;
  setSortBy: (v: DocumentSortBy) => void;
  /** Whether any Gate 1 (match) documents exist right now — confidence sort
   *  options and the bulk-confirm panel only make sense when they do. */
  hasGate1: boolean;
  hiddenCount: number;
  showHidden: boolean;
  setShowHidden: (v: boolean) => void;
  bulkThreshold: number;
  setBulkThreshold: (v: number) => void;
  bulkEligibleCount: number;
  bulkRunning: boolean;
  bulkProgress: { done: number; total: number } | null;
  bulkResult: { ok: number; failed: number } | null;
  onBulkConfirm: () => void;
}) {
  return (
    <div className="space-y-3 border border-hairline rounded-xl bg-slate-50/60 p-3">
      {/* Progress metrics — the true backlog counts, never affected by the
       *  filters below (a filtered-down view showing "0" here would read
       *  as the backlog shrinking when it hasn't). */}
      <div className="flex flex-wrap gap-2 text-[11px] font-bold">
        <span className="bg-white text-ink-700 px-2.5 py-1 rounded-lg border border-hairline">
          {KIND_LABELS.match} ({counts.match})
        </span>
        <span className="bg-white text-ink-700 px-2.5 py-1 rounded-lg border border-hairline">
          {KIND_LABELS.extraction} ({counts.extraction})
        </span>
        <span className="bg-white text-ink-700 px-2.5 py-1 rounded-lg border border-hairline">
          {KIND_LABELS.new_lease} ({counts.newLease})
        </span>
        {counts.resolvedRecent > 0 && (
          <span className="bg-white text-emerald-700 px-2.5 py-1 rounded-lg border border-hairline">
            {counts.resolvedRecent} resuelto{counts.resolvedRecent === 1 ? "" : "s"} recientemente
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "match", "extraction", "new_lease"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setKindFilter(kind)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
              kindFilter === kind
                ? "bg-ink text-white border-ink"
                : "bg-white text-ink-700 border-hairline hover:bg-slate-100"
            }`}
          >
            {kind === "all" ? "Todos" : KIND_LABELS[kind]}
          </button>
        ))}

        <input
          type="text"
          value={textFilter}
          onChange={(e) => setTextFilter(e.target.value)}
          placeholder="Buscar por archivo, inquilino o local…"
          className="border border-hairline rounded-lg px-2.5 py-1 text-[11px] flex-1 min-w-[180px]"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as DocumentSortBy)}
          className="border border-hairline rounded-lg px-2 py-1 text-[11px] font-semibold cursor-pointer bg-white"
        >
          <option value="oldest">Más antiguo primero</option>
          <option value="newest">Más reciente primero</option>
          {hasGate1 && <option value="confidence_asc">Confianza: menor primero</option>}
          {hasGate1 && <option value="confidence_desc">Confianza: mayor primero</option>}
        </select>

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowHidden(!showHidden)}
            className="text-[11px] font-bold text-ink-500 underline cursor-pointer"
          >
            {showHidden ? "Ocultar los ocultos de nuevo" : `${hiddenCount} ocultos — mostrar`}
          </button>
        )}
      </div>

      {hasGate1 && (
        <div className="border-t border-hairline pt-2.5 flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] font-bold text-ink-700">Confirmar automáticamente si confianza ≥</span>
          <input
            type="number"
            min={0}
            max={100}
            value={bulkThreshold}
            onChange={(e) => setBulkThreshold(Number(e.target.value))}
            className="border border-hairline rounded-lg px-2 py-1 text-[11px] w-16"
          />
          <span className="text-[11px] font-bold text-ink-700">%</span>
          <button
            type="button"
            disabled={bulkRunning || bulkEligibleCount === 0}
            onClick={onBulkConfirm}
            className="text-[11px] font-bold bg-ink text-white px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkRunning
              ? `Confirmando ${bulkProgress?.done ?? 0}/${bulkProgress?.total ?? 0}…`
              : `Confirmar ${bulkEligibleCount} documento${bulkEligibleCount === 1 ? "" : "s"}`}
          </button>
          {bulkResult && (
            <span className="text-[11px] font-bold text-ink-700">
              {bulkResult.ok} confirmado{bulkResult.ok === 1 ? "" : "s"}
              {bulkResult.failed > 0 ? `, ${bulkResult.failed} con error — revísalos manualmente` : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
