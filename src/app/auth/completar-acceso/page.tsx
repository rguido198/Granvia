"use client";

import { useState, useEffect, useActionState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/auth/browser";
import { PageFade } from "@/components/ui";
import {
  resendInviteAction,
  requestPasswordResetAction,
  type ResendState,
  type PasswordResetRequestState,
} from "@/lib/auth/actions";

type Stage = "confirm" | "verifying" | "ready" | "expired";

/**
 * Where both invite links AND password-recovery links land — `type` in the
 * query string (read generically below, not hardcoded) is "invite" for one
 * and "recovery" for the other; everything else about the flow is shared.
 * The link carries a raw `token_hash` + `type` in the query string (not the
 * Supabase-hosted ConfirmationURL, and not a hash fragment) — see the
 * "Invite user" and "Reset Password" email templates in the Supabase
 * dashboard, both edited to this same shape. Loading this page does nothing
 * on its own; verifyOtp() only fires from the confirm button's click
 * handler. That's deliberate: email security scanners (Gmail, Microsoft
 * Safe Links) GET every link in an email to check it, and a page that
 * auto-verifies on load hands the one-time token to the scanner instead of
 * the user — confirmed live on this exact flow (token consumed, session
 * created, but the real click a minute later hit an already-used token).
 * Deferring verification to an explicit click means a prefetch only ever
 * loads inert HTML.
 */
export default function CompleteInvitePage() {
  const [stage, setStage] = useState<Stage>("confirm");
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [otpType, setOtpType] = useState<EmailOtpType | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = params.get("token_hash");
    const type = params.get("type") as EmailOtpType | null;
    if (!hash || !type) {
      setStage("expired");
      return;
    }
    setTokenHash(hash);
    setOtpType(type);
  }, []);

  async function acceptInvite() {
    if (!tokenHash || !otpType) return;
    setStage("verifying");
    const supabase = createSupabaseBrowserClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    setStage(verifyError ? "expired" : "ready");
  }

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

          {stage === "confirm" && (
            <button
              onClick={acceptInvite}
              className="mt-6 w-full cursor-pointer rounded-sm bg-ink py-3 text-sm font-bold text-sand-100 transition-colors hover:bg-ink-700"
            >
              {otpType === "recovery" ? "Restablecer contraseña →" : "Aceptar invitación →"}
            </button>
          )}

          {stage === "verifying" && <p className="mt-6 text-center text-sm text-ink-500">Verificando invitación…</p>}

          {stage === "ready" && (
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

          {stage === "expired" &&
            (otpType === "recovery" ? <ResendRecoveryForm /> : <ResendInviteForm />)}
        </div>
      </div>
    </PageFade>
  );
}

const RESEND_INITIAL: ResendState = {};

function ResendInviteForm() {
  const [state, formAction, pending] = useActionState<ResendState, FormData>(resendInviteAction, RESEND_INITIAL);

  if (state.done) {
    return (
      <p className="mt-4 rounded-sm border border-pine/30 bg-pine/10 px-3 py-2 text-xs font-medium text-pine">
        Si esa invitación seguía pendiente, se envió una nueva. Revisa tu correo.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p role="alert" className="rounded-sm border border-terra/40 bg-terra/10 px-3 py-2 text-xs font-medium text-terra-dark">
        Enlace inválido o vencido.
      </p>
      <form action={formAction} className="mt-3 space-y-2">
        <input
          name="email"
          type="email"
          required
          placeholder="tu correo"
          className="w-full rounded-sm border border-hairline-strong bg-sand-50 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine/40"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full cursor-pointer rounded-sm bg-ink py-2.5 text-xs font-bold text-sand-100 transition-colors hover:bg-ink-700 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Reenviar invitación"}
        </button>
      </form>
    </div>
  );
}

const RECOVERY_RESEND_INITIAL: PasswordResetRequestState = {};

function ResendRecoveryForm() {
  const [state, formAction, pending] = useActionState<PasswordResetRequestState, FormData>(
    requestPasswordResetAction,
    RECOVERY_RESEND_INITIAL,
  );

  if (state.done) {
    return (
      <p className="mt-4 rounded-sm border border-pine/30 bg-pine/10 px-3 py-2 text-xs font-medium text-pine">
        Si esa cuenta existe, te enviamos un nuevo enlace. Revisa tu correo.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p role="alert" className="rounded-sm border border-terra/40 bg-terra/10 px-3 py-2 text-xs font-medium text-terra-dark">
        Enlace inválido o vencido.
      </p>
      <form action={formAction} className="mt-3 space-y-2">
        <input
          name="email"
          type="email"
          required
          placeholder="tu correo"
          className="w-full rounded-sm border border-hairline-strong bg-sand-50 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine/40"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full cursor-pointer rounded-sm bg-ink py-2.5 text-xs font-bold text-sand-100 transition-colors hover:bg-ink-700 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Reenviar enlace"}
        </button>
      </form>
    </div>
  );
}
