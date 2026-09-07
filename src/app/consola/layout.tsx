import { CommandPalette } from "@/components/hub/command-palette";

/**
 * Wraps every /consola/* route (the main dashboard and every standalone
 * page — finanzas, escalaciones, locales/[id], renovaciones/[id],
 * solicitudes/[id], actividad) purely to mount the ⌘K command palette once,
 * globally. A bare fragment around {children} rather than any wrapping
 * element — each page already builds its own full CONSOLE_ROOT_ID tree with
 * its own font/accent tokens (see any of those pages' own doc comments on
 * why they redeclare rather than share a layout), and this must not add a
 * DOM node that could affect their full-bleed layouts.
 *
 * CommandPalette self-excludes on /consola/acceso (no session yet, nothing
 * to search) rather than this layout special-casing the route, since
 * Next.js layouts can't conditionally skip children by pathname.
 */
export default function ConsolaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}
