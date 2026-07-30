"use client";

import { useEffect, useRef, useState } from "react";
import { AC_TICKET_SCRIPT } from "@/content/hub";
import { cn } from "@/components/ui";

const BEAT_MS = 900;
const CHAR_MS = 28;

function ChatBubble({ role, text }: { role: "ai" | "tenant"; text: string }) {
  const isAi = role === "ai";
  return (
    <div className={cn("flex", isAi ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed",
          isAi
            ? "border border-hairline bg-sand-50 text-ink-700"
            : "bg-terra text-sand-100",
        )}
      >
        {text}
      </div>
    </div>
  );
}

function TypingBubble({ role }: { role: "ai" | "tenant" }) {
  const isAi = role === "ai";
  return (
    <div className={cn("flex", isAi ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "flex gap-1 rounded-lg px-3.5 py-3",
          isAi ? "border border-hairline bg-sand-50" : "bg-terra",
        )}
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className={cn(
              "h-1.5 w-1.5 animate-bounce rounded-full",
              isAi ? "bg-ink-400" : "bg-sand-100/80",
            )}
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function AcTicketSimulator({
  triggerLabel = "Simular Ticket: Falla de Aire Acondicionado →",
}: {
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [typingRole, setTypingRole] = useState<"ai" | "tenant" | null>(null);
  const [partial, setPartial] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisibleCount(0);
    setTypingRole(null);
    setPartial("");

    let cumulative = 0;
    AC_TICKET_SCRIPT.forEach((msg, i) => {
      cumulative += BEAT_MS;
      timers.current.push(setTimeout(() => setTypingRole(msg.role), cumulative));

      if (msg.role === "tenant") {
        for (let c = 1; c <= msg.text.length; c++) {
          timers.current.push(
            setTimeout(() => setPartial(msg.text.slice(0, c)), cumulative + c * CHAR_MS),
          );
        }
        cumulative += msg.text.length * CHAR_MS + 300;
      } else {
        cumulative += 700;
      }

      timers.current.push(
        setTimeout(() => {
          setTypingRole(null);
          setPartial("");
          setVisibleCount(i + 1);
        }, cumulative),
      );
    });

    return () => timers.current.forEach(clearTimeout);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount, typingRole, partial]);

  const done = visibleCount === AC_TICKET_SCRIPT.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full cursor-pointer rounded bg-terra py-2 text-xs font-bold text-sand-100 transition-colors hover:bg-terra/90"
      >
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="flex h-[82vh] w-full flex-col overflow-hidden rounded-t-xl border border-hairline bg-sand-100 shadow-2xl sm:h-[560px] sm:max-w-md sm:rounded-xl">
            <div className="flex items-center justify-between border-b border-hairline bg-sand-200 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-terra text-sm text-sand-100"
                >
                  🛠️
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Diego · Agente de Mantenimiento</p>
                  <p className="text-[11px] text-ink-400">Diagnóstico de Aire Acondicionado</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer text-sm text-ink-400 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {AC_TICKET_SCRIPT.slice(0, visibleCount).map((msg, i) => (
                <ChatBubble key={i} role={msg.role} text={msg.text} />
              ))}

              {typingRole &&
                (typingRole === "tenant" && partial ? (
                  <ChatBubble role="tenant" text={partial} />
                ) : (
                  <TypingBubble role={typingRole} />
                ))}
            </div>

            {done && (
              <div className="animate-fadeIn border-t border-hairline bg-pine/10 p-3.5 text-center">
                <span className="text-xs font-semibold text-pine">
                  ✓ Climas de Mexicali despachado — hoy 3:00 PM · Ticket #INC-404
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
