/**
 * Deliberately no "server-only" import — same reasoning contract-status.ts
 * and transition-result.ts already document: this is a plain const/type
 * shape with no DB access, so it has to stay importable from a "use client"
 * component (renewal-workspace.tsx) and a plain vitest run, not just
 * renewal-workspace.server.ts's own Route Handler callers.
 */
export const RENEWAL_OUTREACH_STAGES = [
  "contacted",
  "negotiating",
  "proposal_sent",
  "tenant_accepted",
  "tenant_declined",
] as const;

export type RenewalOutreachStage = (typeof RENEWAL_OUTREACH_STAGES)[number];

export type RenewalOutreachStatus = {
  stage: RenewalOutreachStage;
  note: string | null;
  actor: string;
  createdAt: string;
};
