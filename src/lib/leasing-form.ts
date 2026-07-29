import type { FieldErrors } from "@/lib/leads";

/**
 * Shape of the leasing form's action state.
 *
 * Lives outside `actions.ts` on purpose: a "use server" module may only export
 * async functions, so the initial-state constant cannot live there.
 */
export type LeasingFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: FieldErrors;
  /** Echoed back so the confirmation can name the right next step. */
  branch?: "guide" | "call";
};

export const initialLeasingState: LeasingFormState = { status: "idle" };
