import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, notFound, ok, preflight } from "@/lib/bookly/http";

export const Route = createFileRoute("/api/public/v1/refunds/$id")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ params }) => {
        const id = (params as { id: string }).id;
        const db = booklyDb();
        const key = /^RF-/i.test(id) ? "refund_number" : "id";
        const { data, error } = await db
          .from("refunds")
          .select("*, order:orders(id,order_number,total_cents), return:returns(id,rma_number,status)")
          .eq(key, key === "refund_number" ? id.toUpperCase() : id)
          .maybeSingle();
        dbErr(error);
        if (!data) throw notFound(`Refund "${id}"`);
        return ok(data);
      }),
    },
  },
});
