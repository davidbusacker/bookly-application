import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, notFound, ok, preflight } from "@/lib/bookly/http";

export const Route = createFileRoute("/api/public/v1/shipments/$tracking/events")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ params }) => {
        const tracking = (params as { tracking: string }).tracking;
        const db = booklyDb();
        const { data: shipment, error } = await db
          .from("shipments")
          .select("id,tracking_number,status,carrier,estimated_delivery")
          .eq("tracking_number", tracking)
          .maybeSingle();
        dbErr(error);
        if (!shipment) throw notFound(`Shipment "${tracking}"`);

        const { data, error: e2 } = await db
          .from("shipment_events")
          .select("*")
          .eq("shipment_id", shipment.id)
          .order("occurred_at", { ascending: true });
        dbErr(e2);

        return ok(data ?? [], {
          tracking_number: shipment.tracking_number,
          carrier: shipment.carrier,
          status: shipment.status,
          estimated_delivery: shipment.estimated_delivery,
          count: data?.length ?? 0,
        });
      }),
    },
  },
});
