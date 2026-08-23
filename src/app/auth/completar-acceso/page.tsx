"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/auth/browser";
import { PageFade } from "@/components/ui";

/**
 * Where every invite email's link lands. inviteUserByEmail's link carries
 * the session in a URL hash fragment (#access_token=...) — createBrowserClient
 * auto-detects and exchanges it on load, which is why this page must be a
 * client component; a server component never sees the fragment at all (it's
 * stripped before the request reaches the server).
 */
export default function CompleteInvitePage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
      if (!data.session) setError("Enlace inválido o vencido. Solicita una nueva invitación.");
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id).single();

    setDone(profile?.role === "landlord" ? "/consola" : "/inquilinos");
  }

  if (done) {
    window.location.href = done;
    return null;
  }

  return (
    <PageFade>
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
        <div className="w-full rounded-lg border border-hairline-strong bg-sand-100 p-6 sm:p-8 shadow-lg">
          <h1 className="text-center font-display text-2xl font-bold text-ink">Crea tu contraseña</h1>
          <p className="mt-2 text-center text-xs text-ink-500">Un solo paso más para entrar.</p>

          {!ready && !error && <p className="mt-6 text-center text-sm text-ink-500">Verificando invitación…</p>}

          {ready && (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="password" className="block font-mono text-[11px] font-bold uppercase text-ink-700 mb-1">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  autoFocus
                  className="w-full rounded-sm border border-hairline-strong bg-sand-50 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine/40"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full cursor-pointer rounded-sm bg-ink py-3 text-sm font-bold text-sand-100 transition-colors hover:bg-ink-700 disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? "Guardando…" : "Guardar y entrar →"}
              </button>
            </form>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-sm border border-terra/40 bg-terra/10 px-3 py-2 text-xs font-medium text-terra-dark">
              {error}
            </p>
          )}
        </div>
      </div>
    </PageFade>
  );
}
