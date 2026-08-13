import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, notFound, ok, parseBody, preflight } from "@/lib/bookly/http";

const PatchBody = z.object({
  status: z.enum(["open", "pending", "resolved", "escalated", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  resolution: z.string().max(2000).optional(),
});

const TICKET_SELECT =
  "*, customer:customers(id,full_name,email), order:orders(id,order_number,status), events:ticket_events(*)";

export const Route = createFileRoute("/api/public/v1/support/tickets/$id")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ params }) => {
        const id = (params as { id: string }).id;
        const db = booklyDb();
        const key = /^TCK-/i.test(id) ? "ticket_number" : "id";
        const { data, error } = await db
          .from("support_tickets")
          .select(TICKET_SELECT)
          .eq(key, key === "ticket_number" ? id.toUpperCase() : id)
          .maybeSingle();
        dbErr(error);
        if (!data) throw notFound(`Ticket "${id}"`);
        return ok(data);
      }),

      PATCH: handler(async ({ request, params }) => {
        const body = await parseBody(request, PatchBody);
        const id = (params as { id: string }).id;
        const db = booklyDb();
        const key = /^TCK-/i.test(id) ? "ticket_number" : "id";
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (body.status) patch["status"] = body.status;
        if (body.priority) patch["priority"] = body.priority;

        const { data, error } = await db
          .from("support_tickets")
          .update(patch)
          .eq(key, key === "ticket_number" ? id.toUpperCase() : id)
          .select("id")
          .maybeSingle();
        dbErr(error);
        if (!data) throw notFound(`Ticket "${id}"`);

        if (body.resolution) {
          await db
            .from("ticket_events")
            .insert({ ticket_id: data.id, type: "resolution", author: "agent", body: body.resolution });
        }

        const { data: full } = await db.from("support_tickets").select(TICKET_SELECT).eq("id", data.id).single();
        return ok(full);
      }),
    },
  },
});
