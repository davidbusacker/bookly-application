import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, listMeta, ok, pagination, preflight, searchParams } from "@/lib/bookly/http";

export const Route = createFileRoute("/api/public/v1/books/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ request }) => {
        const sp = searchParams(request);
        const { limit, offset } = pagination(request);
        const db = booklyDb();
        let query = db.from("books").select("*", { count: "exact" });

        const q = sp.get("q");
        if (q) query = query.or(`title.ilike.%${q}%,author.ilike.%${q}%,isbn.ilike.%${q}%`);
        const category = sp.get("category");
        if (category) query = query.eq("category", category);
        const format = sp.get("format");
        if (format) query = query.eq("format", format);
        const inStock = sp.get("in_stock");
        if (inStock === "true") query = query.gt("stock", 0);

        const { data, error, count } = await query
          .order("title", { ascending: true })
          .range(offset, offset + limit - 1);
        dbErr(error);
        return ok(data ?? [], listMeta(count, limit, offset));
      }),
    },
  },
});
