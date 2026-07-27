import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ⚠️ SERVICE ROLE CLIENT — DANGER ⚠️
//
// This client authenticates with the SUPABASE_SERVICE_ROLE_KEY, which BYPASSES
// ALL row-level security (RLS) policies. It has unrestricted read/write access to
// the entire database.
//
// It MUST ONLY be used inside trusted server code (Route Handlers / Server Actions)
// and ONLY AFTER bot detection and permission/authorization checks have passed.
//
// The `import 'server-only'` above ensures this module can never be bundled into,
// or imported from, client-side code. Never expose the service role key to the browser.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
