import type { SupabaseClient } from "@supabase/supabase-js";
import { dbErr, notFound } from "@/lib/bookly/http";
import { ORDER_SELECT } from "@/lib/bookly/selects";

/** Resolve an order by UUID or by human order number (e.g. BK-10042). */
export async function findOrder(
  db: SupabaseClient,
  idOrNumber: string,
  select: string = ORDER_SELECT,
): Promise<Record<string, unknown>> {
  const key = /^BK-/i.test(idOrNumber) ? "order_number" : "id";
  const value = key === "order_number" ? idOrNumber.toUpperCase() : idOrNumber;
  const { data, error } = await db.from("orders").select(select).eq(key, value).maybeSingle();
  dbErr(error);
  if (!data) throw notFound(`Order "${idOrNumber}"`);
  return data as unknown as Record<string, unknown>;
}
