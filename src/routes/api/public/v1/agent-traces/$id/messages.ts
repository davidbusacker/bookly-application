import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, notFound, ok, parseBody, preflight } from "@/lib/bookly/http";
import { TRACE_ROLES, TRACE_SELECT, renderTranscript, type TraceMessageInput } from "@/lib/bookly/traces";

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

const AppendBody = z.object({
  messages: z.array(MessageBody).min(1).max(200),
  status: z.enum(["in_progress", "completed", "failed"]).optional(),
});

export const Route = createFileRoute("/api/public/v1/agent-traces/$id/messages")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),

      POST: handler(async ({ request, params }) => {
        const body = await parseBody(request, AppendBody);
        const raw = (params as { id: string }).id;
        const db = booklyDb();
        const key = /^TRC-/i.test(raw) ? "trace_number" : "id";
        const { data: trace, error: findErr } = await db
          .from("agent_traces")
          .select("id, trace_number, agent_name, subject, started_at")
          .eq(key, key === "trace_number" ? raw.toUpperCase() : raw)
          .maybeSingle();
        dbErr(findErr);
        if (!trace) throw notFound(`Agent trace "${raw}"`);

        const { data: existing } = await db
          .from("agent_trace_messages")
          .select("seq")
          .eq("trace_id", trace.id)
          .order("seq", { ascending: false })
          .limit(1);
        const nextSeq = ((existing?.[0]?.seq as number | undefined) ?? -1) + 1;

        const rows = body.messages.map((m, i) => ({
          trace_id: trace.id,
          seq: nextSeq + i,
          role: m.role,
          speaker: m.speaker ?? null,
          content: m.content ?? "",
          occurred_at: m.occurred_at ?? new Date().toISOString(),
          duration_ms: m.duration_ms ?? null,
          tool_name: m.tool_name ?? null,
          tool_input: m.tool_input ?? null,
          tool_output: m.tool_output ?? null,
          metadata: m.metadata ?? {},
        }));
        const { error } = await db.from("agent_trace_messages").insert(rows);
        dbErr(error);

        const { data: all } = await db
          .from("agent_trace_messages")
          .select("*")
          .eq("trace_id", trace.id)
          .order("seq", { ascending: true });

        const list = (all ?? []) as unknown as TraceMessageInput[];
        const lastAt = rows[rows.length - 1]!.occurred_at;
        await db
          .from("agent_traces")
          .update({
            message_count: list.length,
            tool_calls: list.filter((m) => m.role === "tool").length,
            ...(body.status ? { status: body.status } : {}),
            ended_at: lastAt,
            duration_ms: Math.max(0, new Date(lastAt).getTime() - new Date(trace.started_at as string).getTime()),
            transcript_text: renderTranscript(
              {
                trace_number: trace.trace_number as string,
                agent_name: trace.agent_name as string,
                subject: trace.subject as string,
                started_at: trace.started_at as string,
              },
              list,
            ),
          })
          .eq("id", trace.id);

        const { data: full } = await db.from("agent_traces").select(TRACE_SELECT).eq("id", trace.id).single();
        return ok(full, { appended: rows.length }, 201);
      }),
    },
  },
});
