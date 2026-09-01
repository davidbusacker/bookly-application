import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ChevronDown, ExternalLink, X } from "lucide-react";
import { apiGet, type AgentTrace } from "@/lib/bookly/api-client";
import { Card, ErrorNote, Loading } from "@/components/console/ui";
import {
  CHANNEL_COLOR,
  INTENTS,
  arcPath,
  intentSlices,
  lengthByChannel,
  subReasonSlices,
  traceChannel,
  type Slice,
} from "@/lib/decagon/insights";

export const Route = createFileRoute("/decagon/")({
  head: () => ({
    meta: [
      { title: "Decagon Insights — Bookly Support Intents" },
      {
        name: "description",
        content:
          "Intent analytics for Bookly's AI support agent: intent mix, sub-reason drill-downs, conversation length by chat and phone, and AI-generated trend summaries.",
      },
      { property: "og:title", content: "Decagon Insights for Bookly" },
      { property: "og:description", content: "Intent mix, sub-reason drill-downs and AI trend summaries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Insights,
});

function Insights() {
  const [drill, setDrill] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  // While non-null, we're animating out: holds the slices being shown during exit.
  const [exiting, setExiting] = useState<"in" | "out" | null>(null);

  const animateDrill = (next: string | null) => {
    if (exiting) return;
    setExiting(next ? "in" : "out");
    window.setTimeout(() => {
      setDrill(next);
      setSub(null);
      setExiting(null);
    }, 340);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["decagon-traces"],
    queryFn: () => apiGet<AgentTrace[]>("/api/public/v1/agent-traces?limit=100"),
  });

  const traces = useMemo(() => data?.data ?? [], [data]);
  // Demo scale factor: simulate a much larger conversation volume than we have traces.
  const scale = useMemo(() => 100 + Math.floor(Math.random() * 101), []);
  const rawSlices = useMemo(
    () => (drill ? subReasonSlices(traces, drill) : intentSlices(traces)),
    [traces, drill],
  );
  const slices = useMemo(
    () => rawSlices.map((s) => ({ ...s, value: s.value * scale })),
    [rawSlices, scale],
  );
  const buckets = useMemo(
    () =>
      lengthByChannel(traces).map((b) => ({ ...b, chat: b.chat * scale, voice: b.voice * scale })),
    [traces, scale],
  );
  const voice = traces.filter((t) => traceChannel(t) === "voice").length;
  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmt(traces.length * scale)} AI conversations analyzed · {fmt((traces.length - voice) * scale)} chat ·{" "}
            {fmt(voice * scale)} phone
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip label="Date range" value="Last 45 days" />
          <FilterChip label="Channel" value="All channels" />
          <FilterChip label="Agent" value="Bookly CX v2.4" />
          <FilterChip label="Region" value="All regions" />
        </div>
      </div>

      {error ? <ErrorNote error={error} /> : null}

      <Card
        title={
          drill ? (
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => animateDrill(null)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                All intents
              </button>
              <span className="text-muted-foreground">/</span>
              <span>Intent · {INTENTS.find((i) => i.key === drill)?.label ?? drill}</span>
            </span>
          ) : (
            "What customers contact us about"
          )
        }
        action={
          drill ? (
            <button
              type="button"
              onClick={() => animateDrill(null)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent"
            >
              <ArrowLeft size={13} /> Back to all intents
            </button>
          ) : null
        }
      >
        {isLoading && !data ? (
          <Loading />
        ) : (
          <div
            key={drill ?? "all"}
            className={`grid gap-8 px-5 py-6 lg:grid-cols-[320px_1fr] ${
              exiting ? "pointer-events-none" : "animate-fade-in"
            }`}
          >
            <div
              className={`transition-all duration-300 ease-in ${
                exiting ? "scale-90 opacity-0" : "scale-100 opacity-100"
              }`}
            >
              <Donut
                slices={slices}
                total={slices.reduce((a, s) => a + s.value, 0)}
                caption={drill ? "Sub-reasons" : "Primary intents"}
                onSelect={(key) => {
                  if (!drill) {
                    if (key === "initiate_return") animateDrill(key);
                  } else {
                    setSub(key);
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              {drill ? null : (
                <p className="mb-2 text-xs text-muted-foreground">
                  Click <span className="font-semibold text-foreground">Initiate return</span> to drill into sub-reasons.
                </p>
              )}

              {slices.map((s, i) => {
                const total = slices.reduce((a, x) => a + x.value, 0) || 1;
                const clickable = drill ? true : s.key === "initiate_return";
                const slidingAway = exiting === "in" && s.key !== "initiate_return";
                return (
                  <button
                    key={s.key}
                    type="button"
                    disabled={!clickable}
                    onClick={() => (drill ? setSub(s.key) : animateDrill(s.key))}
                    style={{ transitionDelay: exiting ? `${i * 35}ms` : undefined }}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-all duration-300 ease-in ${
                      clickable ? "hover:bg-accent" : "cursor-default"
                    } ${slidingAway ? "translate-x-8 opacity-0" : ""}`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
                    <span className="flex-1 truncate text-sm font-medium">{s.label}</span>
                    <span className="tabular-nums text-sm text-muted-foreground">{fmt(s.value)}</span>
                    <span className="w-12 text-right tabular-nums text-xs text-muted-foreground">
                      {Math.round((s.value / total) * 100)}%
                    </span>
                    {clickable ? <ArrowRight size={14} className="text-muted-foreground" /> : <span className="w-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Mean time to resolution">
          <div className="px-5 py-5">
            <div className="flex items-end gap-3">
              <span className="text-3xl font-semibold tabular-nums">4m 12s</span>
              <span className="mb-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">▼ 18% vs prior 45d</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Chat 3m 04s · Phone 6m 41s · P90 11m 22s</p>
            <Spark points={MTTR_TREND} />
            <div className="mt-4 space-y-2">
              {MTTR_BY_INTENT.map((r) => (
                <div key={r.label} className="flex items-center gap-3 text-xs">
                  <span className="w-28 shrink-0 truncate text-muted-foreground">{r.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                  </span>
                  <span className="w-12 text-right tabular-nums">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="CSAT">
          <div className="px-5 py-5">
            <div className="flex items-end gap-3">
              <span className="text-3xl font-semibold tabular-nums">4.42</span>
              <span className="mb-1 text-xs text-muted-foreground">/ 5 · 3,180 surveys</span>
            </div>
            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">▲ 0.14 vs prior 45d</p>
            <Spark points={CSAT_TREND} />
            <div className="mt-4 space-y-1.5">
              {CSAT_DIST.map((d) => (
                <div key={d.score} className="flex items-center gap-3 text-xs">
                  <span className="w-6 tabular-nums text-muted-foreground">{d.score}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${d.pct}%`, background: d.score >= 4 ? CHANNEL_COLOR.chat : CHANNEL_COLOR.voice }}
                    />
                  </span>
                  <span className="w-9 text-right tabular-nums text-muted-foreground">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Conversation length by channel">
          <div className="px-5 py-5">
            <div className="mb-3 flex gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHANNEL_COLOR.chat }} /> Chat
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHANNEL_COLOR.voice }} /> Phone
              </span>
            </div>
            <BarChart buckets={buckets} />
          </div>
        </Card>
      </div>


      {sub && drill ? (
        <SubReasonPanel
          intentKey={drill}
          subKey={sub}
          label={subReasonSlices(traces, drill).find((s) => s.key === sub)?.label ?? sub}
          count={(subReasonSlices(traces, drill).find((s) => s.key === sub)?.value ?? 0) * scale}
          onClose={() => setSub(null)}
        />
      ) : null}
    </div>
  );
}

function Donut({
  slices,
  total,
  caption,
  onSelect,
}: {
  slices: Slice[];
  total: number;
  caption: string;
  onSelect: (key: string) => void;
}) {
  let angle = 0;
  return (
    <div className="relative mx-auto h-64 w-64">
      <svg viewBox="0 0 240 240" className="h-64 w-64">
        {slices.map((s) => {
          const sweep = (s.value / (total || 1)) * Math.PI * 2;
          const d = arcPath(120, 120, 110, 66, angle, angle + sweep - 0.012);
          angle += sweep;
          return (
            <path
              key={s.key}
              d={d}
              fill={s.color}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onClick={() => onSelect(s.key)}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </path>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{total.toLocaleString()}</span>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{caption}</span>
      </div>
    </div>
  );
}

/** Non-functional demo filter chip — looks interactive, intentionally inert. */
function FilterChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex cursor-default items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs shadow-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
      <ChevronDown size={12} className="text-muted-foreground" />
    </span>
  );
}

const MTTR_TREND = [6.4, 6.1, 5.8, 5.9, 5.4, 5.1, 4.9, 5.0, 4.6, 4.4, 4.3, 4.2];
const CSAT_TREND = [4.18, 4.21, 4.19, 4.26, 4.24, 4.3, 4.33, 4.29, 4.36, 4.38, 4.4, 4.42];
const MTTR_BY_INTENT = [
  { label: "Initiate return", value: "5m 48s", pct: 92 },
  { label: "Order status", value: "2m 11s", pct: 35 },
  { label: "Refund status", value: "4m 02s", pct: 64 },
  { label: "Stock check", value: "1m 47s", pct: 28 },
];
const CSAT_DIST = [
  { score: 5, pct: 62 },
  { score: 4, pct: 24 },
  { score: 3, pct: 8 },
  { score: 2, pct: 4 },
  { score: 1, pct: 2 },
];

function Spark({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const d = points
    .map((p, i) => `${(i / (points.length - 1)) * 100},${28 - ((p - min) / span) * 24}`)
    .join(" L ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-3 h-10 w-full">
      <path d={`M ${d}`} fill="none" stroke="var(--primary)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function BarChart({ buckets }: { buckets: { key: string; label: string; chat: number; voice: number }[] }) {
  const max = Math.max(1, ...buckets.map((b) => Math.max(b.chat, b.voice)));
  return (
    <div className="flex h-52 items-end gap-3">

      {buckets.map((b) => (
        <div key={b.key} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-44 w-full items-end justify-center gap-1.5">
            {(["chat", "voice"] as const).map((k) => (
              <div key={k} className="flex w-6 flex-col items-center justify-end" style={{ height: "100%" }}>
                <span className="mb-1 text-[10px] tabular-nums text-muted-foreground">{b[k]}</span>
                <div
                  className="w-full rounded-t-sm"
                  style={{ height: `${(b[k] / max) * 100}%`, background: CHANNEL_COLOR[k], minHeight: 2 }}
                />
              </div>
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

const SUMMARY: Record<
  string,
  { body: string; refs: { n: number; trace: string; note: string }[] }
> = {
  didnt_like_book: {
    body: [
      "**Fit, not quality, is driving these returns.** Over the last 45 days, \"didn't like the book\" is the single largest return sub-reason and the only one trending up week over week. Customers are not complaining about damage, print quality or delivery — they are telling the agent that the book was not what they expected once they started reading it [1][2].",
      "**The pattern is genre switching.** Nearly all of these returns come from recurring customers whose purchase history is concentrated in one or two genres, who then bought a title outside that pattern. The disappointment shows up in the first few chapters and the return is opened within days of delivery [3][4].",
      "**Cost impact.** These returns are fully eligible under the 30-day policy, so the agent resolves them quickly and resolution confidence stays high — but each one costs a prepaid label, a restock touch and a refund. Sentiment on these conversations skews negative even when the outcome is a clean return [5].",
      "**Opportunity.** This is a pre-purchase problem showing up in post-purchase support. Intervening at checkout, when a recurring customer adds an off-pattern genre, would prevent the return rather than process it faster [6].",
    ].join("\n\n"),
    refs: [
      { n: 1, trace: "TRC-200007", note: "Bread, Salt, Fire — \"just was not for me\"" },
      { n: 2, trace: "TRC-200014", note: "Winterlight — returned after 3 chapters" },
      { n: 3, trace: "TRC-200021", note: "A Map of Small Rains — first literary title" },
      { n: 4, trace: "TRC-200028", note: "Deep Field — usually buys fiction" },
      { n: 5, trace: "TRC-200035", note: "Negative sentiment, clean return" },
      { n: 6, trace: "TRC-200042", note: "Customer asked for better recommendations" },
    ],
  },
};

function SubReasonPanel({
  intentKey,
  subKey,
  label,
  count,
  onClose,
}: {
  intentKey: string;
  subKey: string;
  label: string;
  count: number;
  onClose: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(4);

  useEffect(() => {
    setReady(false);
    setProgress(4);
    const tick = setInterval(() => setProgress((p) => Math.min(98, p + 9)), 90);
    const done = setTimeout(() => setReady(true), 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [subKey]);

  const summary = SUMMARY[subKey];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-foreground/20" onClick={onClose}>
      <aside
        className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {INTENTS.find((i) => i.key === intentKey)?.label} · sub-reason
            </p>
            <h2 className="text-lg font-bold tracking-tight">{label}</h2>
            <p className="text-xs text-muted-foreground">{count.toLocaleString()} conversations in the last 45 days</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {!ready ? (
            <div className="space-y-3 py-10">
              <p className="text-sm text-muted-foreground">Summarizing {count} conversations…</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : summary ? (
            <>
              <article className="space-y-4 text-sm leading-relaxed">
                {summary.body.split("\n\n").map((para, i) => (
                  <p key={i}>
                    {para.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((chunk, j) => {
                      if (/^\*\*/.test(chunk)) return <strong key={j}>{chunk.replace(/\*\*/g, "")}</strong>;
                      const ref = /^\[(\d+)\]$/.exec(chunk);
                      if (ref) {
                        const r = summary.refs.find((x) => x.n === Number(ref[1]));
                        if (!r) return chunk;
                        return (
                          <Link
                            key={j}
                            to="/decagon/convos/$id"
                            params={{ id: r.trace }}
                            className="mx-0.5 rounded bg-accent px-1 py-0.5 align-super text-[10px] font-semibold text-accent-foreground hover:bg-primary hover:text-primary-foreground"
                            title={r.note}
                          >
                            {ref[1]}
                          </Link>
                        );
                      }
                      return chunk;
                    })}
                  </p>
                ))}
              </article>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  References
                </p>
                <ul className="space-y-1.5">
                  {summary.refs.map((r) => (
                    <li key={r.n} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">[{r.n}]</span>
                      <Link
                        to="/decagon/convos/$id"
                        params={{ id: r.trace }}
                        className="flex items-center gap-1 font-mono font-semibold underline-offset-4 hover:underline"
                      >
                        {r.trace} <ExternalLink size={11} />
                      </Link>
                      <span className="truncate text-muted-foreground">{r.note}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-accent/40 px-5 py-4">
                <p className="text-sm font-semibold">Continue in Duet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hand this opportunity to Duet to design an agent change that prevents these returns.
                </p>
                <Link
                  to="/decagon/duet"
                  search={{ topic: subKey }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Continue in Duet <ArrowRight size={14} />
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No AI summary generated for this sub-reason yet.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
