import { createClient } from "@supabase/supabase-js";

/**
 * Server-only. Use only for bootstrap operations that must bypass RLS
 * (e.g. creating a user's first workspace + membership).
 * Never expose to the client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  }
  return createClient(url, key);
}
