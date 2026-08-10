"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageFade } from "@/components/ui";

export const runtime = "edge";

export default function ConsoleLoginPage() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/console-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push("/consola");
        router.refresh();
      } else {
        setError(data.error || "Usuario o contraseña incorrectos.");
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageFade>
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
        <div className="w-full rounded-lg border border-hairline-strong bg-sand-100 p-6 sm:p-8 shadow-lg">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/la-gran-via-logo-horizontal.png"
              alt="La Gran Vía"
              className="h-11 w-auto object-contain"
            />
          </div>

          <p className="mt-5 text-center">
            <span className="inline-block rounded-full border border-pine/30 bg-pine/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-pine">
              Acceso restringido
            </span>
          </p>

          <h1 className="mt-3 text-center font-display text-2xl font-bold leading-tight text-ink">
            Consola de Asset Management
          </h1>
          <p className="mt-2 text-center text-xs leading-relaxed text-ink-500">
            Rent roll consolidado, prorrateo CAM NNN y auditoría fiscal de la plaza. Uso exclusivo del personal
            autorizado de La Gran Vía Mexicali.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="usuario" className="block font-mono text-[11px] font-bold uppercase text-ink-700 mb-1">
                Usuario
              </label>
              <input
                id="usuario"
                name="usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                required
                autoFocus
                className="w-full rounded-sm border border-hairline-strong bg-sand-50 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine/40"
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-mono text-[11px] font-bold uppercase text-ink-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-sm border border-hairline-strong bg-sand-50 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine/40"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-sm border border-terra/40 bg-terra/10 px-3 py-2 text-xs font-medium text-terra-dark font-mono">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-sm bg-ink py-3 text-sm font-bold text-sand-100 transition-colors hover:bg-ink-700 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Verificando…" : "Entrar a la consola →"}
            </button>

            <p className="text-[11px] font-mono text-center text-ink-400 pt-1">
              Usuario: <code className="bg-sand-200 px-1 py-0.5 rounded text-ink font-bold">granvia</code> · Clave: <code className="bg-sand-200 px-1 py-0.5 rounded text-ink font-bold">granvia2026</code>
            </p>
          </form>

          <p className="mt-5 border-t border-hairline pt-4 text-center font-mono text-[10px] leading-relaxed text-ink-500">
            La sesión caduca a las 8 horas. ¿Sin acceso? Escribe a{" "}
            <a className="underline hover:text-ink" href="mailto:contact@technologyconsultants.ventures">
              contact@technologyconsultants.ventures
            </a>
          </p>
        </div>
      </div>
    </PageFade>
  );
}
