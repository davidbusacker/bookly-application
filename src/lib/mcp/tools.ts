import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { ENDPOINTS, type EndpointDef, type FieldDef, type ParamDef } from "@/lib/bookly/catalog";
import { apiBaseUrl } from "./base-url";

function fieldToZod(f: FieldDef): z.ZodTypeAny {
  let base: z.ZodTypeAny;
  if (f.type === "array") {
    const item = f.items;
    base =
      item?.type === "object" && item.fields
        ? z.array(objectToZod(item.fields))
        : z.array(z.string());
  } else if (f.enum && f.enum.length) {
    base = z.enum([...f.enum] as [string, ...string[]]);
  } else if (f.type === "integer" || f.type === "number") {
    base = z.number();
  } else if (f.type === "boolean") {
    base = z.boolean();
  } else if (f.type === "object") {
    base = z.record(z.string(), z.unknown());
  } else {
    base = z.string();
  }
  base = base.describe(f.description);
  return f.required ? base : base.optional();
}

function objectToZod(fields: FieldDef[]): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) shape[f.name] = fieldToZod(f);
  return z.object(shape);
}

function paramToZod(p: ParamDef): z.ZodTypeAny {
  let base: z.ZodTypeAny;
  if (p.enum && p.enum.length) base = z.enum([...p.enum] as [string, ...string[]]);
  else if (p.type === "integer") base = z.number();
  else if (p.type === "boolean") base = z.boolean();
  else base = z.string();
  base = base.describe(`${p.in === "path" ? "Path segment. " : "Query parameter. "}${p.description}`);
  return p.in === "path" ? base : base.optional();
}

export function toolName(e: EndpointDef): string {
  return e.id.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function buildShape(e: EndpointDef): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const p of e.params ?? []) shape[p.name] = paramToZod(p);
  for (const f of e.body ?? []) shape[f.name] = fieldToZod(f);
  return shape;
}

function buildTool(e: EndpointDef) {
  const pathParams = new Set((e.params ?? []).filter((p) => p.in === "path").map((p) => p.name));
  const queryParams = (e.params ?? []).filter((p) => p.in === "query").map((p) => p.name);
  const bodyFields = (e.body ?? []).map((f) => f.name);

  return defineTool({
    name: toolName(e),
    title: e.summary,
    description: `${e.description} ${e.agentUse}`,
    inputSchema: buildShape(e),
    annotations: {
      readOnlyHint: e.method === "GET",
      destructiveHint: e.method !== "GET",
      openWorldHint: false,
    },
    handler: async (input: Record<string, unknown>) => {
      let path = e.path;
      for (const name of pathParams) {
        const value = input?.[name];
        if (value === undefined || value === null || value === "") {
          throw new ToolError(`Missing required path parameter "${name}"`);
        }
        path = path.replace(`{${name}}`, encodeURIComponent(String(value)));
      }

      const url = new URL(`${apiBaseUrl()}${path}`);
      for (const name of queryParams) {
        const value = input?.[name];
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(name, String(value));
        }
      }

      let body: string | undefined;
      if (e.method !== "GET" && bodyFields.length) {
        const payload: Record<string, unknown> = {};
        for (const name of bodyFields) {
          if (input?.[name] !== undefined) payload[name] = input[name];
        }
        body = JSON.stringify(payload);
      }

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: e.method,
          headers: {
            Accept: "application/json",
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          ...(body ? { body } : {}),
        });
      } catch (err) {
        throw new ToolError(
          `Could not reach the Bookly API at ${url.pathname}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      const text = await response.text();
      if (!response.ok) {
        return { content: [{ type: "text" as const, text }], isError: true };
      }
      return { content: [{ type: "text" as const, text }] };
    },
  });
}

export const booklyTools = ENDPOINTS.map(buildTool);
