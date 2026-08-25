"use client";

import { useActionState, useState } from "react";
import { upsertContractorAction, type ContractorFormState } from "@/lib/contractors/actions";
import {
  CONTRACTOR_TRADES,
  CONTRACTOR_TRADE_LABELS,
  type Contractor,
} from "@/lib/contractors/shared";

const FORM_INITIAL: ContractorFormState = {};

function isExpired(dateStr: string | null) {
  if (!dateStr) return true;
  return new Date(dateStr) < new Date();
}

function ContractorForm({ contractor, onDone }: { contractor: Contractor | null; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ContractorFormState, FormData>(upsertContractorAction, FORM_INITIAL);

  if (state.success) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between">
        <span>{state.success}</span>
        <button onClick={onDone} className="text-emerald-700 underline cursor-pointer">
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      {contractor && <input type="hidden" name="id" value={contractor.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Especialidad</label>
          <select
            name="trade"
            defaultValue={contractor?.trade ?? CONTRACTOR_TRADES[0]}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            {CONTRACTOR_TRADES.map((t) => (
              <option key={t} value={t}>
                {CONTRACTOR_TRADE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nombre del contratista</label>
          <input
            name="name"
            type="text"
            required
            defaultValue={contractor?.name}
            placeholder="Ej. Climas de Mexicali S.A. de C.V."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cobertura</label>
          <input
            name="coverage_hours"
            type="text"
            defaultValue={contractor?.coverageHours ?? ""}
            placeholder="Ej. 24/7 o L-V 08:00-18:00"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SLA / Compromiso de respuesta</label>
          <input
            name="response_time_commitment"
            type="text"
            defaultValue={contractor?.responseTimeCommitment ?? ""}
            placeholder="Ej. ≤ 2h (P1) · Mismo día (P2)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tarifa (opcional)</label>
          <input
            name="rate"
            type="number"
            step="0.01"
            defaultValue={contractor?.rate ?? ""}
            placeholder="MXN"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              Activo
              <input type="checkbox" name="active" defaultChecked={contractor?.active ?? true} className="ml-1" />
            </span>
          </label>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vencimiento de licencia</label>
          <input
            name="license_expiry"
            type="date"
            required
            defaultValue={contractor?.licenseExpiry ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vencimiento de póliza (COI)</label>
          <input
            name="coi_expiry"
            type="date"
            required
            defaultValue={contractor?.coiExpiry ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Licencia y póliza vencidas o sin fecha excluyen al contratista del despacho automático de Diego, aunque siga
        activo aquí.
      </p>

      {state.error && <p className="text-[11px] text-red-600">{state.error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-[var(--console-accent)] hover:bg-[var(--console-accent-dark)] text-white font-bold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {pending ? "Guardando…" : contractor ? "Guardar Cambios" : "Agregar Contratista"}
        </button>
        <button type="button" onClick={onDone} className="text-slate-600 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-slate-100">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function ContractorRoster({ contractors }: { contractors: Contractor[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  const editingContractor = contractors.find((c) => c.id === editingId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Directorio de Contratistas Preaprobados</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Contratistas reales dados de alta en Supabase — Diego solo puede despachar automáticamente a los que
            aparecen aquí, con licencia y póliza vigentes.
          </p>
        </div>
        <button
          onClick={() => {
            setAddingNew(true);
            setEditingId(null);
          }}
          className="bg-[var(--console-accent)] hover:bg-[var(--console-accent-dark)] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shrink-0"
        >
          + Agregar Contratista
        </button>
      </div>

      {addingNew && <ContractorForm contractor={null} onDone={() => setAddingNew(false)} />}

      {contractors.length === 0 && !addingNew ? (
        <p className="text-xs text-slate-500">
          Sin contratistas dados de alta todavía. Diego no puede despachar automáticamente a nadie hasta que agregues
          al menos uno.
        </p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5">Especialidad</th>
                <th className="p-3.5">Contratista</th>
                <th className="p-3.5">Cobertura</th>
                <th className="p-3.5">Licencia / COI</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {contractors.map((c) => {
                const expired = isExpired(c.licenseExpiry) || isExpired(c.coiExpiry);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors align-top">
                    <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">{CONTRACTOR_TRADE_LABELS[c.trade as keyof typeof CONTRACTOR_TRADE_LABELS] ?? c.trade}</td>
                    <td className="p-3.5">
                      <span className="text-slate-800 font-semibold">{c.name}</span>
                      {c.responseTimeCommitment && <p className="text-[11px] text-slate-500">{c.responseTimeCommitment}</p>}
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium whitespace-nowrap">{c.coverageHours ?? "—"}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      {expired ? (
                        <span className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Vencida — excluida del despacho
                        </span>
                      ) : (
                        <span className="text-slate-600 font-medium text-[11px]">
                          Lic. {c.licenseExpiry} · COI {c.coiExpiry}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.active ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-slate-50 text-slate-400 border border-slate-200"
                        }`}
                      >
                        {c.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setAddingNew(false);
                        }}
                        className="text-slate-700 font-bold text-[11px] underline cursor-pointer hover:text-slate-900"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingContractor && (
        <ContractorForm contractor={editingContractor} onDone={() => setEditingId(null)} />
      )}
    </div>
  );
}
