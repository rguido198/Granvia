export const LEAD_STAGES = [
  "contacted",
  "touring_scheduled",
  "touring_done",
  "application_requested",
  "converted",
  "lost",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  contacted: "Contactado",
  touring_scheduled: "Recorrido Agendado",
  touring_done: "Recorrido Hecho",
  application_requested: "Solicitud Solicitada",
  converted: "Convertido a Solicitud",
  lost: "Perdido",
};

export type LeadRow = {
  id: string;
  applicantEntity: string;
  category: string;
  targetLocaleId: string | null;
  targetUnitCode: string | null;
  targetPropertyName: string | null;
  contactChannel: string | null;
  source: string | null;
  notes: string | null;
  stage: LeadStage;
  lostReason: string | null;
  convertedApplicationId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  latestNote: string | null;
  latestActor: string | null;
};

export type LeadStageHistoryRow = {
  id: string;
  leadId: string;
  fromStage: LeadStage | null;
  toStage: LeadStage;
  note: string | null;
  actor: string;
  changedAt: string;
};
