import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses every RLS policy on this project.
 * `import "server-only"` is load-bearing here, same reason as
 * `console-data.server.ts`: SUPABASE_SERVICE_ROLE_KEY must never reach a
 * client bundle. Only import this from Route Handlers, Server Actions, or
 * other server-only modules.
 */
let client: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set — see .env.example",
    );
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return client;
}
