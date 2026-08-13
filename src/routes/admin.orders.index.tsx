import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, money, qs, when, type Order } from "@/lib/bookly/api-client";
import { Card, Empty, ErrorNote, Loading, StatusBadge, Table } from "@/components/console/ui";

export const Route = createFileRoute("/admin/orders/")({
  component: OrdersPage,
});

const STATUSES = ["", "pending", "processing", "shipped", "delivered", "cancelled", "returned"];
const LIMIT = 25;

function OrdersPage() {
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("");
  const [offset, setOffset] = useState(0);

  const path = `/api/public/v1/orders${qs({ status: status || undefined, email: email || undefined, limit: LIMIT, offset })}`;
  const { data, isLoading, error } = useQuery({
    queryKey: ["orders", path],
    queryFn: () => apiGet<Order[]>(path),
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
  });

  const total = data?.meta.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} orders · updates live as the agent works</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={email}
            onChange={(e) => { setEmail(e.target.value); setOffset(0); }}
            placeholder="Filter by customer email"
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setOffset(0); }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm capitalize"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s === "" ? "All statuses" : s}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        {error ? (
          <ErrorNote error={error} />
        ) : isLoading && !data ? (
          <Loading />
        ) : data!.data.length === 0 ? (
          <Empty>No orders match those filters.</Empty>
        ) : (
          <Table head={["Order", "Customer", "Items", "Placed", "Status", "Total"]}>
            {data!.data.map((o) => (
              <tr key={o.id} className="hover:bg-accent/40">
                <td className="px-5 py-2.5 font-mono text-xs">
                  <Link to="/admin/orders/$id" params={{ id: o.order_number }} className="font-semibold underline-offset-4 hover:underline">
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-5 py-2.5">
                  <div>{o.customer?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{o.customer?.email}</div>
                </td>
                <td className="px-5 py-2.5 text-muted-foreground">{o.items?.length ?? 0}</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{when(o.placed_at)}</td>
                <td className="px-5 py-2.5"><StatusBadge value={o.status} /></td>
                <td className="px-5 py-2.5 text-right tabular-nums">{money(o.total_cents, o.currency)}</td>
              </tr>
            ))}
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
          <span className="text-muted-foreground">
            {total === 0 ? "0" : `${offset + 1}–${Math.min(offset + LIMIT, total)}`} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
              className="rounded-md border border-border px-3 py-1.5 font-medium disabled:opacity-40 hover:bg-accent"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + LIMIT)}
              disabled={!data?.meta.has_more}
              className="rounded-md border border-border px-3 py-1.5 font-medium disabled:opacity-40 hover:bg-accent"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
