import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, FileText, Loader2, Sparkle, Wrench } from "lucide-react";
import { Card } from "@/components/console/ui";

type Search = { topic?: string };

export const Route = createFileRoute("/decagon/duet")({
  validateSearch: (s: Record<string, unknown>): Search =>
    typeof s["topic"] === "string" ? { topic: s["topic"] } : {},
  head: () => ({
    meta: [
      { title: "Duet — Agents Improving Agents for Bookly" },
      {
        name: "description",
        content:
          "Duet turns Bookly's support conversation data into concrete agent improvements: new tools, new AOPs and edits to existing ones, drafted and reviewed in one place.",
      },
      { property: "og:title", content: "Duet — agents improving agents" },
      { property: "og:description", content: "Data-backed agent improvement recommendations for Bookly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Duet,
});

const TOPIC_PROMPT: Record<string, string> = {
  didnt_like_book:
    "Explore the \"customers disliked the ordered book\" return driver. 12 returns in the last 45 days, trending up. Find the root cause across AOPs, tools and KPIs, and recommend an agent change that prevents the return instead of processing it faster.",
};

const RECOMMENDATIONS = [
  {
    kind: "New AOP",
    icon: Sparkle,
    title: "Proactive genre-fit check at checkout",
    body: "Recurring customers who add an off-pattern genre return the book 4.1× more often. A pre-purchase nudge from the store chatbot would intercept the mismatch.",
    impact: "Est. −18% return volume · −$4.2k/mo operational cost",
  },
  {
    kind: "New Tool",
    icon: Wrench,
    title: "get_reading_profile(customer)",
    body: "The agent has no view of a customer's genre history at conversation time, so it cannot recommend better substitutes when a return is opened.",
    impact: "Est. +9 pts resolution confidence on return convos",
  },
  {
    kind: "Modify AOP",
    icon: FileText,
    title: "#return_intake_aop — offer exchange before refund",
    body: "82% of 'didn't like the book' returns go straight to refund. Offering a targeted exchange first retains revenue on a third of them.",
    impact: "Est. +$2.8k/mo retained revenue",
  },
];

const RUN_STEPS = [
  "Fetching #return_intake_aop, #refund_policy_aop, #order_status_aop…",
  "Reading @return_eligibility, @refund_processor, @inventory_lookup skill definitions…",
  "Sampling 31 return conversations and 12 'didn't like the book' transcripts…",
  "Joining conversation outcomes to {{customer.order_history}} and {{book.category}}…",
  "Reviewing KPIs: return rate, cost per return, CSAT, containment, repeat purchase rate…",
  "Correlating genre switching against return probability…",
];

const FINDINGS = [
  "**Root cause.** Customers whose order history is concentrated in one or two genres, and who then buy a title outside that pattern, return that book 4.1× more often than a same-genre purchase. The return reason is almost always fit — not damage, not delivery.",
  "**Cost.** Each of these returns carries a prepaid label, a restock touch and a refund. At 12 in 45 days and rising, that is roughly $4.2k/mo in avoidable operational cost, plus the lost revenue on the title.",
  "**Where support can't help.** By the time the customer reaches the agent, the outcome is already fixed: the book was read, the policy allows the return, and the agent correctly creates it. Resolution confidence is high while sentiment is negative — a signal that the process worked but the experience did not.",
  "**Recommendation.** Move the intervention upstream. Author a new AOP for the Bookly store chatbot: when a logged-in recurring customer reaches checkout with a book in a genre they do not normally buy, proactively surface a short, warm note about the genre plus 2–3 titles closer to their usual reading, without blocking the purchase.",
];

const AOP = `# 📚 AOP: Proactive Genre-Fit Nudge at Checkout

**Owner:** Bookly CX · **Surface:** \`store_chatbot\` · **Trigger:** checkout view
**Related:** #return_intake_aop · #refund_policy_aop · #recommendation_aop

---

## 🎯 Goal
Reduce "didn't like the book" returns by warmly flagging genre mismatches **before** purchase, and offering closer-fit alternatives — never blocking or shaming the purchase.

## ⚡ Trigger conditions
Fire only when **all** of the following hold:
1. \`{{customer.is_authenticated}}\` is true
2. \`{{customer.lifetime_orders}}\` >= 3
3. \`{{customer.top_genre_share}}\` >= 0.6 (their reading is concentrated)
4. \`{{cart.item.category}}\` is not in \`{{customer.recent_genres}}\`
5. \`{{cart.item.price_cents}}\` >= 1500

## 🛠️ Skills to call
- @get_reading_profile — pull \`{{customer.recent_genres}}\` and favorite authors
- @inventory_lookup — confirm alternates are actually in stock
- @recommend_titles — rank 3 alternates by genre + author affinity
- @log_conversation — write the interaction back as a trace

## 💬 What the agent says
> "Quick heads up before you check out 👋 — *{{cart.item.title}}* is a **{{cart.item.category}}** title, and most of your library is **{{customer.top_genre}}**. Plenty of readers love branching out, so no pressure at all! If you'd like something closer to your usual, these are in stock right now: {{recommendations}}."

**Tone rules**
- ✅ Warm, brief, one message, easy to dismiss
- ✅ Always affirm the original choice as a valid pick
- ❌ Never imply the customer will dislike the book
- ❌ Never fire more than once per checkout session

## 🔁 Branches
| Customer response | Action |
| --- | --- |
| Keeps original title | Thank them, close the nudge, tag \`genre_nudge_declined\` |
| Swaps to a recommendation | Update cart, confirm price delta, tag \`genre_nudge_converted\` |
| Asks for more like it | Call @recommend_titles again with \`{{customer.favorite_authors}}\` |
| Asks about returns | Hand off to #return_policy_aop, do not improvise policy |

## 📊 Success metrics
- Primary: "didn't like the book" return rate (target **−18%** in 60 days)
- Secondary: nudge conversion rate, checkout completion rate (must not drop >1%)
- Guardrail: CSAT on nudged sessions must stay >= current baseline

## 🚦 Rollout
Shadow mode for 7 days → 10% of eligible sessions → 50% → 100%, with a weekly review against #return_intake_aop volume.
`;

type Phase = "cards" | "running" | "findings" | "drafting" | "aop";

function Duet() {
  const { topic } = Route.useSearch();
  const [prompt, setPrompt] = useState(topic ? (TOPIC_PROMPT[topic] ?? "") : "");
  const [phase, setPhase] = useState<Phase>("cards");
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [aopChars, setAopChars] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = () => {
    if (!prompt.trim()) return;
    setPhase("running");
    setVisibleSteps(0);
    RUN_STEPS.forEach((_, i) => {
      timers.current.push(setTimeout(() => setVisibleSteps(i + 1), 700 + i * 750));
    });
    timers.current.push(setTimeout(() => setPhase("findings"), 700 + RUN_STEPS.length * 750));
  };

  const approve = () => {
    setPhase("drafting");
    setAopChars(0);
    timers.current.push(setTimeout(() => setPhase("aop"), 600));
  };

  useEffect(() => {
    if (phase !== "aop") return;
    const id = setInterval(() => {
      setAopChars((c) => {
        if (c >= AOP.length) {
          clearInterval(id);
          return c;
        }
        return c + 40;
      });
    }, 16);
    return () => clearInterval(id);
  }, [phase]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkle size={20} /> Duet
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agents improving agents. Duet reads your conversation data, AOPs, tools and KPIs, then drafts the change.
        </p>
      </div>

      {phase === "cards" ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {RECOMMENDATIONS.map((r) => (
              <div key={r.title} className="flex flex-col rounded-lg border border-border bg-card p-5">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <r.icon size={11} /> {r.kind}
                </span>
                <h3 className="mt-3 text-sm font-semibold leading-snug">{r.title}</h3>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{r.body}</p>
                <p className="mt-3 text-xs font-medium">{r.impact}</p>
                <button
                  type="button"
                  className="mt-3 w-fit rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent"
                >
                  Explore further
                </button>
              </div>
            ))}
          </div>

          <Card title="Something else">
            <div className="space-y-3 px-5 py-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Describe an opportunity you want Duet to explore…"
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed"
              />
              <button
                type="button"
                onClick={run}
                disabled={!prompt.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
              >
                Go <ArrowRight size={14} />
              </button>
            </div>
          </Card>
        </>
      ) : (
        <div className="space-y-4">
          <div className="ml-auto max-w-2xl rounded-lg bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
            {prompt}
          </div>

          <div className="max-w-3xl space-y-2">
            {RUN_STEPS.slice(0, phase === "running" ? visibleSteps : RUN_STEPS.length).map((s) => (
              <p key={s} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check size={14} className="text-emerald-500" />
                {s}
              </p>
            ))}
            {phase === "running" && visibleSteps < RUN_STEPS.length ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Analyzing…
              </p>
            ) : null}
          </div>

          {phase !== "running" ? (
            <Card title="Summary of findings">
              <div className="space-y-4 px-5 py-5 text-sm leading-relaxed">
                {FINDINGS.map((f, i) => (
                  <p key={i}>
                    {f.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
                      /^\*\*/.test(chunk) ? <strong key={j}>{chunk.replace(/\*\*/g, "")}</strong> : chunk,
                    )}
                  </p>
                ))}
                {phase === "findings" ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={approve}
                      className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      Approve · draft the AOP
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhase("cards")}
                      className="rounded-md border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-accent"
                    >
                      Not now
                    </button>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          {phase === "drafting" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Opening canvas and authoring the AOP…
            </p>
          ) : null}

          {phase === "aop" ? (
            <Card title="Canvas · Proactive Genre-Fit Nudge at Checkout">
              <div className="px-5 py-5">
                <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-5 text-sm leading-relaxed">
                  {AOP.slice(0, aopChars)}
                  {aopChars < AOP.length ? <span className="animate-pulse">▍</span> : null}
                </pre>
                {aopChars >= AOP.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      Simulate a new chat with this AOP
                    </button>
                    <button type="button" className="rounded-md border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-accent">
                      Publish to #store_chatbot
                    </button>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
