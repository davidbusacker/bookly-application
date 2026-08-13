import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { apiGet, money, when, type Order, type Refund, type ReturnRow, type Transaction } from "@/lib/bookly/api-client";
import { Card, Empty, ErrorNote, Field, Loading, StatusBadge, Table } from "@/components/console/ui";

export const Route = createFileRoute("/admin/orders/$id")({
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();

  const [orderQ, returnsQ, refundsQ, txQ] = useQueries({
    queries: [
      { queryKey: ["order", id], queryFn: () => apiGet<Order>(`/api/public/v1/orders/${id}`), refetchInterval: 8000 },
      { queryKey: ["order", id, "returns"], queryFn: () => apiGet<ReturnRow[]>(`/api/public/v1/returns?order_id=${id}`), refetchInterval: 8000 },
      { queryKey: ["order", id, "refunds"], queryFn: () => apiGet<Refund[]>(`/api/public/v1/refunds?order_id=${id}`), refetchInterval: 8000 },
      { queryKey: ["order", id, "tx"], queryFn: () => apiGet<Transaction[]>(`/api/public/v1/transactions?order_id=${id}`), refetchInterval: 8000 },
    ],
  });

  if (orderQ.error) return <ErrorNote error={orderQ.error} />;
  if (!orderQ.data) return <Loading label="Loading order…" />;

  const o = orderQ.data.data;
  const addr = o.shipping_address ?? {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/admin/orders" className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">
            ← All orders
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold tracking-tight">
            {o.order_number} <StatusBadge value={o.status} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed {when(o.placed_at)}</p>
        </div>
        <a
          href={`/api/public/v1/orders/${o.order_number}`}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          View API response
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Customer" className="lg:col-span-1">
          <dl className="space-y-3 px-5 py-4">
            <Field label="Name">
              {o.customer ? (
                <Link to="/admin/customers/$id" params={{ id: o.customer.id }} className="underline underline-offset-4">
                  {o.customer.full_name}
                </Link>
              ) : "—"}
            </Field>
            <Field label="Email">{o.customer?.email ?? "—"}</Field>
            <Field label="Tier"><span className="capitalize">{o.customer?.member_tier ?? "—"}</span></Field>
            <Field label="Ship to">
              <span className="text-muted-foreground">
                {[addr.name, addr.line1, addr.line2, [addr.city, addr.state, addr.postal_code].filter(Boolean).join(", "), addr.country]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </span>
            </Field>
          </dl>
        </Card>

        <Card title="Payment" className="lg:col-span-2">
          <dl className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
            <Field label="Subtotal">{money(o.subtotal_cents, o.currency)}</Field>
            <Field label="Shipping">{money(o.shipping_cents, o.currency)}</Field>
            <Field label="Tax">{money(o.tax_cents, o.currency)}</Field>
            <Field label="Discount">−{money(o.discount_cents, o.currency)}</Field>
            <Field label="Total"><span className="font-semibold">{money(o.total_cents, o.currency)}</span></Field>
            <Field label="Method">{o.payment_method ?? "—"}</Field>
            <Field label="Cancelled">{o.cancelled_at ? when(o.cancelled_at) : "—"}</Field>
            <Field label="Updated">{when(o.updated_at)}</Field>
          </dl>
        </Card>
      </div>

      <Card title="Items">
        {(o.items?.length ?? 0) === 0 ? <Empty /> : (
          <Table head={["Title", "ISBN", "Qty", "Unit", "Total"]}>
            {o.items!.map((i) => (
              <tr key={i.id}>
                <td className="px-5 py-2.5 font-medium">{i.title}</td>
                <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{i.isbn ?? "—"}</td>
                <td className="px-5 py-2.5 tabular-nums">{i.quantity}</td>
                <td className="px-5 py-2.5 tabular-nums">{money(i.unit_price_cents, o.currency)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{money(i.total_cents, o.currency)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Shipments">
        {(o.shipments?.length ?? 0) === 0 ? <Empty>Nothing shipped yet.</Empty> : (
          <div className="divide-y divide-border">
            {o.shipments!.map((s) => (
              <div key={s.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <StatusBadge value={s.status} />
                  <span className="font-medium">{s.carrier ?? "Carrier"}</span>
                  <span className="font-mono text-xs text-muted-foreground">{s.tracking_number ?? "no tracking"}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.shipped_at ? `Shipped ${when(s.shipped_at)}` : "Not shipped"}
                    {s.delivered_at ? ` · Delivered ${when(s.delivered_at)}` : s.estimated_delivery ? ` · ETA ${when(s.estimated_delivery)}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Returns">
          {(returnsQ.data?.data.length ?? 0) === 0 ? <Empty>No returns for this order.</Empty> : (
            <Table head={["RMA", "Status", "Reason", "Expected"]}>
              {returnsQ.data!.data.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-2.5 font-mono text-xs font-semibold">{r.rma_number}</td>
                  <td className="px-5 py-2.5"><StatusBadge value={r.status} /></td>
                  <td className="px-5 py-2.5 capitalize text-muted-foreground">{(r.reason ?? "—").replace(/_/g, " ")}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{money(r.expected_refund_cents)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title="Refunds">
          {(refundsQ.data?.data.length ?? 0) === 0 ? <Empty>No refunds issued.</Empty> : (
            <Table head={["Refund", "Status", "Method", "Amount"]}>
              {refundsQ.data!.data.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-2.5 font-mono text-xs font-semibold">{r.refund_number}</td>
                  <td className="px-5 py-2.5"><StatusBadge value={r.status} /></td>
                  <td className="px-5 py-2.5 capitalize text-muted-foreground">{(r.method ?? "").replace(/_/g, " ")}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{money(r.amount_cents, r.currency)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <Card title="Transaction ledger">
        {(txQ.data?.data.length ?? 0) === 0 ? <Empty>No transactions.</Empty> : (
          <Table head={["Txn", "Type", "Status", "When", "Amount"]}>
            {txQ.data!.data.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-2.5 font-mono text-xs font-semibold">{t.transaction_number}</td>
                <td className="px-5 py-2.5 capitalize">{t.type.replace(/_/g, " ")}</td>
                <td className="px-5 py-2.5"><StatusBadge value={t.status} /></td>
                <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{when(t.occurred_at)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{money(t.amount_cents, t.currency)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
