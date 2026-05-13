import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Public client — used by Bleon's frontend (EUGuideApp)
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createBrowserClient(url, key);
}

// Public supabase instance — for chat widget Google auth (public pages)
export const supabasePublic = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: 'euguide-public-auth',
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Admin supabase instance — completely separate session for admin panel
export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: 'euguide-admin-auth',
    autoRefreshToken: true,
    persistSession: true,
  },
});
