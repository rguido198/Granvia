/**
 * DOM id of the console shell's root element.
 *
 * Overlays (slide-overs, modals) inside the console must portal to THIS node
 * rather than to document.body. Two reasons, both load-bearing:
 *
 *  1. The --console-accent* tokens, the console font var and the accessibility
 *     zoom are declared on the shell element, not on :root — an overlay mounted
 *     on <body> inherits none of them and renders unstyled-ish.
 *  2. Mounting inside the tab content instead is not an option either: several
 *     panels carry `animate-fadeIn`, whose `fill-mode: both` leaves a permanent
 *     `transform` on the element. A non-none transform makes that element the
 *     containing block for `position: fixed` descendants, so a "full-screen"
 *     drawer would be clipped to the panel's box. Measured, not assumed.
 *
 * Kept in its own leaf module so console-shell.tsx and the overlays can both
 * import it without a cycle.
 */
export const CONSOLE_ROOT_ID = "console-root";
