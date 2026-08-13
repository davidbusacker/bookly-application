# Bookly — API-native order & support platform

A fictional online bookstore backend, built API-first: every capability a support agent needs is a public REST endpoint, described by a machine-readable OpenAPI 3.1 spec and an MCP-style tool manifest. Plus a small docs site and admin viewer so you can see the data.

No auth — this is a demo for an interview. Anyone with the URL can read and modify the demo data.

## What gets built

### 1. Data (Lovable Cloud database, seeded)
Tables with realistic seeded demo data so the API returns meaningful results immediately:
- `customers` — name, email, phone, address, member tier, created date
- `books` — title, author, isbn, price, format, stock, category
- `orders` — order number (e.g. `BK-10042`), customer, status, totals, dates
- `order_items` — line items linking orders to books
- `shipments` — carrier, tracking number, status, ETA
- `shipment_events` — timestamped tracking history
- `returns` — RMA number, reason, status, items, eligibility window
- `refunds` — amount, method, status, processed date, linked transaction
- `transactions` — payments, refunds, adjustments; ledger-style
- `policies` — shipping/returns/privacy/etc., markdown body, machine-readable fields
- `faqs` — question, answer, category, tags
- `password_reset_requests` — mock reset flow records
- `support_tickets` + `ticket_events` — so an agent can log/escalate conversations

Around 20 customers, 60 books, 80 orders across every status (processing, shipped, delivered, cancelled, returned, refunded, backordered, lost-in-transit), with matching shipments, returns, refunds, and transactions. Seeded via migration so the data is stable.

### 2. Public REST API (`/api/public/v1/*`)
Consistent envelope, cursor pagination, filtering, sorting, RFC-7807-style errors, and an `X-Request-Id` on every response.

Orders & tracking
- `GET /orders` (filter by email, status, date range), `GET /orders/{idOrNumber}`
- `GET /orders/{id}/items`, `GET /orders/{id}/shipments`
- `GET /shipments/{tracking}` + `GET /shipments/{tracking}/events`
- `POST /orders/{id}/cancel`, `POST /orders/{id}/reship`

Returns & refunds
- `GET /returns`, `GET /returns/{rma}`
- `POST /orders/{id}/returns/eligibility` — rules-based yes/no with reasons
- `POST /returns` — create RMA, returns a mock label URL
- `POST /returns/{rma}/receive`, `POST /returns/{rma}/cancel`
- `POST /refunds` (full/partial/store-credit), `GET /refunds/{id}`

Customers & accounts
- `GET /customers`, `GET /customers/{idOrEmail}`, `PATCH /customers/{id}`
- `GET /customers/{id}/orders`, `GET /customers/{id}/transactions`
- `POST /auth/password-reset` (mock: creates a request, returns a fake token/expiry)

Catalog, policies, FAQ
- `GET /books`, `GET /books/{isbn}`, `GET /books/search?q=`
- `GET /policies`, `GET /policies/{slug}`
- `GET /faqs`, `GET /faqs/search?q=` — chunked, RAG-friendly output

Transactions & support
- `GET /transactions`, `GET /transactions/{id}`
- `GET /tickets`, `POST /tickets`, `POST /tickets/{id}/events`, `POST /tickets/{id}/escalate`

Utility
- `GET /health`, `GET /meta` (counts + sample IDs so an agent can bootstrap)
- `POST /admin/reset-demo` — restore seed data after a messy demo run

### 3. Agent integration surfaces
- `GET /api/public/openapi.json` and `/api/public/openapi.yaml` — hand-authored OpenAPI 3.1 covering every endpoint with schemas, examples, and error responses
- `GET /api/public/tools.json` — MCP-style tool manifest: one tool per operation with name, description, JSON Schema input, and when-to-use guidance written for an LLM
- `GET /api/public/llms.txt` — plain-text primer pointing an agent at the spec, base URL, and common workflows

### 4. Frontend
- `/` — landing: what Bookly is, base URL, quick-start curl, links to spec/manifest
- `/docs` — full API reference: grouped endpoints, params, request/response examples, copy buttons, and a live "try it" that hits the real endpoint
- `/admin` — minimal viewer: tables for orders, returns, refunds, transactions, customers with search and a detail drawer

Design: bookshop-inspired — warm paper tones, deep ink, a serif display face for headings against a clean mono for code. Not the default AI look.

## Technical notes
- TanStack Start server routes under `src/routes/api/public/v1/*`; the `/api/public/` prefix stays unauthenticated.
- Shared request layer: Zod validation on every body/query, uniform error mapper, pagination helper, response envelope helper.
- Database access from routes via a publishable-key Supabase client with permissive `anon` RLS policies (read + write), because the API is intentionally public and unauthenticated. Explicit GRANTs on every table.
- Business rules live in `src/lib/bookly/*` (return eligibility windows, refund math, status transitions) so both routes and the OpenAPI examples stay consistent.
- OpenAPI spec authored as a typed TS object and served as JSON/YAML, so it can't drift silently from route paths.
- CORS enabled with `OPTIONS` handlers on all API routes so external agents can call from anywhere.
- SEO head metadata on `/`, `/docs`, `/admin`.

## Security note
Because there is no auth, every endpoint — including writes and `reset-demo` — is callable by anyone who knows the URL. That is appropriate for fictional interview demo data and nothing real should be stored here.
