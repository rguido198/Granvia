"use client";

import { useActionState } from "react";
import { PageFade } from "@/components/ui";
import { requestPasswordResetAction, type PasswordResetRequestState } from "@/lib/auth/actions";

const INITIAL: PasswordResetRequestState = {};

/**
 * Shared by both roles — recovery doesn't need to know landlord vs tenant
 * up front, completar-acceso looks up the profile's role after verifyOtp
 * and redirects accordingly, same as the invite flow.
 */
export default function RecuperarPasswordPage() {
  const [state, formAction, pending] = useActionState<PasswordResetRequestState, FormData>(
    requestPasswordResetAction,
    INITIAL,
  );

  return (
    <PageFade>
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
        <div className="w-full rounded-lg border border-hairline-strong bg-sand-100 p-6 sm:p-8 shadow-lg">
          <h1 className="text-center font-display text-2xl font-bold text-ink">Recuperar contraseña</h1>
          <p className="mt-2 text-center text-xs leading-relaxed text-ink-500">
            Escribe tu correo y te enviaremos un enlace para restablecerla.
          </p>

          {state.done ? (
            <p className="mt-6 rounded-sm border border-pine/30 bg-pine/10 px-3 py-2 text-center text-xs font-medium text-pine">
              Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña. Revisa tu
              bandeja de entrada.
            </p>
          ) : (
            <form action={formAction} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block font-mono text-[11px] font-bold uppercase text-ink-700 mb-1">
                  Correo
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  autoFocus
                  className="w-full rounded-sm border border-hairline-strong bg-sand-50 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine/40"
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full cursor-pointer rounded-sm bg-ink py-3 text-sm font-bold text-sand-100 transition-colors hover:bg-ink-700 disabled:cursor-wait disabled:opacity-60"
              >
                {pending ? "Enviando…" : "Enviar enlace →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </PageFade>
  );
}
