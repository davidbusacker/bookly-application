import type { SupabaseClient } from "@supabase/supabase-js";
import { dbErr, notFound } from "@/lib/bookly/http";

export const REFUND_SELECT =
  "*, order:orders(id,order_number,status,total_cents,customer_id), return:returns(id,rma_number,status), events:refund_events(*)";

/** Resolve a refund by UUID or refund number (RF-12345). */
export async function findRefund(
  db: SupabaseClient,
  idOrNumber: string,
  select = REFUND_SELECT,
): Promise<Record<string, unknown>> {
  const key = /^RF-/i.test(idOrNumber) ? "refund_number" : "id";
  const value = key === "refund_number" ? idOrNumber.toUpperCase() : idOrNumber;
  const { data, error } = await db.from("refunds").select(select).eq(key, value).maybeSingle();
  dbErr(error);
  if (!data) throw notFound(`Refund "${idOrNumber}"`);
  return data as unknown as Record<string, unknown>;
}

export async function logRefundEvent(
  db: SupabaseClient,
  input: {
    refund_id: string;
    type?: string;
    status_from?: string | null;
    status_to?: string | null;
    actor?: string;
    note?: string | null;
    amount_cents?: number | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await db.from("refund_events").insert({
    refund_id: input.refund_id,
    type: input.type ?? "status_change",
    status_from: input.status_from ?? null,
    status_to: input.status_to ?? null,
    actor: input.actor ?? "agent",
    note: input.note ?? null,
    amount_cents: input.amount_cents ?? null,
    metadata: input.metadata ?? {},
  });
}

/** Money movement that happens when a refund settles (status becomes `succeeded`). */
export async function settleRefund(
  db: SupabaseClient,
  refund: { id: string; refund_number: string; amount_cents: number; method: string },
  order: { id: string; order_number: string; customer_id: string; total_cents: number },
): Promise<Record<string, unknown> | null> {
  const now = new Date().toISOString();

  const { data: existingTxn } = await db
    .from("transactions")
    .select("id")
    .eq("reference", refund.refund_number)
    .eq("type", "refund")
    .maybeSingle();

  let txn: Record<string, unknown> | null = null;
  if (!existingTxn) {
    const { data } = await db
      .from("transactions")
      .insert({
        transaction_number: `TXN-${Date.now().toString().slice(-8)}`,
        order_id: order.id,
        customer_id: order.customer_id,
        type: "refund",
        amount_cents: -refund.amount_cents,
        status: "succeeded",
        method: refund.method,
        reference: refund.refund_number,
        description: `Refund for order ${order.order_number}`,
      })
      .select("*")
      .single();
    txn = data as Record<string, unknown> | null;
  }

  if (refund.method === "store_credit") {
    const { data: cust } = await db
      .from("customers")
      .select("store_credit_cents")
      .eq("id", order.customer_id)
      .single();
    await db
      .from("customers")
      .update({ store_credit_cents: (cust?.store_credit_cents ?? 0) + refund.amount_cents })
      .eq("id", order.customer_id);
  }

  const { data: succeeded } = await db
    .from("refunds")
    .select("amount_cents")
    .eq("order_id", order.id)
    .eq("status", "succeeded");
  const totalRefunded = (succeeded ?? []).reduce((s, r) => s + (r.amount_cents as number), 0);
  if (totalRefunded >= order.total_cents) {
    await db.from("orders").update({ status: "refunded", updated_at: now }).eq("id", order.id);
  }

  return txn;
}

/** Reverses the money movement when a settled refund is cancelled or marked failed. */
export async function reverseRefund(
  db: SupabaseClient,
  refund: { id: string; refund_number: string; amount_cents: number; method: string },
  order: { id: string; order_number: string; customer_id: string },
): Promise<void> {
  await db.from("transactions").insert({
    transaction_number: `TXN-${Date.now().toString().slice(-8)}`,
    order_id: order.id,
    customer_id: order.customer_id,
    type: "void",
    amount_cents: refund.amount_cents,
    status: "succeeded",
    method: refund.method,
    reference: refund.refund_number,
    description: `Reversal of refund ${refund.refund_number} on order ${order.order_number}`,
  });

  if (refund.method === "store_credit") {
    const { data: cust } = await db
      .from("customers")
      .select("store_credit_cents")
      .eq("id", order.customer_id)
      .single();
    await db
      .from("customers")
      .update({ store_credit_cents: Math.max((cust?.store_credit_cents ?? 0) - refund.amount_cents, 0) })
      .eq("id", order.customer_id);
  }
}
