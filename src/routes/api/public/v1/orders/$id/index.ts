import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { handler, ok, preflight } from "@/lib/bookly/http";
import { findOrder } from "@/lib/bookly/orders";

export const Route = createFileRoute("/api/public/v1/orders/$id/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ params }) => {
        const order = await findOrder(booklyDb(), (params as { id: string }).id);
        return ok(order);
      }),
    },
  },
});
