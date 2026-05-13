import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-anon-key";

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
// Uses localStorage with custom key — does NOT touch cookies
export const supabasePublic = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: 'euguide-public-auth',
    autoRefreshToken: true,
    persistSession: true,
    flowType: 'implicit', // token in URL hash — works with popup windows
  },
});

// Admin supabase instance — uses @supabase/ssr (cookie-based + PKCE)
// This stores auth in cookies so middleware can read it
// PKCE flow ensures magic link callback works with server-side code exchange
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
