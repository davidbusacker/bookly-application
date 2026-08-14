import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import {
  badRequest,
  conflict,
  dbErr,
  handler,
  listMeta,
  ok,
  pagination,
  parseBody,
  preflight,
  searchParams,
} from "@/lib/bookly/http";
import { RULES } from "@/lib/bookly/rules";
import { ORDER_LIST_SELECT, ORDER_SELECT } from "@/lib/bookly/selects";

const SHIPPING_SPEEDS = ["ground", "expedited", "overnight"] as const;

const CreateOrderBody = z.object({
  customer: z.string().min(1).describe("Customer UUID or email address."),
  customer_name: z.string().max(120).optional().describe("Used only when creating a brand-new customer."),
  create_customer_if_missing: z.boolean().optional(),
  items: z
    .array(
      z.object({
        isbn: z.string().optional(),
        book_id: z.string().uuid().optional(),
        title: z.string().optional(),
        quantity: z.number().int().min(1).max(20).default(1),
      }),
    )
    .min(1)
    .max(20),
  shipping_speed: z.enum(SHIPPING_SPEEDS).optional(),
  shipping_address: z.record(z.string(), z.string()).optional(),
  payment_method: z.string().max(60).optional(),
  discount_cents: z.number().int().min(0).max(100_000).optional(),
  use_store_credit: z.boolean().optional(),
  allow_backorder: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

const shippingCost = (speed: (typeof SHIPPING_SPEEDS)[number], subtotal: number) => {
  if (speed === "overnight") return RULES.overnightShippingCents;
  if (speed === "expedited") return RULES.expeditedShippingCents;
  return subtotal >= RULES.freeShippingThresholdCents ? 0 : RULES.groundShippingCents;
};

export const Route = createFileRoute("/api/public/v1/orders/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async ({ request }) => {
        const sp = searchParams(request);
        const { limit, offset } = pagination(request);
        const db = booklyDb();

        let query = db.from("orders").select(ORDER_LIST_SELECT, { count: "exact" });

        const email = sp.get("email");
        if (email) {
          const { data: cust, error } = await db
            .from("customers")
            .select("id")
            .ilike("email", email)
            .maybeSingle();
          dbErr(error);
          query = query.eq("customer_id", cust?.id ?? "00000000-0000-0000-0000-000000000000");
        }

        const customerId = sp.get("customer_id");
        if (customerId) query = query.eq("customer_id", customerId);

        const status = sp.get("status");
        if (status) query = query.in("status", status.split(",").map((s) => s.trim()));

        const placedAfter = sp.get("placed_after");
        if (placedAfter) query = query.gte("placed_at", placedAfter);
        const placedBefore = sp.get("placed_before");
        if (placedBefore) query = query.lte("placed_at", placedBefore);

        const sort = sp.get("sort") ?? "-placed_at";
        const desc = sort.startsWith("-");
        query = query.order(desc ? sort.slice(1) : sort, { ascending: !desc });

        const { data, error, count } = await query.range(offset, offset + limit - 1);
        dbErr(error);

        return ok(data ?? [], listMeta(count, limit, offset, { sort }));
      }),

      POST: handler(async ({ request }) => {
        const body = await parseBody(request, CreateOrderBody);
        const db = booklyDb();

        /* ---- resolve the customer ---- */
        const isEmail = body.customer.includes("@");
        const { data: existing, error: custErr } = await db
          .from("customers")
          .select("*")
          .eq(isEmail ? "email" : "id", isEmail ? body.customer.toLowerCase() : body.customer)
          .maybeSingle();
        dbErr(custErr);

        let customer = existing as Record<string, unknown> | null;
        if (!customer) {
          if (!isEmail || !body.create_customer_if_missing) {
            throw badRequest(
              `Customer "${body.customer}" not found`,
              "Pass an existing customer UUID/email, or set create_customer_if_missing with an email and customer_name.",
            );
          }
          const { data: created, error } = await db
            .from("customers")
            .insert({
              email: body.customer.toLowerCase(),
              full_name: body.customer_name ?? body.customer.split("@")[0],
              ...(body.shipping_address ?? {}),
            })
            .select("*")
            .single();
          dbErr(error);
          customer = created as Record<string, unknown>;
        }

        /* ---- resolve books and price the order ---- */
        type Line = {
          book_id: string;
          title: string;
          isbn: string;
          quantity: number;
          unit_price_cents: number;
          total_cents: number;
          stock: number;
        };
        const lines: Line[] = [];

        for (const wanted of body.items) {
          let query = db.from("books").select("id,isbn,title,price_cents,stock").limit(1);
          if (wanted.book_id) query = query.eq("id", wanted.book_id);
          else if (wanted.isbn) query = query.eq("isbn", wanted.isbn);
          else if (wanted.title) query = query.ilike("title", `%${wanted.title}%`);
          else throw badRequest("Each item needs one of book_id, isbn or title");

          const { data: book, error } = await query.maybeSingle();
          dbErr(error);
          if (!book) {
            throw badRequest(
              `No book matched ${JSON.stringify(wanted.book_id ?? wanted.isbn ?? wanted.title)}`,
              "Use GET /api/public/v1/inventory to load the catalog and pick an exact ISBN.",
            );
          }

          const qty = wanted.quantity ?? 1;
          const unit = book.price_cents as number;
          lines.push({
            book_id: book.id as string,
            title: book.title as string,
            isbn: book.isbn as string,
            quantity: qty,
            unit_price_cents: unit,
            total_cents: unit * qty,
            stock: (book.stock as number) ?? 0,
          });
        }

        const short = lines.filter((l) => l.stock < l.quantity);
        if (short.length && !body.allow_backorder) {
          throw conflict(
            "Insufficient stock for one or more titles",
            `${short
              .map((l) => `${l.title} (requested ${l.quantity}, ${l.stock} in stock)`)
              .join("; ")}. Retry with allow_backorder: true to place a backorder.`,
          );
        }

        const subtotal = lines.reduce((s, l) => s + l.total_cents, 0);
        const speed = body.shipping_speed ?? "ground";
        const shipping = shippingCost(speed, subtotal);
        let discount = body.discount_cents ?? 0;
        const creditAvailable = (customer["store_credit_cents"] as number) ?? 0;
        const creditApplied = body.use_store_credit
          ? Math.min(creditAvailable, Math.max(0, subtotal + shipping - discount))
          : 0;
        discount += creditApplied;
        const taxable = Math.max(0, subtotal - Math.min(discount, subtotal));
        const tax = Math.round((taxable * RULES.taxRateBps) / 10_000);
        const total = Math.max(0, subtotal + shipping + tax - discount);

        /* ---- order number ---- */
        const { data: last } = await db
          .from("orders")
          .select("order_number")
          .order("order_number", { ascending: false })
          .limit(1)
          .maybeSingle();
        const lastNum = Number(String(last?.order_number ?? "BK-10000").replace(/\D/g, "")) || 10_000;
        const orderNumber = `BK-${lastNum + 1}`;

        const shippingAddress =
          body.shipping_address ??
          {
            line1: (customer["address_line1"] as string) ?? "",
            line2: (customer["address_line2"] as string) ?? "",
            city: (customer["city"] as string) ?? "",
            state: (customer["state"] as string) ?? "",
            postal_code: (customer["postal_code"] as string) ?? "",
            country: (customer["country"] as string) ?? "US",
          };

        const status = short.length ? "backordered" : "processing";
        const { data: order, error: orderErr } = await db
          .from("orders")
          .insert({
            order_number: orderNumber,
            customer_id: customer["id"],
            status,
            subtotal_cents: subtotal,
            shipping_cents: shipping,
            tax_cents: tax,
            discount_cents: discount,
            total_cents: total,
            payment_method: body.payment_method ?? "visa_4242",
            shipping_address: shippingAddress,
            notes: body.notes ?? `Placed via support API (${speed} shipping)`,
          })
          .select("id,order_number")
          .single();
        dbErr(orderErr);

        const orderId = order!["id"] as string;

        const { error: itemsErr } = await db.from("order_items").insert(
          lines.map((l) => ({
            order_id: orderId,
            book_id: l.book_id,
            title: l.title,
            isbn: l.isbn,
            quantity: l.quantity,
            unit_price_cents: l.unit_price_cents,
            total_cents: l.total_cents,
            fulfillment_status: l.stock < l.quantity ? "backordered" : "pending",
          })),
        );
        dbErr(itemsErr);

        /* ---- decrement stock ---- */
        for (const l of lines) {
          await db
            .from("books")
            .update({ stock: Math.max(0, l.stock - l.quantity) })
            .eq("id", l.book_id);
        }

        /* ---- money ---- */
        if (creditApplied > 0) {
          await db
            .from("customers")
            .update({ store_credit_cents: creditAvailable - creditApplied, updated_at: new Date().toISOString() })
            .eq("id", customer["id"] as string);
        }

        const { data: txn } = await db
          .from("transactions")
          .insert({
            transaction_number: `TXN-${Date.now().toString().slice(-8)}`,
            order_id: orderId,
            customer_id: customer["id"],
            type: "charge",
            amount_cents: total,
            status: "succeeded",
            method: body.payment_method ?? "visa_4242",
            description: `Charge for order ${orderNumber}`,
          })
          .select("*")
          .single();

        const { data: full, error: fullErr } = await db
          .from("orders")
          .select(ORDER_SELECT)
          .eq("id", orderId)
          .single();
        dbErr(fullErr);

        return ok(
          {
            order: full,
            transaction: txn,
            pricing: {
              subtotal_cents: subtotal,
              shipping_cents: shipping,
              tax_cents: tax,
              discount_cents: discount,
              store_credit_applied_cents: creditApplied,
              total_cents: total,
              shipping_speed: speed,
            },
            backordered: short.map((l) => ({ title: l.title, isbn: l.isbn, in_stock: l.stock })),
          },
          { created: true },
          201,
        );
      }),
    },
  },
});
