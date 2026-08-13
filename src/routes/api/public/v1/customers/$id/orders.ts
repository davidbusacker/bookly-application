import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, listMeta, notFound, ok, pagination, preflight } from "@/lib/bookly/http";
import { ORDER_SELECT } from "@/lib/bookly/selects";

export const Route = createFileRoute("/api/public/v1/customers/$id/orders")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ request, params }) => {
        const id = decodeURIComponent((params as { id: string }).id);
        const { limit, offset } = pagination(request);
        const db = booklyDb();

        let customerId = id;
        if (id.includes("@")) {
          const { data, error } = await db.from("customers").select("id").eq("email", id).maybeSingle();
          dbErr(error);
          if (!data) throw notFound(`Customer "${id}"`);
          customerId = data.id as string;
        }

        const { data, error, count } = await db
          .from("orders")
          .select(ORDER_SELECT, { count: "exact" })
          .eq("customer_id", customerId)
          .order("placed_at", { ascending: false })
          .range(offset, offset + limit - 1);
        dbErr(error);
        return ok(data ?? [], { customer_id: customerId, ...listMeta(count, limit, offset) });
      }),
    },
  },
});
