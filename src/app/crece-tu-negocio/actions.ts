"use server";

import { recordLead, validateLead } from "@/lib/leads";
import { branchFor } from "@/content/leasing";
import { SITE } from "@/content/site";
import type { LeasingFormState } from "@/lib/leasing-form";

export async function submitLeasingInquiry(
  _prev: LeasingFormState,
  formData: FormData,
): Promise<LeasingFormState> {
  // Honeypot: real visitors never see this field, bots fill everything.
  if (String(formData.get("empresa-web") ?? "")) {
    return { status: "success", branch: "call" };
  }

  const result = validateLead(formData);

  if (!result.ok) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      errors: result.errors,
    };
  }

  try {
    await recordLead(result.lead);
  } catch (error) {
    console.error("[leasing-lead] no se pudo registrar", error);
    return {
      status: "error",
      message: `No pudimos enviar tu solicitud. Inténtalo de nuevo o escríbenos a ${SITE.emails.leasing}.`,
    };
  }

  return { status: "success", branch: branchFor(result.lead.duracion) };
}
