import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { apiGet, money, when, type Order, type ReturnRow, type Refund } from "@/lib/bookly/api-client";
import { Card, Empty, ErrorNote, Loading, Stat, StatusBadge, Table } from "@/components/console/ui";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

const REFRESH = 10_000;

function Overview() {
  const results = useQueries({
    queries: [
      { queryKey: ["orders", "recent"], queryFn: () => apiGet<Order[]>("/api/public/v1/orders?limit=8"), refetchInterval: REFRESH },
      { queryKey: ["orders", "open"], queryFn: () => apiGet<Order[]>("/api/public/v1/orders?status=pending,processing,shipped&limit=1"), refetchInterval: REFRESH },
      { queryKey: ["returns", "recent"], queryFn: () => apiGet<ReturnRow[]>("/api/public/v1/returns?limit=6"), refetchInterval: REFRESH },
      { queryKey: ["refunds", "recent"], queryFn: () => apiGet<Refund[]>("/api/public/v1/refunds?limit=6"), refetchInterval: REFRESH },
      { queryKey: ["customers", "count"], queryFn: () => apiGet<unknown[]>("/api/public/v1/customers?limit=1"), refetchInterval: REFRESH },
    ],
  });

  const [orders, openOrders, returns, refunds, customers] = results;
  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error;

  const refundTotal = (refunds.data?.data ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Store overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live back-office view. Everything here reads the same public API your agent calls — refreshes every 10s.
        </p>
      </div>

      {error ? <ErrorNote error={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total orders" value={orders.data?.meta.total ?? "—"} hint="all time" />
        <Stat label="Open orders" value={openOrders.data?.meta.total ?? "—"} hint="pending, processing or shipped" />
        <Stat label="Open returns" value={returns.data?.meta.total ?? "—"} hint="RMAs on record" />
        <Stat label="Customers" value={customers.data?.meta.total ?? "—"} hint="registered accounts" />
      </div>

      <Card
        title="Latest orders"
        action={<Link to="/admin/orders" className="text-xs font-medium underline underline-offset-4">View all</Link>}
      >
        {isLoading && !orders.data ? (
          <Loading />
        ) : (orders.data?.data.length ?? 0) === 0 ? (
          <Empty />
        ) : (
          <Table head={["Order", "Customer", "Placed", "Status", "Total"]}>
            {orders.data!.data.map((o) => (
              <tr key={o.id} className="hover:bg-accent/40">
                <td className="px-5 py-2.5 font-mono text-xs">
                  <Link to="/admin/orders/$id" params={{ id: o.order_number }} className="font-semibold underline-offset-4 hover:underline">
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-5 py-2.5">{o.customer?.full_name ?? "—"}</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{when(o.placed_at)}</td>
                <td className="px-5 py-2.5"><StatusBadge value={o.status} /></td>
                <td className="px-5 py-2.5 text-right tabular-nums">{money(o.total_cents, o.currency)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Recent returns"
          action={<Link to="/admin/returns" className="text-xs font-medium underline underline-offset-4">View all</Link>}
        >
          {(returns.data?.data.length ?? 0) === 0 ? (
            <Empty>No returns yet.</Empty>
          ) : (
            <Table head={["RMA", "Order", "Status", "Expected"]}>
              {returns.data!.data.map((r) => (
                <tr key={r.id} className="hover:bg-accent/40">
                  <td className="px-5 py-2.5 font-mono text-xs font-semibold">{r.rma_number}</td>
                  <td className="px-5 py-2.5 font-mono text-xs">{r.order?.order_number ?? "—"}</td>
                  <td className="px-5 py-2.5"><StatusBadge value={r.status} /></td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{money(r.expected_refund_cents)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card
          title="Recent refunds"
          action={<span className="text-xs text-muted-foreground">{money(refundTotal)} shown</span>}
        >
          {(refunds.data?.data.length ?? 0) === 0 ? (
            <Empty>No refunds yet.</Empty>
          ) : (
            <Table head={["Refund", "Order", "Method", "Amount"]}>
              {refunds.data!.data.map((r) => (
                <tr key={r.id} className="hover:bg-accent/40">
                  <td className="px-5 py-2.5 font-mono text-xs font-semibold">{r.refund_number}</td>
                  <td className="px-5 py-2.5 font-mono text-xs">{r.order?.order_number ?? "—"}</td>
                  <td className="px-5 py-2.5 capitalize text-muted-foreground">{(r.method ?? "").replace(/_/g, " ")}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{money(r.amount_cents, r.currency)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

    </div>
  );
}
