import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, ok, preflight } from "@/lib/bookly/http";
import { findOrder } from "@/lib/bookly/orders";

export const Route = createFileRoute("/api/public/v1/orders/$id/items")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ params }) => {
        const db = booklyDb();
        const order = await findOrder(db, (params as { id: string }).id, "id,order_number");
        const { data, error } = await db
          .from("order_items")
          .select("*, book:books(id,isbn,title,author,format,category,price_cents,stock)")
          .eq("order_id", order["id"] as string);
        dbErr(error);
        return ok(data ?? [], { order_number: order["order_number"], count: data?.length ?? 0 });
      }),
    },
  },
});
