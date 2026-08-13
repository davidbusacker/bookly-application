import { Fragment, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, money, when, type Refund } from "@/lib/bookly/api-client";
import { Card, Empty, ErrorNote, Loading, StatusBadge, Table } from "@/components/console/ui";
import { RefundTimeline } from "@/components/console/refund-timeline";

export const Route = createFileRoute("/admin/refunds/")({
  component: RefundsPage,
});

function RefundsPage() {
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["refunds", "all"],
    queryFn: () => apiGet<Refund[]>("/api/public/v1/refunds?limit=50"),
    refetchInterval: 10_000,
  });

  const rows = data?.data ?? [];
  const total = rows.reduce((s, r) => s + r.amount_cents, 0);
  const pending = rows.filter((r) => r.status !== "succeeded").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Refunds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.meta.total ?? 0} refunds · {money(total)} shown on this page · {pending} not yet settled
        </p>
      </div>

      <Card>
        {error ? <ErrorNote error={error} /> : isLoading && !data ? <Loading /> : rows.length === 0 ? (
          <Empty>No refunds yet.</Empty>
        ) : (
          <Table head={["", "Refund", "Order", "Method", "Reason", "Created", "Status", "Amount"]}>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="hover:bg-accent/40">
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      aria-expanded={open === r.id}
                      aria-label={`Toggle history for ${r.refund_number}`}
                      onClick={() => setOpen(open === r.id ? null : r.id)}
                      className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
                    >
                      {open === r.id ? "▾" : "▸"}
                    </button>
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs font-semibold">
                    <Link
                      to="/admin/refunds/$id"
                      params={{ id: r.refund_number }}
                      className="underline-offset-4 hover:underline"
                    >
                      {r.refund_number}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs">
                    {r.order ? (
                      <Link to="/admin/orders/$id" params={{ id: r.order.order_number }} className="underline-offset-4 hover:underline">
                        {r.order.order_number}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-2.5 capitalize text-muted-foreground">{(r.method ?? "").replace(/_/g, " ")}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{r.reason ?? "—"}</td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{when(r.created_at)}</td>
                  <td className="px-5 py-2.5"><StatusBadge value={r.status} /></td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{money(r.amount_cents, r.currency)}</td>
                </tr>
                {open === r.id ? (
                  <tr className="bg-muted/30">
                    <td colSpan={8} className="px-6 py-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Decision history
                      </p>
                      <RefundTimeline events={r.events ?? []} />
                      <Link
                        to="/admin/refunds/$id"
                        params={{ id: r.refund_number }}
                        className="mt-3 inline-block text-xs font-medium underline underline-offset-4"
                      >
                        Open refund workspace
                      </Link>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
