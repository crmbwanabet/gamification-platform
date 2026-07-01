import { createClient } from '@supabase/supabase-js';

// Server-ONLY Supabase client using the service_role key (bypasses RLS).
// NEVER import this from a client component — it must stay server-side (API routes only).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
