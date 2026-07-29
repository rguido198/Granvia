import {
  FOLLOW_UPS,
  GUIDE_CONTENTS,
  GUIDE_PDF,
  PROFILE_FIELDS,
} from "@/content/leasing";
import { SITE } from "@/content/site";
import { Kicker, MonoNote } from "@/components/ui";

/** Dark title bar shared by every email mockup. */
function EmailChrome({ label, from }: { label: string; from: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-ink px-4.5 py-3 text-dune-100">
      <span className="font-mono text-[11px] tracking-[0.08em]">{label}</span>
      <span className="font-mono text-[11px] text-gold">{from}</span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-sand-50 shadow-[0_10px_30px_-18px_rgba(33,31,28,0.5)]">
      {children}
    </div>
  );
}

function GuideBranch() {
  return (
    <div className="grid gap-5">
      <Card>
        <EmailChrome
          label="EMAIL · AUTOMÁTICO · t+0 min"
          from={SITE.emails.noReply}
        />
        <div className="px-5.5 pt-5.5 pb-5">
          <p className="mb-1 text-xs text-ink-400">Para: prospecto pop-up</p>
          <p className="mb-3 font-display text-2xl font-semibold">
            Tu Guía Pop-Up de La Gran Vía 🌵
          </p>
          <p className="mb-3.5 text-sm text-ink-700">
            ¡Gracias por tu interés! Los espacios pop-up de 1 a 3 meses tienen
            todo pre-aprobado para que abras rápido. Aquí está tu guía con
            requisitos, reglas y precios estándar — sin necesidad de reunión.
          </p>

          <div className="flex items-center gap-3.5 rounded-md border border-hairline bg-sand-100 p-3.5">
            <span
              aria-hidden="true"
              className="flex h-14 w-11 flex-none items-end justify-center rounded-xs stripe-terra pb-1"
            >
              <span className="font-mono text-[8px] text-sand-100">PDF</span>
            </span>
            <span>
              <span className="block text-sm font-semibold">
                {GUIDE_PDF.filename}
              </span>
              <span className="block text-xs text-ink-400">
                {GUIDE_PDF.meta}
              </span>
            </span>
          </div>

          <p className="mt-4 inline-flex rounded-xs bg-pine px-5 py-2.75 text-[13.5px] font-semibold text-sand-100">
            Reservar mi espacio pop-up
          </p>
        </div>
      </Card>

      <div className="rounded-lg border border-hairline bg-sand-50 px-5.5 py-5">
        <MonoNote className="mb-3.5 tracking-[0.1em] uppercase">
          PDF package · contenido pre-aprobado
        </MonoNote>
        <dl className="grid grid-cols-[36px_1fr] gap-3.5 text-sm text-ink-700">
          {GUIDE_CONTENTS.map((item) => (
            <div key={item.n} className="contents">
              <dt className="font-mono text-terra">{item.n}</dt>
              <dd>
                <strong className="font-semibold">{item.title}</strong>{" "}
                {item.text}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function CallBranch() {
  return (
    <div className="grid gap-5">
      <Card>
        <EmailChrome
          label="EMAIL · AUTOMÁTICO · t+0 min"
          from={SITE.emails.leasing}
        />
        <div className="px-5.5 pt-5.5 pb-5">
          <p className="mb-1 text-xs text-ink-400">Para: prospecto largo plazo</p>
          <p className="mb-3 font-display text-2xl font-semibold">
            Hablemos de tu espacio permanente
          </p>
          <p className="mb-4 text-sm text-ink-700">
            Un contrato de largo plazo merece una conversación. Elige el horario
            que te acomode y, antes de la llamada, completa un breve perfil para
            llegar con una propuesta lista.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-xs bg-terra px-5 py-2.75 text-[13.5px] font-semibold text-sand-100">
              Agendar llamada
            </span>
            <span className="rounded-xs border border-hairline-strong px-4.5 py-2.75 text-[13.5px] font-semibold text-ink">
              Completar perfil de negocio
            </span>
          </div>
        </div>
      </Card>

      <div className="rounded-lg border border-hairline bg-sand-50 px-5.5 py-5">
        <MonoNote className="mb-3.5 tracking-[0.1em] uppercase">
          Tenant profile questionnaire · {PROFILE_FIELDS.length} campos
        </MonoNote>
        <ul className="flex flex-wrap gap-2">
          {PROFILE_FIELDS.map((field) => (
            <li
              key={field}
              className="rounded-[20px] border border-hairline bg-sand-100 px-3.5 py-1.5 text-[12.5px]"
            >
              {field}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AutomationPreview({ branch }: { branch: "guide" | "call" }) {
  return (
    <div>
      <Kicker accent="pine" className="mb-3.5 tracking-[0.2em]">
        Automated pre-onboarding flow
      </Kicker>
      <h2 className="mb-2 font-display text-[clamp(1.75rem,3.5vw,2.125rem)] leading-[1.02] font-semibold">
        Lo que sucede después de enviar
      </h2>
      <p className="mb-6 text-sm text-ink-500">
        El correo se personaliza según el giro y la duración que elegiste — sin
        que el equipo mueva un dedo.
      </p>

      {/* Screen readers get the branch change announced, not just a silent swap */}
      <div aria-live="polite">
        {branch === "guide" ? <GuideBranch /> : <CallBranch />}
      </div>

      <div className="mt-6 border-t border-hairline pt-5.5">
        <MonoNote className="mb-4 tracking-[0.12em] uppercase">
          Secuencia de seguimiento automático
        </MonoNote>
        <ul className="grid gap-3">
          {FOLLOW_UPS[branch].map((step) => (
            <li key={step.when} className="flex gap-4">
              <span className="w-21 flex-none font-mono text-[11px] text-terra">
                {step.when}
              </span>
              <span className="text-sm text-ink-700">{step.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
