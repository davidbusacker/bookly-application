import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import { conflict, dbErr, handler, ok, parseBody, preflight } from "@/lib/bookly/http";
import { logRefundEvent, settleRefund } from "@/lib/bookly/refunds";
import { findReturn } from "@/lib/bookly/returns";
import { RETURN_SELECT } from "@/lib/bookly/selects";

const Body = z
  .object({
    condition: z.enum(["unopened", "opened", "damaged"]).optional(),
    note: z.string().max(1000).optional(),
    auto_refund: z.boolean().optional(),
  })
  .default({});

export const Route = createFileRoute("/api/public/v1/returns/$rma/receive")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: handler(async ({ request, params }) => {
        let body: z.infer<typeof Body> = {};
        try {
          body = await parseBody(request, Body);
        } catch {
          body = {};
        }
        const db = booklyDb();
        const ret = await findReturn(
          db,
          (params as { rma: string }).rma,
          "id,rma_number,status,order_id,expected_refund_cents",
        );

        if (["refunded", "cancelled", "rejected"].includes(ret["status"] as string)) {
          throw conflict(`Return is already ${ret["status"] as string}`);
        }

        const now = new Date().toISOString();
        const { error } = await db
          .from("returns")
          .update({ status: "received", received_at: now, comment: body.note ?? null })
          .eq("id", ret["id"] as string);
        dbErr(error);

        let refund: unknown = null;
        if (body.auto_refund) {
          const { data: pending } = await db
            .from("refunds")
            .select("*")
            .eq("return_id", ret["id"] as string)
            .neq("status", "succeeded")
            .maybeSingle();

          if (pending) {
            await db
              .from("refunds")
              .update({ status: "succeeded", processed_at: now })
              .eq("id", pending.id as string);
            await logRefundEvent(db, {
              refund_id: pending.id as string,
              status_from: pending.status as string,
              status_to: "succeeded",
              actor: "warehouse",
              amount_cents: pending.amount_cents as number,
              note: `Return ${ret["rma_number"] as string} received — pending refund released`,
            });
            const { data: order } = await db
              .from("orders")
              .select("id,order_number,customer_id,total_cents")
              .eq("id", ret["order_id"] as string)
              .single();
            if (order) {
              await settleRefund(
                db,
                {
                  id: pending.id as string,
                  refund_number: pending.refund_number as string,
                  amount_cents: pending.amount_cents as number,
                  method: pending.method as string,
                },
                order as { id: string; order_number: string; customer_id: string; total_cents: number },
              );
            }
            const { data: fresh } = await db.from("refunds").select("*").eq("id", pending.id as string).single();
            refund = fresh;
            await db.from("returns").update({ status: "refunded", closed_at: now }).eq("id", ret["id"] as string);
            const { data: full0 } = await db.from("returns").select(RETURN_SELECT).eq("id", ret["id"] as string).single();
            return ok({ return: full0, refund });
          }

          const { data } = await db
            .from("refunds")
            .insert({
              refund_number: `RF-${Math.floor(10000 + Math.random() * 89999)}`,
              order_id: ret["order_id"],
              return_id: ret["id"],
              amount_cents: ret["expected_refund_cents"],
              method: "original_payment",
              status: "succeeded",
              reason: "Return received",
              processed_at: now,
            })
            .select("*")
            .single();
          refund = data;
          if (data) {
            await logRefundEvent(db, {
              refund_id: data.id as string,
              type: "created",
              status_to: "succeeded",
              actor: "warehouse",
              amount_cents: data.amount_cents as number,
              note: `Refund issued on receipt of return ${ret["rma_number"] as string}`,
            });
          }
          await db.from("returns").update({ status: "refunded", closed_at: now }).eq("id", ret["id"] as string);
        }

        const { data: full } = await db.from("returns").select(RETURN_SELECT).eq("id", ret["id"] as string).single();
        return ok({ return: full, refund });
      }),
    },
  },
});
