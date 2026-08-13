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
import { RETURN_REASONS, evaluateReturnEligibility } from "@/lib/bookly/rules";
import { RETURN_SELECT } from "@/lib/bookly/selects";

const CreateBody = z.object({
  order_id: z.string().min(1).describe("Order UUID or order number"),
  reason: z.enum(RETURN_REASONS),
  comment: z.string().max(1000).optional(),
  items: z
    .array(z.object({ order_item_id: z.string().uuid(), quantity: z.number().int().min(1).max(50) }))
    .min(1),
  override_eligibility: z.boolean().optional(),
});

export const Route = createFileRoute("/api/public/v1/returns/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ request }) => {
        const sp = searchParams(request);
        const { limit, offset } = pagination(request);
        const db = booklyDb();
        let query = db.from("returns").select(RETURN_SELECT, { count: "exact" });

        const status = sp.get("status");
        if (status) query = query.in("status", status.split(",").map((s) => s.trim()));
        const orderId = sp.get("order_id");
        if (orderId) query = query.eq("order_id", orderId);
        const customerId = sp.get("customer_id");
        if (customerId) query = query.eq("customer_id", customerId);

        const { data, error, count } = await query
          .order("requested_at", { ascending: false })
          .range(offset, offset + limit - 1);
        dbErr(error);
        return ok(data ?? [], listMeta(count, limit, offset));
      }),

      POST: handler(async ({ request }) => {
        const body = await parseBody(request, CreateBody);
        const db = booklyDb();
        const order = await findOrder(
          db,
          body.order_id,
          "id,order_number,status,placed_at,customer_id, items:order_items(id,total_cents,quantity, book:books(format)), shipments(delivered_at)",
        );

        const items = (order["items"] ?? []) as Array<Record<string, unknown>>;
        const shipments = (order["shipments"] ?? []) as Array<{ delivered_at: string | null }>;
        const deliveredAt = shipments.find((s) => s.delivered_at)?.delivered_at ?? null;

        const eligibility = evaluateReturnEligibility({
          status: order["status"] as string,
          deliveredAt,
          placedAt: order["placed_at"] as string,
          reason: body.reason,
          itemFormats: items
            .map((i) => (i["book"] as { format?: string } | null)?.format)
            .filter((f): f is string => Boolean(f)),
        });

        if (!eligibility.eligible && !body.override_eligibility) {
          throw conflict("Order is not eligible for a return", eligibility.reasons.join(" "));
        }

        let expected = 0;
        for (const requested of body.items) {
          const match = items.find((i) => i["id"] === requested.order_item_id);
          if (!match) throw badRequest(`order_item_id ${requested.order_item_id} is not part of this order`);
          if (requested.quantity > (match["quantity"] as number)) {
            throw badRequest(
              `Requested quantity ${requested.quantity} exceeds ordered quantity ${match["quantity"] as number}`,
            );
          }
          const unit = (match["total_cents"] as number) / (match["quantity"] as number);
          expected += Math.round(unit * requested.quantity);
        }

        const rma = `RMA-${Math.floor(10000 + Math.random() * 89999)}`;
        const { data: created, error } = await db
          .from("returns")
          .insert({
            rma_number: rma,
            order_id: order["id"],
            customer_id: order["customer_id"],
            status: "label_sent",
            reason: body.reason,
            comment: body.comment ?? null,
            label_url: `https://labels.bookly.example/${rma}.pdf`,
            expected_refund_cents: expected,
          })
          .select("id,rma_number")
          .single();
        dbErr(error);

        const { error: e2 } = await db.from("return_items").insert(
          body.items.map((i) => ({
            return_id: created.id,
            order_item_id: i.order_item_id,
            quantity: i.quantity,
          })),
        );
        dbErr(e2);

        const { data: full } = await db
          .from("returns")
          .select(RETURN_SELECT)
          .eq("id", created.id)
          .single();

        return ok(
          { return: full, eligibility, label_url: `https://labels.bookly.example/${rma}.pdf` },
          {},
          201,
        );
      }),
    },
  },
});
