import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, money, qs, type Customer } from "@/lib/bookly/api-client";
import { Card, Empty, ErrorNote, Loading, Table } from "@/components/console/ui";

export const Route = createFileRoute("/admin/customers/")({
  component: CustomersPage,
});

function CustomersPage() {
  const [q, setQ] = useState("");
  const path = `/api/public/v1/customers${qs({ q: q || undefined, limit: 50 })}`;
  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", path],
    queryFn: () => apiGet<Customer[]>(path),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data?.meta.total ?? 0} accounts</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="h-9 w-72 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      <Card>
        {error ? <ErrorNote error={error} /> : isLoading && !data ? <Loading /> : data!.data.length === 0 ? (
          <Empty>No customers found.</Empty>
        ) : (
          <Table head={["Name", "Email", "Location", "Tier", "Store credit"]}>
            {data!.data.map((c) => (
              <tr key={c.id} className="hover:bg-accent/40">
                <td className="px-5 py-2.5 font-medium">
                  <Link to="/admin/customers/$id" params={{ id: c.id }} className="underline-offset-4 hover:underline">
                    {c.full_name}
                  </Link>
                </td>
                <td className="px-5 py-2.5 text-muted-foreground">{c.email}</td>
                <td className="px-5 py-2.5 text-muted-foreground">
                  {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-5 py-2.5 capitalize">{c.member_tier ?? "—"}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{money(c.store_credit_cents ?? 0)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
