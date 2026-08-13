import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import { conflict, dbErr, handler, ok, parseBody, preflight } from "@/lib/bookly/http";
import { findOrder } from "@/lib/bookly/orders";
import { RULES } from "@/lib/bookly/rules";

const Body = z.object({ reason: z.string().max(500).optional() });

export const Route = createFileRoute("/api/public/v1/orders/$id/cancel")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: handler(async ({ request, params }) => {
        const body = await parseBody(request, Body);
        const db = booklyDb();
        const order = await findOrder(db, (params as { id: string }).id, "id,order_number,status,total_cents,customer_id");
        const status = order["status"] as string;

        if (!RULES.cancellableStatuses.includes(status as "processing")) {
          throw conflict(
            `Order cannot be cancelled while its status is "${status}"`,
            `Only orders in ${RULES.cancellableStatuses.join(" or ")} can be cancelled. Create a return instead.`,
          );
        }

        const now = new Date().toISOString();
        const { data, error } = await db
          .from("orders")
          .update({
            status: "cancelled",
            cancelled_at: now,
            updated_at: now,
            notes: body.reason ?? "Cancelled via support API",
          })
          .eq("id", order["id"] as string)
          .select("*")
          .single();
        dbErr(error);

        await db.from("order_items").update({ fulfillment_status: "cancelled" }).eq("order_id", order["id"] as string);
        const { data: txn } = await db
          .from("transactions")
          .insert({
            transaction_number: `TXN-${Date.now().toString().slice(-8)}`,
            order_id: order["id"],
            customer_id: order["customer_id"],
            type: "void",
            amount_cents: -(order["total_cents"] as number),
            status: "succeeded",
            description: `Authorization voided for cancelled order ${order["order_number"]}`,
          })
          .select("*")
          .single();

        return ok({ order: data, transaction: txn });
      }),
    },
  },
});
