"use client";

import { useActionState, useRef, useState } from "react";
import {
  addTenantAction,
  bulkAddTenantsAction,
  vacateTenantAction,
  type BulkImportResult,
  type BulkImportRow,
  type RentRollActionState,
} from "@/lib/data/rent-roll-actions";

const FORM_INITIAL: RentRollActionState = {};
const BULK_INITIAL: BulkImportResult = { insertedCount: 0, failed: [] };

const INPUT_CLS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-[var(--console-accent)] focus:outline-none";
const LABEL_CLS = "text-[11px] font-bold text-slate-500 uppercase tracking-wider";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className={LABEL_CLS}>{label}</label>
      {children}
    </div>
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusYearsISO(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────
// Add Tenant — Tier 3: two real steps (fill in → review the exact payload →
// confirm) before addTenantAction ever fires. There is no single-click path
// from an empty form to a Supabase write.
// ─────────────────────────────────────────────────────────────────────────

type TenantDraft = {
  tenantName: string;
  unitNumber: string;
  areaSqm: string;
  baseRentMonthly: string;
  startDate: string;
  endDate: string;
};

function AddTenantForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState<RentRollActionState, FormData>(addTenantAction, FORM_INITIAL);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [draft, setDraft] = useState<TenantDraft>({
    tenantName: "",
    unitNumber: "",
    areaSqm: "",
    baseRentMonthly: "",
    startDate: todayISO(),
    endDate: plusYearsISO(5),
  });

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

  const canReview =
    draft.tenantName.trim() !== "" &&
    draft.unitNumber.trim() !== "" &&
    draft.areaSqm !== "" &&
    Number(draft.areaSqm) > 0 &&
    draft.baseRentMonthly !== "" &&
    Number(draft.baseRentMonthly) >= 0;

  if (step === "form") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
        <p className="text-xs font-bold text-slate-700">+ Agregar Inquilino al Rent Roll</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre del inquilino">
            <input
              value={draft.tenantName}
              onChange={(e) => setDraft((d) => ({ ...d, tenantName: e.target.value }))}
              placeholder="Ej. Café Tino"
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Número de local">
            <input
              value={draft.unitNumber}
              onChange={(e) => setDraft((d) => ({ ...d, unitNumber: e.target.value }))}
              placeholder="Ej. 9-90"
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Superficie (m²)">
            <input
              type="number"
              min="1"
              value={draft.areaSqm}
              onChange={(e) => setDraft((d) => ({ ...d, areaSqm: e.target.value }))}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Renta mensual (MXN)">
            <input
              type="number"
              min="0"
              value={draft.baseRentMonthly}
              onChange={(e) => setDraft((d) => ({ ...d, baseRentMonthly: e.target.value }))}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Inicio de contrato">
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Vencimiento de contrato">
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
              className={INPUT_CLS}
            />
          </Field>
        </div>
        <p className="text-[11px] text-slate-500">
          Fechas precargadas a 5 años desde hoy (plazo ilustrativo) si todavía no hay contrato firmado — ajústalas si ya
          existe una fecha real. Si el número de local corresponde a una unidad actualmente vacante, este formulario la
          vuelve a ocupar en lugar de crear un local duplicado.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canReview}
            onClick={() => setStep("confirm")}
            className="bg-[var(--console-accent)] hover:bg-[var(--console-accent-dark)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer"
          >
            Revisar →
          </button>
          <button
            type="button"
            onClick={onDone}
            className="text-slate-600 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-slate-100"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 space-y-3">
      <input type="hidden" name="tenant_name" value={draft.tenantName} />
      <input type="hidden" name="unit_number" value={draft.unitNumber} />
      <input type="hidden" name="area_sqm" value={draft.areaSqm} />
      <input type="hidden" name="base_rent_monthly" value={draft.baseRentMonthly} />
      <input type="hidden" name="start_date" value={draft.startDate} />
      <input type="hidden" name="end_date" value={draft.endDate} />

      <p className="text-xs font-bold text-amber-900">
        Confirmar nuevo inquilino — esta acción escribe directamente en el rent roll (Supabase)
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-800 bg-white rounded-lg border border-amber-200 p-3">
        <dt className="text-slate-500">Inquilino</dt>
        <dd className="font-bold">{draft.tenantName}</dd>
        <dt className="text-slate-500">Local</dt>
        <dd className="font-bold">{draft.unitNumber}</dd>
        <dt className="text-slate-500">Superficie</dt>
        <dd className="font-bold">{draft.areaSqm} m²</dd>
        <dt className="text-slate-500">Renta mensual</dt>
        <dd className="font-bold">{Number(draft.baseRentMonthly).toLocaleString("es-MX")} MXN</dd>
        <dt className="text-slate-500">Contrato</dt>
        <dd className="font-bold">
          {draft.startDate} → {draft.endDate}
        </dd>
      </dl>

      {state.error && <p className="text-[11px] text-red-600 font-semibold">{state.error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer"
        >
          {pending ? "Guardando…" : "Confirmar y Agregar Inquilino"}
        </button>
        <button
          type="button"
          onClick={() => setStep("form")}
          className="text-slate-600 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-slate-100"
        >
          ← Volver a editar
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Terminate Tenant — Tier 3: per-row button opens a modal that names exactly
// what will change before vacateTenantAction fires. No bare "delete" icon.
// ─────────────────────────────────────────────────────────────────────────

export function TerminateTenantButton({
  localeId,
  leaseId,
  tenantName,
  unitCode,
}: {
  localeId: string;
  leaseId: string;
  tenantName: string;
  unitCode: string;
}) {
  const [state, formAction, pending] = useActionState<RentRollActionState, FormData>(vacateTenantAction, FORM_INITIAL);
  const [open, setOpen] = useState(false);

  if (state.success) {
    return <span className="text-[10px] font-bold text-emerald-700">{state.success}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] font-bold text-red-700 underline cursor-pointer hover:text-red-900"
      >
        Desocupar
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 max-w-sm w-full space-y-3">
            <p className="text-sm font-bold text-slate-900">¿Desocupar el local de {tenantName}?</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {unitCode} pasará a estatus <strong>VACANTE</strong> y el contrato se marcará con vencimiento hoy. Esto
              no borra nada — {tenantName} se mueve a &ldquo;Inquilinos Anteriores&rdquo; con su renta y fecha de
              salida, y el local queda listo para un nuevo contrato.
            </p>
            <form action={formAction} className="space-y-2">
              <input type="hidden" name="locale_id" value={localeId} />
              <input type="hidden" name="lease_id" value={leaseId} />
              <input type="hidden" name="tenant_name" value={tenantName} />
              {state.error && <p className="text-[11px] text-red-600 font-semibold">{state.error}</p>}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-slate-600 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
                >
                  {pending ? "Procesando…" : "Confirmar Desocupación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Bulk Import — parses client-side with SheetJS (dynamically imported so it
// never lands in the initial console bundle), shows every row's status
// before anything is written, and only bad rows are flagged — never
// silently dropped.
// ─────────────────────────────────────────────────────────────────────────

type ParsedRow = {
  tenantName: string;
  unitNumber: string;
  areaSqm: number | null;
  baseRentMonthly: number | null;
  startDate: string;
  endDate: string;
  errors: string[];
};

const FIELD_ALIASES: Record<string, string[]> = {
  tenantName: ["inquilino", "tenant", "tenantname", "nombre", "arrendatario", "inquilinolocal", "razonsocial"],
  unitNumber: ["local", "unidad", "unit", "unitnumber", "numlocal", "numerodelocal", "numerolocal"],
  areaSqm: ["m2", "superficie", "areasqm", "sqm", "metroscuadrados", "area", "superficiem2"],
  baseRentMonthly: ["renta", "rent", "baserentmonthly", "rentamensual", "rentamensualmxn", "rentamxn"],
  startDate: ["inicio", "startdate", "fechainicio", "fechadeinicio"],
  endDate: ["fin", "vencimiento", "enddate", "fechafin", "fechadevencimiento", "fechavencimiento"],
};

function normalizeHeader(h: string): string {
  return h
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function matchField(header: string): keyof typeof FIELD_ALIASES | null {
  const norm = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(norm)) return field as keyof typeof FIELD_ALIASES;
  }
  return null;
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Only accepts an unambiguous ISO date — anything else is left blank rather
 *  than guessed at (day/month order in spreadsheets is not reliably inferable). */
function toDateStringOrEmpty(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

async function parseWorkbook(file: File): Promise<ParsedRow[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return raw.map((record) => {
    const mapped: Record<string, unknown> = {};
    for (const header of Object.keys(record)) {
      const field = matchField(header);
      if (field) mapped[field] = record[header];
    }

    const tenantName = String(mapped.tenantName ?? "").trim();
    const unitNumber = String(mapped.unitNumber ?? "").trim();
    const areaSqm = toNumberOrNull(mapped.areaSqm);
    const baseRentMonthly = toNumberOrNull(mapped.baseRentMonthly);
    const startDate = toDateStringOrEmpty(mapped.startDate);
    const endDate = toDateStringOrEmpty(mapped.endDate);

    const errors: string[] = [];
    if (!tenantName) errors.push("Falta nombre de inquilino");
    if (!unitNumber) errors.push("Falta número de local");
    if (areaSqm === null || areaSqm <= 0) errors.push("Superficie (m²) inválida o faltante");
    if (baseRentMonthly === null || baseRentMonthly < 0) errors.push("Renta mensual inválida o faltante");

    return { tenantName, unitNumber, areaSqm, baseRentMonthly, startDate, endDate, errors };
  });
}

function BulkImportPanel({ onDone }: { onDone: () => void }) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [state, formAction, pending] = useActionState<BulkImportResult, BulkImportRow[]>(bulkAddTenantsAction, BULK_INITIAL);
  const inputRef = useRef<HTMLInputElement>(null);

  const validRows = rows?.filter((r) => r.errors.length === 0) ?? [];
  const invalidRows = rows?.filter((r) => r.errors.length > 0) ?? [];

  const handleFile = async (file: File) => {
    setParsing(true);
    setParseError(null);
    setSubmitted(false);
    try {
      const parsed = await parseWorkbook(file);
      if (parsed.length === 0) {
        setParseError("El archivo no tiene filas de datos.");
        setRows(null);
      } else {
        setRows(parsed);
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "No se pudo leer el archivo. Verifica que sea .xlsx, .xls o .csv.");
      setRows(null);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = () => {
    const payload: BulkImportRow[] = validRows.map((r) => ({
      tenantName: r.tenantName,
      unitNumber: r.unitNumber,
      areaSqm: r.areaSqm as number,
      baseRentMonthly: r.baseRentMonthly as number,
      startDate: r.startDate || undefined,
      endDate: r.endDate || undefined,
    }));
    setSubmitted(true);
    formAction(payload);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700">Importar Inquilinos desde Excel / CSV</p>
        <button type="button" onClick={onDone} className="text-slate-500 text-[11px] font-bold cursor-pointer hover:text-slate-800">
          Cerrar
        </button>
      </div>

      {!rows && !submitted && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500">
            Columnas esperadas (nombres flexibles, EN/ES): Inquilino, Local, Superficie (m²), Renta mensual — Inicio /
            Vencimiento son opcionales (formato AAAA-MM-DD).
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
            className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--console-accent)] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white file:cursor-pointer cursor-pointer"
          />
          {parsing && <p className="text-[11px] text-slate-500">Leyendo archivo…</p>}
          {parseError && <p className="text-[11px] text-red-600 font-semibold">{parseError}</p>}
        </div>
      )}

      {rows && !submitted && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
            <span className="text-emerald-700">{validRows.length} lista(s) para importar</span>
            {invalidRows.length > 0 && (
              <span className="text-red-600">{invalidRows.length} con errores (no se importarán)</span>
            )}
            <button
              type="button"
              onClick={() => {
                setRows(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-slate-500 underline cursor-pointer"
            >
              Elegir otro archivo
            </button>
          </div>

          <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 font-bold text-slate-600 sticky top-0">
                <tr>
                  <th className="p-2">Estatus</th>
                  <th className="p-2">Inquilino</th>
                  <th className="p-2">Local</th>
                  <th className="p-2 text-right">m²</th>
                  <th className="p-2 text-right">Renta</th>
                  <th className="p-2">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={i} className={r.errors.length ? "bg-red-50" : ""}>
                    <td className="p-2">{r.errors.length ? "⚠" : "✓"}</td>
                    <td className="p-2 font-semibold">{r.tenantName || "—"}</td>
                    <td className="p-2">{r.unitNumber || "—"}</td>
                    <td className="p-2 text-right">{r.areaSqm ?? "—"}</td>
                    <td className="p-2 text-right">{r.baseRentMonthly ?? "—"}</td>
                    <td className="p-2 text-red-700">{r.errors.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={validRows.length === 0 || pending}
              onClick={handleConfirm}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
            >
              {pending ? "Importando…" : `Confirmar Importación (${validRows.length})`}
            </button>
            <button
              type="button"
              onClick={() => {
                setRows(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-slate-600 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <div className="space-y-2">
          {pending && <p className="text-xs text-slate-600">Importando…</p>}
          {!pending && state.error && <p className="text-xs text-red-600 font-semibold">{state.error}</p>}
          {!pending && !state.error && (
            <>
              <p className="text-xs font-bold text-emerald-700">
                {state.insertedCount} inquilino(s) importado(s) al rent roll.
              </p>
              {state.failed.length > 0 && (
                <div className="text-[11px] text-red-700">
                  <p className="font-bold">{state.failed.length} fila(s) rechazadas:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {state.failed.map((f, i) => (
                      <li key={i}>
                        {f.row.tenantName || "(sin nombre)"} — {f.row.unitNumber || "(sin local)"}: {f.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <button type="button" onClick={onDone} className="text-slate-600 underline text-xs font-bold cursor-pointer hover:text-slate-900">
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Toolbar — rendered next to "Modo Edición" in the rent roll header.
// ─────────────────────────────────────────────────────────────────────────

export function RentRollAdminTools() {
  const [panel, setPanel] = useState<"none" | "add" | "import">("none");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPanel(panel === "add" ? "none" : "add")}
          className="bg-white border border-slate-300 hover:border-[var(--console-accent)] text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          + Agregar Inquilino
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === "import" ? "none" : "import")}
          className="bg-white border border-slate-300 hover:border-[var(--console-accent)] text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          Importar desde Excel
        </button>
      </div>

      {panel === "add" && <AddTenantForm onDone={() => setPanel("none")} />}
      {panel === "import" && <BulkImportPanel onDone={() => setPanel("none")} />}
    </div>
  );
}
