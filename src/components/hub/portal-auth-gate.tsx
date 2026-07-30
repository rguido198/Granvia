"use client";

import { useState } from "react";
import { LandlordDashboard } from "@/components/hub/landlord-dashboard";
import { AiAgentModule } from "@/components/hub/ai-agent-module";
import { AcTicketSimulator } from "@/components/hub/ac-ticket-chat";
import { CamLedger } from "@/components/hub/cam-ledger";

export function PortalAuthGate() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<"propietario" | "inquilino">("propietario");
  const [email, setEmail] = useState("propietario@lagranvia.com.mx");
  const [password, setPassword] = useState("••••••••••••");
  const [isLoading, setIsLoading] = useState(false);
  const [salesSubmitted, setSalesSubmitted] = useState(false);

  const handleRoleChange = (newRole: "propietario" | "inquilino") => {
    setRole(newRole);
    if (newRole === "propietario") {
      setEmail("propietario@lagranvia.com.mx");
    } else {
      setEmail("gerente@mintboutique.com");
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsAuthenticated(true);
    }, 600);
  };

  const handleQuickDemoLogin = (targetRole: "propietario" | "inquilino") => {
    setRole(targetRole);
    setEmail(targetRole === "propietario" ? "propietario@lagranvia.com.mx" : "gerente@mintboutique.com");
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsAuthenticated(true);
    }, 400);
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto my-6 sm:my-10 max-w-md">
        {/* Security Card Container */}
        <div className="rounded-xl border border-hairline-strong bg-sand-100 p-6 sm:p-8 shadow-xl">
          {/* Badge */}
          <div className="mb-4 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-pine/30 bg-pine/10 px-3 py-1 font-mono text-[10px] sm:text-[11px] font-bold text-pine uppercase tracking-wider">
              🔒 ACCESO PRIVADO & RESTRINGIDO
            </span>
          </div>

          <h2 className="text-center font-display text-2xl font-bold text-ink leading-tight">
            Portal de Inquilinos & Asset Management
          </h2>
          <p className="mt-2 text-center text-xs text-ink-500 leading-relaxed">
            Consola privada con vistas personalizadas para Propietarios y Arrendatarios.
          </p>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block font-mono text-[11px] font-bold text-ink-600 uppercase mb-1">
                Tipo de Cuenta (Selecciona Rol)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleChange("propietario")}
                  className={`cursor-pointer rounded-md border py-2.5 px-2 text-center transition-all ${
                    role === "propietario"
                      ? "border-pine bg-pine text-sand-100 shadow-sm"
                      : "border-hairline bg-sand-50 text-ink-600 hover:bg-sand-200"
                  }`}
                >
                  <span className="block font-bold text-xs">🏢 Propietario</span>
                  <span className="block font-mono text-[9px] opacity-80 uppercase mt-0.5">Asset Manager</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange("inquilino")}
                  className={`cursor-pointer rounded-md border py-2.5 px-2 text-center transition-all ${
                    role === "inquilino"
                      ? "border-terra bg-terra text-sand-100 shadow-sm"
                      : "border-hairline bg-sand-50 text-ink-600 hover:bg-sand-200"
                  }`}
                >
                  <span className="block font-bold text-xs">🏪 Arrendatario</span>
                  <span className="block font-mono text-[9px] opacity-80 uppercase mt-0.5">Inquilino Local</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] font-bold text-ink-600 uppercase mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-hairline bg-sand-50 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine/30 font-mono"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] font-bold text-ink-600 uppercase mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-hairline bg-sand-50 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine/30 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full cursor-pointer rounded-md bg-ink py-3 text-sm font-bold text-sand-100 transition-colors hover:bg-ink-700 disabled:opacity-50"
            >
              {isLoading ? "Verificando Credenciales..." : `Ingresar como ${role === "propietario" ? "Propietario" : "Inquilino"} →`}
            </button>
          </form>

          {/* Quick Demo Access Triggers */}
          <div className="mt-5 border-t border-hairline pt-4 space-y-2 text-center">
            <p className="font-mono text-[10.5px] font-bold text-ink-400 uppercase">
              Probar Vistas de Demostración:
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("propietario")}
                className="cursor-pointer rounded border border-pine/30 bg-pine/10 px-3 py-1.5 font-mono text-xs font-semibold text-pine hover:bg-pine/20 transition-colors"
              >
                ⚡ Entrar como Propietario (Panel General)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("inquilino")}
                className="cursor-pointer rounded border border-terra/30 bg-terra/10 px-3 py-1.5 font-mono text-xs font-semibold text-terra hover:bg-terra/20 transition-colors"
              >
                ⚡ Entrar como Inquilino (Mi Tienda)
              </button>
            </div>
          </div>

          <div className="mt-4 rounded bg-sand-200 p-2.5 text-center font-mono text-[10px] text-ink-400">
            🔒 Conexión SSL de 256 bits · Autenticación de Doble Factor (2FA) Habilitada
          </div>
        </div>
      </div>
    );
  }

  // ---------------- ROLE 1: PROPIETARIO / ASSET MANAGER VIEW ----------------
  if (role === "propietario") {
    return (
      <div className="space-y-6">
        {/* Active Session Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-pine/30 bg-pine/10 p-3 sm:px-4 text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="h-2 w-2 rounded-full bg-pine animate-pulse" />
            <span className="font-bold text-pine uppercase">Vista de Propietario (Plaza Completa):</span>
            <span className="text-ink font-medium">{email}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRole("inquilino")}
              className="cursor-pointer rounded border border-hairline bg-sand-100 px-2.5 py-1 font-mono text-[11px] font-medium text-ink-600 hover:bg-sand-200"
            >
              Cambiar a Vista Inquilino
            </button>
            <button
              type="button"
              onClick={() => setIsAuthenticated(false)}
              className="cursor-pointer rounded border border-pine/40 bg-sand-100 px-3 py-1 font-mono text-[11px] font-bold text-terra hover:bg-sand-200 transition-colors shrink-0"
            >
              🔒 Cerrar Sesión
            </button>
          </div>
        </div>

        {/* AI Agent Showcase Module */}
        <AiAgentModule />

        {/* Main Executive Landlord Dashboard */}
        <LandlordDashboard />
      </div>
    );
  }

  // ---------------- ROLE 2: ARRENDATARIO / INQUILINO LOCAL VIEW ----------------
  return (
    <div className="space-y-6">
      {/* Active Session Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-terra/30 bg-terra/10 p-3 sm:px-4 text-xs">
        <div className="flex items-center gap-2 font-mono">
          <span className="h-2 w-2 rounded-full bg-terra animate-pulse" />
          <span className="font-bold text-terra uppercase">Vista de Arrendatario (Local A-04):</span>
          <span className="text-ink font-medium">MINT Boutique ({email})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRole("propietario")}
            className="cursor-pointer rounded border border-hairline bg-sand-100 px-2.5 py-1 font-mono text-[11px] font-medium text-ink-600 hover:bg-sand-200"
          >
            Cambiar a Vista Propietario
          </button>
          <button
            type="button"
            onClick={() => setIsAuthenticated(false)}
            className="cursor-pointer rounded border border-pine/40 bg-sand-100 px-3 py-1 font-mono text-[11px] font-bold text-terra hover:bg-sand-200 transition-colors shrink-0"
          >
            🔒 Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Tenant Store Portal */}
      <section className="rounded-xl border border-hairline-strong bg-sand-100 p-5 sm:p-8 shadow-md space-y-6">
        {/* Store Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-bold text-pine uppercase">
                RENTA AL DÍA (JULIO 2026)
              </span>
              <span className="font-mono text-[10px] text-ink-400">
                {"// Local A-04 · Zona Boutique"}
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
              MINT Boutique
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-ink-500">
              Portal del Arrendatario. Envío de ventas mensuales, reporte de incidencias y reglamentos internos.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1 font-mono text-xs text-ink-600 bg-sand-50 p-3 rounded-lg border border-hairline">
            <span><strong>Contrato Activo:</strong> Hasta Octubre 2026</span>
            <span><strong>Superficie:</strong> 145 m²</span>
            <span><strong>Renta Base:</strong> $40,000 MXN / mes</span>
          </div>
        </div>

        {/* Tenant Quick Action Tools */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Action 1: Upload POS Sales */}
          <div className="rounded-lg border border-hairline bg-sand-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📄</span>
              <h3 className="font-display text-sm font-bold text-ink">Reportar Ventas Mensuales</h3>
            </div>
            <p className="text-xs text-ink-500 leading-relaxed">
              Sube tu comprobante de cierre de caja en PDF o fotografía antes del día 5 del mes.
            </p>

            {salesSubmitted ? (
              <div className="rounded bg-emerald-100 p-2 text-center text-xs font-semibold text-emerald-800">
                ✓ Reporte de Julio Enviado Correctamente
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSalesSubmitted(true)}
                className="w-full cursor-pointer rounded bg-pine py-2 text-xs font-bold text-sand-100 hover:bg-pine/90 transition-colors"
              >
                Subir Reporte POS (Julio 2026) →
              </button>
            )}
          </div>

          {/* Action 2: WhatsApp Maintenance Ticket */}
          <div className="rounded-lg border border-hairline bg-sand-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛠️</span>
              <h3 className="font-display text-sm font-bold text-ink">Reportar Incidencia HVAC / Mantenimiento</h3>
            </div>
            <p className="text-xs text-ink-500 leading-relaxed">
              El Agente de IA atiende 24/7 vía WhatsApp y asigna al técnico de plaza en minutos.
            </p>

            <AcTicketSimulator />
          </div>

          {/* Action 3: Download Rules & Hours */}
          <div className="rounded-lg border border-hairline bg-sand-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h3 className="font-display text-sm font-bold text-ink">Reglamento & Horarios</h3>
            </div>
            <p className="text-xs text-ink-500 leading-relaxed">
              Horarios de carga y descarga de proveedores, música ambiental y permisos de modificación.
            </p>
            <button
              type="button"
              onClick={() => alert("Descargando Reglamento_Inquilinos_2026.pdf...")}
              className="w-full cursor-pointer rounded bg-ink py-2 text-xs font-bold text-sand-100 hover:bg-ink-700 transition-colors"
            >
              Descargar Reglamento (.PDF) ↓
            </button>
          </div>
        </div>

        {/* Store Active Tickets Section */}
        <div className="pt-4 border-t border-hairline">
          <h3 className="font-display text-base font-bold text-ink mb-3">
            Mis Solicitudes & Incidencias (Local A-04)
          </h3>
          <div className="rounded-lg border border-hairline bg-sand-50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline/60 pb-3 mb-3">
              <div>
                <span className="font-mono text-xs font-bold text-ink">#INC-402 · Compresor HVAC Terraza</span>
                <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800">
                  EN PROGRESO
                </span>
              </div>
              <span className="font-mono text-[11px] text-ink-400">Asignado: Carlos R. (Climas)</span>
            </div>
            <p className="text-xs text-ink-600">
              Diagnóstico: El Agente de IA detectó falla en el compresor secundario. El técnico llegará a las 11:30 AM con el repuesto.
            </p>
          </div>
        </div>

        {/* NNN / CAM Ledger */}
        <div className="pt-4 border-t border-hairline">
          <CamLedger />
        </div>
      </section>
    </div>
  );
}
