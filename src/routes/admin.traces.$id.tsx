import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, when, type AgentTrace } from "@/lib/bookly/api-client";
import { Card, ErrorNote, Field, Loading, StatusBadge } from "@/components/console/ui";
import { TraceTranscript } from "@/components/console/trace-transcript";

export const Route = createFileRoute("/admin/traces/$id")({
  component: TraceDetail,
});

function TraceDetail() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["agent-trace", id],
    queryFn: () => apiGet<AgentTrace>(`/api/public/v1/agent-traces/${encodeURIComponent(id)}`),
    refetchInterval: 10_000,
  });

  if (error) return <ErrorNote error={error} />;
  if (isLoading && !data) return <Loading />;
  const t = data!.data;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/settings" className="text-xs font-medium underline underline-offset-4">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t.subject}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{t.trace_number}</p>
        {t.summary ? <p className="mt-3 max-w-3xl text-sm">{t.summary}</p> : null}
      </div>

      <Card title="Conversation metadata">
        <dl className="grid gap-4 px-5 py-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Status"><StatusBadge value={t.status} /></Field>
          <Field label="Outcome"><StatusBadge value={t.outcome ?? undefined} /></Field>
          <Field label="Sentiment">{t.sentiment ?? "—"}</Field>
          <Field label="Escalated">{t.escalated ? "Yes" : "No"}</Field>
          <Field label="Agent">{t.agent_name ?? "—"}{t.agent_version ? ` · ${t.agent_version}` : ""}</Field>
          <Field label="Model">{t.model ?? "—"}</Field>
          <Field label="Channel">{t.channel ?? "—"}</Field>
          <Field label="Intent">{t.intent ?? "—"}</Field>
          <Field label="Confidence">
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">
                Show confidence
              </summary>
              <div className="mt-1.5 space-y-1">
                <ConfidenceRow label="Intent" value={t.intent_confidence} />
                <ConfidenceRow label="Resolution" value={t.resolution_confidence} />
              </div>
            </details>
          </Field>
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
              <Link to="/admin/orders/$id" params={{ id: t.order.order_number }} className="font-mono text-xs underline underline-offset-4">
                {t.order.order_number}
              </Link>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Ticket">{t.ticket?.ticket_number ?? "—"}</Field>
          <Field label="Turns">
            {t.message_count ?? t.messages?.length ?? 0} · {t.tool_calls ?? 0} tool calls
          </Field>
          <Field label="Started">{when(t.started_at)}</Field>
          <Field label="Ended">{when(t.ended_at)}</Field>
          <Field label="Duration">
            {typeof t.duration_ms === "number" ? `${Math.round(t.duration_ms / 1000)}s` : "—"}
          </Field>
          <Field label="Tags">{t.tags?.length ? t.tags.join(", ") : "—"}</Field>
        </dl>
      </Card>

      <Card title="Transcript">
        <TraceTranscript messages={t.messages ?? []} />
      </Card>
    </div>
  );
}

function ConfidenceRow({ label, value }: { label: string; value?: number | null | undefined }) {
  const pct = typeof value === "number" ? Math.round(value * 100) : null;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct ?? 0}%` }} />
      </div>
      <span className="font-mono text-xs">{pct === null ? "—" : `${pct}%`}</span>
    </div>
  );
}
