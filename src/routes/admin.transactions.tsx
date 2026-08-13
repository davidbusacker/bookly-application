import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, money, qs, when, type Transaction } from "@/lib/bookly/api-client";
import { Card, Empty, ErrorNote, Loading, StatusBadge, Table } from "@/components/console/ui";

export const Route = createFileRoute("/admin/transactions")({
  component: TransactionsPage,
});

const TYPES = ["", "payment", "refund", "store_credit", "authorization", "void", "chargeback"];

function TransactionsPage() {
  const [type, setType] = useState("");
  const path = `/api/public/v1/transactions${qs({ type: type || undefined, limit: 50 })}`;
  const { data, isLoading, error } = useQuery({
    queryKey: ["transactions", path],
    queryFn: () => apiGet<Transaction[]>(path),
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data?.meta.total ?? 0} ledger entries</p>
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm capitalize"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>{t === "" ? "All types" : t.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <Card>
        {error ? <ErrorNote error={error} /> : isLoading && !data ? <Loading /> : data!.data.length === 0 ? (
          <Empty>No transactions match.</Empty>
        ) : (
          <Table head={["Txn", "Order", "Type", "Method", "When", "Status", "Amount"]}>
            {data!.data.map((t) => (
              <tr key={t.id} className="hover:bg-accent/40">
                <td className="px-5 py-2.5 font-mono text-xs font-semibold">{t.transaction_number}</td>
                <td className="px-5 py-2.5 font-mono text-xs">
                  {t.order ? (
                    <Link to="/admin/orders/$id" params={{ id: t.order.order_number }} className="underline-offset-4 hover:underline">
                      {t.order.order_number}
                    </Link>
                  ) : "—"}
                </td>
                <td className="px-5 py-2.5 capitalize">{t.type.replace(/_/g, " ")}</td>
                <td className="px-5 py-2.5 text-muted-foreground">{t.method ?? "—"}</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{when(t.occurred_at)}</td>
                <td className="px-5 py-2.5"><StatusBadge value={t.status} /></td>
                <td className="px-5 py-2.5 text-right tabular-nums">{money(t.amount_cents, t.currency)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
