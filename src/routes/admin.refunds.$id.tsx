import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend, money, when, type Refund } from "@/lib/bookly/api-client";
import { Card, ErrorNote, Field, Loading, StatusBadge } from "@/components/console/ui";
import { RefundTimeline } from "@/components/console/refund-timeline";
import { REFUND_STATUSES } from "@/lib/bookly/rules";

export const Route = createFileRoute("/admin/refunds/$id")({
  component: RefundDetail,
});

function RefundDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [actor, setActor] = useState("store_owner");

  const { data, isLoading, error } = useQuery({
    queryKey: ["refund", id],
    queryFn: () => apiGet<Refund>(`/api/public/v1/refunds/${encodeURIComponent(id)}`),
    refetchInterval: 10_000,
  });

  const mutate = useMutation({
    mutationFn: (status: string) =>
      apiSend<Refund>(`/api/public/v1/refunds/${encodeURIComponent(id)}`, "PATCH", {
        status,
        actor: actor || "store_owner",
        ...(note ? { note } : {}),
      }),
    onSuccess: () => {
      setNote("");
      void qc.invalidateQueries({ queryKey: ["refund", id] });
      void qc.invalidateQueries({ queryKey: ["refunds"] });
    },
  });

  if (error) return <ErrorNote error={error} />;
  if (isLoading || !data) return <Loading />;
  const r = data.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Refund</p>
          <h1 className="font-mono text-2xl font-bold tracking-tight">{r.refund_number}</h1>
        </div>
        <StatusBadge value={r.status} />
        <Link to="/admin/refunds" className="ml-auto text-sm underline underline-offset-4">
          All refunds
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Details" className="lg:col-span-1">
          <div className="space-y-3 px-5 py-4 text-sm">
            <Field label="Amount">{money(r.amount_cents, r.currency)}</Field>
            <Field label="Method">
              <span className="capitalize">{(r.method ?? "").replace(/_/g, " ")}</span>
            </Field>
            <Field label="Order">
              {r.order ? (
                <Link to="/admin/orders/$id" params={{ id: r.order.order_number }} className="underline underline-offset-4">
                  {r.order.order_number}
                </Link>
              ) : "—"}
            </Field>
            <Field label="Linked return">{r.return ? r.return.rma_number : "—"}</Field>
            <Field label="Reason">{r.reason ?? "—"}</Field>
            <Field label="Created">{when(r.created_at)}</Field>
            <Field label="Processed">{when(r.processed_at)}</Field>
          </div>
        </Card>

        <Card title="Decision history" className="lg:col-span-2">
          <div className="px-5 py-4">
            <RefundTimeline events={r.events ?? []} />
          </div>
        </Card>
      </div>

      <Card title="Change status">
        <div className="space-y-3 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Actor</span>
              <input
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Note</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why this decision was made"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {REFUND_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={mutate.isPending || s === r.status}
                onClick={() => mutate.mutate(s)}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium capitalize transition-colors hover:bg-accent disabled:opacity-40"
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          {mutate.error ? <ErrorNote error={mutate.error} /> : null}
        </div>
      </Card>
    </div>
  );
}
