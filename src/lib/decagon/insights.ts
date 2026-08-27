import type { AgentTrace } from "@/lib/bookly/api-client";

/**
 * Decagon-style CX analytics helpers.
 * Aggregates Bookly agent traces into intents, sub-reasons and channel volumes.
 * Chart hues are explicit oklch values (charts need discrete, stable colors);
 * everything else in the UI uses the app's semantic tokens.
 */

export type SubReason = { key: string; label: string };
export type Intent = {
  key: string;
  label: string;
  color: string;
  subReasons: SubReason[];
};

export const INTENTS: Intent[] = [
  {
    key: "initiate_return",
    label: "Initiate return",
    color: "oklch(0.62 0.17 264)",
    subReasons: [
      { key: "didnt_like_book", label: "Didn't like the book" },
      { key: "damaged_in_transit", label: "Damaged in transit" },
      { key: "wrong_item", label: "Wrong item received" },
      { key: "arrived_late", label: "Arrived late" },
      { key: "changed_mind", label: "Changed mind" },
    ],
  },
  {
    key: "order_status",
    label: "Order status",
    color: "oklch(0.68 0.14 196)",
    subReasons: [
      { key: "where_is_my_order", label: "Where is my order" },
      { key: "tracking_not_updating", label: "Tracking not updating" },
      { key: "delivered_not_received", label: "Delivered, not received" },
    ],
  },
  {
    key: "refund_status",
    label: "Refund status",
    color: "oklch(0.72 0.15 150)",
    subReasons: [
      { key: "refund_not_received", label: "Refund not received" },
      { key: "partial_refund_question", label: "Partial refund question" },
      { key: "refund_method_change", label: "Refund method change" },
    ],
  },
  {
    key: "shipping_policy",
    label: "Shipping policy",
    color: "oklch(0.78 0.15 85)",
    subReasons: [
      { key: "delivery_estimate", label: "Delivery estimate" },
      { key: "shipping_cost", label: "Shipping cost" },
      { key: "international_shipping", label: "International shipping" },
    ],
  },
  {
    key: "password_reset",
    label: "Password reset",
    color: "oklch(0.7 0.16 30)",
    subReasons: [
      { key: "reset_email_missing", label: "Reset email never arrived" },
      { key: "account_locked", label: "Account locked out" },
    ],
  },
  {
    key: "book_availability",
    label: "Book availability",
    color: "oklch(0.66 0.13 320)",
    subReasons: [
      { key: "out_of_stock", label: "Out of stock" },
      { key: "restock_date", label: "Restock date" },
    ],
  },
];

export const CHANNEL_COLOR = {
  chat: "oklch(0.62 0.17 264)",
  voice: "oklch(0.78 0.15 85)",
} as const;

/** Lighter hues of the same base color for sub-reason drill-downs. */
export function hueRamp(base: string, count: number): string[] {
  const match = /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/.exec(base);
  if (!match) return Array.from({ length: count }, () => base);
  const l = Number(match[1]);
  const c = Number(match[2]);
  const h = Number(match[3]);
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    return `oklch(${(l + t * 0.22).toFixed(3)} ${(c * (1 - t * 0.55)).toFixed(3)} ${(h + t * 14).toFixed(1)})`;
  });
}

export function traceIntent(t: AgentTrace): string {
  const meta = (t.metadata ?? {}) as Record<string, unknown>;
  return (meta["intent_category"] as string) || t.intent || "other";
}

export function traceSubReason(t: AgentTrace): string | null {
  const meta = (t.metadata ?? {}) as Record<string, unknown>;
  return (meta["sub_reason"] as string) ?? null;
}

export function traceChannel(t: AgentTrace): "chat" | "voice" {
  const meta = (t.metadata ?? {}) as Record<string, unknown>;
  const raw = ((meta["contact_channel"] as string) || t.channel || "chat").toLowerCase();
  return raw === "voice" || raw === "phone" ? "voice" : "chat";
}

export type Slice = { key: string; label: string; value: number; color: string };

export function intentSlices(traces: AgentTrace[]): Slice[] {
  return INTENTS.map((intent) => ({
    key: intent.key,
    label: intent.label,
    color: intent.color,
    value: traces.filter((t) => traceIntent(t) === intent.key).length,
  }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function subReasonSlices(traces: AgentTrace[], intentKey: string): Slice[] {
  const intent = INTENTS.find((i) => i.key === intentKey);
  if (!intent) return [];
  const ramp = hueRamp(intent.color, intent.subReasons.length);
  return intent.subReasons
    .map((sr, i) => ({
      key: sr.key,
      label: sr.label,
      color: ramp[i]!,
      value: traces.filter((t) => traceIntent(t) === intentKey && traceSubReason(t) === sr.key).length,
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

export const LENGTH_BUCKETS = [
  { key: "1-4", label: "1–4 turns", test: (n: number) => n <= 4 },
  { key: "5-6", label: "5–6 turns", test: (n: number) => n >= 5 && n <= 6 },
  { key: "7-8", label: "7–8 turns", test: (n: number) => n >= 7 && n <= 8 },
  { key: "9-10", label: "9–10 turns", test: (n: number) => n >= 9 && n <= 10 },
  { key: "11+", label: "11+ turns", test: (n: number) => n >= 11 },
];

export function lengthByChannel(traces: AgentTrace[]) {
  return LENGTH_BUCKETS.map((b) => {
    const inBucket = traces.filter((t) => b.test(t.message_count ?? t.messages?.length ?? 0));
    return {
      key: b.key,
      label: b.label,
      chat: inBucket.filter((t) => traceChannel(t) === "chat").length,
      voice: inBucket.filter((t) => traceChannel(t) === "voice").length,
    };
  });
}

/** SVG donut arc path. */
export function arcPath(cx: number, cy: number, r: number, rInner: number, start: number, end: number): string {
  const p = (radius: number, angle: number) => [
    cx + radius * Math.cos(angle - Math.PI / 2),
    cy + radius * Math.sin(angle - Math.PI / 2),
  ];
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = p(r, start);
  const [x2, y2] = p(r, end);
  const [x3, y3] = p(rInner, end);
  const [x4, y4] = p(rInner, start);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
}
