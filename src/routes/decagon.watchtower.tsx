import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { Card } from "@/components/console/ui";

export const Route = createFileRoute("/decagon/watchtower")({
  head: () => ({
    meta: [
      { title: "Watchtower — Configurable CX KPI Monitoring" },
      {
        name: "description",
        content:
          "Watchtower is Bookly's just-in-time CX dashboard: configurable widgets monitoring containment, resolution, escalations, refund cost, SLA and policy risk.",
      },
      { property: "og:title", content: "Watchtower — Configurable CX KPI Monitoring" },
      { property: "og:description", content: "Admin-editable, just-in-time dashboards for any support metric." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Watchtower,
});

type Widget = {
  id: string;
  name: string;
  criteria: string;
  value: string;
  delta: string;
  good: boolean;
  target: string;
  kind: "spark" | "bars" | "gauge" | "split";
  series: number[];
  legend?: { label: string; value: string }[];
};

const WIDGETS: Widget[] = [
  {
    id: "containment",
    name: "AI containment rate",
    criteria: "Conversations fully resolved by the AI agent with no human handoff",
    value: "78.4%",
    delta: "▲ 5.1 pts",
    good: true,
    target: "Target 75%",
    kind: "spark",
    series: [67, 68, 70, 69, 72, 73, 74, 73, 76, 77, 78, 78.4],
  },
  {
    id: "fcr",
    name: "First contact resolution",
    criteria: "No repeat contact from the same customer within 72 hours",
    value: "84.1%",
    delta: "▲ 2.3 pts",
    good: true,
    target: "Target 85%",
    kind: "gauge",
    series: [84.1],
  },
  {
    id: "escalation",
    name: "Escalation to human",
    criteria: "Handoffs triggered by guardrail, low resolution confidence, or customer request",
    value: "11.6%",
    delta: "▼ 1.8 pts",
    good: true,
    target: "Ceiling 15%",
    kind: "bars",
    series: [18, 16, 15, 16, 14, 13, 14, 12, 13, 12, 12, 11.6],
    legend: [
      { label: "Guardrail", value: "41%" },
      { label: "Low confidence", value: "34%" },
      { label: "Customer asked", value: "25%" },
    ],
  },
  {
    id: "return-cost",
    name: "Return & refund cost per order",
    criteria: "Reverse logistics + refunded margin, all channels",
    value: "$3.87",
    delta: "▲ $0.41",
    good: false,
    target: "Target $3.25",
    kind: "spark",
    series: [3.1, 3.2, 3.15, 3.3, 3.4, 3.35, 3.5, 3.6, 3.55, 3.7, 3.8, 3.87],
  },
  {
    id: "sla",
    name: "Response SLA & backlog",
    criteria: "First response under 60s (chat) / 30s (voice); open backlog at end of day",
    value: "96.2%",
    delta: "▲ 0.9 pts",
    good: true,
    target: "142 open · 9 aging >24h",
    kind: "split",
    series: [93, 94, 95, 94, 96, 95, 96, 97, 96, 96, 96, 96.2],
    legend: [
      { label: "Chat p50", value: "8s" },
      { label: "Voice p50", value: "3s" },
      { label: "Aging >24h", value: "9" },
    ],
  },
  {
    id: "policy",
    name: "Policy & tone risk flags",
    criteria: "Turns flagged for refund-policy deviation, PII exposure, or frustrated sentiment",
    value: "27 flags",
    delta: "▼ 12 flags",
    good: true,
    target: "0 critical this week",
    kind: "bars",
    series: [52, 48, 44, 46, 41, 39, 36, 38, 33, 31, 29, 27],
    legend: [
      { label: "Policy deviation", value: "11" },
      { label: "Frustration", value: "13" },
      { label: "PII", value: "3" },
    ],
  },
];

function Watchtower() {
  const [widgets, setWidgets] = useState<Widget[]>(WIDGETS);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [criteria, setCriteria] = useState("");

  const create = () => {
    setWidgets((w) => [
      ...w,
      {
        id: `custom-${Date.now()}`,
        name: name.trim() || "Untitled watchtower",
        criteria: criteria.trim() || "Natural language flagging criteria",
        value: "—",
        delta: "collecting",
        good: true,
        target: "Awaiting first run",
        kind: "spark",
        series: [1, 1.2, 1.1, 1.4, 1.3, 1.6, 1.5, 1.8, 1.7, 2, 1.9, 2.1],
      },
    ]);
    setName("");
    setCriteria("");
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watchtower</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Just-in-time dashboards for Bookly CX. Define what matters in natural language and Watchtower monitors it
            continuously — no analyst queue required.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              editing ? "border-primary/40 bg-primary/10 text-foreground" : "border-border hover:bg-accent"
            }`}
          >
            <Settings2 size={13} /> {editing ? "Done editing" : "Edit dashboard"}
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus size={13} /> Create watchtower
          </button>
        </div>
      </div>

      {creating ? (
        <Card title="Create watchtower">
          <div className="grid gap-6 px-5 py-5 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">1. Basic info</p>
              <label className="block text-sm font-medium">
                Watchtower name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Genre-switch return risk"
                  className="mt-1.5 w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-sm font-normal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </label>
              <label className="block text-sm font-medium">
                Flag criteria
                <textarea
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  rows={4}
                  placeholder="Flag conversations where a recurring customer returns a book outside their usual genre"
                  className="mt-1.5 w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-sm font-normal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </label>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">2. Filters</p>
              <div className="text-sm">
                <span className="font-medium">CSAT</span>
                <div className="mt-1.5 flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-xs tabular-nums text-muted-foreground"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-sm">
                <span className="font-medium">Channel</span>
                <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {["Chat", "Voice", "Email", "SMS", "Agent assist"].map((c) => (
                    <span key={c} className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-sm border border-border" /> {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={create}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  Add to dashboard
                </button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {widgets.map((w) => (
          <Card
            key={w.id}
            title={w.name}
            action={
              editing ? (
                <button
                  type="button"
                  aria-label={`Remove ${w.name}`}
                  onClick={() => setWidgets((list) => list.filter((x) => x.id !== w.id))}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={12} /> Remove
                </button>
              ) : (
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Last 45d</span>
              )
            }
            className={editing ? "ring-1 ring-primary/30" : ""}
          >
            <div className="px-5 py-5">
              <p className="text-xs text-muted-foreground">{w.criteria}</p>
              <div className="mt-3 flex items-end gap-3">
                <span className="text-3xl font-semibold tabular-nums">{w.value}</span>
                <span
                  className={`mb-1 text-xs font-medium ${
                    w.good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  }`}
                >
                  {w.delta}
                </span>
                <span className="mb-1 ml-auto text-xs text-muted-foreground">{w.target}</span>
              </div>
              <Viz widget={w} />
              {w.legend ? (
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {w.legend.map((l) => (
                    <span key={l.label}>
                      {l.label} <span className="font-medium tabular-nums text-foreground">{l.value}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        ))}

        {editing ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex min-h-40 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Plus size={15} /> Add a widget
          </button>
        ) : null}
      </div>

      {widgets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No widgets. Create a watchtower to start monitoring.</p>
      ) : null}
    </div>
  );
}

function Viz({ widget }: { widget: Widget }) {
  const { kind, series } = widget;
  if (kind === "gauge") {
    const pct = series[0] ?? 0;
    const r = 42;
    const c = Math.PI * r;
    return (
      <svg viewBox="0 0 120 62" className="mt-3 h-24 w-full">
        <path d="M 18 56 A 42 42 0 0 1 102 56" fill="none" stroke="var(--muted)" strokeWidth={10} strokeLinecap="round" />
        <path
          d="M 18 56 A 42 42 0 0 1 102 56"
          fill="none"
          stroke="var(--primary)"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
        />
      </svg>
    );
  }
  if (kind === "bars") {
    const max = Math.max(...series);
    return (
      <div className="mt-4 flex h-20 items-end gap-1.5">
        {series.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-primary/70"
            style={{ height: `${(v / max) * 100}%`, minHeight: 2 }}
          />
        ))}
      </div>
    );
  }
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const pts = series.map((p, i) => `${(i / (series.length - 1)) * 100},${30 - ((p - min) / span) * 26}`);
  const line = `M ${pts.join(" L ")}`;
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-4 h-20 w-full">
      <path d={`${line} L 100,32 L 0,32 Z`} fill="var(--primary)" opacity={0.12} />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
