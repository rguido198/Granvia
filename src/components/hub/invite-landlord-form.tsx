"use client";

import { useActionState, useState } from "react";
import { inviteUserAction, type InviteState } from "@/lib/auth/actions";

const INITIAL: InviteState = {};

export function InviteLandlordForm() {
  const [open, setOpen] = useState(false);
  const boundAction = inviteUserAction.bind(null, "landlord");
  const [state, formAction, pending] = useActionState<InviteState, FormData>(boundAction, INITIAL);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-[var(--console-accent)] hover:bg-[var(--console-accent-dark)] text-white font-bold px-5 py-3 rounded-xl text-sm transition-all cursor-pointer shadow-xs shrink-0"
      >
        Invitar Usuario / Asignar Perfil
      </button>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 w-full sm:max-w-md">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nombre completo</label>
          <input
            name="full_name"
            type="text"
            placeholder="Nombre del usuario"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Correo</label>
          <input
            name="email"
            type="email"
            required
            placeholder="usuario@lagranvia.com.mx"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      {state.error && <p className="text-[11px] text-red-600">{state.error}</p>}
      {state.success && <p className="text-[11px] text-emerald-700 font-semibold">{state.success}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-[var(--console-accent)] hover:bg-[var(--console-accent-dark)] text-white font-bold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Enviar Invitación"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-slate-600 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-slate-100"
        >
          Cerrar
        </button>
      </div>
    </form>
  );
}
