/**
 * Agent trace domain helpers.
 * A "trace" is one conversation the external Bookly CX agent had with a customer,
 * logged back to Bookly after the call so store staff can audit what the agent did.
 */

export const TRACE_SELECT =
  "*, customer:customers(id,full_name,email,member_tier), order:orders(id,order_number,status,total_cents), ticket:support_tickets(id,ticket_number,status), messages:agent_trace_messages(*)";

export const TRACE_ROLES = [
  "customer",
  "agent",
  "tool",
  "system",
  "note",
] as const;

export const TRACE_OUTCOMES = [
  "resolved",
  "refund_issued",
  "return_created",
  "escalated",
  "deflected",
  "unresolved",
] as const;

export const TRACE_STATUSES = ["in_progress", "completed", "failed"] as const;

export const TRACE_CHANNELS = ["chat", "email", "voice", "sms", "api"] as const;

export function traceNumber(): string {
  return `TRC-${Math.floor(100000 + Math.random() * 899999)}`;
}

export type TraceMessageInput = {
  role: string;
  speaker?: string | undefined;
  content?: string | undefined;
  occurred_at?: string | undefined;
  duration_ms?: number | undefined;
  tool_name?: string | undefined;
  tool_input?: unknown;
  tool_output?: unknown;
  metadata?: Record<string, unknown> | undefined;
};

/** Deterministic markdown rendering so the console and the API agree on formatting. */
export function renderTranscript(
  header: { trace_number: string; agent_name: string; subject: string; started_at: string },
  messages: TraceMessageInput[],
): string {
  const lines = [
    `# ${header.trace_number} — ${header.subject}`,
    `_${header.agent_name} · ${header.started_at}_`,
    "",
  ];
  for (const m of messages) {
    const ts = m.occurred_at ? new Date(m.occurred_at).toISOString() : "";
    const who = m.speaker || defaultSpeaker(m.role);
    if (m.role === "tool") {
      lines.push(`**[${ts}] ${who} → \`${m.tool_name ?? "tool"}\`**`);
      if (m.tool_input !== undefined) lines.push("```json\n" + JSON.stringify(m.tool_input, null, 2) + "\n```");
      if (m.tool_output !== undefined) lines.push("```json\n" + JSON.stringify(m.tool_output, null, 2) + "\n```");
    } else {
      lines.push(`**[${ts}] ${who}:** ${m.content ?? ""}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

function defaultSpeaker(role: string): string {
  switch (role) {
    case "customer":
      return "Customer";
    case "agent":
      return "Agent";
    case "tool":
      return "Agent";
    case "system":
      return "System";
    default:
      return "Note";
  }
}

/**
 * Written for an LLM: exact contract for logging a conversation back to Bookly.
 * Surfaced in the MCP tool manifest, the OpenAPI description, llms.txt and /docs.
 */
export const TRACE_LOGGING_GUIDE = [
  "## Logging your conversations back to Bookly (required after every call)",
  "",
  "After you finish handling a customer, POST the whole conversation to `/api/public/v1/agent-traces`.",
  "Bookly store staff review these traces to verify what you claimed you did, so log every turn and every tool call.",
  "",
  "**When to log**",
  "- Once, at the end of a conversation, with the complete `messages` array.",
  "- If the conversation is still running, POST with `status: \"in_progress\"` and append later turns with `POST /api/public/v1/agent-traces/{id}/messages`.",
  "- Never log the same conversation twice; reuse the returned `trace_number`.",
  "",
  "**Required shape**",
  "- `subject`: one short line describing the request (e.g. \"Refund for damaged copy on BK-10005\").",
  "- `summary`: 1-3 sentences of what you did and why, including the reasoning behind any money movement.",
  "- `customer_email` (and `order_id` / `ticket_id` when known) so the trace is queryable by customer and order.",
  "- `outcome`: one of resolved | refund_issued | return_created | escalated | deflected | unresolved.",
  "- `messages[]`: every turn, in order.",
  "",
  "**Message formatting rules**",
  "- `role`: customer | agent | tool | system | note. `speaker` is the display name shown in bold (defaults: \"Customer\", \"Agent\", \"System\").",
  "- `occurred_at`: ISO-8601 UTC timestamp for each turn. Timestamps are rendered next to the bold speaker.",
  "- Plain-language turns go in `content` as markdown; keep the customer's words verbatim.",
  "- For every API call you made, add a `tool` message with `tool_name` (the tool/operation id), `tool_input` (the arguments) and `tool_output` (the trimmed response).",
  "- Use `metadata` on a message for anything structured you want staff to see (confidence, policy id, rule that fired).",
  "- Use a `note` role for internal reasoning that was never shown to the customer.",
  "",
  "**Rendered format in the store console**",
  "`**[2026-08-14T14:03:11Z] Customer:** where is my order?` — speaker bold, timestamp first, tool calls shown as collapsible JSON.",
  "",
  "**Querying past conversations**",
  "- `GET /api/public/v1/agent-traces?email=...` — everything you did for this customer before.",
  "- `GET /api/public/v1/agent-traces?q=refund&outcome=refund_issued` — full-text search over subject, summary and transcript.",
  "- `GET /api/public/v1/support/tickets?email=...&q=...` — past support tickets, including their event history.",
  "- Always check prior traces and tickets before promising anything, so you do not contradict an earlier decision.",
].join("\n");
