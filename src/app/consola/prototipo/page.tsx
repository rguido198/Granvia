import type { Metadata } from "next";
import { ConsolePrototype } from "@/components/hub/console-prototype";
import { buildConsoleData } from "@/lib/console-data.server";

/**
 * Dark-console prototype, for evaluating the direction against real data.
 *
 * Sits under /consola so the same middleware session check applies — it renders
 * the full rent roll and must not be reachable without a session.
 *
 * It draws itself fixed over the marketing header and footer. Shipping this for
 * real means splitting the root layout into (site) and (console) route groups so
 * the console gets its own chrome-less shell, rather than covering the chrome.
 */
export const dynamic = "force-dynamic";
export const runtime = "edge";

export const metadata: Metadata = {
  title: "Prototipo de Consola | La Gran Vía Mexicali",
  description: "Prototipo de superficie oscura para la consola de asset management.",
  robots: { index: false, follow: false },
};

export default function ConsolePrototypePage() {
  return <ConsolePrototype data={buildConsoleData()} />;
}
