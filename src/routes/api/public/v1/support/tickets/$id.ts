import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, notFound, ok, parseBody, preflight } from "@/lib/bookly/http";

const PatchBody = z.object({
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  resolution: z.string().max(2000).optional(),
});

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
          .select("*, customer:customers(id,name,email), order:orders(id,order_number,status)")
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
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), ...body };
        if (body.status === "resolved" || body.status === "closed") {
          patch["resolved_at"] = new Date().toISOString();
        }
        const { data, error } = await db
          .from("support_tickets")
          .update(patch)
          .eq(key, key === "ticket_number" ? id.toUpperCase() : id)
          .select("*")
          .maybeSingle();
        dbErr(error);
        if (!data) throw notFound(`Ticket "${id}"`);
        return ok(data);
      }),
    },
  },
});
