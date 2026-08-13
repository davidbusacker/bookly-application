import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, qs, when, type Ticket } from "@/lib/bookly/api-client";
import { Card, Empty, ErrorNote, Loading, StatusBadge } from "@/components/console/ui";

export const Route = createFileRoute("/admin/tickets")({
  component: TicketsPage,
});

const STATUSES = ["", "open", "pending", "awaiting_customer", "resolved", "closed"];

function TicketsPage() {
  const [status, setStatus] = useState("");
  const path = `/api/public/v1/support/tickets${qs({ status: status || undefined, limit: 50 })}`;
  const { data, isLoading, error } = useQuery({
    queryKey: ["tickets", path],
    queryFn: () => apiGet<Ticket[]>(path),
    refetchInterval: 8000,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.meta.total ?? 0} tickets · anything the agent files appears here within seconds
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm capitalize"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === "" ? "All statuses" : s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {error ? <ErrorNote error={error} /> : isLoading && !data ? <Loading /> : data!.data.length === 0 ? (
        <Card><Empty>No tickets match.</Empty></Card>
      ) : (
        <div className="space-y-4">
          {data!.data.map((t) => (
            <Card key={t.id}>
              <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
                <span className="font-mono text-xs font-semibold">{t.ticket_number}</span>
                <span className="font-medium">{t.subject}</span>
                <StatusBadge value={t.status} />
                <StatusBadge value={t.priority} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {t.customer?.full_name ?? "Unknown customer"} · {when(t.created_at)}
                  {t.channel ? ` · via ${t.channel}` : ""}
                </span>
              </div>
              <div className="space-y-3 px-5 py-4">
                {(t.events ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages on this ticket.</p>
                ) : (
                  t.events!.map((e) => (
                    <div key={e.id} className="rounded-lg border border-border bg-background px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {e.author ?? "system"} · {e.type ?? "message"} · {when(e.created_at ?? e.occurred_at)}
                      </p>
                      <p className="mt-1 text-sm">{e.body}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
