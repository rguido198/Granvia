"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInWithRole, type SignInState } from "@/lib/auth/actions";

const INITIAL: SignInState = {};

export function LoginForm() {
  const boundAction = signInWithRole.bind(null, "landlord", "/consola");
  const [state, formAction, pending] = useActionState<SignInState, FormData>(boundAction, INITIAL);

  return (
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
          defaultValue={state.email ?? ""}
          required
          autoFocus
          aria-describedby={state.error ? "login-error" : undefined}
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
          autoComplete="current-password"
          required
          aria-describedby={state.error ? "login-error" : undefined}
          className="w-full rounded-sm border border-hairline-strong bg-sand-50 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine/40"
        />
      </div>

      {state.error ? (
        <p
          id="login-error"
          role="alert"
          className="rounded-sm border border-terra/40 bg-terra/10 px-3 py-2 text-xs font-medium text-terra-dark"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full cursor-pointer rounded-sm bg-ink py-3 text-sm font-bold text-sand-100 transition-colors hover:bg-ink-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Verificando…" : "Entrar a la consola →"}
      </button>

      <p className="text-center">
        <Link href="/auth/recuperar-password" className="font-mono text-[11px] text-ink-500 underline hover:text-ink">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  );
}
