import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Phone } from "lucide-react";
import { apiGet, qs, when, type AgentTrace } from "@/lib/bookly/api-client";
import { Card, Empty, ErrorNote, Loading, StatusBadge, Table } from "@/components/console/ui";
import { INTENTS, traceChannel, traceIntent } from "@/lib/decagon/insights";

export const Route = createFileRoute("/decagon/convos/")({
  head: () => ({
    meta: [
      { title: "Decagon Convos — Bookly AI Support Conversations" },
      {
        name: "description",
        content:
          "Every conversation Bookly's AI support agent handled, with intent, outcome, channel, confidence and the full turn-by-turn transcript.",
      },
      { property: "og:title", content: "Decagon Convos" },
      { property: "og:description", content: "Search and audit every AI support conversation for Bookly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Convos,
});

const OUTCOMES = ["", "resolved", "refund_issued", "return_created", "escalated", "deflected", "unresolved"];

function Convos() {
  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState("");
  const [intent, setIntent] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["decagon-convos", q, outcome],
    queryFn: () => apiGet<AgentTrace[]>(`/api/public/v1/agent-traces${qs({ q, outcome, limit: 100 })}`),
    refetchInterval: 20_000,
  });

  const rows = (data?.data ?? []).filter((t) => !intent || traceIntent(t) === intent);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Convos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every conversation the Bookly CX agent handled, logged back through the public API.
        </p>
      </div>

      {error ? <ErrorNote error={error} /> : null}

      <Card title={`Conversations (${rows.length})`}>
        <div className="space-y-3 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search subject, summary or transcript…"
              className="w-72 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">All intents</option>
              {INTENTS.map((i) => (
                <option key={i.key} value={i.key}>
                  {i.label}
                </option>
              ))}
            </select>
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
          ) : rows.length === 0 ? (
            <Empty>No conversations match.</Empty>
          ) : (
            <Table head={["Convo", "Subject", "Customer", "Channel", "Outcome", "Turns", "Started"]}>
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-accent/40">
                  <td className="px-5 py-2.5 font-mono text-xs">
                    <Link
                      to="/decagon/convos/$id"
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
                  <td className="px-5 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      {traceChannel(t) === "voice" ? <Phone size={13} /> : <MessageSquare size={13} />}
                      {traceChannel(t) === "voice" ? "Phone" : "Chat"}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <StatusBadge value={t.outcome ?? t.status} />
                  </td>
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
    </div>
  );
}
