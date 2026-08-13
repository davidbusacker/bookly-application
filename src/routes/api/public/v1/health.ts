import { createFileRoute } from "@tanstack/react-router";
import { API_VERSION, handler, ok, preflight } from "@/lib/bookly/http";

export const Route = createFileRoute("/api/public/v1/health")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async () =>
        ok({ status: "ok", service: "bookly-api", version: API_VERSION, time: new Date().toISOString() }),
      ),
    },
  },
});
