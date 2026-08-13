import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, ok, preflight, searchParams } from "@/lib/bookly/http";

export const Route = createFileRoute("/api/public/v1/faqs/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ request }) => {
        const sp = searchParams(request);
        const db = booklyDb();
        let query = db.from("faqs").select("*");
        const topic = sp.get("topic");
        if (topic) query = query.eq("topic", topic);
        const q = sp.get("q");
        if (q) query = query.or(`question.ilike.%${q}%,answer.ilike.%${q}%`);
        const { data, error } = await query.order("topic", { ascending: true });
        dbErr(error);
        return ok(data ?? [], { count: data?.length ?? 0 });
      }),
    },
  },
});
