import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, notFound, ok, preflight } from "@/lib/bookly/http";

export const Route = createFileRoute("/api/public/v1/customers/$id/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ params }) => {
        const id = decodeURIComponent((params as { id: string }).id);
        const db = booklyDb();
        const key = id.includes("@") ? "email" : "id";
        const { data, error } = await db
          .from("customers")
          .select("*, recent_orders:orders(id,order_number,status,total_cents,placed_at)")
          .eq(key, id)
          .maybeSingle();
        dbErr(error);
        if (!data) throw notFound(`Customer "${id}"`);
        return ok(data);
      }),
    },
  },
});
