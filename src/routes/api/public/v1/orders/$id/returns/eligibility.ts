import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import { handler, ok, parseBody, preflight } from "@/lib/bookly/http";
import { findOrder } from "@/lib/bookly/orders";
import { RETURN_REASONS, evaluateReturnEligibility } from "@/lib/bookly/rules";

const Body = z.object({ reason: z.enum(RETURN_REASONS).optional() }).default({});

export const Route = createFileRoute("/api/public/v1/orders/$id/returns/eligibility")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: handler(async ({ request, params }) => {
        let body: z.infer<typeof Body> = {};
        if (request.headers.get("content-length") !== "0") {
          try {
            body = await parseBody(request, Body);
          } catch {
            body = {};
          }
        }
        const db = booklyDb();
        const order = await findOrder(
          db,
          (params as { id: string }).id,
          "id,order_number,status,placed_at,total_cents, items:order_items(id,title,isbn,quantity,total_cents, book:books(format)), shipments(delivered_at)",
        );

        const items = (order["items"] ?? []) as Array<Record<string, unknown>>;
        const shipments = (order["shipments"] ?? []) as Array<{ delivered_at: string | null }>;
        const deliveredAt = shipments.find((s) => s.delivered_at)?.delivered_at ?? null;
        const formats = items
          .map((i) => (i["book"] as { format?: string } | null)?.format)
          .filter((f): f is string => Boolean(f));

        const result = evaluateReturnEligibility({
          status: order["status"] as string,
          deliveredAt,
          placedAt: order["placed_at"] as string,
          reason: body.reason,
          itemFormats: formats,
        });

        return ok({
          order_number: order["order_number"],
          order_status: order["status"],
          delivered_at: deliveredAt,
          eligibility: result,
          eligible_items: items.map((i) => ({
            order_item_id: i["id"],
            title: i["title"],
            quantity: i["quantity"],
            refundable_cents: i["total_cents"],
            returnable: (i["book"] as { format?: string } | null)?.format !== "ebook",
          })),
        });
      }),
    },
  },
});
