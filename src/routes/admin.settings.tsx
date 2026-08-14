import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiSend } from "@/lib/bookly/api-client";
import { Card, ErrorNote } from "@/components/console/ui";
import { AgentTracesTile } from "@/components/console/agent-traces-tile";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Bookly Admin — Demo Controls & Reset" },
      {
        name: "description",
        content:
          "Admin tools for the Bookly demo store: reset all orders, returns, refunds and customers back to a clean seeded state.",
      },
      { property: "og:title", content: "Bookly Admin — Demo Controls" },
      { property: "og:description", content: "Reset the Bookly demo dataset back to its seeded state in one click." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSettings,
});

type ResetResult = { reset: boolean; reset_at: string; summary?: unknown };

function AdminSettings() {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [doneAt, setDoneAt] = useState<string | null>(null);

  const reset = useMutation({
    mutationFn: async () => (await apiSend<ResetResult>("/api/public/v1/admin/reset-demo", "POST", {})).data,
    onSuccess: (d) => {
      setDoneAt(d.reset_at);
      setConfirming(false);
      void qc.invalidateQueries();
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Demo controls for the Bookly store console and the public API your agent calls.
        </p>
      </div>

      {reset.error ? <ErrorNote error={reset.error} /> : null}

      <AgentTracesTile />

      <Card title="Reset demo data">
        <div className="space-y-4 px-5 py-5 text-sm">
          <p className="text-muted-foreground">
            Regenerates the full demo dataset: books, customers, orders, shipments, returns, refunds, refund history
            and transactions are wiped and re-seeded. All agent traces are purged except the two example traces kept
            for demos. The demo customer{" "}
            <span className="font-mono text-xs">david.busacker@example.com</span> is recreated with four orders from the
            last year. Run this between agent demos to start clean.
          </p>


          {doneAt ? (
            <p className="rounded-md border border-border bg-accent/40 px-3 py-2 text-xs">
              Demo data reset at {new Date(doneAt).toLocaleString()}.
            </p>
          ) : null}

          {confirming ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">This deletes all current demo records. Continue?</span>
              <button
                type="button"
                onClick={() => reset.mutate()}
                disabled={reset.isPending}
                className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground disabled:opacity-60"
              >
                {reset.isPending ? "Resetting…" : "Yes, reset now"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Reset demo data
            </button>
          )}

          <p className="text-xs text-muted-foreground">
            API equivalent: <span className="font-mono">POST /api/public/v1/admin/reset-demo</span>
          </p>
        </div>
      </Card>

      <Card title="Integration surfaces">
        <ul className="space-y-2 px-5 py-5 text-sm">
          <li>
            <a className="underline underline-offset-4" href="/docs">API documentation</a>
          </li>
          <li>
            <a className="underline underline-offset-4" href="/api/public/openapi.json">OpenAPI 3.1 spec</a>
          </li>
          <li>
            <a className="underline underline-offset-4" href="/api/public/tools.json">Agent tool manifest (MCP)</a>
          </li>
          <li>
            <a className="underline underline-offset-4" href="/llms.txt">llms.txt</a>
          </li>
        </ul>
      </Card>
    </div>
  );
}
