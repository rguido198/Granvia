import {
  BUSINESS_CATEGORIES,
  LEASE_KEYS,
  branchFor,
  type LeaseKey,
} from "@/content/leasing";

export type LeasingLead = {
  nombre: string;
  telefono: string;
  correo: string;
  giro: string;
  metros: number;
  duracion: LeaseKey;
  /** Which automation this lead should enter. Derived, never user-supplied. */
  branch: "guide" | "call";
  receivedAt: string;
};

/** Field-keyed error messages, ready to render inline next to each input. */
export type FieldErrors = Partial<
  Record<"nombre" | "telefono" | "correo" | "giro" | "metros" | "duracion", string>
>;

// Deliberately permissive: enough to catch typos, not so strict it rejects
// real addresses. Real deliverability is confirmed by the auto-reply landing.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Mexican numbers are 10 digits; tolerate spaces, dashes, parens and +52. */
function digitsOf(value: string) {
  return value.replace(/[\s\-().]/g, "").replace(/^\+?52/, "");
}

export function validateLead(
  formData: FormData,
): { ok: true; lead: LeasingLead } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim();
  const giro = String(formData.get("giro") ?? "").trim();
  const metrosRaw = String(formData.get("metros") ?? "").trim();
  const duracion = String(formData.get("duracion") ?? "").trim();

  if (nombre.length < 2) {
    errors.nombre = "Escribe tu nombre.";
  } else if (nombre.length > 120) {
    errors.nombre = "El nombre es demasiado largo.";
  }

  const phoneDigits = digitsOf(telefono);
  if (!phoneDigits) {
    errors.telefono = "Escribe un teléfono de contacto.";
  } else if (!/^\d{10}$/.test(phoneDigits)) {
    errors.telefono = "Debe tener 10 dígitos, por ejemplo 686 000 0000.";
  }

  if (!correo) {
    errors.correo = "Escribe tu correo.";
  } else if (!EMAIL.test(correo) || correo.length > 254) {
    errors.correo = "Ese correo no parece válido.";
  }

  if (!BUSINESS_CATEGORIES.includes(giro)) {
    errors.giro = "Selecciona un giro.";
  }

  const metros = Number(metrosRaw);
  if (!metrosRaw) {
    errors.metros = "Indica cuántos m² necesitas.";
  } else if (!Number.isFinite(metros) || metros <= 0) {
    errors.metros = "Usa un número, por ejemplo 60.";
  } else if (metros > 100000) {
    errors.metros = "Ese valor parece demasiado grande.";
  }

  if (!LEASE_KEYS.includes(duracion as LeaseKey)) {
    errors.duracion = "Selecciona la duración del arrendamiento.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const key = duracion as LeaseKey;
  return {
    ok: true,
    lead: {
      nombre,
      telefono: phoneDigits,
      correo: correo.toLowerCase(),
      giro,
      metros,
      duracion: key,
      branch: branchFor(key),
      receivedAt: new Date().toISOString(),
    },
  };
}

/**
 * Persistence seam for a validated lead.
 *
 * TODO(integración): today this only writes a structured server log so nothing
 * is silently dropped while the site is in review. Before launch, point this at
 * the real destination — CRM insert plus the branch-specific auto-reply
 * (pop-up guide PDF vs. scheduling link) described on the page — and make the
 * failure path surface to the visitor rather than resolving quietly.
 */
export async function recordLead(lead: LeasingLead): Promise<void> {
  console.info("[leasing-lead]", JSON.stringify(lead));
}
