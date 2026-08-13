DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'books','customers','faqs','order_items','orders','password_reset_requests','policies',
    'refund_events','refunds','return_items','returns','shipment_events','shipments',
    'support_tickets','ticket_events','transactions'
  ] LOOP
    IF to_regclass('public.'||t) IS NULL THEN CONTINUE; END IF;

    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.seed_bookly_demo() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_bookly_demo() TO service_role;