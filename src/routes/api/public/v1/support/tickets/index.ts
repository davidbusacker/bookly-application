import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import {
  dbErr,
  handler,
  listMeta,
  ok,
  pagination,
  parseBody,
  preflight,
  searchParams,
} from "@/lib/bookly/http";

const CreateBody = z.object({
  customer_email: z.string().email(),
  subject: z.string().min(3).max(200),
  body: z.string().max(4000).optional(),
  category: z.enum(["order_status", "return", "refund", "shipping", "account", "other"]).default("other"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  order_id: z.string().uuid().optional(),
});

const TICKET_SELECT =
  "*, customer:customers(id,full_name,email), order:orders(id,order_number,status), events:ticket_events(*)";

export const Route = createFileRoute("/api/public/v1/support/tickets/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ request }) => {
        const sp = searchParams(request);
        const { limit, offset } = pagination(request);
        const db = booklyDb();
        let query = db.from("support_tickets").select(TICKET_SELECT, { count: "exact" });
        const status = sp.get("status");
        if (status) query = query.in("status", status.split(","));
        const email = sp.get("email");
        if (email) {
          const { data: c } = await db.from("customers").select("id").eq("email", email).maybeSingle();
          query = query.eq("customer_id", c?.id ?? "00000000-0000-0000-0000-000000000000");
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
        const { data: customer } = await db
          .from("customers")
          .select("id")
          .eq("email", body.customer_email)
          .maybeSingle();

        const { data, error } = await db
          .from("support_tickets")
          .insert({
            ticket_number: `TCK-${Math.floor(10000 + Math.random() * 89999)}`,
            customer_id: customer?.id ?? null,
            order_id: body.order_id ?? null,
            subject: body.subject,
            category: body.category,
            priority: body.priority,
            status: "open",
            channel: "api",
          })
          .select("id")
          .single();
        dbErr(error);

        if (data && body.body) {
          await db
            .from("ticket_events")
            .insert({ ticket_id: data.id, type: "message", author: "customer", body: body.body });
        }

        const { data: full } = await db.from("support_tickets").select(TICKET_SELECT).eq("id", data!.id).single();
        return ok(full, { customer_email: body.customer_email }, 201);
      }),
    },
  },
});
