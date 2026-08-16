type RuntimeGlobals = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const DEFAULT_BASE_URL = "https://bookly.davidbusacker.com";

/** Base URL the MCP tools call the Bookly REST API on. Read lazily at call time. */
export function apiBaseUrl(): string {
  const env = (globalThis as RuntimeGlobals).process?.env ?? {};
  const configured = env["BOOKLY_API_BASE_URL"]?.trim() || env["VITE_BOOKLY_API_BASE_URL"]?.trim();
  return (configured || DEFAULT_BASE_URL).replace(/\/+$/, "");
}
