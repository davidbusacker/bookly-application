import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, listMeta, ok, pagination, preflight, searchParams } from "@/lib/bookly/http";

export const Route = createFileRoute("/api/public/v1/customers/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ request }) => {
        const sp = searchParams(request);
        const { limit, offset } = pagination(request);
        const db = booklyDb();
        let query = db.from("customers").select("*", { count: "exact" });

        const email = sp.get("email");
        if (email) query = query.ilike("email", email);
        const q = sp.get("q");
        if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
        const tier = sp.get("tier");
        if (tier) query = query.eq("tier", tier);

        const { data, error, count } = await query
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        dbErr(error);
        return ok(data ?? [], listMeta(count, limit, offset));
      }),
    },
  },
});
