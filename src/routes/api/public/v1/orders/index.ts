import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, listMeta, ok, pagination, preflight, searchParams } from "@/lib/bookly/http";
import { ORDER_LIST_SELECT } from "@/lib/bookly/selects";

export const Route = createFileRoute("/api/public/v1/orders/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ request }) => {
        const sp = searchParams(request);
        const { limit, offset } = pagination(request);
        const db = booklyDb();

        let query = db.from("orders").select(ORDER_LIST_SELECT, { count: "exact" });

        const email = sp.get("email");
        if (email) {
          const { data: cust, error } = await db
            .from("customers")
            .select("id")
            .ilike("email", email)
            .maybeSingle();
          dbErr(error);
          query = query.eq("customer_id", cust?.id ?? "00000000-0000-0000-0000-000000000000");
        }

        const customerId = sp.get("customer_id");
        if (customerId) query = query.eq("customer_id", customerId);

        const status = sp.get("status");
        if (status) query = query.in("status", status.split(",").map((s) => s.trim()));

        const placedAfter = sp.get("placed_after");
        if (placedAfter) query = query.gte("placed_at", placedAfter);
        const placedBefore = sp.get("placed_before");
        if (placedBefore) query = query.lte("placed_at", placedBefore);

        const sort = sp.get("sort") ?? "-placed_at";
        const desc = sort.startsWith("-");
        query = query.order(desc ? sort.slice(1) : sort, { ascending: !desc });

        const { data, error, count } = await query.range(offset, offset + limit - 1);
        dbErr(error);

        return ok(data ?? [], listMeta(count, limit, offset, { sort }));
      }),
    },
  },
});
