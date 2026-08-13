import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, listMeta, ok, pagination, preflight, searchParams } from "@/lib/bookly/http";

export const Route = createFileRoute("/api/public/v1/transactions/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ request }) => {
        const sp = searchParams(request);
        const { limit, offset } = pagination(request);
        const db = booklyDb();
        let query = db
          .from("transactions")
          .select("*, order:orders(id,order_number)", { count: "exact" });

        const orderId = sp.get("order_id");
        if (orderId) query = query.eq("order_id", orderId);
        const customerId = sp.get("customer_id");
        if (customerId) query = query.eq("customer_id", customerId);
        const type = sp.get("type");
        if (type) query = query.in("type", type.split(","));
        const status = sp.get("status");
        if (status) query = query.in("status", status.split(","));

        const { data, error, count } = await query
          .order("occurred_at", { ascending: false })
          .range(offset, offset + limit - 1);
        dbErr(error);
        return ok(data ?? [], listMeta(count, limit, offset));
      }),
    },
  },
});
