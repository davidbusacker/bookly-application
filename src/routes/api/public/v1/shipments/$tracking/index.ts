import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, notFound, ok, preflight } from "@/lib/bookly/http";
import { SHIPMENT_SELECT } from "@/lib/bookly/selects";

export const Route = createFileRoute("/api/public/v1/shipments/$tracking/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ params }) => {
        const tracking = (params as { tracking: string }).tracking;
        const db = booklyDb();
        const { data, error } = await db
          .from("shipments")
          .select(SHIPMENT_SELECT)
          .or(`tracking_number.eq.${tracking},id.eq.${tracking}`)
          .maybeSingle();
        dbErr(error);
        if (!data) throw notFound(`Shipment "${tracking}"`);
        return ok(data);
      }),
    },
  },
});
