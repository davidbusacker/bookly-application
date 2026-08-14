ALTER TABLE public.agent_trace_messages
  ADD COLUMN IF NOT EXISTS intent_confidence numeric,
  ADD COLUMN IF NOT EXISTS resolution_confidence numeric;

UPDATE public.agent_trace_messages m
SET intent_confidence = LEAST(0.99, GREATEST(0.4, COALESCE(t.intent_confidence, 0.8) + ((m.seq % 5) - 2) * 0.03)),
    resolution_confidence = LEAST(0.99, GREATEST(0.3, COALESCE(t.resolution_confidence, 0.7) + (m.seq * 0.04)))
FROM public.agent_traces t
WHERE t.id = m.trace_id
  AND m.role IN ('agent', 'tool')
  AND m.intent_confidence IS NULL;