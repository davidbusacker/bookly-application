import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, qs, when, type AgentTrace } from "@/lib/bookly/api-client";
import { Card, Empty, ErrorNote, Loading, StatusBadge, Table } from "@/components/console/ui";

const OUTCOMES = ["", "resolved", "refund_issued", "return_created", "escalated", "deflected", "unresolved"];

export function AgentTracesTile() {
  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["agent-traces", q, outcome],
    queryFn: () => apiGet<AgentTrace[]>(`/api/public/v1/agent-traces${qs({ q, outcome, limit: 25 })}`),
    refetchInterval: 10_000,
  });

  return (
    <Card title={`Agent traces${data ? ` (${data.meta.total ?? data.data.length})` : ""}`}>
      <div className="space-y-3 px-5 py-4">
        {error ? <ErrorNote error={error} /> : null}

        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subject, summary or transcript…"
            className="w-72 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o ? o.replace(/_/g, " ") : "All outcomes"}
              </option>
            ))}
          </select>
        </div>

        {isLoading && !data ? (
          <Loading />
        ) : (data?.data.length ?? 0) === 0 ? (
          <Empty>No agent traces logged yet.</Empty>
        ) : (
          <Table head={["Trace", "Subject", "Customer", "Outcome", "Turns", "Started"]}>
            {data!.data.map((t) => (
              <tr key={t.id} className="hover:bg-accent/40">
                <td className="px-5 py-2.5 font-mono text-xs">
                  <Link
                    to="/admin/traces/$id"
                    params={{ id: t.trace_number }}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {t.trace_number}
                  </Link>
                </td>
                <td className="px-5 py-2.5">
                  <span className="font-medium">{t.subject}</span>
                  {t.summary ? (
                    <span className="mt-0.5 block max-w-md truncate text-xs text-muted-foreground">{t.summary}</span>
                  ) : null}
                </td>
                <td className="px-5 py-2.5 text-muted-foreground">{t.customer?.full_name ?? "—"}</td>
                <td className="px-5 py-2.5"><StatusBadge value={t.outcome ?? t.status} /></td>
                <td className="px-5 py-2.5 tabular-nums text-muted-foreground">
                  {t.message_count ?? t.messages?.length ?? 0}
                  <span className="ml-1 text-xs">({t.tool_calls ?? 0} tools)</span>
                </td>
                <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{when(t.started_at)}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </Card>
  );
}
