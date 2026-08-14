UPDATE public.agent_traces
SET metadata = metadata || jsonb_build_object('demo_seed', true)
WHERE trace_number IN ('TRC-789402','TRC-704318');

CREATE OR REPLACE FUNCTION public.reset_bookly_demo()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  did uuid;
  purged integer;
  onums text[] := ARRAY['BK-10005','BK-10025','BK-10045','BK-10065'];
BEGIN
  -- purge every agent trace except the flagged example ones
  DELETE FROM public.agent_trace_messages m
  USING public.agent_traces t
  WHERE m.trace_id = t.id
    AND COALESCE((t.metadata->>'demo_seed')::boolean, false) = false;

  DELETE FROM public.agent_traces t
  WHERE COALESCE((t.metadata->>'demo_seed')::boolean, false) = false;
  GET DIAGNOSTICS purged = ROW_COUNT;

  -- detach kept traces from records that are about to be re-seeded
  UPDATE public.agent_traces
  SET customer_id = NULL, order_id = NULL, ticket_id = NULL;

  DELETE FROM public.refund_events WHERE true;
  result := public.seed_bookly_demo();

  DELETE FROM public.customers WHERE email = 'david.busacker@example.com';

  INSERT INTO public.customers (email, full_name, phone, address_line1, city, state, postal_code, country, member_tier, marketing_opt_in, store_credit_cents)
  VALUES ('david.busacker@example.com', 'David Busacker', '+1-312-555-9876', '1200 N Lake Shore Dr', 'Chicago', 'IL', '60610', 'US', 'gold', true, 0)
  RETURNING id INTO did;

  UPDATE public.orders o
  SET customer_id = did,
      shipping_address = o.shipping_address || jsonb_build_object('name', 'David Busacker')
  WHERE o.order_number = ANY(onums);

  UPDATE public.returns r SET customer_id = did
  WHERE r.order_id IN (SELECT id FROM public.orders WHERE order_number = ANY(onums));

  UPDATE public.transactions t SET customer_id = did
  WHERE t.order_id IN (SELECT id FROM public.orders WHERE order_number = ANY(onums));

  UPDATE public.support_tickets s SET customer_id = did
  WHERE s.order_id IN (SELECT id FROM public.orders WHERE order_number = ANY(onums));

  result := result || public.seed_bookly_inventory();

  -- relink the kept example traces to the recreated demo customer/order
  UPDATE public.agent_traces
  SET customer_id = did,
      customer_email = 'david.busacker@example.com',
      order_id = (SELECT id FROM public.orders WHERE order_number = 'BK-10005' LIMIT 1)
  WHERE COALESCE((metadata->>'demo_seed')::boolean, false) = true;

  RETURN result
    || jsonb_build_object('demo_customer', 'david.busacker@example.com')
    || jsonb_build_object('agent_traces_purged', purged);
END;
$$;