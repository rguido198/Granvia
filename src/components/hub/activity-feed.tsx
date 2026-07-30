"use client";

import { useEffect, useRef, useState } from "react";
import { AI_ACTIVITY_POOL, type ActivityEntry } from "@/content/hub";
import { cn } from "@/components/ui";

type FeedItem = ActivityEntry & { id: number; time: string };

const ACCENT_DOT = {
  terra: "bg-terra",
  pine: "bg-pine",
  gold: "bg-gold",
} as const;

function timeLabel(secondsAgo: number) {
  if (secondsAgo < 60) return "justo ahora";
  const min = Math.floor(secondsAgo / 60);
  return `hace ${min} min`;
}

/** Seeds the feed with the first few pool entries, staggered as if just logged. */
function seed(): FeedItem[] {
  return AI_ACTIVITY_POOL.slice(0, 4).map((entry, i) => ({
    ...entry,
    id: i,
    time: timeLabel(i * 240),
  }));
}

export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>(seed);
  const nextId = useRef(4);

  useEffect(() => {
    const interval = setInterval(() => {
      const id = nextId.current++;
      const next = AI_ACTIVITY_POOL[id % AI_ACTIVITY_POOL.length];
      const entry: FeedItem = { ...next, id, time: "justo ahora" };
      setItems((prev) => [entry, ...prev].slice(0, 6));
    }, 6500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-lg border border-hairline bg-sand-50 p-4 sm:p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink sm:text-lg">
          Actividad de Agentes en Tiempo Real
        </h3>
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-pine uppercase">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pine" />
          En vivo
        </span>
      </div>

      <ul className="space-y-2.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="animate-fadeIn flex items-start gap-2.5 rounded-md border border-hairline bg-sand-100 px-3 py-2.5 text-xs"
          >
            <span
              className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", ACCENT_DOT[item.accent])}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="font-semibold text-ink">{item.agent}</span>
                <span className="font-mono text-[10px] text-ink-400">{item.time}</span>
              </div>
              <p className="mt-0.5 text-ink-600">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
