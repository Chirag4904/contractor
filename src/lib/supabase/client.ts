import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // ponytail: typed as `any` for now; use `supabase gen types` for full type safety
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
