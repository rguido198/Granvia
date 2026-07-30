import type { Metadata } from "next";
import { SITE } from "@/content/site";
import { Container, PageFade } from "@/components/ui";
import { LandlordDashboard } from "@/components/hub/landlord-dashboard";
import { AiAgentModule } from "@/components/hub/ai-agent-module";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Control Operativo & Asset Management",
  description:
    "Consola de administración y control operativo para propietarios y arrendatarios de La Gran Vía Mexicali.",
  robots: { index: false, follow: false },
};

export default function TenantHubPage() {
  return (
    <PageFade>
      <div className="min-h-[calc(100vh-74px)] bg-sand-200 py-6 sm:py-14">
        <Container className="max-w-[1180px]! px-3.5 sm:px-6">
          {/* Executive Operational Portal Header */}
          <div className="mx-auto mb-5 sm:mb-8 max-w-[700px] text-center">
            <p className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-pine/30 bg-sand-100 px-3 py-1 font-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.08em] text-pine uppercase">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-pine animate-pulse"
              />
              inquilinos.lagranvia.com.mx
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-4xl md:text-5xl leading-tight">
              Control Operativo & Asset Management
            </h1>
            <p className="mt-2 text-xs sm:text-base text-ink-500">
              Plataforma centralizada de administración para La Gran Vía. Monitoreo de indicadores comerciales, cobranza, afluencia e integración con Agentes de IA.
            </p>
          </div>

          {/* AI AGENT MODULE SHOWCASE */}
          <AiAgentModule />

          {/* MAIN COMPONENT: Landlord Control Panel */}
          <LandlordDashboard />

          <p className="mt-10 text-center text-[13px] text-ink-400">
            ¿Problemas de acceso? Contacta a la Administración de Plaza en{" "}
            <span dangerouslySetInnerHTML={{ __html: "<!--email_off-->" }} />
            <a
              href={`mailto:${SITE.emails.support}`}
              className="font-medium text-terra hover:underline"
            >
              {SITE.emails.support}
            </a>
            <span dangerouslySetInnerHTML={{ __html: "<!--/email_off-->" }} />
          </p>
        </Container>
      </div>
    </PageFade>
  );
}
