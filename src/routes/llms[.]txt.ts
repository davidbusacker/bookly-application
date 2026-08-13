import { createFileRoute } from "@tanstack/react-router";
import { ENDPOINTS, endpointsByTag } from "@/lib/bookly/catalog";
import { CORS_HEADERS } from "@/lib/bookly/http";
import { RULES } from "@/lib/bookly/rules";

function llmsTxt(origin: string): string {
  const lines: string[] = [
    "# Bookly Support API",
    "",
    "> Public, no-auth REST API for the fictional Bookly online bookstore. It powers a customer-support agent handling order status, returns/refunds, shipping, policies and account questions.",
    "",
    `- Base URL: ${origin}`,
    `- OpenAPI 3.1: ${origin}/api/public/openapi.json`,
    `- Tool manifest (MCP-style): ${origin}/api/public/tools.json`,
    `- Human docs: ${origin}/docs`,
    "- Auth: none. CORS: open.",
    "",
    "## Conventions",
    '- Success: {"data": ..., "meta": {"request_id": "..."}}',
    '- Error: {"error": {"type","title","status","code","detail","request_id"}} with codes invalid_request | not_found | conflict | internal_error',
    "- Money is integer cents. Timestamps are ISO-8601 UTC.",
    "- Identifiers are flexible: orders accept UUID or BK-#####, customers accept UUID or email, returns accept RMA-#####, refunds accept RF-#####, tickets accept TCK-#####, shipments accept tracking number.",
    "- Lists paginate with ?limit (max 100) & ?offset; meta contains total/limit/offset/has_more.",
    "",
    "## Business rules",
    `- Return window: ${RULES.returnWindowDays} days after delivery; ${RULES.damagedWindowDays} days for damaged or wrong-item.`,
    `- Return label fee $${(RULES.returnLabelFeeCents / 100).toFixed(2)}, waived for damaged/wrong-item.`,
    "- Ebooks are non-returnable.",
    `- Cancellation allowed while order is ${RULES.cancellableStatuses.join(" or ")}.`,
    `- Reship allowed when order is ${RULES.reshipableStatuses.join(" or ")}; tracking with no scan for ${RULES.stalledTrackingDays}+ days is considered stalled.`,
    `- Free shipping over $${(RULES.freeShippingThresholdCents / 100).toFixed(2)}, otherwise $${(RULES.groundShippingCents / 100).toFixed(2)} ground.`,
    "",
    "## Recommended agent flow",
    "1. GET /api/public/v1/meta — discover live sample IDs and enums.",
    "2. Identify the customer: GET /api/public/v1/customers?email=... or GET /api/public/v1/orders?email=...",
    "3. Read the order: GET /api/public/v1/orders/{id}",
    "4. Before promising a return: POST /api/public/v1/orders/{id}/returns/eligibility",
    "5. Act: create the return, issue the refund, cancel, reship, or change the address.",
    "6. Ground policy answers in /api/public/v1/policies and /api/public/v1/faqs.",
    "7. Escalate with POST /api/public/v1/support/tickets when you cannot resolve it.",
    "",
    "## Endpoints",
  ];

  for (const group of endpointsByTag()) {
    lines.push("", `### ${group.name} — ${group.description}`);
    for (const e of group.endpoints) {
      lines.push(`- ${e.method} ${e.path} — ${e.summary}. ${e.agentUse}`);
    }
  }

  lines.push(
    "",
    "## Quick examples",
    `curl ${origin}/api/public/v1/meta`,
    `curl "${origin}/api/public/v1/orders?email=ava.brooks@example.com"`,
    `curl ${origin}/api/public/v1/orders/BK-10042`,
    `curl -X POST ${origin}/api/public/v1/orders/BK-10042/returns/eligibility -H 'Content-Type: application/json' -d '{"reason":"damaged"}'`,
    "",
    `Total endpoints: ${ENDPOINTS.length}.`,
    "",
  );
  return lines.join("\n");
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) =>
        new Response(llmsTxt(new URL(request.url).origin), {
          headers: { ...CORS_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
