import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { ApiError, handler, ok, preflight } from "@/lib/bookly/http";

export const Route = createFileRoute("/api/public/v1/admin/reset-demo")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: handler(async () => {
        const db = booklyDb();
        const { data, error } = await db.rpc("reset_bookly_demo");
        if (error) throw new ApiError(500, "reset_failed", "Demo reset failed", error.message);
        return ok({ reset: true, summary: data, reset_at: new Date().toISOString() });
      }),
    },
  },
});
