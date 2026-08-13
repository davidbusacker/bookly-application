import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, notFound, ok, preflight } from "@/lib/bookly/http";

export const Route = createFileRoute("/api/public/v1/policies/$slug")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ params }) => {
        const slug = (params as { slug: string }).slug;
        const db = booklyDb();
        const { data, error } = await db.from("policies").select("*").eq("slug", slug).maybeSingle();
        dbErr(error);
        if (!data) throw notFound(`Policy "${slug}"`);
        return ok(data);
      }),
    },
  },
});
