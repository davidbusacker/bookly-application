import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import { conflict, dbErr, handler, ok, parseBody, preflight } from "@/lib/bookly/http";
import { findOrder } from "@/lib/bookly/orders";

const Body = z.object({
  order_id: z.string().min(1),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  region: z.string().min(1).max(100),
  postal_code: z.string().min(1).max(20),
  country: z.string().min(2).max(2).default("US"),
});

export const Route = createFileRoute("/api/public/v1/support/actions/address-change")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: handler(async ({ request }) => {
        const body = await parseBody(request, Body);
        const db = booklyDb();
        const order = await findOrder(db, body.order_id, "id,order_number,status,shipping_address");
        const status = order["status"] as string;
        if (!["pending", "processing"].includes(status)) {
          throw conflict(
            `Shipping address cannot be changed once an order is "${status}"`,
            "Addresses can only be updated while the order is pending or processing.",
          );
        }
        const address = {
          line1: body.line1,
          line2: body.line2 ?? null,
          city: body.city,
          region: body.region,
          postal_code: body.postal_code,
          country: body.country,
        };
        const { data, error } = await db
          .from("orders")
          .update({ shipping_address: address, updated_at: new Date().toISOString() })
          .eq("id", order["id"] as string)
          .select("id,order_number,status,shipping_address")
          .single();
        dbErr(error);
        return ok(data);
      }),
    },
  },
});
