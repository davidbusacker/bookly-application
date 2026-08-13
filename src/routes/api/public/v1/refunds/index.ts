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
import { logRefundEvent, REFUND_SELECT, settleRefund } from "@/lib/bookly/refunds";
import { REFUND_METHODS, REFUND_STATUSES } from "@/lib/bookly/rules";

const CreateBody = z.object({
  order_id: z.string().min(1),
  amount_cents: z.number().int().min(1).optional(),
  method: z.enum(REFUND_METHODS).optional(),
  status: z.enum(REFUND_STATUSES).optional(),
  return_id: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
  note: z.string().max(1000).optional(),
  actor: z.string().max(120).optional(),
});

export const Route = createFileRoute("/api/public/v1/refunds/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ request }) => {
        const sp = searchParams(request);
        const { limit, offset } = pagination(request);
        const db = booklyDb();
        let query = db.from("refunds").select(REFUND_SELECT, { count: "exact" });
        const status = sp.get("status");
        if (status) query = query.in("status", status.split(",").map((s) => s.trim()));
        const orderId = sp.get("order_id");
        if (orderId) {
          const order = await findOrder(db, orderId, "id");
          query = query.eq("order_id", order["id"] as string);
        }

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
        const status = body.status ?? "succeeded";
        const settled = status === "succeeded";

        const { data: refund, error } = await db
          .from("refunds")
          .insert({
            refund_number: `RF-${Math.floor(10000 + Math.random() * 89999)}`,
            order_id: order["id"],
            return_id: body.return_id ?? null,
            amount_cents: amount,
            method,
            status,
            reason: body.reason ?? "Refund issued by support",
            processed_at: settled ? now : null,
          })
          .select("*")
          .single();
        dbErr(error);

        await logRefundEvent(db, {
          refund_id: refund!.id as string,
          type: "created",
          status_to: status,
          actor: body.actor ?? "agent",
          amount_cents: amount,
          note:
            body.note ??
            (settled
              ? `Refund of ${amount} cents issued immediately (${body.reason ?? "support decision"})`
              : `Refund created with status "${status}" (${body.reason ?? "support decision"})`),
          metadata: { method, return_id: body.return_id ?? null },
        });

        let txn: unknown = null;
        if (settled) {
          txn = await settleRefund(
            db,
            {
              id: refund!.id as string,
              refund_number: refund!.refund_number as string,
              amount_cents: amount,
              method,
            },
            {
              id: order["id"] as string,
              order_number: order["order_number"] as string,
              customer_id: order["customer_id"] as string,
              total_cents: order["total_cents"] as number,
            },
          );
        }

        const { data: full } = await db.from("refunds").select(REFUND_SELECT).eq("id", refund!.id).single();

        return ok(
          {
            refund: full,
            transaction: txn,
            remaining_refundable_cents: settled ? remaining - amount : remaining,
          },
          {},
          201,
        );
      }),
    },
  },
});
