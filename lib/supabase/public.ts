import { createClient } from "@supabase/supabase-js";

// Cookie-free client for public, cacheable reads (ISR). Relies on the public-read RLS policies;
// never use it for user-scoped data.
export function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
