/**
 * Path constants for the landlord console's login flow. Middleware must let
 * CONSOLE_LOGIN_PATH through unauthenticated or the redirect loops.
 *
 * The actual session mechanism used to live here too (a hand-rolled
 * HMAC-signed cookie against a single shared CONSOLA_* password) — replaced
 * by real per-user Supabase Auth (src/lib/auth/). See git history if you
 * need the old implementation for reference.
 */
export const CONSOLE_LOGIN_PATH = "/consola/acceso";
export const CONSOLE_HOME_PATH = "/consola";
