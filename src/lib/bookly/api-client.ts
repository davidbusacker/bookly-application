/**
 * Thin browser client for the public Bookly API.
 * The admin console reads exactly the same endpoints an agent would call,
 * so anything the agent changes shows up here.
 */

export type ApiEnvelope<T> = {
  data: T;
  meta: {
    request_id: string;
    total?: number;
    limit?: number;
    offset?: number;
    has_more?: boolean;
    [k: string]: unknown;
  };
};

export async function apiGet<T>(path: string): Promise<ApiEnvelope<T>> {
  const res = await fetch(path, { headers: { accept: "application/json" } });
  const json = (await res.json()) as ApiEnvelope<T> & { title?: string; detail?: string };
  if (!res.ok) {
    throw new Error(json.detail || json.title || `Request failed (${res.status})`);
  }
  return json;
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PATCH",
  body: unknown,
): Promise<ApiEnvelope<T>> {
  const res = await fetch(path, {
    method,
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiEnvelope<T> & { error?: { title?: string; detail?: string } };
  if (!res.ok) {
    throw new Error(json.error?.detail || json.error?.title || `Request failed (${res.status})`);
  }
  return json;
}

export function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const money = (cents?: number | null, currency = "USD") =>
  typeof cents === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100)
    : "—";

export const when = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

export const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

/* ---------- loose row shapes used by the console ---------- */

export type CustomerRef = { id: string; email: string; full_name: string; member_tier?: string; phone?: string | null };

export type OrderItem = {
  id: string;
  isbn?: string | null;
  title: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
};

export type Shipment = {
  id: string;
  shipment_number?: string;
  carrier?: string | null;
  tracking_number?: string | null;
  status?: string;
  shipped_at?: string | null;
  delivered_at?: string | null;
  estimated_delivery?: string | null;
  events?: Array<{ id: string; status?: string; description?: string; location?: string | null; occurred_at?: string }>;
};

export type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  payment_method?: string | null;
  shipping_address?: Record<string, string> | null;
  placed_at: string;
  cancelled_at?: string | null;
  notes?: string | null;
  updated_at?: string;
  customer?: CustomerRef | null;
  items?: OrderItem[];
  shipments?: Shipment[];
};

export type Customer = CustomerRef & {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  marketing_opt_in?: boolean;
  store_credit_cents?: number;
  created_at?: string;
  recent_orders?: Order[];
};

export type ReturnRow = {
  id: string;
  rma_number: string;
  status: string;
  reason?: string | null;
  comment?: string | null;
  requested_at?: string;
  received_at?: string | null;
  closed_at?: string | null;
  expected_refund_cents?: number | null;
  order?: { id: string; order_number: string; status?: string; total_cents?: number } | null;
  customer?: CustomerRef | null;
  items?: Array<{ id: string; quantity: number; condition?: string | null }>;
};

export type RefundEvent = {
  id: string;
  type: string;
  status_from?: string | null;
  status_to?: string | null;
  actor: string;
  note?: string | null;
  amount_cents?: number | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type Refund = {
  id: string;
  refund_number: string;
  amount_cents: number;
  currency: string;
  method: string;
  status: string;
  reason?: string | null;
  created_at?: string;
  processed_at?: string | null;
  order?: { id: string; order_number: string; status?: string; total_cents?: number } | null;
  return?: { id: string; rma_number: string; status?: string } | null;
  events?: RefundEvent[];
};

export type Transaction = {
  id: string;
  transaction_number: string;
  type: string;
  amount_cents: number;
  currency: string;
  status: string;
  method?: string | null;
  reference?: string | null;
  description?: string | null;
  occurred_at?: string;
  order?: { id: string; order_number: string } | null;
};

export type Ticket = {
  id: string;
  ticket_number: string;
  subject: string;
  category?: string | null;
  status: string;
  priority?: string | null;
  channel?: string | null;
  assignee?: string | null;
  created_at?: string;
  updated_at?: string;
  customer?: CustomerRef | null;
  order?: { id: string; order_number: string } | null;
  events?: Array<{ id: string; body: string; type?: string; author?: string; created_at?: string; occurred_at?: string }>;
};

export type TraceMessage = {
  id: string;
  seq: number;
  role: string;
  speaker?: string | null;
  content?: string | null;
  occurred_at?: string | null;
  duration_ms?: number | null;
  tool_name?: string | null;
  tool_input?: unknown;
  tool_output?: unknown;
  intent_confidence?: number | null;
  resolution_confidence?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type AgentTrace = {
  id: string;
  trace_number: string;
  subject: string;
  summary?: string | null;
  agent_name?: string | null;
  agent_version?: string | null;
  model?: string | null;
  channel?: string | null;
  intent?: string | null;
  intent_confidence?: number | null;
  resolution_confidence?: number | null;
  outcome?: string | null;
  status: string;
  sentiment?: string | null;
  escalated?: boolean;
  tags?: string[] | null;
  message_count?: number | null;
  tool_calls?: number | null;
  duration_ms?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  transcript_text?: string | null;
  metadata?: Record<string, unknown> | null;
  customer?: CustomerRef | null;
  order?: { id: string; order_number: string; status?: string; total_cents?: number } | null;
  ticket?: { id: string; ticket_number: string; status?: string } | null;
  messages?: TraceMessage[];
};
