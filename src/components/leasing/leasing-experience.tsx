"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  BUSINESS_CATEGORIES,
  LEASE_OPTIONS,
  type BusinessCategory,
  type LeaseKey,
} from "@/content/leasing";
import { submitLeasingInquiry } from "@/app/crece-tu-negocio/actions";
import { initialLeasingState } from "@/lib/leasing-form";
import { SITE } from "@/content/site";
import { cn } from "@/components/ui";
import type { FieldErrors } from "@/lib/leads";

const FIELD =
  "w-full rounded-xs border border-hairline-strong bg-sand-50 px-3.5 py-2.75 text-sm text-ink placeholder:text-ink-400 focus:border-terra focus:outline-none transition-all";
const LABEL = "mb-1.5 block text-xs font-semibold tracking-[0.02em] text-ink";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-terra-dark font-medium">
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
      className="w-full cursor-pointer rounded-xs border border-terra bg-terra px-6 py-3.75 text-[15px] font-semibold text-sand-100 transition-colors hover:border-terra-dark hover:bg-terra-dark disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
    >
      {pending ? "Enviando solicitud…" : "Enviar solicitud comercial →"}
    </button>
  );
}

export function LeasingExperience() {
  const [leaseType, setLeaseType] = useState<LeaseKey>("short");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [giro, setGiro] = useState<BusinessCategory>(BUSINESS_CATEGORIES[0]);
  const [metros, setMetros] = useState("");
  const [state, formAction] = useActionState(
    submitLeasingInquiry,
    initialLeasingState
  );
  const uid = useId();
  const errors: FieldErrors = state.errors ?? {};

  const field = (name: string) => `${uid}-${name}`;
  const errId = (name: string) => `${uid}-${name}-error`;
  const describedBy = (name: keyof FieldErrors) =>
    errors[name] ? errId(name) : undefined;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1fr_0.9fr]">
      {/* ------------------------------- Form ------------------------------- */}
      <div className="rounded-xl border border-hairline bg-sand-100 p-6 sm:p-8 shadow-xs">
        <div className="mb-6 pb-4 border-b border-hairline">
          <span className="font-mono text-[10.5px] font-bold text-terra uppercase tracking-wider block mb-1">
            ARRENDAMIENTO COMERCIAL
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink leading-tight">
            Solicitud de Espacio Comercial
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-ink-500">
            Completa la información de tu concepto para consultar disponibilidad de locales, planos y fichas técnicas.
          </p>
        </div>

        {state.status === "success" ? (
          <div className="rounded-lg border border-pine bg-pine/10 p-6 space-y-3">
            <h3 className="font-display text-xl font-semibold text-pine">
              ¡Solicitud enviada con éxito!
            </h3>
            <p className="text-sm text-ink-700 leading-relaxed">
              Gracias por tu interés en formar parte de La Gran Vía Mexicali. Nuestro equipo comercial revisará tu solicitud y se pondrá en contacto contigo a la brevedad para compartirte la Ficha Técnica de Arrendamiento y las opciones disponibles.
            </p>
            <p className="text-xs text-ink-400 font-mono pt-2 border-t border-pine/20">
              También enviamos un correo de confirmación a tu bandeja de entrada.
            </p>
          </div>
        ) : (
          <form action={formAction} noValidate className="space-y-4">
            {state.status === "error" && state.message && (
              <p
                role="alert"
                className="rounded-xs border border-terra/40 bg-terra/8 px-3.5 py-2.5 text-[13px] text-terra-dark font-medium"
              >
                {state.message}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor={field("nombre")}>
                  Nombre Completo
                </label>
                <input
                  id={field("nombre")}
                  name="nombre"
                  autoComplete="name"
                  placeholder="Tu nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  aria-invalid={!!errors.nombre}
                  aria-describedby={describedBy("nombre")}
                  className={FIELD}
                />
                <FieldError id={errId("nombre")} message={errors.nombre} />
              </div>

              <div>
                <label className={LABEL} htmlFor={field("telefono")}>
                  Teléfono de Contacto
                </label>
                <input
                  id={field("telefono")}
                  name="telefono"
                  type="tel"
                  autoComplete="tel"
                  placeholder="686 000 0000"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  aria-invalid={!!errors.telefono}
                  aria-describedby={describedBy("telefono")}
                  className={FIELD}
                />
                <FieldError id={errId("telefono")} message={errors.telefono} />
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor={field("correo")}>
                Correo Electrónico
              </label>
              <input
                id={field("correo")}
                name="correo"
                type="email"
                autoComplete="email"
                placeholder="tu@negocio.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                aria-invalid={!!errors.correo}
                aria-describedby={describedBy("correo")}
                className={FIELD}
              />
              <FieldError id={errId("correo")} message={errors.correo} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor={field("giro")}>
                  Giro del Negocio
                </label>
                <select
                  id={field("giro")}
                  name="giro"
                  value={giro}
                  onChange={(e) => setGiro(e.target.value as BusinessCategory)}
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
                  Superficie Aproximada (m²)
                </label>
                <input
                  id={field("metros")}
                  name="metros"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="ej. 80"
                  value={metros}
                  onChange={(e) => setMetros(e.target.value)}
                  aria-invalid={!!errors.metros}
                  aria-describedby={describedBy("metros")}
                  className={FIELD}
                />
                <FieldError id={errId("metros")} message={errors.metros} />
              </div>
            </div>

            <fieldset className="pt-2">
              <legend className={LABEL}>Vigencia Preferida del Contrato</legend>
              <input type="hidden" name="duracion" value={leaseType} />
              <div className="grid gap-2.5 sm:grid-cols-3">
                {LEASE_OPTIONS.map((option) => {
                  const active = option.key === leaseType;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setLeaseType(option.key)}
                      aria-pressed={active}
                      className={cn(
                        "cursor-pointer rounded-xs border px-3 py-2.5 text-center text-xs font-semibold transition-colors",
                        active
                          ? "border-terra bg-terra text-sand-100 shadow-2xs"
                          : "border-hairline-strong bg-sand-50 text-ink hover:border-ink-400"
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <FieldError id={errId("duracion")} message={errors.duracion} />
            </fieldset>

            {/* Honeypot field */}
            <div aria-hidden="true" className="absolute left-[-9999px]">
              <label htmlFor={field("empresa-web")}>No llenar</label>
              <input
                id={field("empresa-web")}
                name="empresa-web"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="pt-2">
              <SubmitButton />
            </div>
            <p className="text-center text-xs text-ink-400">
              Tus datos están protegidos y solo se utilizarán para la gestión de arrendamiento comercial.
            </p>
          </form>
        )}
      </div>

      {/* --------------------------- Commercial Highlights & Modalities --------------------------- */}
      <div className="space-y-6">
        {/* Why La Gran Via Card */}
        <div className="rounded-xl border border-hairline bg-sand-100 p-6 sm:p-7 space-y-4">
          <span className="font-mono text-[10.5px] font-bold text-pine uppercase tracking-wider block">
            VENTAJAS COMERCIALES
          </span>
          <h3 className="font-display text-xl font-bold text-ink leading-tight">
            ¿Por qué posicionar tu marca en La Gran Vía?
          </h3>
          <ul className="space-y-3 text-xs sm:text-sm text-ink-600">
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-terra text-sm">✓</span>
              <span><strong>Ubicación de Alta Plusvalía:</strong> Situado sobre Calzada CETYS, el corredor financiero y residencial más exclusivo de Mexicali.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-terra text-sm">✓</span>
              <span><strong>Afluencia & Tráfico Cautivo:</strong> Flujo constante de ejecutivos, familias y visitantes durante toda la semana.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-terra text-sm">✓</span>
              <span><strong>Mezcla Comercial Consolidada:</strong> Más de 84 negocios activos como Cinemex, IHOP, Bodega 8, Alma Verde, Wendlandt y Fairfield Hotel.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-terra text-sm">✓</span>
              <span><strong>Infraestructura de Nivel Corporativo:</strong> Seguridad 24/7, estacionamiento con valet parking, subestación propia y mantenimiento continuo.</span>
            </li>
          </ul>
        </div>

        {/* Available Space Modalities Card */}
        <div className="rounded-xl border border-hairline bg-sand-100 p-6 sm:p-7 space-y-4">
          <span className="font-mono text-[10.5px] font-bold text-terra uppercase tracking-wider block">
            MODALIDADES DE ESPACIO
          </span>
          <h3 className="font-display text-xl font-bold text-ink leading-tight">
            Formatos disponibles para tu concepto
          </h3>

          <div className="space-y-3 font-sans text-xs sm:text-sm">
            <div className="p-3.5 rounded-lg border border-hairline bg-sand-50 space-y-1">
              <div className="flex items-center justify-between font-bold text-ink">
                <span>Locales Comerciales (Planta Baja)</span>
                <span className="font-mono text-xs text-terra">50 m² a 350 m²</span>
              </div>
              <p className="text-ink-500 text-xs">
                Espacios de gran altura y fachada exterior sobre los andadores principales para retail, gastronomía y tiendas ancla.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-hairline bg-sand-50 space-y-1">
              <div className="flex items-center justify-between font-bold text-ink">
                <span>Suites de Salud & Servicios (2do Piso)</span>
                <span className="font-mono text-xs text-amber-800">30 m² a 150 m²</span>
              </div>
              <p className="text-ink-500 text-xs">
                Módulos ejecutivos en Planta Alta diseñados para clínicas especializadas, boutiques de belleza, consultorios y despachos.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-hairline bg-sand-50 space-y-1">
              <div className="flex items-center justify-between font-bold text-ink">
                <span>Kioscos e Islas (Pasillo Interior)</span>
                <span className="font-mono text-xs text-pine">10 m² a 25 m²</span>
              </div>
              <p className="text-ink-500 text-xs">
                Módulos de alta visibilidad en corredores interiores de alto tráfico peatonal para marcas de conveniencia y productos boutique.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info Footer */}
        <div className="rounded-xl border border-hairline bg-sand-50 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-ink-500">
          <div>
            <span className="font-bold text-ink block">Oficina de Comercialización</span>
            <span>Calzada CETYS 2901, Mexicali, B.C.</span>
          </div>
          <a
            href={`mailto:${SITE.emails.leasing}`}
            className="text-terra font-bold hover:underline"
          >
            {SITE.emails.leasing}
          </a>
        </div>
      </div>
    </div>
  );
}
