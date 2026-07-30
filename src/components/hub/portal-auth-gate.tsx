"use client";

import { useState } from "react";
import { LandlordDashboard } from "@/components/hub/landlord-dashboard";
import { AiAgentModule } from "@/components/hub/ai-agent-module";

export function PortalAuthGate() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("propietario@lagranvia.com.mx");
  const [password, setPassword] = useState("••••••••••••");
  const [role, setRole] = useState<"propietario" | "inquilino">("propietario");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsAuthenticated(true);
    }, 600);
  };

  const handleQuickDemoLogin = () => {
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
            Consola privada para propietarios, administradores y arrendatarios de La Gran Vía.
          </p>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
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

            <div>
              <label className="block font-mono text-[11px] font-bold text-ink-600 uppercase mb-1">
                Tipo de Cuenta
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("propietario")}
                  className={`cursor-pointer rounded-md border py-2 text-xs font-semibold transition-all ${
                    role === "propietario"
                      ? "border-pine bg-pine text-sand-100 shadow-sm"
                      : "border-hairline bg-sand-50 text-ink-600 hover:bg-sand-200"
                  }`}
                >
                  Propietario / Asset Mgr
                </button>
                <button
                  type="button"
                  onClick={() => setRole("inquilino")}
                  className={`cursor-pointer rounded-md border py-2 text-xs font-semibold transition-all ${
                    role === "inquilino"
                      ? "border-terra bg-terra text-sand-100 shadow-sm"
                      : "border-hairline bg-sand-50 text-ink-600 hover:bg-sand-200"
                  }`}
                >
                  Arrendatario / Inquilino
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full cursor-pointer rounded-md bg-ink py-3 text-sm font-bold text-sand-100 transition-colors hover:bg-ink-700 disabled:opacity-50"
            >
              {isLoading ? "Verificando Credenciales..." : "Ingresar al Portal →"}
            </button>
          </form>

          {/* Quick Demo Access Trigger */}
          <div className="mt-5 border-t border-hairline pt-4 text-center">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="cursor-pointer font-mono text-xs font-semibold text-pine hover:underline"
            >
              ⚡ Iniciar Sesión de Demostración (Acceso Directo)
            </button>
          </div>

          <div className="mt-4 rounded bg-sand-200 p-2.5 text-center font-mono text-[10px] text-ink-400">
            🔒 Conexión SSL de 256 bits · Autenticación de Doble Factor (2FA) Habilitada
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Active Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-pine/30 bg-pine/10 p-3 sm:px-4 text-xs">
        <div className="flex items-center gap-2 font-mono">
          <span className="h-2 w-2 rounded-full bg-pine animate-pulse" />
          <span className="font-bold text-pine uppercase">Sesión Activa:</span>
          <span className="text-ink font-medium">Propietario / Asset Manager (propietario@lagranvia.com.mx)</span>
        </div>
        <button
          type="button"
          onClick={() => setIsAuthenticated(false)}
          className="cursor-pointer rounded border border-pine/40 bg-sand-100 px-3 py-1 font-mono text-[11px] font-bold text-terra hover:bg-sand-200 transition-colors shrink-0"
        >
          🔒 Bloquear Portal / Cerrar Sesión
        </button>
      </div>

      {/* AI Agent Module */}
      <AiAgentModule />

      {/* Main Landlord Control Panel */}
      <LandlordDashboard />
    </div>
  );
}
