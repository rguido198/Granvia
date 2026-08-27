"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { CONSOLE_ROOT_ID } from "@/components/hub/console-root";

/**
 * Portal wrapper for anything in the console that needs to render at the
 * true viewport position — a confirm dialog, a full-screen picker, anything
 * using `fixed inset-0`. Use this instead of rendering `fixed inset-0`
 * directly inline inside tab content.
 *
 * Confirmed live and reproduced in isolation: several tab panels carry
 * `animate-fadeIn` (globals.css — `animation: fade-in-up 0.35s ease-out
 * both`), and `fill-mode: both` leaves the end keyframe's `transform:
 * translateY(0)` permanently applied to the panel after the animation
 * finishes. That's a non-`none` transform — spec behavior, not a quirk —
 * so it makes the panel the containing block for any `position: fixed`
 * descendant. A dialog rendered inline inside such a panel doesn't center
 * on the viewport; it centers on that panel's own (often much taller than
 * one screen) content box, landing wherever that midpoint happens to fall
 * — which is how a reject-confirmation dialog ended up over a contracts
 * table several screens away from where it was triggered.
 *
 * CONSOLE_ROOT_ID (console-root.ts) already documents this exact hazard and
 * is the established fix — portaling there escapes every tab panel's own
 * transform, since the root itself carries no `animate-fadeIn`. This
 * wrapper exists so that fix is one import instead of a copy-pasted
 * `createPortal` call at every dialog.
 *
 * The portal target is looked up on mount rather than imported as a DOM
 * reference, since it doesn't exist during SSR — `children` render nothing
 * until then, which is invisible in practice since a modal only mounts in
 * response to a click that already happened client-side.
 */
export function ConsoleModal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById(CONSOLE_ROOT_ID));
  }, []);

  if (!target) return null;
  return createPortal(children, target);
}
