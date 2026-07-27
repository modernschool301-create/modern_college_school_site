import { createBrowserClient } from '@supabase/ssr';

// Browser Supabase client — uses the public ANON key only.
// Safe to import from Client Components. All access is subject to row-level security.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
