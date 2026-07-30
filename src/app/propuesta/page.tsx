import type { Metadata } from "next";
import { PitchDeck } from "@/components/pitch/pitch-deck";

export const metadata: Metadata = {
  title: "Propuesta: Tu Nuevo Equipo",
  description: "Una propuesta para La Gran Vía — tres Agentes de IA, no un rediseño del sitio.",
  robots: { index: false, follow: false },
};

export default function PropuestaPage() {
  return <PitchDeck />;
}
