import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, money, qs, when, type ReturnRow } from "@/lib/bookly/api-client";
import { Card, Empty, ErrorNote, Loading, StatusBadge, Table } from "@/components/console/ui";

export const Route = createFileRoute("/admin/returns")({
  component: ReturnsPage,
});

const STATUSES = ["", "requested", "label_created", "in_transit", "received", "refunded", "cancelled", "rejected"];

function ReturnsPage() {
  const [status, setStatus] = useState("");
  const path = `/api/public/v1/returns${qs({ status: status || undefined, limit: 50 })}`;
  const { data, isLoading, error } = useQuery({
    queryKey: ["returns", path],
    queryFn: () => apiGet<ReturnRow[]>(path),
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Returns</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data?.meta.total ?? 0} RMAs on record</p>
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

      <Card>
        {error ? <ErrorNote error={error} /> : isLoading && !data ? <Loading /> : data!.data.length === 0 ? (
          <Empty>No returns match.</Empty>
        ) : (
          <Table head={["RMA", "Order", "Customer", "Reason", "Requested", "Status", "Expected refund"]}>
            {data!.data.map((r) => (
              <tr key={r.id} className="hover:bg-accent/40">
                <td className="px-5 py-2.5 font-mono text-xs font-semibold">{r.rma_number}</td>
                <td className="px-5 py-2.5 font-mono text-xs">
                  {r.order ? (
                    <Link to="/admin/orders/$id" params={{ id: r.order.order_number }} className="underline-offset-4 hover:underline">
                      {r.order.order_number}
                    </Link>
                  ) : "—"}
                </td>
                <td className="px-5 py-2.5">{r.customer?.full_name ?? "—"}</td>
                <td className="px-5 py-2.5 capitalize text-muted-foreground">{(r.reason ?? "—").replace(/_/g, " ")}</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{when(r.requested_at)}</td>
                <td className="px-5 py-2.5"><StatusBadge value={r.status} /></td>
                <td className="px-5 py-2.5 text-right tabular-nums">{money(r.expected_refund_cents)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
