import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { apiGet, money, when, type Customer, type Order, type Ticket } from "@/lib/bookly/api-client";
import { Card, Empty, ErrorNote, Field, Loading, StatusBadge, Table } from "@/components/console/ui";

export const Route = createFileRoute("/admin/customers/$id")({
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const [custQ, ordersQ] = useQueries({
    queries: [
      { queryKey: ["customer", id], queryFn: () => apiGet<Customer>(`/api/public/v1/customers/${id}`), refetchInterval: 10_000 },
      { queryKey: ["customer", id, "orders"], queryFn: () => apiGet<Order[]>(`/api/public/v1/customers/${id}/orders?limit=50`), refetchInterval: 10_000 },
      { queryKey: ["customer", id, "tickets"], queryFn: () => apiGet<Ticket[]>(`/api/public/v1/support/tickets?customer_id=${id}&limit=20`), refetchInterval: 10_000 },
    ],
  });

  if (custQ.error) return <ErrorNote error={custQ.error} />;
  if (!custQ.data) return <Loading label="Loading customer…" />;
  const c = custQ.data.data;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/customers" className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">
          ← All customers
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{c.full_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{c.email}</p>
      </div>

      <Card title="Profile">
        <dl className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
          <Field label="Phone">{c.phone ?? "—"}</Field>
          <Field label="Tier"><span className="capitalize">{c.member_tier ?? "—"}</span></Field>
          <Field label="Store credit">{money(c.store_credit_cents ?? 0)}</Field>
          <Field label="Member since">{when(c.created_at)}</Field>
          <Field label="Address">
            <span className="text-muted-foreground">
              {[c.address_line1, c.address_line2, [c.city, c.state, c.postal_code].filter(Boolean).join(", "), c.country]
                .filter(Boolean)
                .join(" · ") || "—"}
            </span>
          </Field>
          <Field label="Marketing opt-in">{c.marketing_opt_in ? "Yes" : "No"}</Field>
        </dl>
      </Card>

      <Card title="Order history">
        {(ordersQ.data?.data.length ?? 0) === 0 ? <Empty>No orders.</Empty> : (
          <Table head={["Order", "Placed", "Status", "Items", "Total"]}>
            {ordersQ.data!.data.map((o) => (
              <tr key={o.id} className="hover:bg-accent/40">
                <td className="px-5 py-2.5 font-mono text-xs">
                  <Link to="/admin/orders/$id" params={{ id: o.order_number }} className="font-semibold underline-offset-4 hover:underline">
                    {o.order_number}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{when(o.placed_at)}</td>
                <td className="px-5 py-2.5"><StatusBadge value={o.status} /></td>
                <td className="px-5 py-2.5 text-muted-foreground">{o.items?.length ?? 0}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{money(o.total_cents, o.currency)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
