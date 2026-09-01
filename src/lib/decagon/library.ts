export type Aop = {
  slug: string;
  name: string;
  surface: string;
  status: "live" | "draft" | "shadow";
  summary: string;
  body: string;
};

export const AOPS: Aop[] = [
  {
    slug: "return_intake_aop",
    name: "Return intake",
    surface: "support_agent",
    status: "live",
    summary: "Qualifies a return request, checks eligibility and creates the RMA.",
    body: `# 📦 AOP: Return Intake

**Owner:** Bookly CX · **Surface:** \`support_agent\` · **Trigger:** intent \`initiate_return\`
**Related:** #refund_policy_aop · #order_status_aop

---

## 🎯 Goal
Turn a return request into a correct, policy-backed outcome in one conversation — without over-refunding or making the customer repeat themselves.

## ⚡ Trigger conditions
1. Customer states or implies intent to return an item
2. \`{{order.id}}\` can be resolved from history, order number or email
3. \`{{order.delivered_at}}\` is present

## 🛠️ Skills to call
- @get_order — resolve \`{{order.status}}\` and line items
- @return_eligibility — confirm the 30-day window and item condition rules
- @create_return — open the RMA and issue the label
- @log_conversation — write the trace back to Bookly

## 💬 How the agent should talk about it
- Acknowledge the reason before quoting policy
- State eligibility as a fact, never as a favor
- Offer an exchange first when the reason is fit, not defect
- ❌ Never invent policy exceptions; hand off instead

## 🔁 Branches
| Situation | Action |
| --- | --- |
| Within window, unopened | Create RMA, email label |
| Outside window | Explain window, offer store credit review |
| Damaged on arrival | Skip return, go to #reship_aop |

## 📊 Success metrics
Return handle time, refund accuracy, CSAT on return conversations.`,
  },
  {
    slug: "refund_policy_aop",
    name: "Refund policy & timing",
    surface: "support_agent",
    status: "live",
    summary: "Explains refund method, timing and pending-return states consistently.",
    body: `# 💳 AOP: Refund Policy & Timing

**Owner:** Bookly Finance CX · **Surface:** \`support_agent\`
**Related:** #return_intake_aop

---

## 🎯 Goal
Set an accurate refund expectation the first time so the customer does not contact us again to ask "where is my money".

## ⚡ Trigger conditions
1. Conversation references a refund on \`{{order.id}}\`
2. \`{{refund.status}}\` is one of \`pending_return\`, \`pending\`, \`succeeded\`

## 🛠️ Skills to call
- @get_refund — read \`{{refund.status}}\` and \`{{refund.amount_cents}}\`
- @update_refund — advance status when loyalty rules allow early processing
- @log_conversation

## 💬 How the agent should talk about it
- Name the current state in plain language, then the next state and its timing
- Quote timing as a range, never a single date
- When advancing a refund early, frame it as loyalty, not as an exception to policy

## 🔁 Branches
| \`{{refund.status}}\` | Action |
| --- | --- |
| pending_return | Explain the return must be scanned first |
| pending | Give the 3–5 business day bank window |
| succeeded | Point to the statement descriptor |

## 📊 Success metrics
Refund repeat-contact rate, refund accuracy, CSAT.`,
  },
  {
    slug: "order_status_aop",
    name: "Order status & tracking",
    surface: "support_agent",
    status: "live",
    summary: "Answers 'where is my order' with live shipment data instead of a generic ETA.",
    body: `# 🚚 AOP: Order Status & Tracking

**Owner:** Bookly CX · **Surface:** \`support_agent\` · **Trigger:** intent \`order_status\`
**Related:** #reship_aop

---

## 🎯 Goal
Answer with the actual shipment scan, not a policy paragraph.

## ⚡ Trigger conditions
1. Customer asks about delivery of \`{{order.id}}\`
2. \`{{shipment.tracking_number}}\` exists

## 🛠️ Skills to call
- @get_order · @get_shipment · @shipment_events · @log_conversation

## 💬 How the agent should talk about it
- Lead with the most recent scan and its timestamp
- Only quote an ETA the carrier actually gave us
- If the last scan is older than 48h, say so proactively and offer #reship_aop

## 📊 Success metrics
Containment on \`order_status\`, repeat contact within 72h.`,
  },
  {
    slug: "genre_fit_nudge_aop",
    name: "Proactive genre-fit nudge",
    surface: "store_chatbot",
    status: "draft",
    summary: "Drafted by Duet — intercepts off-pattern genre purchases at checkout.",
    body: `# 📚 AOP: Proactive Genre-Fit Nudge at Checkout

**Owner:** Bookly CX · **Surface:** \`store_chatbot\` · **Trigger:** checkout view
**Related:** #return_intake_aop · #recommendation_aop

---

## 🎯 Goal
Reduce "didn't like the book" returns by warmly flagging genre mismatches **before** purchase.

## ⚡ Trigger conditions
1. \`{{customer.is_authenticated}}\` is true
2. \`{{customer.lifetime_orders}}\` >= 3
3. \`{{customer.top_genre_share}}\` >= 0.6
4. \`{{cart.item.category}}\` is not in \`{{customer.recent_genres}}\`

## 🛠️ Skills to call
- @get_reading_profile · @inventory_lookup · @recommend_titles · @log_conversation

## 💬 How the agent should talk about it
- Lead with the observation, never a warning
- Frame branching out as a good thing
- Offer \`{{recommendations}}\` as an option, one dismissible message per session

## 📊 Success metrics
"Didn't like the book" return rate (target −18%), checkout completion (must not drop >1%).`,
  },
  {
    slug: "password_reset_aop",
    name: "Account & password reset",
    surface: "support_agent",
    status: "shadow",
    summary: "Handles login trouble without exposing account details over voice.",
    body: `# 🔐 AOP: Account & Password Reset

**Owner:** Bookly Trust · **Surface:** \`support_agent\`

---

## 🎯 Goal
Get the customer back into \`{{customer.email}}\` safely, especially on voice.

## ⚡ Trigger conditions
1. Customer cannot sign in, or asks to change \`{{customer.email}}\`

## 🛠️ Skills to call
- @password_reset — send the reset link to the email on file
- @get_customer — verify identity signals only, never read them aloud
- @log_conversation

## 💬 How the agent should talk about it
- Confirm identity by asking, never by reciting stored data
- Say where the link is going without spelling out the full address on voice
- ❌ Never read \`{{customer.phone}}\` or order totals aloud to verify

## 📊 Success metrics
Reset completion rate, escalation rate on account intents.`,
  },
];

export type CatalogEntry = {
  id: string;
  kind: "tool" | "skill";
  name: string;
  description: string;
  surface: string;
  status: "live" | "draft";
};

export const CATALOG: CatalogEntry[] = [
  { id: "t1", kind: "tool", name: "get_order", description: "Fetch an order, its items, shipments and totals from Bookly.", surface: "bookly_api", status: "live" },
  { id: "t2", kind: "tool", name: "get_customer", description: "Resolve a customer by email, phone or id with order history counts.", surface: "bookly_api", status: "live" },
  { id: "t3", kind: "tool", name: "create_return", description: "Open an RMA against an order item and issue a prepaid label.", surface: "bookly_api", status: "live" },
  { id: "t4", kind: "tool", name: "update_refund", description: "Advance or override a refund status, including pending_return.", surface: "bookly_api", status: "live" },
  { id: "t5", kind: "tool", name: "inventory_lookup", description: "Check live stock for a title by ISBN, id or name.", surface: "bookly_api", status: "live" },
  { id: "t6", kind: "tool", name: "get_reading_profile", description: "Return genre concentration, recent genres and favorite authors.", surface: "bookly_api", status: "draft" },
  { id: "t7", kind: "tool", name: "log_conversation", description: "Write the agent trace, intent and confidence scores back to Bookly.", surface: "bookly_api", status: "live" },
  { id: "s1", kind: "skill", name: "return_eligibility", description: "Applies the 30-day window and condition rules to a candidate return.", surface: "support_agent", status: "live" },
  { id: "s2", kind: "skill", name: "refund_processor", description: "Decides immediate vs pending-return refunds using loyalty signals.", surface: "support_agent", status: "live" },
  { id: "s3", kind: "skill", name: "recommend_titles", description: "Ranks in-stock alternates by genre and author affinity.", surface: "store_chatbot", status: "draft" },
  { id: "s4", kind: "skill", name: "policy_answer", description: "Answers shipping, returns and privacy questions from published policy.", surface: "support_agent", status: "live" },
  { id: "s5", kind: "skill", name: "escalate_to_human", description: "Hands off with a structured summary when confidence drops below 0.6.", surface: "support_agent", status: "live" },
];

export type AopVersion = {
  version: string;
  label: string;
  author: string;
  date: string;
  live: boolean;
  quality: number;
  containment: number;
  csat: number;
  convos: number;
  note: string;
};

// Lightweight audit trail: each published version with the eval performance
// recorded while that version was serving traffic.
export const AOP_VERSIONS: Record<string, AopVersion[]> = {
  return_intake_aop: [
    { version: "v4", label: "Exchange-first branch", author: "M. Okafor", date: "Aug 12, 2026", live: true, quality: 92, containment: 78, csat: 4.6, convos: 8421, note: "Offer exchange before refund on fit reasons." },
    { version: "v3", label: "Damaged-on-arrival handoff", author: "Duet", date: "Jun 03, 2026", live: false, quality: 88, containment: 74, csat: 4.4, convos: 12980, note: "Route damaged items to #reship_aop." },
    { version: "v2", label: "Window wording rewrite", author: "R. Vance", date: "Feb 19, 2026", live: false, quality: 81, containment: 69, csat: 4.1, convos: 15310, note: "Policy stated as fact, not favor." },
    { version: "v1", label: "Initial publish", author: "M. Okafor", date: "Oct 07, 2025", live: false, quality: 74, containment: 61, csat: 3.9, convos: 9044, note: "First production AOP." },
  ],
  refund_policy_aop: [
    { version: "v3", label: "Loyalty early-processing", author: "Duet", date: "Jul 28, 2026", live: true, quality: 90, containment: 81, csat: 4.5, convos: 6210, note: "Advance refunds for high-loyalty customers." },
    { version: "v2", label: "Range-based timing", author: "S. Iyer", date: "Mar 11, 2026", live: false, quality: 84, containment: 76, csat: 4.2, convos: 11045, note: "Quote 3–5 day windows, never single dates." },
    { version: "v1", label: "Initial publish", author: "S. Iyer", date: "Nov 22, 2025", live: false, quality: 77, containment: 70, csat: 4.0, convos: 8730, note: "First production AOP." },
  ],
  order_status_aop: [
    { version: "v2", label: "Stale-scan proactive offer", author: "Duet", date: "Jul 02, 2026", live: true, quality: 94, containment: 86, csat: 4.7, convos: 19402, note: "Flag scans older than 48h." },
    { version: "v1", label: "Initial publish", author: "M. Okafor", date: "Jan 15, 2026", live: false, quality: 85, containment: 79, csat: 4.3, convos: 22110, note: "Lead with latest carrier scan." },
  ],
  genre_fit_nudge_aop: [
    { version: "v1", label: "Draft — not yet published", author: "Duet", date: "Aug 28, 2026", live: false, quality: 0, containment: 0, csat: 0, convos: 0, note: "Awaiting A/B test configuration." },
  ],
  password_reset_aop: [
    { version: "v2", label: "Voice redaction rules", author: "Bookly Trust", date: "May 09, 2026", live: true, quality: 89, containment: 72, csat: 4.4, convos: 3311, note: "Never read PII aloud on voice." },
    { version: "v1", label: "Initial publish", author: "Bookly Trust", date: "Dec 04, 2025", live: false, quality: 80, containment: 65, csat: 4.1, convos: 4102, note: "First production AOP." },
  ],
};
