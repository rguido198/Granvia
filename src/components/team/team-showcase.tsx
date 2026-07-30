"use client";

import { useState } from "react";
import { AI_TEAM, TEAM_TOGETHER, type AiEmployee } from "@/content/team";
import { LEASING_SCENARIOS } from "@/content/leasing";
import { AiScreeningPanel } from "@/components/leasing/ai-screening";
import { AcTicketSimulator } from "@/components/hub/ac-ticket-chat";
import { CamAllocation } from "@/components/hub/cam-allocation";
import { ActivityFeed } from "@/components/hub/activity-feed";
import { ChurnRadar } from "@/components/hub/churn-radar";
import { Kicker, SectionTitle, accentBg, accentText, cn } from "@/components/ui";

function AgentAvatar({ employee }: { employee: AiEmployee }) {
  return (
    <span
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-2xl font-bold text-sand-100",
        accentBg(employee.accent),
      )}
      aria-hidden="true"
    >
      {employee.avatarInitial}
    </span>
  );
}

function AgentCard({ employee, children }: { employee: AiEmployee; children: React.ReactNode }) {
  return (
    <article className="flex flex-col rounded-xl border border-hairline-strong bg-sand-50 p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <AgentAvatar employee={employee} />
        <div className="min-w-0">
          <p className={cn("font-mono text-[10.5px] tracking-[0.16em] uppercase", accentText(employee.accent))}>
            {employee.role}
          </p>
          <h3 className="font-display text-2xl font-semibold text-ink">{employee.name}</h3>
        </div>
      </div>

      <p className="mt-4 text-[15px] leading-relaxed text-ink-700">{employee.pitch}</p>

      <div className="mt-4 space-y-1.5 rounded-md border border-hairline bg-sand-100 p-3.5 text-[13px]">
        <p className="text-ink-400">{employee.before}</p>
        <p className="font-semibold text-ink">{employee.after}</p>
      </div>

      <div className="mt-5">{children}</div>
    </article>
  );
}

function scenarioButtonClass(accent: AiEmployee["accent"]) {
  return cn(
    "flex-1 cursor-pointer rounded-xs border px-3.5 py-3 text-left text-[13px] font-semibold transition-colors border-hairline-strong bg-sand-100 text-ink hover:border-current",
    accentText(accent),
  );
}

function MarianaDemo({ employee }: { employee: AiEmployee }) {
  const [scenario, setScenario] = useState<(typeof LEASING_SCENARIOS)[number] | null>(null);
  const [trigger, setTrigger] = useState(0);

  const pick = (s: (typeof LEASING_SCENARIOS)[number]) => {
    setScenario(s);
    setTrigger((n) => n + 1);
  };

  return (
    <div>
      <p className="mb-2.5 text-[12.5px] font-semibold text-ink-500">
        Elige quién le está pidiendo un local a {employee.name}:
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {LEASING_SCENARIOS.map((s) => (
          <button key={s.key} type="button" onClick={() => pick(s)} className={scenarioButtonClass(employee.accent)}>
            <span className="block text-ink">{s.label}</span>
            <span className="mt-0.5 block text-[11px] font-normal text-ink-400">{s.sublabel}</span>
          </button>
        ))}
      </div>
      {scenario && (
        <div className="mt-4">
          <AiScreeningPanel
            giro={scenario.giro}
            metros={scenario.metros}
            duracion={scenario.duracion}
            trigger={trigger}
          />
        </div>
      )}
    </div>
  );
}

function RenataDemo({ employee }: { employee: AiEmployee }) {
  const [revealed, setRevealed] = useState(false);
  if (revealed) return <CamAllocation />;
  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className={cn(
        "w-full cursor-pointer rounded-xs px-5 py-3 text-[13.5px] font-semibold text-sand-100 transition-opacity hover:opacity-90",
        accentBg(employee.accent),
      )}
    >
      {employee.ctaLabel} →
    </button>
  );
}

export function TeamShowcase() {
  return (
    <div className="space-y-14">
      <div className="grid gap-6 lg:grid-cols-3">
        {AI_TEAM.map((employee) => (
          <AgentCard key={employee.key} employee={employee}>
            {employee.key === "leasing" && <MarianaDemo employee={employee} />}
            {employee.key === "maintenance" && (
              <AcTicketSimulator triggerLabel={`${employee.ctaLabel} →`} />
            )}
            {employee.key === "finance" && <RenataDemo employee={employee} />}
          </AgentCard>
        ))}
      </div>

      <section aria-labelledby="together-titulo">
        <div className="mx-auto mb-8 max-w-[620px] text-center">
          <Kicker accent="pine" className="mb-3.5 tracking-[0.22em]">
            {TEAM_TOGETHER.kicker}
          </Kicker>
          <SectionTitle id="together-titulo" className="mb-3.5 text-[clamp(1.75rem,4vw,2.5rem)]!">
            {TEAM_TOGETHER.title}
          </SectionTitle>
          <p className="text-[15px] text-ink-500">{TEAM_TOGETHER.lead}</p>
        </div>

        <div className="space-y-5">
          <ActivityFeed />
          <ChurnRadar />
        </div>
      </section>
    </div>
  );
}
