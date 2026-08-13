import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import {
  badRequest,
  conflict,
  dbErr,
  handler,
  listMeta,
  ok,
  pagination,
  parseBody,
  preflight,
  searchParams,
} from "@/lib/bookly/http";
import { findOrder } from "@/lib/bookly/orders";
import { REFUND_METHODS } from "@/lib/bookly/rules";

const CreateBody = z.object({
  order_id: z.string().min(1),
  amount_cents: z.number().int().min(1).optional(),
  method: z.enum(REFUND_METHODS).optional(),
  return_id: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
});

export const Route = createFileRoute("/api/public/v1/refunds/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ request }) => {
        const sp = searchParams(request);
        const { limit, offset } = pagination(request);
        const db = booklyDb();
        let query = db
          .from("refunds")
          .select("*, order:orders(id,order_number,total_cents,customer_id)", { count: "exact" });
        const status = sp.get("status");
        if (status) query = query.in("status", status.split(","));
        const orderId = sp.get("order_id");
        if (orderId) query = query.eq("order_id", orderId);

        const { data, error, count } = await query
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        dbErr(error);
        return ok(data ?? [], listMeta(count, limit, offset));
      }),

      POST: handler(async ({ request }) => {
        const body = await parseBody(request, CreateBody);
        const db = booklyDb();
        const order = await findOrder(db, body.order_id, "id,order_number,status,total_cents,customer_id");

        const { data: existing } = await db
          .from("refunds")
          .select("amount_cents")
          .eq("order_id", order["id"] as string)
          .eq("status", "succeeded");
        const alreadyRefunded = (existing ?? []).reduce((sum, r) => sum + (r.amount_cents as number), 0);
        const remaining = (order["total_cents"] as number) - alreadyRefunded;

        const amount = body.amount_cents ?? remaining;
        if (amount <= 0) throw conflict("Order has already been fully refunded");
        if (amount > remaining) {
          throw badRequest(
            `Refund amount ${amount} exceeds the refundable remainder ${remaining} for order ${order["order_number"] as string}`,
          );
        }

        const now = new Date().toISOString();
        const method = body.method ?? "original_payment";
        const { data: refund, error } = await db
          .from("refunds")
          .insert({
            refund_number: `RF-${Math.floor(10000 + Math.random() * 89999)}`,
            order_id: order["id"],
            return_id: body.return_id ?? null,
            amount_cents: amount,
            method,
            status: "succeeded",
            reason: body.reason ?? "Refund issued by support",
            processed_at: now,
          })
          .select("*")
          .single();
        dbErr(error);

        const { data: txn } = await db
          .from("transactions")
          .insert({
            transaction_number: `TXN-${Date.now().toString().slice(-8)}`,
            order_id: order["id"],
            customer_id: order["customer_id"],
            type: "refund",
            amount_cents: -amount,
            status: "succeeded",
            method,
            reference: refund?.refund_number ?? null,
            description: `Refund for order ${order["order_number"] as string}`,
          })
          .select("*")
          .single();

        if (method === "store_credit") {
          const { data: cust } = await db
            .from("customers")
            .select("store_credit_cents")
            .eq("id", order["customer_id"] as string)
            .single();
          await db
            .from("customers")
            .update({ store_credit_cents: (cust?.store_credit_cents ?? 0) + amount })
            .eq("id", order["customer_id"] as string);
        }

        if (amount >= remaining) {
          await db.from("orders").update({ status: "refunded", updated_at: now }).eq("id", order["id"] as string);
        }

        return ok(
          { refund, transaction: txn, remaining_refundable_cents: remaining - amount },
          {},
          201,
        );
      }),
    },
  },
});
