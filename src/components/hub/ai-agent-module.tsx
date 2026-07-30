"use client";

import { useState } from "react";
import { cn } from "@/components/ui";

interface AiDemoState {
  helpdesk: boolean;
  ocr: boolean;
  renewal: boolean;
}

export function AiAgentModule() {
  const [activeDemo, setActiveDemo] = useState<keyof AiDemoState | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [queryResponse, setQueryResponse] = useState<string | null>(null);

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;

    const q = userQuery.toLowerCase();
    if (q.includes("mantenimiento") || q.includes("incidencia") || q.includes("whatsapp")) {
      setQueryResponse(
        "🤖 [Agente de Mantenimiento]: El Agente de IA está activo en WhatsApp (+52 686 123 4567). Ha gestionado 4 tickets este mes con un tiempo de respuesta promedio de 12 minutos. Todos los contratistas de HVAC y electricidad están sincronizados con Yardi ERP."
      );
    } else if (q.includes("venta") || q.includes("factura") || q.includes("cobro")) {
      setQueryResponse(
        "🤖 [Agente Financiero]: El 96% de los inquilinos enviaron su reporte mensual de ventas antes del 5 del mes. El Agente procesó 76 documentos PDF con OCR y generó las facturas electrónicas CFDI automáticamente."
      );
    } else if (q.includes("contrato") || q.includes("vence") || q.includes("renovacion")) {
      setQueryResponse(
        "🤖 [Agente de Arrendamiento]: Próximos vencimientos Q3: Bodega 8 (Oct 2026, incremento sugerido +5.5%) y Cinépolis VIP (Nov 2026, renovación segura 5 años). El Agente preparó las cartas de intención."
      );
    } else {
      setQueryResponse(
        `🤖 [Agente de Asset Management]: Analizando tu consulta "${userQuery}"... Conectado en tiempo real a la base de datos de La Gran Vía. Todos los sistemas operativos, sensores de afluencia y cobranza están funcionando al 100%.`
      );
    }
  };

  return (
    <section className="my-8 rounded-xl border border-pine/30 bg-gradient-to-b from-pine/5 via-sand-100 to-sand-100 p-5 sm:p-7 shadow-md">
      {/* Module Title */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pine/20 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pine px-2.5 py-0.5 font-mono text-[10px] font-bold text-sand-100 uppercase">
              ✨ AGENTES DE IA AUTÓNOMOS
            </span>
            <span className="font-mono text-[10px] text-ink-400">
              // Integración en Tiempo Real
            </span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">
            Capacidades de Agentes de IA para Propietarios
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-ink-600 max-w-2xl">
            Tres sistemas autónomos que se conectan a los software existentes de la plaza para automatizar operaciones, cobros e inteligencia comercial.
          </p>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-pine/40 bg-sand-100 px-3 py-1.5 font-mono text-xs font-semibold text-pine">
            <span className="h-2 w-2 rounded-full bg-pine animate-pulse" />
            3 Agentes Activos
          </span>
        </div>
      </div>

      {/* AI Command Query Bar */}
      <div className="mb-6 rounded-lg border border-hairline bg-sand-100 p-3 sm:p-4">
        <label className="block font-mono text-[10.5px] font-bold text-ink-500 uppercase mb-1.5">
          💬 Consola Interactiva del Agente de IA (Prueba una consulta)
        </label>
        <form onSubmit={handleQuerySubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Ej. ¿Qué contratos vencen pronto? o ¿Cómo va la cobranza?"
            className="flex-1 rounded-md border border-hairline bg-sand-50 px-3 py-2 text-xs text-ink outline-none focus:border-pine font-mono"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-pine px-4 py-2 text-xs font-bold text-sand-100 transition-colors hover:bg-pine/90 shrink-0"
          >
            Consultar IA →
          </button>
        </form>

        {/* Quick Query Pills */}
        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
          <span className="text-ink-400 self-center text-[10.5px]">Sugerencias:</span>
          <button
            type="button"
            onClick={() => {
              setUserQuery("¿Qué contratos vencen en Q3?");
              setQueryResponse(
                "🤖 [Agente de Arrendamiento]: Próximos vencimientos Q3: Bodega 8 (Oct 2026, incremento sugerido +5.5%) y Cinépolis VIP (Nov 2026). Cartas de intención generadas."
              );
            }}
            className="cursor-pointer rounded border border-hairline bg-sand-50 px-2 py-0.5 text-ink-600 hover:border-pine hover:text-pine"
          >
            Contratos a vencer
          </button>

          <button
            type="button"
            onClick={() => {
              setUserQuery("¿Quién falta de enviar reporte de ventas?");
              setQueryResponse(
                "🤖 [Agente Financiero]: 96% entregado. Solo restan 3 locales menores. El Agente envió recordatorio automático por WhatsApp esta mañana."
              );
            }}
            className="cursor-pointer rounded border border-hairline bg-sand-50 px-2 py-0.5 text-ink-600 hover:border-pine hover:text-pine"
          >
            Reportes de ventas pendientes
          </button>

          <button
            type="button"
            onClick={() => {
              setUserQuery("¿Cómo funciona el reporte por WhatsApp?");
              setQueryResponse(
                "🤖 [Agente de Mantenimiento]: El inquilino escribe por WhatsApp, el Agente interpreta la falla con IA, consulta contratistas en el ERP y asigna al técnico disponible."
              );
            }}
            className="cursor-pointer rounded border border-hairline bg-sand-50 px-2 py-0.5 text-ink-600 hover:border-pine hover:text-pine"
          >
            Agente WhatsApp
          </button>
        </div>

        {/* Query Response Box */}
        {queryResponse && (
          <div className="mt-3 rounded-md border border-pine/30 bg-pine/10 p-3 text-xs text-ink-800 animate-fadeIn">
            <div className="flex items-start justify-between">
              <p className="font-sans leading-relaxed">{queryResponse}</p>
              <button
                type="button"
                onClick={() => setQueryResponse(null)}
                className="text-ink-400 hover:text-ink font-mono text-xs ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3 Core Agent Showcase Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Agent 1 */}
        <div className="flex flex-col justify-between rounded-lg border border-hairline bg-sand-100 p-4.5 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🤖</span>
              <span className="rounded bg-terra/15 px-2 py-0.5 font-mono text-[10px] font-bold text-terra uppercase">
                WhatsApp + Web
              </span>
            </div>
            <h3 className="font-display text-base font-bold text-ink">
              1. Agente de Mesa de Ayuda & Mantenimiento
            </h3>
            <p className="mt-1.5 text-xs text-ink-500 leading-relaxed">
              Atiende solicitudes de inquilinos 24/7 por WhatsApp. Diagnostica la falla, consulta el ERP y asigna automáticamente al técnico de plaza.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-hairline">
            <button
              type="button"
              onClick={() => setActiveDemo(activeDemo === "helpdesk" ? null : "helpdesk")}
              className="w-full cursor-pointer rounded border border-hairline bg-sand-50 py-1.5 text-center text-xs font-semibold text-terra hover:bg-sand-200 transition-colors"
            >
              {activeDemo === "helpdesk" ? "Ocultar Simulación ✕" : "Ver Simulación WhatsApp →"}
            </button>

            {activeDemo === "helpdesk" && (
              <div className="mt-3 rounded-md bg-sand-200 p-3 text-[11px] space-y-2 border border-hairline font-mono">
                <div className="text-emerald-700 bg-emerald-50 p-2 rounded">
                  📱 <strong>Inquilino (WhatsApp):</strong> "Hola, el aire acondicionado del Local A-04 no enfría."
                </div>
                <div className="text-pine bg-pine/10 p-2 rounded">
                  🤖 <strong>Agente IA:</strong> "Entendido, Local A-04 (Bodega 8). Verifiqué disponibilidad en ERP y asigné a Carlos R. (Climas). Llegada estimada: 25 min. Ticket #INC-402 registrado."
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Agent 2 */}
        <div className="flex flex-col justify-between rounded-lg border border-hairline bg-sand-100 p-4.5 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">💰</span>
              <span className="rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-bold text-pine uppercase">
                OCR + CFDI
              </span>
            </div>
            <h3 className="font-display text-base font-bold text-ink">
              2. Agente de Reporte de Ventas & Cobranza
            </h3>
            <p className="mt-1.5 text-xs text-ink-500 leading-relaxed">
              Solicita reportes mensuales el día 1. Lee comprobantes o PDFs con Visión/OCR, calcula la renta variable y genera la factura fiscal automáticamente.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-hairline">
            <button
              type="button"
              onClick={() => setActiveDemo(activeDemo === "ocr" ? null : "ocr")}
              className="w-full cursor-pointer rounded border border-hairline bg-sand-50 py-1.5 text-center text-xs font-semibold text-pine hover:bg-sand-200 transition-colors"
            >
              {activeDemo === "ocr" ? "Ocultar Simulación ✕" : "Ver Lectura de Ticket OCR →"}
            </button>

            {activeDemo === "ocr" && (
              <div className="mt-3 rounded-md bg-sand-200 p-3 text-[11px] space-y-2 border border-hairline font-mono">
                <div className="text-ink-700 bg-sand-50 p-2 rounded">
                  📄 <strong>Comprobante subido:</strong> Reporte_POS_Julio.pdf
                </div>
                <div className="text-pine bg-pine/10 p-2 rounded">
                  🤖 <strong>Agente IA OCR:</strong> "Ventas brutas detectadas: $522,000 MXN. Renta base: $40,000. Renta variable (3%): $15,660. Factura CFDI emitida y enviada a contabilidad."
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Agent 3 */}
        <div className="flex flex-col justify-between rounded-lg border border-hairline bg-sand-100 p-4.5 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📈</span>
              <span className="rounded bg-gold/20 px-2 py-0.5 font-mono text-[10px] font-bold text-gold uppercase">
                IA Predictiva
              </span>
            </div>
            <h3 className="font-display text-base font-bold text-ink">
              3. Agente de Salud de Arrendamiento
            </h3>
            <p className="mt-1.5 text-xs text-ink-500 leading-relaxed">
              Compara la afluencia fuera del local contra las ventas reportadas. 180 días antes del vencimiento, redacta la propuesta de renovación recomendada.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-hairline">
            <button
              type="button"
              onClick={() => setActiveDemo(activeDemo === "renewal" ? null : "renewal")}
              className="w-full cursor-pointer rounded border border-hairline bg-sand-50 py-1.5 text-center text-xs font-semibold text-gold hover:bg-sand-200 transition-colors"
            >
              {activeDemo === "renewal" ? "Ocultar Simulación ✕" : "Ver Análisis Predictivo →"}
            </button>

            {activeDemo === "renewal" && (
              <div className="mt-3 rounded-md bg-sand-200 p-3 text-[11px] space-y-2 border border-hairline font-mono">
                <div className="text-ink-700 bg-sand-50 p-2 rounded">
                  🔍 <strong>Análisis de Local A-04 (Bodega 8):</strong> Vence en Oct 2026. Ventas +14% YoY. Effort Rate: 7.9% (Muy Saludable).
                </div>
                <div className="text-amber-800 bg-gold/15 p-2 rounded">
                  🤖 <strong>Recomendación IA:</strong> "Ofrecer renovación a 3 años con +5.5% en renta base. Borrador de contrato generado para revisión del propietario."
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
