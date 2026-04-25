import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase service-role client for server-side operations only.
 * Uses the service role key for direct Storage access (bypasses RLS).
 * Never import this on the client.
 *
 * Lazily initialized to avoid build-time errors when env vars are missing.
 */
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
      );
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}
