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
import { logRefundEvent, settleRefund } from "@/lib/bookly/refunds";
import { RETURN_REASONS, evaluateReturnEligibility } from "@/lib/bookly/rules";
import { RETURN_SELECT } from "@/lib/bookly/selects";

const CreateBody = z.object({
  order_id: z.string().min(1).describe("Order UUID or order number"),
  reason: z.enum(RETURN_REASONS),
  comment: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        order_item_id: z.string().uuid().optional(),
        isbn: z.string().optional(),
        title: z.string().optional(),
        quantity: z.number().int().min(1).max(50).optional(),
      }),
    )
    .min(1)
    .optional()
    .describe("Omit to return every item on the order (phone-support shortcut)."),
  override_eligibility: z.boolean().optional(),
  initiate_refund: z
    .enum(["none", "pending_return", "immediate"])
    .optional()
    .describe("Optionally open a refund alongside the RMA."),
  actor: z.string().max(120).optional(),
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
        if (orderId) {
          const o = await findOrder(db, orderId, "id");
          query = query.eq("order_id", o["id"] as string);
        }
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
          "id,order_number,status,placed_at,customer_id,total_cents, items:order_items(id,title,isbn,total_cents,quantity, book:books(format)), shipments(delivered_at)",
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

        const requestedItems: Array<{ order_item_id: string; quantity: number }> = [];
        let expected = 0;
        const wanted =
          body.items ?? items.map((i) => ({ order_item_id: i["id"] as string, quantity: i["quantity"] as number }));

        for (const requested of wanted) {
          const match = items.find(
            (i) =>
              (requested.order_item_id && i["id"] === requested.order_item_id) ||
              (requested.isbn && i["isbn"] === requested.isbn) ||
              (requested.title &&
                String(i["title"] ?? "").toLowerCase().includes(requested.title.toLowerCase())),
          );
          if (!match) {
            throw badRequest(
              `Item ${requested.order_item_id ?? requested.isbn ?? requested.title} is not part of this order`,
            );
          }
          const qty = requested.quantity ?? (match["quantity"] as number);
          if (qty > (match["quantity"] as number)) {
            throw badRequest(
              `Requested quantity ${qty} exceeds ordered quantity ${match["quantity"] as number}`,
            );
          }
          const unit = (match["total_cents"] as number) / (match["quantity"] as number);
          expected += Math.round(unit * qty);
          requestedItems.push({ order_item_id: match["id"] as string, quantity: qty });
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
        if (!created) throw conflict("Return could not be created");


        const { error: e2 } = await db.from("return_items").insert(
          requestedItems.map((i) => ({
            return_id: created.id,
            order_item_id: i.order_item_id,
            quantity: i.quantity,
          })),
        );
        dbErr(e2);

        let refund: unknown = null;
        if (body.initiate_refund && body.initiate_refund !== "none") {
          const immediate = body.initiate_refund === "immediate";
          const nowIso = new Date().toISOString();
          const { data: created2 } = await db
            .from("refunds")
            .insert({
              refund_number: `RF-${Math.floor(10000 + Math.random() * 89999)}`,
              order_id: order["id"],
              return_id: created.id,
              amount_cents: expected,
              method: "original_payment",
              status: immediate ? "succeeded" : "pending_return",
              reason: `Return ${rma} — ${body.reason}`,
              processed_at: immediate ? nowIso : null,
            })
            .select("*")
            .single();
          if (created2) {
            await logRefundEvent(db, {
              refund_id: created2.id as string,
              type: "created",
              status_to: created2.status as string,
              actor: body.actor ?? "agent",
              amount_cents: expected,
              note: immediate
                ? `Refund issued immediately alongside return ${rma}`
                : `Refund opened pending receipt of return ${rma}`,
              metadata: { rma_number: rma, reason: body.reason },
            });
            if (immediate) {
              await settleRefund(
                db,
                {
                  id: created2.id as string,
                  refund_number: created2.refund_number as string,
                  amount_cents: expected,
                  method: "original_payment",
                },
                {
                  id: order["id"] as string,
                  order_number: order["order_number"] as string,
                  customer_id: order["customer_id"] as string,
                  total_cents: (order["total_cents"] as number) ?? expected,
                },
              );
            }
            refund = created2;
          }
        }

        const { data: full } = await db
          .from("returns")
          .select(RETURN_SELECT)
          .eq("id", created.id)
          .single();

        return ok(
          { return: full, eligibility, refund, label_url: `https://labels.bookly.example/${rma}.pdf` },
          {},
          201,
        );
      }),
    },
  },
});
