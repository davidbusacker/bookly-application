import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { Card, Stat, Table } from "@/components/console/ui";

export const Route = createFileRoute("/decagon/evals")({
  head: () => ({
    meta: [
      { title: "Evaluations — Bookly Agent Quality" },
      {
        name: "description",
        content:
          "Standard test suites run against the Bookly support agent: pass rates, quality trends, failing scenarios and root-cause clusters.",
      },
      { property: "og:title", content: "Agent Evaluations" },
      { property: "og:description", content: "Regression suites, quality trends and root causes for the Bookly CX agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Evals,
});

type Suite = {
  name: string;
  scope: string;
  cases: number;
  score: number;
  prev: number;
  cadence: string;
  lastRun: string;
  status: "passing" | "watch" | "failing";
};

const SUITES: Suite[] = [
  { name: "Order status accuracy", scope: "Core", cases: 240, score: 97.1, prev: 96.4, cadence: "Every deploy", lastRun: "2h ago", status: "passing" },
  { name: "Return eligibility reasoning", scope: "Core", cases: 180, score: 92.8, prev: 94.6, cadence: "Every deploy", lastRun: "2h ago", status: "watch" },
  { name: "Refund policy compliance", scope: "Compliance", cases: 150, score: 99.3, prev: 99.1, cadence: "Nightly", lastRun: "9h ago", status: "passing" },
  { name: "Tool-call correctness", scope: "Core", cases: 320, score: 95.4, prev: 95.7, cadence: "Every deploy", lastRun: "2h ago", status: "passing" },
  { name: "Genre / recommendation guidance", scope: "Experimental", cases: 90, score: 84.2, prev: 79.5, cadence: "Weekly", lastRun: "3d ago", status: "watch" },
  { name: "Escalation & handoff", scope: "Core", cases: 110, score: 96.0, prev: 96.0, cadence: "Nightly", lastRun: "9h ago", status: "passing" },
  { name: "PII redaction & safety", scope: "Compliance", cases: 200, score: 99.8, prev: 99.8, cadence: "Nightly", lastRun: "9h ago", status: "passing" },
  { name: "Voice transcription robustness", scope: "Channel", cases: 130, score: 88.6, prev: 90.9, cadence: "Weekly", lastRun: "3d ago", status: "failing" },
  { name: "Multi-order disambiguation", scope: "Core", cases: 95, score: 91.5, prev: 90.2, cadence: "Weekly", lastRun: "3d ago", status: "watch" },
  { name: "Tone & brand adherence", scope: "Quality", cases: 160, score: 94.7, prev: 94.1, cadence: "Nightly", lastRun: "9h ago", status: "passing" },
];

const TREND = [91.2, 92.0, 91.4, 93.1, 93.8, 93.2, 94.6, 94.1, 95.0, 95.6, 95.2, 95.9];

const DIMENSIONS = [
  { label: "Task completion", score: 95.9 },
  { label: "Policy adherence", score: 98.2 },
  { label: "Factual grounding", score: 93.4 },
  { label: "Tool selection", score: 95.4 },
  { label: "Tone & empathy", score: 94.7 },
  { label: "Containment", score: 87.3 },
];

const ROOT_CAUSES = [
  { cause: "Ambiguous RMA window on gifted orders", failures: 22, suites: "Return eligibility", trend: "up" as const },
  { cause: "Voice ASR mis-hears ISBN digit strings", failures: 18, suites: "Voice transcription", trend: "up" as const },
  { cause: "Stale inventory read before restock sync", failures: 11, suites: "Tool-call correctness", trend: "down" as const },
  { cause: "Over-apology loops on refund delays", failures: 9, suites: "Tone & brand", trend: "down" as const },
  { cause: "Missing genre profile for new customers", failures: 7, suites: "Recommendation guidance", trend: "flat" as const },
];

const STATUS_STYLE: Record<Suite["status"], string> = {
  passing: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  watch: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  failing: "bg-destructive/12 text-destructive border-destructive/25",
};

function Delta({ value }: { value: number }) {
  if (Math.abs(value) < 0.05)
    return <span className="tabular-nums text-xs text-muted-foreground">0.0</span>;
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 tabular-nums text-xs font-medium ${
        up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
      }`}
    >
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? "+" : ""}
      {value.toFixed(1)}
    </span>
  );
}

function Evals() {
  const avg = SUITES.reduce((a, s) => a + s.score, 0) / SUITES.length;
  const cases = SUITES.reduce((a, s) => a + s.cases, 0);
  const regressions = SUITES.filter((s) => s.score < s.prev).length;

  const max = Math.max(...TREND);
  const min = Math.min(...TREND) - 1;
  const points = TREND.map((v, i) => {
    const x = (i / (TREND.length - 1)) * 100;
    const y = 100 - ((v - min) / (max - min)) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evaluations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Standard regression suites simulated against Bookly CX v2.4 — quality trends and root causes.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs shadow-xs">
          <CheckCircle2 size={13} className="text-emerald-600" />
          Last full run · 2h ago
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Composite score" value={`${avg.toFixed(1)}%`} hint="Weighted across 10 suites" />
        <Stat label="Test cases" value={cases.toLocaleString()} hint="Simulated conversations per cycle" />
        <Stat label="Suites regressing" value={regressions} hint="Score below previous run" />
        <Stat label="Auto-graded" value="98%" hint="2% sampled for human review" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Composite quality trend · last 12 runs">
          <div className="px-5 py-6">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-48 w-full">
              <polyline
                points={points}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
              />
              {TREND.map((v, i) => {
                const x = (i / (TREND.length - 1)) * 100;
                const y = 100 - ((v - min) / (max - min)) * 100;
                return <circle key={i} cx={x} cy={y} r="1" fill="hsl(var(--primary))" vectorEffect="non-scaling-stroke" />;
              })}
            </svg>
            <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
              <span>12 runs ago · {TREND[0]?.toFixed(1)}%</span>
              <span>Latest · {TREND[TREND.length - 1]?.toFixed(1)}%</span>
            </div>
          </div>
        </Card>

        <Card title="Quality dimensions">
          <div className="space-y-3 px-5 py-6">
            {DIMENSIONS.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{d.label}</span>
                  <span className="tabular-nums text-muted-foreground">{d.score.toFixed(1)}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${d.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Test suites">
        <Table head={["Suite", "Scope", "Cases", "Score", "Δ vs prev", "Cadence", "Last run", "Status"]}>
          {SUITES.map((s) => (
            <tr key={s.name} className="hover:bg-accent/40">
              <td className="px-5 py-2.5 font-medium">{s.name}</td>
              <td className="px-5 py-2.5 text-muted-foreground">{s.scope}</td>
              <td className="px-5 py-2.5 tabular-nums">{s.cases}</td>
              <td className="px-5 py-2.5 tabular-nums font-semibold">{s.score.toFixed(1)}%</td>
              <td className="px-5 py-2.5"><Delta value={s.score - s.prev} /></td>
              <td className="px-5 py-2.5 text-muted-foreground">{s.cadence}</td>
              <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{s.lastRun}</td>
              <td className="px-5 py-2.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[s.status]}`}>
                  {s.status}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Root-cause clusters across failing cases">
        <div className="divide-y divide-border">
          {ROOT_CAUSES.map((r) => (
            <div key={r.cause} className="flex items-center gap-4 px-5 py-3.5">
              <AlertTriangle
                size={15}
                className={r.trend === "up" ? "text-destructive" : "text-muted-foreground"}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.cause}</p>
                <p className="text-xs text-muted-foreground">{r.suites}</p>
              </div>
              <span className="tabular-nums text-sm text-muted-foreground">{r.failures} failures</span>
              <span className="w-16 text-right text-xs text-muted-foreground">
                {r.trend === "up" ? "worsening" : r.trend === "down" ? "improving" : "flat"}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
