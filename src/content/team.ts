/**
 * "Tu Equipo de IA" — the guided pitch page.
 *
 * This is the presenter's script for live demos, written in plain language
 * for someone who has never used an AI tool. No jargon in the pitch copy —
 * jargon can live inside the demos themselves, once the value is already
 * obvious.
 */

export type AiEmployee = {
  key: "leasing" | "maintenance" | "finance";
  name: string;
  role: string;
  avatarInitial: string;
  accent: "terra" | "pine" | "gold";
  pitch: string;
  before: string;
  after: string;
  ctaLabel: string;
};

export const AI_TEAM: AiEmployee[] = [
  {
    key: "leasing",
    name: "Mariana",
    role: "Agente de Arrendamiento",
    avatarInitial: "M",
    accent: "terra",
    pitch:
      "Revisa cada solicitud de renta al instante y evita que dos negocios que compiten entre sí terminen en el mismo pasillo.",
    before: "Antes: revisar contratos y cláusulas a mano — a veces después de haber dicho que sí.",
    after: "Ahora: la revisión toma segundos, antes de comprometerte con nadie.",
    ctaLabel: "Ver a Mariana trabajar",
  },
  {
    key: "maintenance",
    name: "Diego",
    role: "Agente de Mantenimiento",
    avatarInitial: "D",
    accent: "pine",
    pitch:
      "Atiende a tus inquilinos cuando algo se descompone — de día, de noche, fin de semana — y manda al técnico correcto sin que tú levantes el teléfono.",
    before: "Antes: el WhatsApp personal del dueño, a cualquier hora.",
    after: "Ahora: el inquilino escribe, el Agente diagnostica y despacha.",
    ctaLabel: "Ver a Diego trabajar",
  },
  {
    key: "finance",
    name: "Renata",
    role: "Agente de Administración",
    avatarInitial: "R",
    accent: "gold",
    pitch:
      "Reparte el recibo de mantenimiento entre los locales exactamente como corresponde, según sus metros cuadrados — sin Excel, sin errores.",
    before: "Antes: horas en Excel dividiendo gastos comunes cada mes.",
    after: "Ahora: el Agente lo calcula solo, en cuanto llega el recibo.",
    ctaLabel: "Ver a Renata trabajar",
  },
];

export const TEAM_INTRO = {
  kicker: "PARA TI · LA FAMILIA DUEÑA DE LA PLAZA",
  title: "Tu equipo de IA.",
  lead: "Tres personas de tu equipo nunca duermen, nunca se les olvida nada y nunca cometen un error de cálculo. No son personas — son Agentes de IA. Conócelos uno por uno.",
} as const;

export const TEAM_TOGETHER = {
  kicker: "CUANDO TRABAJAN JUNTOS",
  title: "Esto es lo que ves tú cada mañana.",
  lead: "Mariana, Diego y Renata no trabajan solos — todo lo que hacen se junta en un solo panel para ti. Así se ve un martes cualquiera.",
} as const;
