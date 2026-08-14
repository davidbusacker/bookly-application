ALTER TABLE public.agent_traces
  ADD COLUMN IF NOT EXISTS intent_confidence numeric,
  ADD COLUMN IF NOT EXISTS resolution_confidence numeric;

CREATE OR REPLACE FUNCTION public.seed_bookly_inventory()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  n integer;
BEGIN
  DELETE FROM public.books WHERE true;

  INSERT INTO public.books (isbn, title, author, format, category, price_cents, stock, published_year, description)
  SELECT
    '978' || lpad((2000000000 + row_number() OVER (ORDER BY t.title))::text, 10, '0'),
    t.title, t.author, t.format, t.category, t.price,
    50 + ((row_number() OVER (ORDER BY t.title) * 47) % 151)::int,
    t.year,
    t.title || ' by ' || t.author || ' — a Bookly catalog title.'
  FROM (VALUES
    ('The Salt Archive','Nadia Fenwick','hardcover','fiction',2899,2021),
    ('Winterlight','Nadia Fenwick','paperback','fiction',1699,2019),
    ('The Glass Orchard','Nadia Fenwick','paperback','fiction',1599,2017),
    ('Small Hours','Nadia Fenwick','ebook','fiction',999,2022),
    ('A House of Tides','Nadia Fenwick','hardcover','fiction',2699,2024),

    ('Quiet Machines','Ivan Petrov','paperback','science_fiction',1699,2019),
    ('Orbital Drift','Ivan Petrov','hardcover','science_fiction',2999,2021),
    ('The Cold Equation','Ivan Petrov','paperback','science_fiction',1799,2016),
    ('Signal Decay','Ivan Petrov','ebook','science_fiction',1099,2023),
    ('Terminus Station','Ivan Petrov','hardcover','science_fiction',3199,2025),

    ('A Map of Small Rains','Ruth Calloway','paperback','literary',1499,2018),
    ('The Weight of Sundays','Ruth Calloway','hardcover','literary',2799,2020),
    ('Letters to No One','Ruth Calloway','paperback','literary',1599,2015),
    ('Rivermouth','Ruth Calloway','paperback','literary',1699,2022),
    ('The Quietest Room','Ruth Calloway','ebook','literary',1199,2024),

    ('The Cartographer''s Daughter','Elena Marsh','hardcover','historical',3199,2022),
    ('Iron and Ash','Elena Marsh','paperback','historical',1899,2018),
    ('The Lanternkeeper','Elena Marsh','hardcover','historical',2999,2020),
    ('Empire of Paper','Elena Marsh','paperback','historical',1799,2016),
    ('The Last Cartouche','Elena Marsh','ebook','historical',1299,2025),

    ('Nights in the Vault','J. R. Kessler','paperback','mystery',1599,2017),
    ('The Second Witness','J. R. Kessler','hardcover','mystery',2899,2019),
    ('Cold Case Blue','J. R. Kessler','paperback','mystery',1499,2021),
    ('The Ninth Room','J. R. Kessler','ebook','mystery',1099,2023),
    ('Ledger of Lost Things','J. R. Kessler','hardcover','mystery',2999,2024),

    ('Bread, Salt, Fire','Marta Oliveira','hardcover','cooking',3499,2020),
    ('The Weeknight Table','Marta Oliveira','paperback','cooking',2199,2018),
    ('Coastal Kitchen','Marta Oliveira','hardcover','cooking',3299,2022),
    ('Slow Sundays','Marta Oliveira','paperback','cooking',1999,2016),
    ('One Pot, Many Homes','Marta Oliveira','ebook','cooking',1499,2025),

    ('Orbital Gardening','Susan Yoo','hardcover','science',2699,2024),
    ('Deep Field','Susan Yoo','hardcover','science',3299,2023),
    ('The Cell and the City','Susan Yoo','paperback','science',1899,2019),
    ('Weather Machines','Susan Yoo','paperback','science',1799,2017),
    ('Small Infinities','Susan Yoo','ebook','science',1299,2021),

    ('Practical Sorcery','Ben Aldridge','paperback','fantasy',1499,2019),
    ('Half a Kingdom','Ben Aldridge','paperback','fantasy',1899,2020),
    ('The Hollow Crownsmith','Ben Aldridge','hardcover','fantasy',2999,2022),
    ('Ashvale','Ben Aldridge','hardcover','fantasy',3099,2024),
    ('The Ninefold Door','Ben Aldridge','ebook','fantasy',1199,2025),

    ('The Blue Hour Diaries','Nina Okonkwo','paperback','memoir',1599,2022),
    ('Homing','Nina Okonkwo','hardcover','memoir',2699,2020),
    ('Everything Was Elsewhere','Nina Okonkwo','hardcover','memoir',2799,2024),
    ('Second Language','Nina Okonkwo','paperback','memoir',1699,2018),
    ('The Long Commute','Nina Okonkwo','ebook','memoir',999,2021),

    ('The Grammar of Storms','Alice Fen','paperback','poetry',1399,2016),
    ('Field Notes for the Sleepless','Alice Fen','paperback','poetry',1499,2019),
    ('Bright Static','Alice Fen','hardcover','poetry',2299,2021),
    ('Saltwater Psalms','Alice Fen','paperback','poetry',1599,2023),
    ('Ninety Small Fires','Alice Fen','ebook','poetry',899,2025)
  ) AS t(title, author, format, category, price, year);

  SELECT count(*) INTO n FROM public.books;
  RETURN jsonb_build_object('books', n, 'authors', (SELECT count(DISTINCT author) FROM public.books));
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_bookly_demo()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  result := result || public.seed_bookly_inventory();

  RETURN result || jsonb_build_object('demo_customer', 'david.busacker@example.com');
END;
$function$;

SELECT public.seed_bookly_inventory();