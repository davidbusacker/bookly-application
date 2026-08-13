/** Bookly business rules — shared by API handlers, docs, and the OpenAPI examples. */

export const RULES = {
  returnWindowDays: 30,
  damagedWindowDays: 90,
  returnLabelFeeCents: 499,
  freeShippingThresholdCents: 3500,
  groundShippingCents: 499,
  stalledTrackingDays: 7,
  passwordResetTtlMinutes: 60,
  nonReturnableFormats: ["ebook"],
  cancellableStatuses: ["processing", "backordered"],
  returnableStatuses: ["delivered", "shipped"],
  reshipableStatuses: ["lost_in_transit", "shipped"],
} as const;

export const ORDER_STATUSES = [
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
  "backordered",
  "lost_in_transit",
] as const;

export const RETURN_STATUSES = [
  "requested",
  "label_sent",
  "in_transit",
  "received",
  "refunded",
  "rejected",
  "cancelled",
] as const;

export const RETURN_REASONS = [
  "damaged",
  "wrong_item",
  "not_as_described",
  "no_longer_needed",
  "arrived_late",
  "other",
] as const;

export const REFUND_METHODS = ["original_payment", "store_credit"] as const;
export const TICKET_STATUSES = ["open", "pending", "resolved", "escalated", "closed"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export type EligibilityInput = {
  status: string;
  deliveredAt: string | null;
  placedAt: string;
  reason?: string | undefined;
  itemFormats: string[];
};

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];
  window_days: number;
  days_since_delivery: number | null;
  days_remaining: number | null;
  requires_label_fee: boolean;
  label_fee_cents: number;
  policy_slug: string;
};

/** Deterministic return-eligibility evaluation used by the API and the docs examples. */
export function evaluateReturnEligibility(input: EligibilityInput): EligibilityResult {
  const reasons: string[] = [];
  const damaged = input.reason === "damaged" || input.reason === "wrong_item";
  const windowDays = damaged ? RULES.damagedWindowDays : RULES.returnWindowDays;
  const since = daysSince(input.deliveredAt ?? input.placedAt);

  if (!RULES.returnableStatuses.includes(input.status as "delivered")) {
    reasons.push(`Order status "${input.status}" is not returnable; only delivered or shipped orders can be returned.`);
  }
  if (input.itemFormats.length > 0 && input.itemFormats.every((f) => RULES.nonReturnableFormats.includes(f as "ebook"))) {
    reasons.push("All items on this order are digital (ebook) and are non-returnable once downloaded.");
  }
  if (since !== null && since > windowDays) {
    reasons.push(`Return window of ${windowDays} days has passed (${since} days since delivery).`);
  }

  const remaining = since === null ? null : Math.max(windowDays - since, 0);

  return {
    eligible: reasons.length === 0,
    reasons: reasons.length === 0 ? ["Within the return window and in a returnable status."] : reasons,
    window_days: windowDays,
    days_since_delivery: since,
    days_remaining: remaining,
    requires_label_fee: !damaged,
    label_fee_cents: damaged ? 0 : RULES.returnLabelFeeCents,
    policy_slug: "returns",
  };
}

export function nextSequence(prefix: string, width = 5): string {
  const n = Math.floor(Math.random() * 10 ** width);
  return `${prefix}-${n.toString().padStart(width, "0")}`;
}
