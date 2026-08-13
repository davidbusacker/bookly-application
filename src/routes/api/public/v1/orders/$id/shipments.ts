import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, ok, preflight } from "@/lib/bookly/http";
import { findOrder } from "@/lib/bookly/orders";

export const Route = createFileRoute("/api/public/v1/orders/$id/shipments")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ params }) => {
        const db = booklyDb();
        const order = await findOrder(db, (params as { id: string }).id, "id,order_number,status");
        const { data, error } = await db
          .from("shipments")
          .select("*, events:shipment_events(*)")
          .eq("order_id", order["id"] as string)
          .order("created_at", { ascending: true });
        dbErr(error);
        return ok(data ?? [], {
          order_number: order["order_number"],
          order_status: order["status"],
          count: data?.length ?? 0,
        });
      }),
    },
  },
});
