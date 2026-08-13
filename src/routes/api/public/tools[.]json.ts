import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, preflight } from "@/lib/bookly/http";
import { buildToolManifest } from "@/lib/bookly/openapi";

export const Route = createFileRoute("/api/public/tools.json")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: ({ request }: { request: Request }) => {
        const origin = new URL(request.url).origin;
        return new Response(JSON.stringify(buildToolManifest(origin), null, 2), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      },
    },
  },
});
