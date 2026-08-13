import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, ok, preflight, searchParams } from "@/lib/bookly/http";

export const Route = createFileRoute("/api/public/v1/policies/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ request }) => {
        const sp = searchParams(request);
        const db = booklyDb();
        let query = db.from("policies").select("*");
        const category = sp.get("category");
        if (category) query = query.eq("category", category);
        const q = sp.get("q");
        if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%,slug.ilike.%${q}%`);
        const { data, error } = await query.order("category", { ascending: true });
        dbErr(error);
        return ok(data ?? [], { count: data?.length ?? 0 });
      }),
    },
  },
});
