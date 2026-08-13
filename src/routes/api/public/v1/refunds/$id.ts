import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import { badRequest, dbErr, handler, ok, parseBody, preflight } from "@/lib/bookly/http";
import { findRefund, logRefundEvent, REFUND_SELECT, reverseRefund, settleRefund } from "@/lib/bookly/refunds";
import { REFUND_METHODS, REFUND_STATUSES } from "@/lib/bookly/rules";

const PatchBody = z.object({
  status: z.enum(REFUND_STATUSES).optional(),
  amount_cents: z.number().int().min(1).optional(),
  method: z.enum(REFUND_METHODS).optional(),
  reason: z.string().max(500).optional(),
  note: z.string().max(1000).optional(),
  actor: z.string().max(120).optional(),
});

export const Route = createFileRoute("/api/public/v1/refunds/$id")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ params }) => {
        const refund = await findRefund(booklyDb(), (params as { id: string }).id);
        return ok(refund);
      }),

      PATCH: handler(async ({ request, params }) => {
        const body = await parseBody(request, PatchBody);
        const db = booklyDb();
        const current = await findRefund(
          db,
          (params as { id: string }).id,
          "*, order:orders(id,order_number,customer_id,total_cents)",
        );

        const from = current["status"] as string;
        const to = body.status ?? from;
        const order = current["order"] as {
          id: string;
          order_number: string;
          customer_id: string;
          total_cents: number;
        } | null;
        if (!order) throw badRequest("Refund is not linked to an order");

        const amount = body.amount_cents ?? (current["amount_cents"] as number);
        const method = body.method ?? (current["method"] as string);

        if (body.amount_cents && from === "succeeded") {
          throw badRequest("Cannot change the amount of a refund that has already settled");
        }

        const now = new Date().toISOString();
        const { error } = await db
          .from("refunds")
          .update({
            status: to,
            amount_cents: amount,
            method,
            ...(body.reason ? { reason: body.reason } : {}),
            processed_at: to === "succeeded" ? ((current["processed_at"] as string | null) ?? now) : null,
          })
          .eq("id", current["id"] as string);
        dbErr(error);

        if (to === "succeeded" && from !== "succeeded") {
          await settleRefund(
            db,
            {
              id: current["id"] as string,
              refund_number: current["refund_number"] as string,
              amount_cents: amount,
              method,
            },
            order,
          );
        } else if (from === "succeeded" && (to === "cancelled" || to === "failed")) {
          await reverseRefund(
            db,
            {
              id: current["id"] as string,
              refund_number: current["refund_number"] as string,
              amount_cents: amount,
              method,
            },
            order,
          );
        }

        await logRefundEvent(db, {
          refund_id: current["id"] as string,
          type: to === from ? "note" : "status_change",
          status_from: from,
          status_to: to,
          actor: body.actor ?? "agent",
          amount_cents: amount,
          note: body.note ?? body.reason ?? `Refund moved from "${from}" to "${to}"`,
          metadata: { method },
        });

        const { data: full } = await db
          .from("refunds")
          .select(REFUND_SELECT)
          .eq("id", current["id"] as string)
          .single();
        return ok(full, { previous_status: from, new_status: to });
      }),
    },
  },
});
