import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS entirely — only ever use it for
 * the Supabase Auth Admin API (auth.admin.createUser/deleteUser), which has
 * no SQL equivalent. All table/RPC access must keep going through the normal
 * session client (lib/supabase/server.ts) so the SECURITY DEFINER RPCs'
 * own admin checks stay the real authorization boundary.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
