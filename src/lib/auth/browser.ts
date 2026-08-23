"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * The one place a Supabase client with the publishable key runs in the
 * browser — needed only for the invite-acceptance flow, where
 * verifyOtp({ token_hash, type }) must run client-side on an explicit user
 * click (see completar-acceso/page.tsx) so the token is consumed by the
 * user, not by an email security scanner prefetching the link. Everything
 * else in this app reads/writes through server-side clients instead.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
