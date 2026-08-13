import { z } from "zod";

export const API_VERSION = "1.0.0";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-Id",
  "Access-Control-Max-Age": "86400",
};

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function requestId(): string {
  return `req_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

type Meta = Record<string, unknown>;

export function ok(data: unknown, meta: Meta = {}, status = 200): Response {
  const rid = requestId();
  return new Response(JSON.stringify({ data, meta: { request_id: rid, ...meta } }, null, 2), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", "X-Request-Id": rid },
  });
}

export type ApiErrorBody = {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  errors?: unknown;
};

export class ApiError extends Error {
  status: number;
  code: string;
  detail: string | undefined;
  errors: unknown;

  constructor(status: number, code: string, message: string, detail?: string, errors?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.errors = errors;
  }
}

export const notFound = (what: string) => new ApiError(404, "not_found", `${what} not found`);
export const badRequest = (msg: string, errors?: unknown) =>
  new ApiError(400, "invalid_request", msg, undefined, errors);
export const conflict = (msg: string, detail?: string) =>
  new ApiError(409, "conflict", msg, detail);

export function fail(err: unknown): Response {
  const rid = requestId();
  const e =
    err instanceof ApiError
      ? err
      : new ApiError(
          500,
          "internal_error",
          "Something went wrong",
          err instanceof Error ? err.message : String(err),
        );
  const body: { error: ApiErrorBody & { request_id: string } } = {
    error: {
      type: `https://bookly.demo/errors/${e.code}`,
      title: e.message,
      status: e.status,
      code: e.code,
      ...(e.detail ? { detail: e.detail } : {}),
      ...(e.errors ? { errors: e.errors } : {}),
      request_id: rid,
    },
  };
  return new Response(JSON.stringify(body, null, 2), {
    status: e.status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", "X-Request-Id": rid },
  });
}

/** Wraps a handler so every failure returns the standard error envelope. */
export function handler<T extends { request: Request }>(
  fn: (ctx: T) => Promise<Response>,
): (ctx: T) => Promise<Response> {
  return async (ctx: T) => {
    try {
      return await fn(ctx);
    } catch (err) {
      return fail(err);
    }
  };
}

export function searchParams(request: Request): URLSearchParams {
  return new URL(request.url).searchParams;
}

export function pagination(request: Request): { limit: number; offset: number } {
  const sp = searchParams(request);
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? 25) || 25, 1), 100);
  const offset = Math.max(Number(sp.get("offset") ?? 0) || 0, 0);
  return { limit, offset };
}

export function listMeta(
  total: number | null,
  limit: number,
  offset: number,
  extra: Meta = {},
): Meta {
  const count = total ?? 0;
  return {
    total: count,
    limit,
    offset,
    has_more: offset + limit < count,
    next_offset: offset + limit < count ? offset + limit : null,
    ...extra,
  };
}

export async function parseBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw badRequest("Request body failed validation", parsed.error.issues);
  }
  return parsed.data;
}

export function dbErr(error: { message: string } | null): void {
  if (error) throw new ApiError(502, "database_error", "Database request failed", error.message);
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
