import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/console/ui";
import { Markdown } from "@/components/decagon/markdown";
import { AOPS } from "@/lib/decagon/library";

export const Route = createFileRoute("/decagon/aops")({
  head: () => ({
    meta: [
      { title: "AOPs — Bookly Agent Operating Procedures" },
      {
        name: "description",
        content:
          "Browse Bookly's agent operating procedures: return intake, refund timing, order status, account resets and the drafted genre-fit nudge.",
      },
      { property: "og:title", content: "Bookly AOP library" },
      { property: "og:description", content: "Agent operating procedures powering Bookly support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AopLibrary,
});

const STATUS_CLASS: Record<string, string> = {
  live: "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  draft: "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  shadow: "border-border bg-muted text-muted-foreground",
};

function AopLibrary() {
  const [slug, setSlug] = useState(AOPS[0]?.slug ?? "");
  const active = AOPS.find((a) => a.slug === slug) ?? AOPS[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AOPs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {AOPS.length} agent operating procedures across the support agent and the store chatbot.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <Card title="Library">
          <div className="flex flex-col p-2">
            {AOPS.map((a) => (
              <button
                key={a.slug}
                type="button"
                onClick={() => setSlug(a.slug)}
                className={`rounded-lg px-3 py-2.5 text-left transition-colors ${
                  a.slug === active?.slug ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm font-medium">{a.name}</span>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_CLASS[a.status]}`}>
                    {a.status}
                  </span>
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">#{a.slug}</span>
              </button>
            ))}
          </div>
        </Card>

        {active ? (
          <Card
            title={`#${active.slug}`}
            action={<span className="text-xs text-muted-foreground">Surface · {active.surface}</span>}
          >
            <div className="space-y-4 px-5 py-5">
              <p className="text-sm text-muted-foreground">{active.summary}</p>
              <div className="ai-panel rounded-xl p-6 text-sm leading-relaxed">
                <Markdown text={active.body} />
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
