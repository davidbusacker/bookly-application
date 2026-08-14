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
import {
  TRACE_CHANNELS,
  TRACE_OUTCOMES,
  TRACE_ROLES,
  TRACE_SELECT,
  TRACE_STATUSES,
  renderTranscript,
  traceNumber,
} from "@/lib/bookly/traces";

const MessageBody = z.object({
  role: z.enum(TRACE_ROLES).default("agent"),
  speaker: z.string().max(80).optional(),
  content: z.string().max(20000).optional(),
  occurred_at: z.string().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  tool_name: z.string().max(120).optional(),
  tool_input: z.unknown().optional(),
  tool_output: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const CreateBody = z.object({
  subject: z.string().min(3).max(200),
  summary: z.string().max(4000).optional(),
  agent_name: z.string().max(120).optional(),
  agent_version: z.string().max(60).optional(),
  model: z.string().max(120).optional(),
  channel: z.enum(TRACE_CHANNELS).default("chat"),
  customer_email: z.string().email().optional(),
  order_id: z.string().max(80).optional(),
  ticket_id: z.string().max(80).optional(),
  intent: z.string().max(120).optional(),
  intent_confidence: z.number().min(0).max(1).optional(),
  resolution_confidence: z.number().min(0).max(1).optional(),
  outcome: z.enum(TRACE_OUTCOMES).default("resolved"),
  status: z.enum(TRACE_STATUSES).default("completed"),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  escalated: z.boolean().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  started_at: z.string().optional(),
  ended_at: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  messages: z.array(MessageBody).max(400).default([]),
});

export const Route = createFileRoute("/api/public/v1/agent-traces/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),

      GET: handler(async ({ request }) => {
        const sp = searchParams(request);
        const { limit, offset } = pagination(request);
        const db = booklyDb();
        let query = db.from("agent_traces").select(TRACE_SELECT, { count: "exact" });

        const email = sp.get("email");
        if (email) query = query.ilike("customer_email", email);
        const customerId = sp.get("customer_id");
        if (customerId) query = query.eq("customer_id", customerId);
        const ticketId = sp.get("ticket_id");
        if (ticketId) query = query.eq("ticket_id", ticketId);
        const outcome = sp.get("outcome");
        if (outcome) query = query.in("outcome", outcome.split(","));
        const status = sp.get("status");
        if (status) query = query.in("status", status.split(","));
        const channel = sp.get("channel");
        if (channel) query = query.in("channel", channel.split(","));
        const tag = sp.get("tag");
        if (tag) query = query.contains("tags", [tag]);
        const after = sp.get("started_after");
        if (after) query = query.gte("started_at", after);
        const before = sp.get("started_before");
        if (before) query = query.lte("started_at", before);

        const orderRef = sp.get("order_id");
        if (orderRef) {
          if (/^BK-/i.test(orderRef)) {
            const { data: o } = await db
              .from("orders")
              .select("id")
              .eq("order_number", orderRef.toUpperCase())
              .maybeSingle();
            query = query.eq("order_id", o?.id ?? "00000000-0000-0000-0000-000000000000");
          } else {
            query = query.eq("order_id", orderRef);
          }
        }

        const q = sp.get("q");
        if (q) {
          const term = q.replace(/[%,()]/g, " ");
          query = query.or(
            `subject.ilike.%${term}%,summary.ilike.%${term}%,transcript_text.ilike.%${term}%,trace_number.ilike.%${term}%`,
          );
        }

        const { data, error, count } = await query
          .order("started_at", { ascending: false })
          .range(offset, offset + limit - 1);
        dbErr(error);
        return ok(data ?? [], listMeta(count, limit, offset));
      }),

      POST: handler(async ({ request }) => {
        const body = await parseBody(request, CreateBody);
        const db = booklyDb();

        let customerId: string | null = null;
        if (body.customer_email) {
          const { data: c } = await db
            .from("customers")
            .select("id")
            .ilike("email", body.customer_email)
            .maybeSingle();
          customerId = c?.id ?? null;
        }

        let orderId: string | null = null;
        if (body.order_id) {
          const key = /^BK-/i.test(body.order_id) ? "order_number" : "id";
          const { data: o } = await db
            .from("orders")
            .select("id, customer_id")
            .eq(key, key === "order_number" ? body.order_id.toUpperCase() : body.order_id)
            .maybeSingle();
          orderId = o?.id ?? null;
          if (!customerId && o?.customer_id) customerId = o.customer_id as string;
        }

        let ticketId: string | null = null;
        if (body.ticket_id) {
          const key = /^TCK-/i.test(body.ticket_id) ? "ticket_number" : "id";
          const { data: t } = await db
            .from("support_tickets")
            .select("id")
            .eq(key, key === "ticket_number" ? body.ticket_id.toUpperCase() : body.ticket_id)
            .maybeSingle();
          ticketId = t?.id ?? null;
        }

        const startedAt = body.started_at ?? body.messages[0]?.occurred_at ?? new Date().toISOString();
        const endedAt =
          body.ended_at ??
          body.messages[body.messages.length - 1]?.occurred_at ??
          (body.status === "in_progress" ? null : new Date().toISOString());
        const number = traceNumber();
        const toolCalls = body.messages.filter((m) => m.role === "tool").length;

        const transcript = renderTranscript(
          {
            trace_number: number,
            agent_name: body.agent_name ?? "Bookly CX Agent",
            subject: body.subject,
            started_at: startedAt,
          },
          body.messages,
        );

        const { data: trace, error } = await db
          .from("agent_traces")
          .insert({
            trace_number: number,
            agent_name: body.agent_name ?? "Bookly CX Agent",
            agent_version: body.agent_version ?? null,
            model: body.model ?? null,
            channel: body.channel,
            customer_id: customerId,
            customer_email: body.customer_email ?? null,
            order_id: orderId,
            ticket_id: ticketId,
            subject: body.subject,
            summary: body.summary ?? null,
            intent: body.intent ?? null,
            intent_confidence: body.intent_confidence ?? null,
            resolution_confidence: body.resolution_confidence ?? null,
            outcome: body.outcome,
            status: body.status,
            sentiment: body.sentiment ?? null,
            escalated: body.escalated ?? body.outcome === "escalated",
            tags: body.tags ?? [],
            tool_calls: toolCalls,
            message_count: body.messages.length,
            duration_ms:
              endedAt && startedAt ? Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime()) : null,
            started_at: startedAt,
            ended_at: endedAt,
            metadata: body.metadata ?? {},
            transcript_text: transcript,
          })
          .select("id")
          .single();
        dbErr(error);

        if (body.messages.length) {
          const rows = body.messages.map((m, i) => ({
            trace_id: trace!.id,
            seq: i,
            role: m.role,
            speaker: m.speaker ?? null,
            content: m.content ?? "",
            occurred_at: m.occurred_at ?? startedAt,
            duration_ms: m.duration_ms ?? null,
            tool_name: m.tool_name ?? null,
            tool_input: m.tool_input ?? null,
            tool_output: m.tool_output ?? null,
            metadata: m.metadata ?? {},
          }));
          const { error: msgErr } = await db.from("agent_trace_messages").insert(rows);
          dbErr(msgErr);
        }

        const { data: full } = await db.from("agent_traces").select(TRACE_SELECT).eq("id", trace!.id).single();
        return ok(full, { trace_number: number }, 201);
      }),
    },
  },
});
