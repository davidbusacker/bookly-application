import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, notFound, ok, parseBody, preflight } from "@/lib/bookly/http";
import { TRACE_OUTCOMES, TRACE_SELECT, TRACE_STATUSES } from "@/lib/bookly/traces";

const PatchBody = z.object({
  summary: z.string().max(4000).optional(),
  outcome: z.enum(TRACE_OUTCOMES).optional(),
  status: z.enum(TRACE_STATUSES).optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  escalated: z.boolean().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  ended_at: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

async function resolveTraceId(db: ReturnType<typeof booklyDb>, id: string): Promise<string> {
  const key = /^TRC-/i.test(id) ? "trace_number" : "id";
  const { data, error } = await db
    .from("agent_traces")
    .select("id")
    .eq(key, key === "trace_number" ? id.toUpperCase() : id)
    .maybeSingle();
  dbErr(error);
  if (!data) throw notFound(`Agent trace "${id}"`);
  return data.id as string;
}

export const Route = createFileRoute("/api/public/v1/agent-traces/$id/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),

      GET: handler(async ({ params }) => {
        const db = booklyDb();
        const id = await resolveTraceId(db, (params as { id: string }).id);
        const { data, error } = await db.from("agent_traces").select(TRACE_SELECT).eq("id", id).single();
        dbErr(error);
        return ok(data);
      }),

      PATCH: handler(async ({ request, params }) => {
        const body = await parseBody(request, PatchBody);
        const db = booklyDb();
        const id = await resolveTraceId(db, (params as { id: string }).id);
        const patch: Record<string, unknown> = {};
        for (const k of ["summary", "outcome", "status", "sentiment", "escalated", "tags", "ended_at", "metadata"] as const) {
          const v = body[k];
          if (v !== undefined) patch[k] = v;
        }
        const { error } = await db.from("agent_traces").update(patch).eq("id", id);
        dbErr(error);
        const { data } = await db.from("agent_traces").select(TRACE_SELECT).eq("id", id).single();
        return ok(data);
      }),
    },
  },
});
