import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Phone } from "lucide-react";
import { apiGet, when, type AgentTrace } from "@/lib/bookly/api-client";
import { Card, ErrorNote, Field, Loading, StatusBadge } from "@/components/console/ui";
import { TraceTranscript } from "@/components/console/trace-transcript";
import { traceChannel } from "@/lib/decagon/insights";

export const Route = createFileRoute("/decagon/convos/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Convo ${params.id} — Decagon · Bookly` },
      { name: "description", content: `Full transcript and QA details for Bookly AI support conversation ${params.id}.` },
      { property: "og:title", content: `Convo ${params.id} — Decagon` },
      { property: "og:description", content: "Turn-by-turn AI support conversation transcript." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConvoDetail,
});

function ConvoDetail() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["decagon-convo", id],
    queryFn: () => apiGet<AgentTrace>(`/api/public/v1/agent-traces/${encodeURIComponent(id)}`),
  });

  if (error) return <ErrorNote error={error} />;
  if (isLoading && !data) return <Loading />;
  const t = data!.data;
  const channel = traceChannel(t);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/decagon/convos" className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4">
          <ArrowLeft size={12} /> Convos
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t.subject}</h1>
        <p className="mt-1 flex items-center gap-2 font-mono text-sm text-muted-foreground">
          {t.trace_number}
          <span className="inline-flex items-center gap-1 font-sans text-xs">
            {channel === "voice" ? <Phone size={12} /> : <MessageSquare size={12} />}
            {channel === "voice" ? "Phone call" : "Chat"}
          </span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card title="Transcript">
          <TraceTranscript messages={t.messages ?? []} />
        </Card>

        <div className="space-y-6">
          <Card title="Overview">
            <div className="space-y-4 px-5 py-4 text-sm">
              {t.summary ? <p className="leading-relaxed">{t.summary}</p> : null}
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <Field label="Outcome"><StatusBadge value={t.outcome ?? t.status} /></Field>
                <Field label="Intent">{t.intent?.replace(/_/g, " ") ?? "—"}</Field>
                <Field label="Sub-reason">
                  {String((t.metadata as Record<string, unknown> | null)?.["sub_reason"] ?? "—").replace(/_/g, " ")}
                </Field>
                <Field label="Sentiment">{t.sentiment ?? "—"}</Field>
                <Field label="Escalated">{t.escalated ? "Yes" : "No"}</Field>
                <Field label="Customer">
                  {t.customer ? (
                    <Link to="/admin/customers/$id" params={{ id: t.customer.id }} className="underline underline-offset-4">
                      {t.customer.full_name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Order">
                  {t.order ? (
                    <Link
                      to="/admin/orders/$id"
                      params={{ id: t.order.order_number }}
                      className="font-mono text-xs underline underline-offset-4"
                    >
                      {t.order.order_number}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Agent">
                  {t.agent_name ?? "—"}
                  {t.agent_version ? ` · ${t.agent_version}` : ""}
                </Field>
                <Field label="Model">{t.model ?? "—"}</Field>
                <Field label="Turns">
                  {t.message_count ?? t.messages?.length ?? 0} · {t.tool_calls ?? 0} tool calls
                </Field>
                <Field label="Started">{when(t.started_at)}</Field>
                <Field label="Duration">
                  {typeof t.duration_ms === "number" ? `${Math.round(t.duration_ms / 1000)}s` : "—"}
                </Field>
                <Field label="Tags">{t.tags?.length ? t.tags.join(", ") : "—"}</Field>
              </dl>
            </div>
          </Card>

          <Card title="QA · confidence">
            <div className="space-y-3 px-5 py-4">
              <ConfidenceRow label="Intent" value={t.intent_confidence} />
              <ConfidenceRow label="Resolution" value={t.resolution_confidence} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ConfidenceRow({ label, value }: { label: string; value?: number | null | undefined }) {
  const pct = typeof value === "number" ? Math.round(value * 100) : null;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct ?? 0}%` }} />
      </div>
      <span className="font-mono text-xs">{pct === null ? "—" : `${pct}%`}</span>
    </div>
  );
}
