import { resolveContractorToken, type ResolvedContractorToken } from "@/lib/data/contractor-execution.server";
import { ContractorActionPanel } from "./contractor-action-panel";

export const metadata = {
  title: "Ejecución de Mantenimiento · La Gran Vía",
};

export default async function ContractorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ticketData: ResolvedContractorToken | null = await resolveContractorToken(token);

  if (!ticketData) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-center">
          <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-800 font-bold text-xl flex items-center justify-center mx-auto">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-900">Enlace No Válido o Expirado</h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            Este enlace de trabajo ya fue completado o ha expirado (válido por 14 días desde su emisión).
          </p>
          <p className="text-xs text-slate-400">
            Si necesitas asistencia, contacta a la administración de La Gran Vía.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-4">
        {/* Header */}
        <header className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>{ticketData.propertyName}</span>
            <span>Local {ticketData.unitNumber}</span>
          </div>
          <h1 className="text-2xl font-bold">{ticketData.ticketNumber}</h1>
          <p className="text-xs text-slate-400 font-medium">Técnico Asignado: {ticketData.contractorName}</p>
        </header>

        {/* Ticket Details */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Reporte del Inquilino</h2>
            <p className="text-sm font-semibold text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              &ldquo;{ticketData.rawReport}&rdquo;
            </p>
          </div>

          {ticketData.diagnosis && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Diagnóstico Inicial</h2>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">{ticketData.diagnosis}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] block">Prioridad</span>
              <span className="font-bold text-slate-800">{ticketData.priority ?? "P3"}</span>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] block">Estado del Ticket</span>
              <span className="font-bold text-slate-800">{ticketData.status}</span>
            </div>
          </div>
        </section>

        {/* Interactive Action Island */}
        <ContractorActionPanel token={token} initialData={ticketData} />
      </div>
    </main>
  );
}
