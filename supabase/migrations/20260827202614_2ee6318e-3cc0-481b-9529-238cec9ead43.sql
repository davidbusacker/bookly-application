CREATE OR REPLACE FUNCTION public.seed_decagon_traces()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  i integer;
  n integer;
  intent_key text;
  sub_key text;
  ch text;
  cid uuid;
  cname text;
  oid uuid;
  onum text;
  tid uuid;
  started timestamptz;
  outcome_key text;
  senti text;
  ic numeric;
  rc numeric;
  book text;
  cust_ids uuid[];
  cust_names text[];
  order_nums text[];
  order_ids uuid[];
  ncust integer;
  norder integer;
  tnum text;
  transcript text;
  msgs jsonb;
  m jsonb;
  seq integer;
  titles text[] := ARRAY['The Salt Archive','Quiet Machines','A Map of Small Rains','Practical Sorcery','Bread, Salt, Fire','Glass Cathedral','Deep Field','Foxglove Lane','Winterlight','Half a Kingdom'];
BEGIN
  DELETE FROM public.agent_trace_messages am
  USING public.agent_traces t
  WHERE am.trace_id = t.id AND COALESCE((t.metadata->>'decagon_seed')::boolean,false);
  DELETE FROM public.agent_traces WHERE COALESCE((metadata->>'decagon_seed')::boolean,false);

  SELECT array_agg(id ORDER BY email), array_agg(full_name ORDER BY email)
    INTO cust_ids, cust_names
  FROM public.customers WHERE email <> 'david.busacker@example.com';
  ncust := COALESCE(array_length(cust_ids,1),0);
  IF ncust = 0 THEN RETURN jsonb_build_object('decagon_traces',0); END IF;

  SELECT array_agg(id ORDER BY order_number), array_agg(order_number ORDER BY order_number)
    INTO order_ids, order_nums
  FROM public.orders o
  WHERE o.customer_id <> COALESCE((SELECT id FROM public.customers WHERE email='david.busacker@example.com' LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid);
  norder := COALESCE(array_length(order_ids,1),0);

  FOR i IN 1..90 LOOP
    IF i <= 31 THEN
      intent_key := 'initiate_return';
      sub_key := CASE WHEN i <= 12 THEN 'didnt_like_book'
                      WHEN i <= 19 THEN 'damaged_in_transit'
                      WHEN i <= 24 THEN 'wrong_item'
                      WHEN i <= 28 THEN 'arrived_late'
                      ELSE 'changed_mind' END;
    ELSIF i <= 51 THEN
      intent_key := 'order_status';
      sub_key := CASE WHEN i <= 40 THEN 'where_is_my_order'
                      WHEN i <= 46 THEN 'tracking_not_updating'
                      ELSE 'delivered_not_received' END;
    ELSIF i <= 65 THEN
      intent_key := 'refund_status';
      sub_key := CASE WHEN i <= 58 THEN 'refund_not_received'
                      WHEN i <= 62 THEN 'partial_refund_question'
                      ELSE 'refund_method_change' END;
    ELSIF i <= 76 THEN
      intent_key := 'shipping_policy';
      sub_key := CASE WHEN i <= 71 THEN 'delivery_estimate'
                      WHEN i <= 74 THEN 'shipping_cost'
                      ELSE 'international_shipping' END;
    ELSIF i <= 84 THEN
      intent_key := 'password_reset';
      sub_key := CASE WHEN i <= 81 THEN 'reset_email_missing' ELSE 'account_locked' END;
    ELSE
      intent_key := 'book_availability';
      sub_key := CASE WHEN i <= 88 THEN 'out_of_stock' ELSE 'restock_date' END;
    END IF;

    ch := CASE WHEN (i * 7) % 10 < 3 THEN 'voice' ELSE 'chat' END;
    cid := cust_ids[((i * 3) % ncust) + 1];
    cname := cust_names[((i * 3) % ncust) + 1];
    IF norder > 0 THEN
      oid := order_ids[((i * 5) % norder) + 1];
      onum := order_nums[((i * 5) % norder) + 1];
    ELSE oid := NULL; onum := 'BK-10000'; END IF;
    book := titles[((i * 4) % 10) + 1];
    started := now() - ((i % 45) || ' days')::interval - ((i * 37 % 900) || ' minutes')::interval;
    n := 4 + (i % 5) + CASE WHEN ch = 'voice' THEN 3 ELSE 0 END;
    ic := 0.72 + ((i % 26)::numeric / 100);
    rc := CASE WHEN sub_key = 'didnt_like_book' THEN 0.55 + ((i % 20)::numeric / 100)
               ELSE 0.70 + ((i % 28)::numeric / 100) END;
    outcome_key := CASE
      WHEN intent_key = 'initiate_return' THEN CASE WHEN i % 9 = 0 THEN 'escalated' ELSE 'return_created' END
      WHEN intent_key = 'refund_status' THEN CASE WHEN i % 7 = 0 THEN 'refund_issued' ELSE 'resolved' END
      WHEN intent_key IN ('shipping_policy','password_reset') THEN 'deflected'
      ELSE CASE WHEN i % 11 = 0 THEN 'unresolved' ELSE 'resolved' END END;
    senti := CASE WHEN sub_key = 'didnt_like_book' AND i % 3 = 0 THEN 'negative'
                  WHEN i % 5 = 0 THEN 'negative' WHEN i % 2 = 0 THEN 'neutral' ELSE 'positive' END;
    tnum := 'TRC-' || (200000 + i * 7)::text;

    msgs := jsonb_build_array();
    msgs := msgs || jsonb_build_array(jsonb_build_object(
      'role','system','speaker','Guardrail','content','Intent classified as **' || replace(intent_key,'_',' ') ||
      '** (sub-reason: ' || replace(sub_key,'_',' ') || '). Policy pack loaded: #' || intent_key || '_aop.'));
    msgs := msgs || jsonb_build_array(jsonb_build_object('role','customer','speaker',split_part(cname,' ',1),'content',
      CASE intent_key
        WHEN 'initiate_return' THEN CASE sub_key
          WHEN 'didnt_like_book' THEN 'Hi — I want to return "' || book || '" from order ' || onum || '. I got a few chapters in and it just was not for me at all.'
          WHEN 'damaged_in_transit' THEN 'My copy of "' || book || '" arrived with a bent cover and torn pages. Order ' || onum || '.'
          WHEN 'wrong_item' THEN 'I ordered "' || book || '" on ' || onum || ' but a completely different title showed up.'
          WHEN 'arrived_late' THEN 'Order ' || onum || ' showed up two weeks late and I already bought it elsewhere. I would like to send it back.'
          ELSE 'I changed my mind on order ' || onum || ' — can I return "' || book || '"?' END
        WHEN 'order_status' THEN CASE sub_key
          WHEN 'where_is_my_order' THEN 'Where is my order ' || onum || '? It has been a while.'
          WHEN 'tracking_not_updating' THEN 'Tracking for ' || onum || ' has not moved in five days.'
          ELSE 'My tracking says ' || onum || ' was delivered but nothing is at my door.' END
        WHEN 'refund_status' THEN CASE sub_key
          WHEN 'refund_not_received' THEN 'I returned a book two weeks ago and still have not seen the refund for ' || onum || '.'
          WHEN 'partial_refund_question' THEN 'Why was my refund on ' || onum || ' less than what I paid?'
          ELSE 'Can my refund for ' || onum || ' go to store credit instead of my card?' END
        WHEN 'shipping_policy' THEN CASE sub_key
          WHEN 'delivery_estimate' THEN 'How long does ground shipping usually take?'
          WHEN 'shipping_cost' THEN 'How much is shipping, and is there a free threshold?'
          ELSE 'Do you ship to Canada?' END
        WHEN 'password_reset' THEN CASE sub_key
          WHEN 'reset_email_missing' THEN 'I asked for a password reset three times and no email ever arrives.'
          ELSE 'My account is locked out and I cannot sign in.' END
        ELSE CASE sub_key
          WHEN 'out_of_stock' THEN 'Do you have "' || book || '" in stock right now?'
          ELSE 'When are you restocking "' || book || '"?' END
      END));
    msgs := msgs || jsonb_build_array(jsonb_build_object('role','agent','speaker','Bookly CX Agent','content',
      'Thanks ' || split_part(cname,' ',1) || ' — let me pull that up for you right now.'));
    msgs := msgs || jsonb_build_array(jsonb_build_object('role','tool','speaker','Bookly CX Agent',
      'tool_name', CASE intent_key WHEN 'initiate_return' THEN 'get_return_eligibility'
                                   WHEN 'order_status' THEN 'get_order'
                                   WHEN 'refund_status' THEN 'list_refunds'
                                   WHEN 'shipping_policy' THEN 'get_policy'
                                   WHEN 'password_reset' THEN 'request_password_reset'
                                   ELSE 'get_inventory' END,
      'tool_input', jsonb_build_object('order_id', onum, 'email', 'customer'),
      'tool_output', jsonb_build_object('ok', true, 'eligible', intent_key = 'initiate_return', 'title', book)));
    msgs := msgs || jsonb_build_array(jsonb_build_object('role','agent','speaker','Bookly CX Agent','content',
      CASE intent_key
        WHEN 'initiate_return' THEN 'You are inside the 30-day window, so I have created RMA-' || (8000 + i)::text ||
          ' for "' || book || '" and emailed you a prepaid label. Once it scans, the refund posts in 5-7 business days.'
        WHEN 'order_status' THEN 'Order ' || onum || ' is in transit and currently estimated to arrive in the next two business days. I have sent you the live tracking link.'
        WHEN 'refund_status' THEN 'Your return was received and the refund is processing — it should land on your original payment method within 5-7 business days.'
        WHEN 'shipping_policy' THEN 'Ground is 3-7 business days at $4.99, and it is free over $35. Two-day and overnight are also available.'
        WHEN 'password_reset' THEN 'I have triggered a fresh reset link to the email on file. It is single use and expires in 60 minutes.'
        ELSE 'I checked live inventory — I can tell you exactly where that title stands and set a restock alert for you.'
      END));
    IF n > 5 THEN
      msgs := msgs || jsonb_build_array(jsonb_build_object('role','customer','speaker',split_part(cname,' ',1),'content',
        CASE WHEN sub_key = 'didnt_like_book' THEN 'Thanks. Honestly I wish I had known it was that kind of book before I bought it.'
             ELSE 'Okay, that works. Thank you.' END));
      msgs := msgs || jsonb_build_array(jsonb_build_object('role','agent','speaker','Bookly CX Agent','content',
        CASE WHEN sub_key = 'didnt_like_book' THEN 'Completely understandable — I have noted the feedback on your account so we can recommend closer matches next time.'
             ELSE 'Happy to help! Anything else I can take care of today?' END));
    END IF;
    IF n > 7 THEN
      msgs := msgs || jsonb_build_array(jsonb_build_object('role','note','speaker','Internal note','content',
        'Customer contacted on ' || ch || '. Sub-reason confirmed: ' || replace(sub_key,'_',' ') || '.'));
      msgs := msgs || jsonb_build_array(jsonb_build_object('role','customer','speaker',split_part(cname,' ',1),'content','No, that is everything. Thanks for the help.'));
    END IF;

    transcript := '# ' || tnum || E'\n';
    FOR seq IN 0..(jsonb_array_length(msgs) - 1) LOOP
      m := msgs -> seq;
      transcript := transcript || '**' || COALESCE(m->>'speaker','Agent') || ':** ' || COALESCE(m->>'content', COALESCE(m->>'tool_name','tool') || ' call') || E'\n';
    END LOOP;

    INSERT INTO public.agent_traces (
      trace_number, agent_name, agent_version, model, channel, customer_id, customer_email, order_id,
      subject, summary, intent, intent_confidence, resolution_confidence, outcome, status, sentiment,
      escalated, tags, tool_calls, message_count, duration_ms, started_at, ended_at, metadata, transcript_text)
    SELECT tnum, 'Bookly CX Agent', '2.4.1',
      CASE WHEN ch = 'voice' THEN 'gpt-4o-realtime' ELSE 'gpt-4o-mini' END,
      ch, cid, c.email, oid,
      CASE intent_key
        WHEN 'initiate_return' THEN 'Return request for "' || book || '" on ' || onum
        WHEN 'order_status' THEN 'Order status check on ' || onum
        WHEN 'refund_status' THEN 'Refund status question on ' || onum
        WHEN 'shipping_policy' THEN 'Shipping policy question'
        WHEN 'password_reset' THEN 'Password reset assistance'
        ELSE 'Availability check for "' || book || '"' END,
      CASE intent_key
        WHEN 'initiate_return' THEN 'Customer asked to return "' || book || '" (' || replace(sub_key,'_',' ') ||
          '). Verified eligibility, created the RMA and issued a prepaid label.'
        WHEN 'order_status' THEN 'Looked up ' || onum || ' and shared live tracking plus a revised delivery estimate.'
        WHEN 'refund_status' THEN 'Located the return and explained refund timing on the original payment method.'
        WHEN 'shipping_policy' THEN 'Answered a shipping policy question from the policy pack; no order action required.'
        WHEN 'password_reset' THEN 'Triggered a new password reset link and confirmed the email on file.'
        ELSE 'Checked live inventory for "' || book || '" and offered a restock alert.' END,
      intent_key, ic, rc, outcome_key, 'completed', senti,
      outcome_key = 'escalated',
      ARRAY[intent_key, sub_key, ch],
      1, jsonb_array_length(msgs),
      (60 + (i * 13) % 540) * 1000, started,
      started + (((60 + (i * 13) % 540)) || ' seconds')::interval,
      jsonb_build_object('decagon_seed', true, 'demo_seed', true, 'intent_category', intent_key,
                         'sub_reason', sub_key, 'contact_channel', ch),
      transcript
    FROM public.customers c WHERE c.id = cid
    RETURNING id INTO tid;

    INSERT INTO public.agent_trace_messages (trace_id, seq, role, speaker, content, occurred_at, tool_name, tool_input, tool_output, intent_confidence, resolution_confidence, metadata)
    SELECT tid, (ord.i - 1)::int, ord.msg->>'role', ord.msg->>'speaker', COALESCE(ord.msg->>'content',''),
      started + (((ord.i - 1) * 25) || ' seconds')::interval,
      ord.msg->>'tool_name', ord.msg->'tool_input', ord.msg->'tool_output',
      LEAST(0.99, ic - 0.05 + (ord.i::numeric / 100)),
      LEAST(0.99, rc - 0.08 + (ord.i::numeric / 60)),
      jsonb_build_object('sub_reason', sub_key)
    FROM jsonb_array_elements(msgs) WITH ORDINALITY AS ord(msg, i);
  END LOOP;

  RETURN jsonb_build_object('decagon_traces', (SELECT count(*) FROM public.agent_traces WHERE COALESCE((metadata->>'decagon_seed')::boolean,false)));
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_bookly_demo()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  did uuid;
  purged integer;
  onums text[] := ARRAY['BK-10005','BK-10025','BK-10045','BK-10065'];
BEGIN
  DELETE FROM public.agent_trace_messages m
  USING public.agent_traces t
  WHERE m.trace_id = t.id
    AND COALESCE((t.metadata->>'demo_seed')::boolean, false) = false;

  DELETE FROM public.agent_traces t
  WHERE COALESCE((t.metadata->>'demo_seed')::boolean, false) = false;
  GET DIAGNOSTICS purged = ROW_COUNT;

  UPDATE public.agent_traces
  SET customer_id = NULL, order_id = NULL, ticket_id = NULL
  WHERE true;

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

  UPDATE public.agent_traces
  SET customer_id = did,
      customer_email = 'david.busacker@example.com',
      order_id = (SELECT id FROM public.orders WHERE order_number = 'BK-10005' LIMIT 1)
  WHERE trace_number = 'TRC-704318';

  result := result || public.seed_decagon_traces();

  RETURN result
    || jsonb_build_object('demo_customer', 'david.busacker@example.com')
    || jsonb_build_object('agent_traces_purged', purged);
END;
$function$;