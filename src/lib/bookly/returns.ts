import type { SupabaseClient } from "@supabase/supabase-js";
import { dbErr, notFound } from "@/lib/bookly/http";

/** Resolve a return by RMA number or UUID. */
export async function findReturn(
  db: SupabaseClient,
  rma: string,
  select = "*",
): Promise<Record<string, unknown>> {
  const key = /^RMA-/i.test(rma) ? "rma_number" : "id";
  const { data, error } = await db
    .from("returns")
    .select(select)
    .eq(key, key === "rma_number" ? rma.toUpperCase() : rma)
    .maybeSingle();
  dbErr(error);
  if (!data) throw notFound(`Return "${rma}"`);
  return data as unknown as Record<string, unknown>;
}
