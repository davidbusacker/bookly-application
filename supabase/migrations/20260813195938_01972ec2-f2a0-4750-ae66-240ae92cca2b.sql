
-- ========== Bookly demo schema ==========

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'US',
  member_tier text NOT NULL DEFAULT 'standard',
  marketing_opt_in boolean NOT NULL DEFAULT false,
  store_credit_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn text NOT NULL UNIQUE,
  title text NOT NULL,
  author text NOT NULL,
  format text NOT NULL DEFAULT 'paperback',
  category text NOT NULL DEFAULT 'fiction',
  price_cents integer NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  published_year integer,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'processing',
  currency text NOT NULL DEFAULT 'USD',
  subtotal_cents integer NOT NULL DEFAULT 0,
  shipping_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'visa_4242',
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  placed_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_customer_idx ON public.orders(customer_id);
CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX orders_placed_at_idx ON public.orders(placed_at DESC);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  title text NOT NULL,
  isbn text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  fulfillment_status text NOT NULL DEFAULT 'pending'
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);

CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier text NOT NULL DEFAULT 'UPS',
  tracking_number text NOT NULL UNIQUE,
  service_level text NOT NULL DEFAULT 'ground',
  status text NOT NULL DEFAULT 'label_created',
  shipped_at timestamptz,
  estimated_delivery date,
  delivered_at timestamptz,
  tracking_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shipments_order_idx ON public.shipments(order_id);

CREATE TABLE public.shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  location text,
  description text
);
CREATE INDEX shipment_events_shipment_idx ON public.shipment_events(shipment_id);

CREATE TABLE public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rma_number text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'requested',
  reason text NOT NULL DEFAULT 'other',
  comment text,
  label_url text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz,
  closed_at timestamptz,
  expected_refund_cents integer NOT NULL DEFAULT 0
);
CREATE INDEX returns_order_idx ON public.returns(order_id);

CREATE TABLE public.return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  condition text NOT NULL DEFAULT 'unopened'
);
CREATE INDEX return_items_return_idx ON public.return_items(return_id);

CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  return_id uuid REFERENCES public.returns(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  method text NOT NULL DEFAULT 'original_payment',
  status text NOT NULL DEFAULT 'pending',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX refunds_order_idx ON public.refunds(order_id);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number text NOT NULL UNIQUE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'succeeded',
  method text NOT NULL DEFAULT 'visa_4242',
  reference text,
  description text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_order_idx ON public.transactions(order_id);
CREATE INDEX transactions_customer_idx ON public.transactions(customer_id);

CREATE TABLE public.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  summary text NOT NULL,
  body_markdown text NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  tags text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
  completed_at timestamptz
);

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  channel text NOT NULL DEFAULT 'api',
  assignee text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'note',
  author text NOT NULL DEFAULT 'agent',
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_events_ticket_idx ON public.ticket_events(ticket_id);

-- ========== Grants + RLS (intentionally public demo API, no auth) ==========

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','books','orders','order_items','shipments','shipment_events',
    'returns','return_items','refunds','transactions','policies','faqs',
    'password_reset_requests','support_tickets','ticket_events'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Public demo access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
