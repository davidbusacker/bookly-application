import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for the Bookly demo API.
 *
 * The REST API is intentionally unauthenticated, but the database itself is
 * NOT publicly reachable: anon/authenticated have no grants or policies on the
 * Bookly tables, so all data access must go through these server handlers,
 * which run with the service role. The key is read from server-only env and
 * never reaches the browser bundle.
 * Must only be constructed inside a request handler (env is injected per request).
 */
export function booklyDb(): SupabaseClient {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SECRET_KEY"];


  if (!url || !key) throw new Error("Supabase environment is not configured");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input as RequestInfo, { ...init, headers });
      },
    },
  });
}
