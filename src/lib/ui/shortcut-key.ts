"use client";

import { useEffect, useState } from "react";

/**
 * "⌘K" on Mac/iOS, "Ctrl K" everywhere else — resolved client-side after
 * mount rather than guessed from a server-rendered default, since the
 * server has no way to know the client's platform and hardcoding ⌘ was
 * simply wrong on Windows/Linux. Defaults to "Ctrl K" pre-mount (the more
 * common case); the one-frame flip to "⌘K" on Mac happens in a normal
 * post-mount re-render, not a hydration diff, so it never warns.
 */
export function useShortcutLabel(key: string): string {
  const [label, setLabel] = useState(`Ctrl ${key}`);

  useEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent;
    if (/Mac|iPhone|iPad|iPod/i.test(platform)) setLabel(`⌘${key}`);
  }, [key]);

  return label;
}

/** Tailwind class for "show only when a physical keyboard shortcut is
 *  actually usable" — (hover: hover) and (pointer: fine) is the property
 *  that's really being checked, not a UA/screen-size guess, so it holds up
 *  correctly on an iPad with a keyboard or a touchscreen desktop. Apply
 *  alongside a `hidden` (or `inline-flex`/etc.) default. */
export const KEYBOARD_ONLY_CLASS = "[@media(hover:hover)_and_(pointer:fine)]:inline-flex";
