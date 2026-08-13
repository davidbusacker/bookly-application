import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, notFound, ok, preflight } from "@/lib/bookly/http";

export const Route = createFileRoute("/api/public/v1/books/$id")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ params }) => {
        const id = (params as { id: string }).id;
        const db = booklyDb();
        const key = /^978/.test(id) ? "isbn" : "id";
        const { data, error } = await db.from("books").select("*").eq(key, id).maybeSingle();
        dbErr(error);
        if (!data) throw notFound(`Book "${id}"`);
        return ok(data);
      }),
    },
  },
});
