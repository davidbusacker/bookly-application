import { defineMcp } from "@lovable.dev/mcp-js";
import { API_VERSION } from "@/lib/bookly/http";
import { TRACE_LOGGING_GUIDE } from "@/lib/bookly/traces";
import { booklyTools } from "./tools";

export default defineMcp({
  name: "bookly-order-bot",
  title: "Bookly Order Bot",
  version: API_VERSION,
  instructions: [
    "Tools for the Bookly bookstore support agent. Resolve the customer first (email or order number), check policy and return/refund eligibility before promising anything, and escalate with create_ticket when a request cannot be resolved.",
    "Call `meta` first to discover live identifiers, and search prior context with list_agent_traces and list_tickets so you never contradict an earlier decision.",
    "Money is always integer cents. Orders accept a UUID or a human order number (BK-10042); customers accept a UUID or email; returns accept RMA-#####.",
    "",
    TRACE_LOGGING_GUIDE,
  ].join("\n"),
  tools: booklyTools,
});
