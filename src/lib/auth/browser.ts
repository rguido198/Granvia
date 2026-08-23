"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * The one place a Supabase client with the publishable key runs in the
 * browser — needed only for the invite-acceptance flow, which arrives via a
 * URL hash (#access_token=...) that only a browser client auto-detects and
 * exchanges for a session. Everything else in this app reads/writes through
 * server-side clients instead.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
