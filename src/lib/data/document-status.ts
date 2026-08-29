/**
 * Pure lease-digitization-document status logic, split out for the same
 * reason contract-status.ts is: no DB dependency, so it's safe to import
 * from both the client-rendered Legal tab (legal-documents-panel.tsx) and
 * the server-rendered approval queue (approval-queue.ts) without either
 * side re-deriving the predicate on its own.
 */

/** A document still needing a human decision at one of
 *  leaseDigitizationWorkflow's two gates — Gate 1 (`ready_for_triage`) or
 *  Gate 2 (`needs_new_lease`, or `attached` with no extraction_verified_at
 *  yet). Everything else (verified, rejected, failed) is done, one way or
 *  another. Single source of truth for this predicate — see
 *  legal-documents-panel.tsx and approval-queue.ts, both of which import it
 *  rather than re-deriving it. */
export function isDocumentActionable(doc: {
  status: string;
  extractionVerifiedAt: string | null;
}): boolean {
  return (
    doc.status === "ready_for_triage" ||
    doc.status === "needs_new_lease" ||
    (doc.status === "attached" && !doc.extractionVerifiedAt)
  );
}
