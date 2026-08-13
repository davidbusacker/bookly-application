import { createFileRoute } from "@tanstack/react-router";
import { API_VERSION, dbErr, handler, ok, preflight } from "@/lib/bookly/http";
import { booklyDb } from "@/lib/bookly/db";
import { ORDER_STATUSES, RETURN_REASONS, RETURN_STATUSES, RULES } from "@/lib/bookly/rules";

async function countOf(table: string): Promise<number> {
  const db = booklyDb();
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
  dbErr(error);
  return count ?? 0;
}

export const Route = createFileRoute("/api/public/v1/meta")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async () => {
        const db = booklyDb();
        const [orders, customers, books, returns, refunds, transactions, tickets] = await Promise.all([
          countOf("orders"),
          countOf("customers"),
          countOf("books"),
          countOf("returns"),
          countOf("refunds"),
          countOf("transactions"),
          countOf("support_tickets"),
        ]);

        const { data: sampleOrders } = await db
          .from("orders")
          .select("order_number,status,customer:customers(email)")
          .limit(5);
        const { data: sampleReturns } = await db.from("returns").select("rma_number,status").limit(3);
        const { data: sampleShipments } = await db
          .from("shipments")
          .select("tracking_number,status")
          .limit(3);

        return ok(
          {
            service: "bookly-api",
            version: API_VERSION,
            description:
              "Bookly is a fictional online bookstore. This API exposes orders, shipments, returns, refunds, transactions, catalog, policies, FAQs, and support tickets for building a customer support agent.",
            counts: { orders, customers, books, returns, refunds, transactions, tickets },
            samples: {
              orders: sampleOrders ?? [],
              returns: sampleReturns ?? [],
              shipments: sampleShipments ?? [],
            },
            enums: {
              order_status: ORDER_STATUSES,
              return_status: RETURN_STATUSES,
              return_reason: RETURN_REASONS,
            },
            rules: RULES,
            discovery: {
              openapi: "/api/public/openapi.json",
              openapi_yaml: "/api/public/openapi.yaml",
              tool_manifest: "/api/public/tools.json",
              llms_txt: "/api/public/llms.txt",
              docs: "/docs",
            },
          },
          { generated_at: new Date().toISOString() },
        );
      }),
    },
  },
});
