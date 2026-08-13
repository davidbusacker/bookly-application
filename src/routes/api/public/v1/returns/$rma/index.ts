import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, notFound, ok, preflight } from "@/lib/bookly/http";
import { RETURN_SELECT } from "@/lib/bookly/selects";

export const Route = createFileRoute("/api/public/v1/returns/$rma/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ params }) => {
        const rma = (params as { rma: string }).rma;
        const db = booklyDb();
        const key = /^RMA-/i.test(rma) ? "rma_number" : "id";
        const { data, error } = await db
          .from("returns")
          .select(RETURN_SELECT)
          .eq(key, key === "rma_number" ? rma.toUpperCase() : rma)
          .maybeSingle();
        dbErr(error);
        if (!data) throw notFound(`Return "${rma}"`);
        return ok(data);
      }),
    },
  },
});
