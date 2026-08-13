import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { conflict, dbErr, handler, ok, preflight } from "@/lib/bookly/http";
import { findReturn } from "@/lib/bookly/returns";
import { RETURN_SELECT } from "@/lib/bookly/selects";

export const Route = createFileRoute("/api/public/v1/returns/$rma/cancel")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: handler(async ({ params }) => {
        const db = booklyDb();
        const ret = await findReturn(db, (params as { rma: string }).rma, "id,status");
        if (["refunded", "cancelled"].includes(ret["status"] as string)) {
          throw conflict(`Return is already ${ret["status"] as string} and cannot be cancelled`);
        }
        const { error } = await db
          .from("returns")
          .update({ status: "cancelled", closed_at: new Date().toISOString() })
          .eq("id", ret["id"] as string);
        dbErr(error);
        const { data } = await db.from("returns").select(RETURN_SELECT).eq("id", ret["id"] as string).single();
        return ok(data);
      }),
    },
  },
});
