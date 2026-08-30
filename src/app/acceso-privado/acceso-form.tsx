"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccesoForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/site-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (res.ok && data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Contraseña incorrecta");
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="password" className="block font-mono text-[11px] font-bold text-ink-700 uppercase tracking-wider mb-1.5">
          Contraseña de Acceso
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoFocus
          className="w-full rounded-md border border-hairline-strong bg-white px-3 py-2 text-sm text-ink placeholder-ink-400 focus:outline-none focus:border-ink font-mono"
        />
      </div>

      {error && (
        <div className="rounded bg-alert-surface border border-alert-edge p-2.5 text-xs text-alert font-mono text-center">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-ink py-2.5 text-xs font-mono font-bold text-sand-100 transition-colors hover:bg-ink-700 cursor-pointer disabled:opacity-50"
      >
        {loading ? "Verificando..." : "Ingresar a la Plataforma →"}
      </button>

      <p className="text-[11px] font-mono text-center text-ink-400 pt-1">
        Clave sugerida de demo: <code className="bg-sand-200 px-1.5 py-0.5 rounded text-ink font-bold">granvia2026</code>
      </p>
    </form>
  );
}
