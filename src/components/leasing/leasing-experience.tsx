"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  BUSINESS_CATEGORIES,
  LEASE_OPTIONS,
  branchFor,
  type LeaseKey,
} from "@/content/leasing";
import { SITE } from "@/content/site";
import { submitLeasingInquiry } from "@/app/crece-tu-negocio/actions";
import { initialLeasingState } from "@/lib/leasing-form";
import { AutomationPreview } from "@/components/leasing/automation-preview";
import { MonoNote, cn } from "@/components/ui";
import type { FieldErrors } from "@/lib/leads";

const FIELD =
  "w-full rounded-xs border border-hairline-strong bg-sand-50 px-3.5 py-2.75 text-sm text-ink placeholder:text-ink-400 focus:border-terra";
const LABEL = "mb-1.5 block text-xs font-semibold tracking-[0.02em]";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-terra-dark">
      {message}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full cursor-pointer rounded-xs border border-terra bg-terra px-6 py-3.75 text-[15px] font-semibold text-sand-100 transition-colors hover:border-terra-dark hover:bg-terra-dark disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enviando…" : "Enviar solicitud →"}
    </button>
  );
}

export function LeasingExperience() {
  const [leaseType, setLeaseType] = useState<LeaseKey>("short");
  const [state, formAction] = useActionState(
    submitLeasingInquiry,
    initialLeasingState,
  );
  const uid = useId();
  const errors: FieldErrors = state.errors ?? {};

  const field = (name: string) => `${uid}-${name}`;
  const errId = (name: string) => `${uid}-${name}-error`;
  const describedBy = (name: keyof FieldErrors) =>
    errors[name] ? errId(name) : undefined;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[0.92fr_1.08fr]">
      {/* ------------------------------- Form ------------------------------- */}
      <div className="rounded-lg border border-hairline bg-sand-50 p-6 sm:p-8">
        <h2 className="mb-2 font-display text-2xl font-semibold">
          Solicitud de Espacio Comercial
        </h2>
        <p className="mb-6 text-sm text-ink-500">
          Completa tus datos y giro comercial para recibir la Ficha Técnica y disponibilidad.
        </p>

        {state.status === "success" ? (
          <div className="rounded-md border border-pine bg-pine/10 p-6">
            <h3 className="mb-2 font-display text-xl font-semibold text-pine">
              ¡Solicitud recibida!
            </h3>
            <p className="text-sm text-ink-700">
              Revisa tu correo: te enviamos la Ficha Técnica de Arrendamiento en PDF y el enlace para agendar llamada con nuestro equipo comercial.
            </p>
            <p className="mt-3 text-xs text-ink-400">
              Si no lo ves en tu bandeja de entrada en 2 minutos, revisa tu carpeta de spam.
            </p>
          </div>
        ) : (
          <form action={formAction} noValidate>
            {state.status === "error" && state.message && (
              <p
                role="alert"
                className="mb-4 rounded-xs border border-terra/40 bg-terra/8 px-3.5 py-2.5 text-[13px] text-terra-dark"
              >
                {state.message}
              </p>
            )}

            <div className="mb-4 grid gap-3.5 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor={field("nombre")}>
                  Nombre
                </label>
                <input
                  id={field("nombre")}
                  name="nombre"
                  autoComplete="name"
                  placeholder="Tu nombre"
                  aria-invalid={!!errors.nombre}
                  aria-describedby={describedBy("nombre")}
                  className={FIELD}
                />
                <FieldError id={errId("nombre")} message={errors.nombre} />
              </div>
              <div>
                <label className={LABEL} htmlFor={field("telefono")}>
                  Teléfono
                </label>
                <input
                  id={field("telefono")}
                  name="telefono"
                  type="tel"
                  autoComplete="tel"
                  placeholder="686 000 0000"
                  aria-invalid={!!errors.telefono}
                  aria-describedby={describedBy("telefono")}
                  className={FIELD}
                />
                <FieldError id={errId("telefono")} message={errors.telefono} />
              </div>
            </div>

            <div className="mb-4">
              <label className={LABEL} htmlFor={field("correo")}>
                Correo
              </label>
              <input
                id={field("correo")}
                name="correo"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                aria-invalid={!!errors.correo}
                aria-describedby={describedBy("correo")}
                className={FIELD}
              />
              <FieldError id={errId("correo")} message={errors.correo} />
            </div>

            <div className="mb-5 grid gap-3.5 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor={field("giro")}>
                  Giro del negocio
                </label>
                <select
                  id={field("giro")}
                  name="giro"
                  defaultValue={BUSINESS_CATEGORIES[0]}
                  aria-invalid={!!errors.giro}
                  aria-describedby={describedBy("giro")}
                  className={FIELD}
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <FieldError id={errId("giro")} message={errors.giro} />
              </div>
              <div>
                <label className={LABEL} htmlFor={field("metros")}>
                  m² requeridos
                </label>
                <input
                  id={field("metros")}
                  name="metros"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="ej. 60"
                  aria-invalid={!!errors.metros}
                  aria-describedby={describedBy("metros")}
                  className={FIELD}
                />
                <FieldError id={errId("metros")} message={errors.metros} />
              </div>
            </div>

            {/* Lease duration doubles as the branch selector for the preview */}
            <fieldset className="mb-6">
              <legend className={LABEL}>Duración del arrendamiento</legend>
              <input type="hidden" name="duracion" value={leaseType} />
              <div className="grid gap-2.5 sm:grid-cols-2">
                {LEASE_OPTIONS.map((option) => {
                  const active = option.key === leaseType;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setLeaseType(option.key)}
                      aria-pressed={active}
                      className={cn(
                        "cursor-pointer rounded-xs border px-3.5 py-3 text-left text-[13px] font-semibold transition-colors",
                        active
                          ? "border-terra bg-terra text-sand-100"
                          : "border-hairline-strong bg-sand-50 text-ink hover:border-ink-400",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <FieldError id={errId("duracion")} message={errors.duracion} />
            </fieldset>

            {/* Honeypot — hidden from people, irresistible to bots */}
            <div aria-hidden="true" className="absolute left-[-9999px]">
              <label htmlFor={field("empresa-web")}>No llenar</label>
              <input
                id={field("empresa-web")}
                name="empresa-web"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <SubmitButton />
            <p className="mt-3 text-center text-xs text-ink-400">
              Recibirás una respuesta automática al instante.
            </p>
          </form>
        )}
      </div>

      {/* --------------------------- Live preview --------------------------- */}
      <AutomationPreview branch={branchFor(leaseType)} />
    </div>
  );
}
