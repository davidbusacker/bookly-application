
CREATE OR REPLACE FUNCTION public.seed_bookly_demo()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  cust_ids uuid[];
  book_ids uuid[];
  bk_price integer[];
  bk_title text[];
  bk_isbn text[];
  i integer;
  j integer;
  n_items integer;
  cid uuid;
  oid uuid;
  oitem uuid;
  first_item uuid;
  first_qty integer;
  first_price integer;
  st text;
  sub integer;
  ship integer;
  tax integer;
  disc integer;
  tot integer;
  placed timestamptz;
  bidx integer;
  qty integer;
  price integer;
  onum text;
  trk text;
  shp uuid;
  ret uuid;
  rma text;
  statuses text[] := ARRAY['processing','processing','shipped','shipped','shipped','delivered','delivered','delivered','delivered','cancelled','returned','refunded','backordered','lost_in_transit'];
  carriers text[] := ARRAY['UPS','FedEx','USPS','DHL'];
  reasons text[] := ARRAY['damaged','wrong_item','not_as_described','no_longer_needed','arrived_late','other'];
BEGIN
  DELETE FROM public.ticket_events;
  DELETE FROM public.support_tickets;
  DELETE FROM public.password_reset_requests;
  DELETE FROM public.transactions;
  DELETE FROM public.refunds;
  DELETE FROM public.return_items;
  DELETE FROM public.returns;
  DELETE FROM public.shipment_events;
  DELETE FROM public.shipments;
  DELETE FROM public.order_items;
  DELETE FROM public.orders;
  DELETE FROM public.books;
  DELETE FROM public.customers;
  DELETE FROM public.faqs;
  DELETE FROM public.policies;

  PERFORM setseed(0.4242);

  -- ---------- customers ----------
  INSERT INTO public.customers (email, full_name, phone, address_line1, city, state, postal_code, member_tier, marketing_opt_in, store_credit_cents, created_at)
  VALUES
    ('ava.mitchell@example.com','Ava Mitchell','+1-312-555-0142','118 Wabash Ave','Chicago','IL','60602','plus',true,0, now() - interval '520 days'),
    ('noah.parker@example.com','Noah Parker','+1-206-555-0117','2201 Pine St','Seattle','WA','98101','standard',false,0, now() - interval '410 days'),
    ('mia.chen@example.com','Mia Chen','+1-415-555-0188','77 Fell St','San Francisco','CA','94102','plus',true,500, now() - interval '390 days'),
    ('liam.oconnor@example.com','Liam O''Connor','+1-617-555-0130','9 Beacon St','Boston','MA','02108','standard',true,0, now() - interval '360 days'),
    ('sofia.ramirez@example.com','Sofia Ramirez','+1-512-555-0166','440 Congress Ave','Austin','TX','78701','elite',true,2500, now() - interval '700 days'),
    ('ethan.brooks@example.com','Ethan Brooks','+1-303-555-0199','1500 Larimer St','Denver','CO','80202','standard',false,0, now() - interval '250 days'),
    ('isabella.rossi@example.com','Isabella Rossi','+1-212-555-0121','300 W 23rd St','New York','NY','10011','plus',true,0, now() - interval '640 days'),
    ('james.holloway@example.com','James Holloway','+1-404-555-0174','812 Peachtree St','Atlanta','GA','30308','standard',false,0, now() - interval '180 days'),
    ('amara.okafor@example.com','Amara Okafor','+1-305-555-0155','601 Brickell Key Dr','Miami','FL','33131','elite',true,1000, now() - interval '820 days'),
    ('lucas.novak@example.com','Lucas Novak','+1-503-555-0109','1220 SW Morrison St','Portland','OR','97205','standard',true,0, now() - interval '95 days'),
    ('grace.lindqvist@example.com','Grace Lindqvist','+1-612-555-0163','510 Nicollet Mall','Minneapolis','MN','55402','standard',false,0, now() - interval '300 days'),
    ('daniel.kim@example.com','Daniel Kim','+1-213-555-0147','888 S Figueroa St','Los Angeles','CA','90017','plus',true,0, now() - interval '460 days'),
    ('harper.jones@example.com','Harper Jones','+1-615-555-0102','210 Broadway','Nashville','TN','37201','standard',true,0, now() - interval '140 days'),
    ('oliver.schmidt@example.com','Oliver Schmidt','+1-702-555-0138','3200 Las Vegas Blvd','Las Vegas','NV','89109','standard',false,0, now() - interval '210 days'),
    ('zoe.bennett@example.com','Zoe Bennett','+1-919-555-0193','120 Fayetteville St','Raleigh','NC','27601','plus',true,750, now() - interval '540 days'),
    ('marcus.dupont@example.com','Marcus Dupont','+1-504-555-0126','700 Canal St','New Orleans','LA','70130','standard',false,0, now() - interval '80 days'),
    ('elena.petrova@example.com','Elena Petrova','+1-602-555-0181','44 N Central Ave','Phoenix','AZ','85004','standard',true,0, now() - interval '330 days'),
    ('samuel.wright@example.com','Samuel Wright','+1-216-555-0114','1100 Euclid Ave','Cleveland','OH','44115','standard',false,0, now() - interval '270 days'),
    ('priya.nair@example.com','Priya Nair','+1-408-555-0170','333 W Santa Clara St','San Jose','CA','95113','elite',true,0, now() - interval '910 days'),
    ('theo.andersen@example.com','Theo Andersen','+1-801-555-0159','15 S Main St','Salt Lake City','UT','84111','standard',false,0, now() - interval '60 days');

  SELECT array_agg(id ORDER BY created_at) INTO cust_ids FROM public.customers;

  -- ---------- books ----------
  INSERT INTO public.books (isbn, title, author, format, category, price_cents, stock, published_year, description)
  SELECT
    '978' || lpad((1000000000 + row_number() OVER ())::text, 10, '0'),
    t.title, t.author, t.format, t.category, t.price, t.stock, t.year,
    t.title || ' by ' || t.author || ' — a Bookly catalog title.'
  FROM (VALUES
    ('The Salt Archive','Nadia Fenwick','hardcover','fiction',2899,42,2021),
    ('Quiet Machines','Ivan Petrov','paperback','science_fiction',1699,120,2019),
    ('A Map of Small Rains','Ruth Calloway','paperback','fiction',1499,64,2018),
    ('The Cartographer''s Daughter','Elena Marsh','hardcover','historical',3199,18,2022),
    ('Signal and Static','Devon Reyes','ebook','science_fiction',999,999,2023),
    ('Bread, Salt, Fire','Marta Oliveira','hardcover','cooking',3499,31,2020),
    ('Nights in the Vault','J. R. Kessler','paperback','mystery',1599,77,2017),
    ('The Long Commute','Peter Nkemdi','paperback','literary',1799,55,2021),
    ('Orbital Gardening','Susan Yoo','hardcover','science_fiction',2699,23,2024),
    ('The Grammar of Storms','Alice Fen','paperback','poetry',1399,88,2016),
    ('Half a Kingdom','Tomas Berg','paperback','fantasy',1899,45,2020),
    ('Ledger of Lost Things','Cara Winslow','hardcover','mystery',2999,12,2023),
    ('Iron Harvest','Gregory Vance','paperback','historical',1699,66,2015),
    ('The Blue Hour Diaries','Nina Okonkwo','paperback','memoir',1599,49,2022),
    ('Practical Sorcery','Ben Aldridge','paperback','fantasy',1499,132,2019),
    ('Everything Was Elsewhere','Rae Lindqvist','hardcover','literary',2799,9,2024),
    ('The Tin Orchard','Sofia Duarte','paperback','fiction',1699,71,2018),
    ('Deep Field','Anwar Haddad','hardcover','science',3299,27,2023),
    ('The Weight of Water Clocks','Hana Ito','paperback','fiction',1799,38,2021),
    ('Counting Crows Backwards','Miles Trent','ebook','mystery',899,999,2020),
    ('The Quiet Museum','Greta Salomon','hardcover','literary',2599,16,2022),
    ('Fifty Ways to Fail Gracefully','Tom Bhattacharya','paperback','self_help',1299,150,2021),
    ('The Understory','Wren Alvarez','paperback','nature',1899,58,2019),
    ('Glass Cathedral','Karl Neumann','hardcover','fantasy',3099,21,2023),
    ('Homecoming Frequency','Dara Nwosu','paperback','fiction',1599,63,2020),
    ('The Bone Almanac','Perry Kwan','paperback','horror',1699,44,2018),
    ('Mercury in Retrograde','Lila Sandoval','ebook','romance',799,999,2022),
    ('The Last Bookmobile','Ann Tisdale','hardcover','fiction',2699,19,2021),
    ('Tidewrack','Joss Bell','paperback','fiction',1499,82,2017),
    ('A Theory of Kindness','Omar Farouk','hardcover','philosophy',2899,25,2024),
    ('Fieldnotes from Nowhere','Petra Vogel','paperback','travel',1799,47,2019),
    ('The Numbers Room','Chen Wei','paperback','thriller',1699,91,2021),
    ('Saltwater Latin','Imogen Reyes','paperback','poetry',1399,36,2016),
    ('The Coldest Summer','Hugo Marchetti','hardcover','historical',3199,14,2022),
    ('Notes on Small Engines','Ray Dunleavy','paperback','nonfiction',1599,53,2018),
    ('The Paper Kingdom','Yara Suleiman','hardcover','fantasy',2999,17,2023),
    ('Static Bloom','Ori Katz','ebook','science_fiction',999,999,2024),
    ('The Widow''s Almanac','Beatrice Hall','paperback','historical',1699,59,2015),
    ('Learning to Drown','Kenji Mori','paperback','literary',1799,41,2020),
    ('Ninety Nine Doors','Anika Rao','hardcover','mystery',2799,22,2022),
    ('The Marmalade Wars','Freddie Lowe','paperback','humor',1499,68,2019),
    ('Antarctic Letters','Solveig Dahl','hardcover','memoir',2699,13,2021),
    ('The Repair Shop of Broken Hours','Nell Barrow','paperback','fiction',1699,74,2023),
    ('Cardinal Directions','Ezra Blum','paperback','poetry',1299,95,2017),
    ('The Anatomy of Fog','Rosa Iglesias','hardcover','literary',2899,11,2024),
    ('Signal Fires','Aidan Cross','paperback','thriller',1799,86,2020),
    ('The Beekeeper''s Ledger','Marta Kalu','paperback','fiction',1599,57,2018),
    ('Small Gods of the Subway','Vic Tran','ebook','fantasy',899,999,2022),
    ('The Inheritance of Rooms','Clara Behn','hardcover','fiction',2999,15,2023),
    ('Wildfire Season','Bo Whitaker','paperback','thriller',1699,79,2021),
    ('Everything a Kitchen Knows','Paula Restrepo','hardcover','cooking',3399,29,2020),
    ('The Lighthouse Interviews','Sean Mulvaney','paperback','nonfiction',1899,48,2019),
    ('Gravity Wells','Nikita Sorokin','paperback','science_fiction',1799,72,2022),
    ('The Second Language of Grief','Yusuf Adeyemi','hardcover','literary',2799,10,2024),
    ('Foxglove Lane','Emily Ward','paperback','romance',1399,103,2018),
    ('The Astronomer''s Debt','Hilda Braun','hardcover','historical',3099,20,2023),
    ('Machines That Forget','Rafael Costa','paperback','science_fiction',1699,65,2021),
    ('A Brief History of Hurry','Dana Feldman','paperback','nonfiction',1599,60,2017),
    ('The Winter Correspondence','Ingrid Sohl','hardcover','fiction',2699,24,2022),
    ('Last Train to Anywhere','Cyrus Malik','paperback','fiction',1499,110,2019)
  ) AS t(title,author,format,category,price,stock,year);

  SELECT array_agg(id ORDER BY isbn), array_agg(price_cents ORDER BY isbn), array_agg(title ORDER BY isbn), array_agg(isbn ORDER BY isbn)
    INTO book_ids, bk_price, bk_title, bk_isbn FROM public.books;

  -- ---------- orders ----------
  FOR i IN 1..80 LOOP
    cid := cust_ids[((i - 1) % 20) + 1];
    st := statuses[((i - 1) % array_length(statuses,1)) + 1];
    placed := now() - ((i * 4 + (i % 7)) || ' days')::interval;
    onum := 'BK-' || (10000 + i)::text;

    INSERT INTO public.orders (order_number, customer_id, status, placed_at, updated_at, payment_method,
      shipping_address, cancelled_at, notes)
    SELECT onum, cid, st, placed, placed + interval '2 days',
      (ARRAY['visa_4242','mastercard_5100','amex_0005','paypal'])[((i - 1) % 4) + 1],
      jsonb_build_object('name', c.full_name, 'line1', c.address_line1, 'city', c.city,
                         'state', c.state, 'postal_code', c.postal_code, 'country', c.country),
      CASE WHEN st = 'cancelled' THEN placed + interval '1 day' ELSE NULL END,
      CASE WHEN st = 'lost_in_transit' THEN 'Carrier reported package lost; eligible for reship or refund.' ELSE NULL END
    FROM public.customers c WHERE c.id = cid
    RETURNING id INTO oid;

    n_items := 1 + (i % 3);
    sub := 0;
    first_item := NULL;
    FOR j IN 1..n_items LOOP
      bidx := ((i * 7 + j * 13) % 60) + 1;
      qty := 1 + ((i + j) % 2);
      price := bk_price[bidx];
      INSERT INTO public.order_items (order_id, book_id, title, isbn, quantity, unit_price_cents, total_cents, fulfillment_status)
      VALUES (oid, book_ids[bidx], bk_title[bidx], bk_isbn[bidx], qty, price, price * qty,
        CASE WHEN st IN ('delivered','returned','refunded') THEN 'fulfilled'
             WHEN st = 'cancelled' THEN 'cancelled'
             WHEN st = 'backordered' THEN 'backordered'
             WHEN st = 'shipped' THEN 'shipped' ELSE 'pending' END)
      RETURNING id INTO oitem;
      IF first_item IS NULL THEN first_item := oitem; first_qty := qty; first_price := price; END IF;
      sub := sub + price * qty;
    END LOOP;

    ship := CASE WHEN sub >= 3500 THEN 0 ELSE 499 END;
    disc := CASE WHEN i % 9 = 0 THEN 500 ELSE 0 END;
    tax := ((sub - disc) * 8) / 100;
    tot := sub + ship + tax - disc;
    UPDATE public.orders SET subtotal_cents = sub, shipping_cents = ship, tax_cents = tax,
      discount_cents = disc, total_cents = tot WHERE id = oid;

    -- payment transaction
    INSERT INTO public.transactions (transaction_number, order_id, customer_id, type, amount_cents, status, method, reference, description, occurred_at)
    VALUES ('TXN-' || (500000 + i)::text, oid, cid, 'payment', tot,
      CASE WHEN st = 'cancelled' THEN 'voided' ELSE 'succeeded' END,
      (ARRAY['visa_4242','mastercard_5100','amex_0005','paypal'])[((i - 1) % 4) + 1],
      'ch_' || substr(md5(onum), 1, 16), 'Payment for order ' || onum, placed);

    -- shipments
    IF st IN ('shipped','delivered','returned','refunded','lost_in_transit') THEN
      trk := '1Z' || upper(substr(md5(onum || 'trk'), 1, 14));
      INSERT INTO public.shipments (order_id, carrier, tracking_number, service_level, status, shipped_at, estimated_delivery, delivered_at, tracking_url)
      VALUES (oid, carriers[((i - 1) % 4) + 1], trk,
        (ARRAY['ground','two_day','overnight'])[((i - 1) % 3) + 1],
        CASE WHEN st = 'shipped' THEN 'in_transit'
             WHEN st = 'lost_in_transit' THEN 'lost'
             ELSE 'delivered' END,
        placed + interval '1 day',
        (placed + interval '6 days')::date,
        CASE WHEN st IN ('delivered','returned','refunded') THEN placed + interval '5 days' ELSE NULL END,
        'https://track.bookly.example/' || trk)
      RETURNING id INTO shp;

      INSERT INTO public.shipment_events (shipment_id, occurred_at, status, location, description) VALUES
        (shp, placed + interval '20 hours', 'label_created', 'Columbus, OH', 'Shipping label created'),
        (shp, placed + interval '1 day', 'picked_up', 'Columbus, OH', 'Package picked up by carrier'),
        (shp, placed + interval '2 days', 'in_transit', 'Indianapolis, IN', 'Departed sorting facility');
      IF st = 'lost_in_transit' THEN
        INSERT INTO public.shipment_events (shipment_id, occurred_at, status, location, description)
        VALUES (shp, placed + interval '9 days', 'lost', 'Unknown', 'Carrier unable to locate package');
      ELSIF st <> 'shipped' THEN
        INSERT INTO public.shipment_events (shipment_id, occurred_at, status, location, description) VALUES
          (shp, placed + interval '4 days', 'out_for_delivery', 'Local facility', 'Out for delivery'),
          (shp, placed + interval '5 days', 'delivered', 'Front door', 'Delivered, left at front door');
      END IF;
    END IF;

    -- returns + refunds
    IF st IN ('returned','refunded') THEN
      rma := 'RMA-' || (7000 + i)::text;
      INSERT INTO public.returns (rma_number, order_id, customer_id, status, reason, comment, label_url,
        requested_at, received_at, closed_at, expected_refund_cents)
      VALUES (rma, oid, cid,
        CASE WHEN st = 'refunded' THEN 'refunded' ELSE 'received' END,
        reasons[((i - 1) % 6) + 1],
        'Customer requested a return through support.',
        'https://labels.bookly.example/' || rma || '.pdf',
        placed + interval '8 days',
        placed + interval '12 days',
        CASE WHEN st = 'refunded' THEN placed + interval '13 days' ELSE NULL END,
        first_price * first_qty)
      RETURNING id INTO ret;

      INSERT INTO public.return_items (return_id, order_item_id, quantity, condition)
      VALUES (ret, first_item, first_qty, CASE WHEN reasons[((i - 1) % 6) + 1] = 'damaged' THEN 'damaged' ELSE 'unopened' END);

      IF st = 'refunded' THEN
        INSERT INTO public.refunds (refund_number, order_id, return_id, amount_cents, method, status, reason, created_at, processed_at)
        VALUES ('RF-' || (3000 + i)::text, oid, ret, first_price * first_qty, 'original_payment', 'succeeded',
          'Return received in good condition', placed + interval '13 days', placed + interval '13 days');

        INSERT INTO public.transactions (transaction_number, order_id, customer_id, type, amount_cents, status, method, reference, description, occurred_at)
        VALUES ('TXN-' || (600000 + i)::text, oid, cid, 'refund', -(first_price * first_qty), 'succeeded',
          (ARRAY['visa_4242','mastercard_5100','amex_0005','paypal'])[((i - 1) % 4) + 1],
          're_' || substr(md5(rma), 1, 16), 'Refund for return ' || rma, placed + interval '13 days');
      END IF;
    END IF;
  END LOOP;

  -- ---------- support tickets ----------
  FOR i IN 1..12 LOOP
    INSERT INTO public.support_tickets (ticket_number, customer_id, order_id, subject, category, status, priority, channel, assignee, created_at, updated_at)
    SELECT 'TKT-' || (9000 + i)::text, o.customer_id, o.id,
      (ARRAY['Where is my order?','Item arrived damaged','Refund not received yet','Wrong book shipped',
             'Cannot reset my password','Change shipping address','Question about return window','Missing item in package'])[((i - 1) % 8) + 1],
      (ARRAY['order_status','return','refund','shipping','account'])[((i - 1) % 5) + 1],
      (ARRAY['open','pending','resolved','escalated'])[((i - 1) % 4) + 1],
      (ARRAY['low','normal','high','urgent'])[((i - 1) % 4) + 1],
      'api',
      (ARRAY['Jordan P.','Riley S.','Casey M.',NULL])[((i - 1) % 4) + 1],
      o.placed_at + interval '3 days', o.placed_at + interval '4 days'
    FROM public.orders o WHERE o.order_number = 'BK-' || (10000 + (i * 6))::text
    RETURNING id INTO ret;

    INSERT INTO public.ticket_events (ticket_id, type, author, body, created_at) VALUES
      (ret, 'customer_message', 'customer', 'Hi, I need help with my recent order.', now() - ((30 - i) || ' days')::interval),
      (ret, 'agent_reply', 'agent', 'Thanks for reaching out — I am looking into this now.', now() - ((30 - i) || ' days')::interval + interval '2 hours');
  END LOOP;

  -- ---------- policies ----------
  INSERT INTO public.policies (slug, title, category, summary, body_markdown, metadata) VALUES
  ('returns','Returns Policy','returns','Most items can be returned within 30 days of delivery for a full refund.',
   E'# Returns Policy\n\n- Returns accepted within **30 days of delivery**.\n- Items must be unread and in original condition, unless damaged on arrival.\n- Damaged or incorrect items are always eligible, with no time limit within 90 days.\n- Ebooks are non-returnable once downloaded.\n- Clearance items are final sale.\n- Return shipping is free for damaged or incorrect items; otherwise a $4.99 label fee is deducted.\n\nStart a return with `POST /api/public/v1/returns`.',
   '{"window_days":30,"damaged_window_days":90,"restocking_fee_cents":0,"return_label_fee_cents":499,"non_returnable_formats":["ebook"],"final_sale_categories":["clearance"]}'),
  ('shipping','Shipping Policy','shipping','Ground shipping is $4.99 and free over $35. Delivery takes 2-7 business days.',
   E'# Shipping Policy\n\n| Service | Cost | Delivery |\n| --- | --- | --- |\n| Ground | $4.99 (free over $35) | 3-7 business days |\n| Two-day | $9.99 | 2 business days |\n| Overnight | $24.99 | 1 business day |\n\nOrders placed before 1pm ET ship the same business day. We ship to the US and Canada. Ebooks are delivered instantly by email.',
   '{"free_shipping_threshold_cents":3500,"ground_cost_cents":499,"two_day_cost_cents":999,"overnight_cost_cents":2499,"carriers":["UPS","FedEx","USPS","DHL"]}'),
  ('refunds','Refunds Policy','refunds','Refunds are issued to the original payment method within 5-7 business days of us receiving a return.',
   E'# Refunds Policy\n\n- Refunds are issued once the return is received and inspected.\n- Funds appear on the original payment method within **5-7 business days**.\n- Store credit refunds are instant and never expire.\n- Shipping charges are refunded only when the return is our fault.\n- Partial refunds are available for multi-item orders.',
   '{"processing_days":"5-7","methods":["original_payment","store_credit"]}'),
  ('lost-packages','Lost or Missing Packages','shipping','If tracking stalls for 7 days we will reship or refund at no cost.',
   E'# Lost or Missing Packages\n\nIf tracking has not updated for **7 days**, or a package is marked delivered but was not received, contact support. We will reship the order or issue a full refund — your choice. No proof of loss is required.',
   '{"stalled_tracking_days":7,"options":["reship","refund"]}'),
  ('password-reset','Password Reset and Account Access','account','Request a reset link by email; the link is valid for 60 minutes.',
   E'# Password Reset\n\n1. Request a reset from the sign-in page or ask support.\n2. A reset link is emailed and is valid for **60 minutes**.\n3. Links are single use.\n\nIf the email does not arrive, check spam and confirm the address on the account. Support can trigger a reset with `POST /api/public/v1/auth/password-reset`.',
   '{"token_ttl_minutes":60,"single_use":true}'),
  ('privacy','Privacy Policy','legal','We store order and account data to fulfill orders and never sell personal data.',
   E'# Privacy Policy\n\nBookly stores the information needed to fulfill orders: name, email, shipping address, and order history. We never sell personal data. Customers may request deletion of their account at any time.',
   '{"data_retention_years":7,"sells_data":false}'),
  ('cancellations','Order Cancellation Policy','orders','Orders can be cancelled any time before they ship.',
   E'# Cancellations\n\nOrders may be cancelled while their status is `processing` or `backordered`. Once an order ships it must be returned instead. Cancelled orders are voided, not charged.',
   '{"cancellable_statuses":["processing","backordered"]}');

  -- ---------- faqs ----------
  INSERT INTO public.faqs (slug, question, answer, category, tags) VALUES
  ('where-is-my-order','Where is my order?','Look up the order by number or email, then check its shipments and tracking events. Ground orders arrive in 3-7 business days.','order_status', ARRAY['tracking','shipping','order']),
  ('how-long-shipping','How long does shipping take?','Ground is 3-7 business days, two-day is 2 business days, and overnight arrives the next business day.','shipping', ARRAY['shipping','delivery']),
  ('free-shipping','Do you offer free shipping?','Yes — ground shipping is free on orders over $35. Below that it is $4.99.','shipping', ARRAY['shipping','cost']),
  ('return-window','How long do I have to return a book?','30 days from delivery for most items, or 90 days if the item arrived damaged or incorrect.','returns', ARRAY['returns','policy']),
  ('start-return','How do I start a return?','Check eligibility for the order, then create a return. You will get an RMA number and a prepaid label.','returns', ARRAY['returns','rma']),
  ('refund-timing','When will I get my refund?','Refunds post to the original payment method 5-7 business days after we receive the return. Store credit is instant.','refunds', ARRAY['refunds','timing']),
  ('damaged-item','My book arrived damaged. What now?','Damaged items are always eligible for a free return or replacement. No need to ship it back in some cases — support can approve a refund directly.','returns', ARRAY['damaged','returns']),
  ('cancel-order','Can I cancel my order?','Yes, while the order is still processing or backordered. Once it ships, return it instead.','orders', ARRAY['cancel','order']),
  ('reset-password','How do I reset my password?','Request a reset link by email. The link works once and expires after 60 minutes.','account', ARRAY['password','account','login']),
  ('change-address','Can I change my shipping address after ordering?','Yes, if the order has not shipped. Update the order or ask support before the label is created.','orders', ARRAY['address','shipping']),
  ('lost-package','My tracking has not updated in a week.','If tracking stalls for 7 days we will reship or refund at no cost — your choice.','shipping', ARRAY['lost','tracking']),
  ('ebook-returns','Can I return an ebook?','Ebooks are non-returnable once downloaded, but contact support if the file will not open.','returns', ARRAY['ebook','returns']),
  ('gift-orders','Do you ship gift orders?','Yes. Gift orders ship without a receipt showing prices, and returns can be issued as store credit.','orders', ARRAY['gift']),
  ('store-credit','How does store credit work?','Store credit is applied automatically at checkout, never expires, and can be combined with card payment.','refunds', ARRAY['store credit','refunds']),
  ('international','Do you ship internationally?','We currently ship to the United States and Canada only.','shipping', ARRAY['international','shipping']);

  RETURN jsonb_build_object(
    'customers', (SELECT count(*) FROM public.customers),
    'books', (SELECT count(*) FROM public.books),
    'orders', (SELECT count(*) FROM public.orders),
    'order_items', (SELECT count(*) FROM public.order_items),
    'shipments', (SELECT count(*) FROM public.shipments),
    'returns', (SELECT count(*) FROM public.returns),
    'refunds', (SELECT count(*) FROM public.refunds),
    'transactions', (SELECT count(*) FROM public.transactions),
    'tickets', (SELECT count(*) FROM public.support_tickets),
    'policies', (SELECT count(*) FROM public.policies),
    'faqs', (SELECT count(*) FROM public.faqs)
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.seed_bookly_demo() TO anon, authenticated, service_role;

SELECT public.seed_bookly_demo();
