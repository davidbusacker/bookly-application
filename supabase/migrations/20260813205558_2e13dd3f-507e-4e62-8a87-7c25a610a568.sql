CREATE OR REPLACE FUNCTION public.reset_bookly_demo()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  result jsonb;
  did uuid;
  onums text[] := ARRAY['BK-10005','BK-10025','BK-10045','BK-10065'];
BEGIN
  DELETE FROM public.refund_events WHERE true;
  result := public.seed_bookly_demo();

  DELETE FROM public.customers WHERE email = 'david.busacker@example.com';

  INSERT INTO public.customers (email, full_name, phone, address_line1, city, state, postal_code, country, member_tier, marketing_opt_in, store_credit_cents)
  VALUES ('david.busacker@example.com', 'David Busacker', '+1-312-555-0142', '1200 N Lake Shore Dr', 'Chicago', 'IL', '60610', 'US', 'gold', true, 0)
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

  RETURN result || jsonb_build_object('demo_customer', 'david.busacker@example.com');
END;
$func$;

REVOKE ALL ON FUNCTION public.reset_bookly_demo() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_bookly_demo() TO service_role;