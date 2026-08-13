import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import { conflict, dbErr, handler, ok, parseBody, preflight } from "@/lib/bookly/http";
import { findOrder } from "@/lib/bookly/orders";
import { RULES } from "@/lib/bookly/rules";

const Body = z.object({
  carrier: z.enum(["UPS", "FedEx", "USPS", "DHL"]).optional(),
  service_level: z.enum(["ground", "two_day", "overnight"]).optional(),
  reason: z.string().max(500).optional(),
});

export const Route = createFileRoute("/api/public/v1/orders/$id/reship")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: handler(async ({ request, params }) => {
        const body = await parseBody(request, Body);
        const db = booklyDb();
        const order = await findOrder(db, (params as { id: string }).id, "id,order_number,status");
        const status = order["status"] as string;

        if (!RULES.reshipableStatuses.includes(status as "shipped")) {
          throw conflict(
            `Order with status "${status}" cannot be reshipped`,
            `Reshipment is available for orders that are ${RULES.reshipableStatuses.join(" or ")}.`,
          );
        }

        const tracking = `1Z${Math.random().toString(36).slice(2, 16).toUpperCase()}`;
        const now = new Date();
        const { data: shipment, error } = await db
          .from("shipments")
          .insert({
            order_id: order["id"],
            carrier: body.carrier ?? "UPS",
            service_level: body.service_level ?? "two_day",
            tracking_number: tracking,
            status: "label_created",
            shipped_at: null,
            estimated_delivery: new Date(now.getTime() + 3 * 86_400_000).toISOString().slice(0, 10),
            tracking_url: `https://track.bookly.example/${tracking}`,
          })
          .select("*")
          .single();
        dbErr(error);

        await db.from("shipment_events").insert({
          shipment_id: shipment.id,
          status: "label_created",
          location: "Columbus, OH",
          description: body.reason ?? "Replacement shipment created by support",
        });

        await db
          .from("orders")
          .update({ status: "processing", updated_at: now.toISOString() })
          .eq("id", order["id"] as string);

        return ok({ order_number: order["order_number"], shipment }, {}, 201);
      }),
    },
  },
});
