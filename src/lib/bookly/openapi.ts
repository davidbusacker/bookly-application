import { ENDPOINTS, TAGS, type EndpointDef, type FieldDef } from "./catalog";
import { API_VERSION } from "./http";
import { RULES } from "./rules";

type JsonSchema = Record<string, unknown>;

function fieldSchema(f: FieldDef): JsonSchema {
  if (f.type === "array") {
    const item = f.items;
    if (item?.type === "object" && item.fields) {
      return {
        type: "array",
        description: f.description,
        items: objectSchema(item.fields),
      };
    }
    return { type: "array", description: f.description, items: { type: "string" } };
  }
  return {
    type: f.type,
    description: f.description,
    ...(f.enum ? { enum: [...f.enum] } : {}),
  };
}

export function objectSchema(fields: FieldDef[]): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const f of fields) {
    properties[f.name] = fieldSchema(f);
    if (f.required) required.push(f.name);
  }
  return { type: "object", properties, ...(required.length ? { required } : {}), additionalProperties: false };
}

function operation(e: EndpointDef): JsonSchema {
  const op: JsonSchema = {
    operationId: e.id,
    tags: [e.tag],
    summary: e.summary,
    description: `${e.description}\n\n**Agent guidance:** ${e.agentUse}`,
    parameters: (e.params ?? []).map((p) => ({
      name: p.name,
      in: p.in,
      required: p.in === "path" ? true : Boolean(p.required),
      description: p.description,
      schema: { type: p.type ?? "string", ...(p.enum ? { enum: [...p.enum] } : {}) },
      ...(p.example !== undefined ? { example: p.example } : {}),
    })),
    responses: {
      "200": {
        description: "Success envelope",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SuccessEnvelope" },
          },
        },
      },
      "400": { $ref: "#/components/responses/Error" },
      "404": { $ref: "#/components/responses/Error" },
      "409": { $ref: "#/components/responses/Error" },
    },
  };
  if (e.body) {
    op["requestBody"] = {
      required: e.body.some((f) => f.required),
      content: {
        "application/json": {
          schema: objectSchema(e.body),
          ...(e.example?.body ? { example: e.example.body } : {}),
        },
      },
    };
  }
  return op;
}

export function buildOpenApi(origin: string): JsonSchema {
  const paths: Record<string, JsonSchema> = {};
  for (const e of ENDPOINTS) {
    const key = e.path;
    paths[key] = { ...(paths[key] ?? {}), [e.method.toLowerCase()]: operation(e) };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Bookly Support API",
      version: API_VERSION,
      summary: "Order, shipping, returns, refunds and support knowledge API for the Bookly demo bookstore.",
      description: [
        "Public, unauthenticated demo API for building a Bookly customer-support agent.",
        "",
        "**Conventions**",
        "- Success responses are `{ \"data\": ..., \"meta\": { \"request_id\": ... } }`.",
        "- Errors are RFC 9457-style: `{ \"error\": { \"type\", \"title\", \"status\", \"code\", \"detail\", \"request_id\" } }`.",
        "- Money is always integer cents.",
        "- Orders accept either a UUID or a human order number (`BK-10042`). Customers accept UUID or email. Returns accept `RMA-#####`.",
        "- Lists are paginated with `limit` (max 100) and `offset`; `meta` carries `total`, `limit`, `offset`, `has_more`.",
        "- CORS is open and no API key is required.",
        "",
        "**Business rules**",
        `- Return window: ${RULES.returnWindowDays} days from delivery (${RULES.damagedWindowDays} days for damaged or wrong-item claims).`,
        `- Return label fee: $${(RULES.returnLabelFeeCents / 100).toFixed(2)}, waived for damaged/wrong-item.`,
        `- Free shipping over $${(RULES.freeShippingThresholdCents / 100).toFixed(2)}, otherwise $${(RULES.groundShippingCents / 100).toFixed(2)} ground.`,
        `- Orders can be cancelled while ${RULES.cancellableStatuses.join(" or ")}; ebooks are never returnable.`,
        "",
        "Start with `GET /api/public/v1/meta` to discover live identifiers.",
      ].join("\n"),
      contact: { name: "Bookly API", url: `${origin}/docs` },
      license: { name: "MIT" },
    },
    servers: [{ url: origin, description: "Bookly demo server" }],
    tags: TAGS,
    paths,
    components: {
      schemas: {
        SuccessEnvelope: {
          type: "object",
          properties: {
            data: { description: "Resource or array of resources." },
            meta: {
              type: "object",
              properties: {
                request_id: { type: "string" },
                total: { type: "integer" },
                limit: { type: "integer" },
                offset: { type: "integer" },
                has_more: { type: "boolean" },
              },
            },
          },
          required: ["data", "meta"],
        },
        ErrorEnvelope: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                type: { type: "string", format: "uri" },
                title: { type: "string" },
                status: { type: "integer" },
                code: {
                  type: "string",
                  enum: ["invalid_request", "not_found", "conflict", "internal_error"],
                },
                detail: { type: "string" },
                request_id: { type: "string" },
              },
              required: ["title", "status", "code"],
            },
          },
        },
      },
      responses: {
        Error: {
          description: "Error envelope",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
        },
      },
    },
  };
}

/** MCP-style tool manifest derived from the same catalog. */
export function buildToolManifest(origin: string) {
  return {
    schema_version: "2024-11-05",
    name: "bookly-support",
    title: "Bookly Support",
    version: API_VERSION,
    instructions:
      "Tools for the Bookly bookstore support agent. Resolve the customer first (email or order number), check policy/eligibility before promising anything, and escalate with create_ticket when a request cannot be resolved.",
    base_url: origin,
    openapi_url: `${origin}/api/public/openapi.json`,
    tools: ENDPOINTS.map((e) => ({
      name: e.id.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase(),
      title: e.summary,
      description: `${e.description} ${e.agentUse}`,
      annotations: { readOnlyHint: e.method === "GET", destructiveHint: e.method !== "GET", openWorldHint: false },
      http: { method: e.method, url: `${origin}${e.path}` },
      inputSchema: objectSchema([
        ...(e.params ?? []).map((p) => ({
          name: p.name,
          type: (p.type ?? "string") as "string",
          required: p.in === "path" ? true : Boolean(p.required),
          description: `${p.in === "path" ? "Path segment. " : "Query parameter. "}${p.description}`,
          ...(p.enum ? { enum: p.enum } : {}),
        })),
        ...(e.body ?? []),
      ]),
    })),
  };
}
