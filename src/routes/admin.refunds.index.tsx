import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, money, when, type Refund } from "@/lib/bookly/api-client";
import { Card, Empty, ErrorNote, Loading, StatusBadge, Table } from "@/components/console/ui";

export const Route = createFileRoute("/admin/refunds/")({
  component: RefundsPage,
});

function RefundsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["refunds", "all"],
    queryFn: () => apiGet<Refund[]>("/api/public/v1/refunds?limit=50"),
    refetchInterval: 10_000,
  });

  const total = (data?.data ?? []).reduce((s, r) => s + r.amount_cents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Refunds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.meta.total ?? 0} refunds · {money(total)} shown on this page
        </p>
      </div>

      <Card>
        {error ? <ErrorNote error={error} /> : isLoading && !data ? <Loading /> : data!.data.length === 0 ? (
          <Empty>No refunds yet.</Empty>
        ) : (
          <Table head={["Refund", "Order", "Method", "Reason", "Created", "Status", "Amount"]}>
            {data!.data.map((r) => (
              <tr key={r.id} className="hover:bg-accent/40">
                <td className="px-5 py-2.5 font-mono text-xs font-semibold">{r.refund_number}</td>
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
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
