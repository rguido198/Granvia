"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LeadRow, LeadStage } from "@/lib/data/lead-types";
import { LEAD_STAGE_LABELS } from "@/lib/data/lead-types";
import type { PortfolioRow } from "@/lib/data/portfolio.server";
import type { LocaleOption } from "@/lib/data/tenant-portal.server";
import { MarianaApplicationForm } from "./mariana-application-form";
import { NewLeadForm } from "./new-lead-form";

const ACTIVE_STAGES: LeadStage[] = [
  "contacted",
  "touring_scheduled",
  "touring_done",
  "application_requested",
];

export function LeadPipeline({
  leads,
  rentRoll,
  localeOptions,
}: {
  leads: LeadRow[];
  rentRoll: PortfolioRow[];
  localeOptions: LocaleOption[];
}) {
  const router = useRouter();
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [selectedVacantLocaleId, setSelectedVacantLocaleId] = useState<string | null>(null);

  const [convertingLead, setConvertingLead] = useState<LeadRow | null>(null);
  const [marianaModalOpen, setMarianaModalOpen] = useState(false);

  const [lostModalLeadId, setLostModalLeadId] = useState<string | null>(null);
  const [lostReasonInput, setLostReasonInput] = useState("");
  const [submittingLost, setSubmittingLost] = useState(false);

  const [updatingStageLeadId, setUpdatingStageLeadId] = useState<string | null>(null);
  const [collapsedResolved, setCollapsedResolved] = useState(true);

  // Cross-reference vacant locales without active prospect leads
  const activeLeads = leads.filter((l) => l.stage !== "converted" && l.stage !== "lost");
  const activeTargetLocaleIds = new Set(
    activeLeads.map((l) => l.targetLocaleId).filter((id): id is string => Boolean(id)),
  );

  const vacantUnitCodes = new Set(rentRoll.filter((row) => row.vacant).map((row) => row.unitCode));
  const vacantLocaleOptions = localeOptions.filter((l) => vacantUnitCodes.has(l.unitNumber));
  const vacantLocalesWithoutLeads = vacantLocaleOptions.filter(
    (l) => !activeTargetLocaleIds.has(l.id),
  );

  async function handleStageChange(leadId: string, newStage: string) {
    setUpdatingStageLeadId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStage: newStage }),
      });
      if (res.ok) router.refresh();
    } finally {
      setUpdatingStageLeadId(null);
    }
  }

  async function handleMarkLost() {
    if (!lostModalLeadId || !lostReasonInput.trim()) return;
    setSubmittingLost(true);
    try {
      const res = await fetch(`/api/leads/${lostModalLeadId}/lost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lostReason: lostReasonInput.trim() }),
      });
      if (res.ok) {
        setLostModalLeadId(null);
        setLostReasonInput("");
        router.refresh();
      }
    } finally {
      setSubmittingLost(false);
    }
  }

  const convertedLeads = leads.filter((l) => l.stage === "converted");
  const lostLeads = leads.filter((l) => l.stage === "lost");

  return (
    <div className="space-y-6">
      {/* 1. Operational Gap Header: Vacantes sin Prospectos */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Locales Vacantes sin Prospectos Activos</h2>
            <p className="text-xs text-slate-500 font-medium">
              Locales desocupados que no tienen ningún seguimiento o prospección registrada.
            </p>
          </div>
          <NewLeadForm
            localeOptions={localeOptions}
            initialLocaleId={selectedVacantLocaleId}
            isOpen={newLeadModalOpen}
            onClose={() => {
              setNewLeadModalOpen(false);
              setSelectedVacantLocaleId(null);
            }}
          />
        </div>

        {vacantLocalesWithoutLeads.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
            <p className="text-xs font-bold text-emerald-800">
              ✓ Cobertura 100% — Todos los locales vacantes cuentan con al menos un prospecto en seguimiento.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {vacantLocalesWithoutLeads.map((row) => (
              <div
                key={row.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{row.unitNumber}</span>
                  <span className="text-[11px] text-slate-500 font-medium">{row.propertyName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVacantLocaleId(row.id);
                    setNewLeadModalOpen(true);
                  }}
                  className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                >
                  + Prospecto
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Pipeline Board */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Embudos de Prospección ({activeLeads.length} activos)</h2>

        <div className="grid gap-4 md:grid-cols-4 items-start">
          {ACTIVE_STAGES.map((stageKey) => {
            const stageLeads = leads.filter((l) => l.stage === stageKey);
            return (
              <div key={stageKey} className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 space-y-3 min-h-[300px]">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {LEAD_STAGE_LABELS[stageKey]}
                  </h3>
                  <span className="bg-white text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-slate-900 text-sm leading-tight">
                          {lead.applicantEntity}
                        </span>
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px] shrink-0">
                          {lead.category}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <p className="font-medium">
                          {lead.targetUnitCode ? `Local ${lead.targetUnitCode} (${lead.targetPropertyName})` : "Sin local definido"}
                        </p>
                        {lead.contactChannel && (
                          <p className="text-slate-500 font-medium">Contacto: {lead.contactChannel}</p>
                        )}
                        {lead.latestNote && (
                          <p className="text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-100 mt-1">
                            &ldquo;{lead.latestNote}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <select
                            disabled={updatingStageLeadId === lead.id}
                            value={lead.stage}
                            onChange={(e) => void handleStageChange(lead.id, e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-800 rounded-lg px-2 py-1 cursor-pointer focus:outline-none"
                          >
                            {ACTIVE_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {LEAD_STAGE_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setConvertingLead(lead);
                              setMarianaModalOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 rounded-md cursor-pointer transition-colors"
                          >
                            Convertir a Solicitud →
                          </button>
                          <button
                            type="button"
                            onClick={() => setLostModalLeadId(lead.id)}
                            className="text-red-600 hover:text-red-800 font-bold text-[10px] px-1.5 py-1 cursor-pointer"
                          >
                            Descartar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs font-medium italic">
                      Sin prospectos en esta etapa.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Collapsible Section for Converted / Lost Leads */}
      {(convertedLeads.length > 0 || lostLeads.length > 0) && (
        <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
          <button
            type="button"
            onClick={() => setCollapsedResolved((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
          >
            <span>
              Histórico Resuelto: {convertedLeads.length} Convertidos · {lostLeads.length} Perdidos
            </span>
            <span>{collapsedResolved ? "Ver detalle ▾" : "Ocultar ▴"}</span>
          </button>

          {!collapsedResolved && (
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Convertidos a Solicitud ({convertedLeads.length})
                </h4>
                {convertedLeads.map((l) => (
                  <div key={l.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs">
                    <p className="font-bold text-emerald-900">{l.applicantEntity}</p>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      Categoría: {l.category} {l.targetUnitCode ? `· Local ${l.targetUnitCode}` : ""}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Perdidos / Descartados ({lostLeads.length})
                </h4>
                {lostLeads.map((l) => (
                  <div key={l.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs space-y-0.5">
                    <p className="font-bold text-slate-800">{l.applicantEntity}</p>
                    <p className="text-[11px] text-slate-600 font-medium">Categoría: {l.category}</p>
                    {l.lostReason && (
                      <p className="text-[11px] text-slate-500 italic">Motivo: &ldquo;{l.lostReason}&rdquo;</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Mariana Modal wrapper for Conversion */}
      {marianaModalOpen && convertingLead && (
        <MarianaApplicationForm
          localeOptions={localeOptions}
          sourceLead={{
            id: convertingLead.id,
            applicantEntity: convertingLead.applicantEntity,
            category: convertingLead.category,
            targetLocaleId: convertingLead.targetLocaleId,
          }}
          isOpen={marianaModalOpen}
          onClose={() => {
            setMarianaModalOpen(false);
            setConvertingLead(null);
          }}
        />
      )}

      {/* Lost Reason Modal */}
      {lostModalLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-md w-full space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Descartar Prospecto</h3>
            <p className="text-xs text-slate-600">
              Indica la razón por la cual no se concretó la oportunidad para el histórico.
            </p>
            <textarea
              value={lostReasonInput}
              onChange={(e) => setLostReasonInput(e.target.value)}
              placeholder="Ej. Decidieron rentar en otra plaza / Presupuesto fuera de rango."
              rows={3}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-slate-900 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setLostModalLeadId(null)}
                className="text-xs font-bold text-slate-600 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submittingLost || !lostReasonInput.trim()}
                onClick={() => void handleMarkLost()}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {submittingLost ? "Guardando…" : "Confirmar Descarte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
