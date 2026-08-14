DELETE FROM public.agent_trace_messages WHERE trace_id IN (SELECT id FROM public.agent_traces WHERE trace_number = 'TRC-789402');
DELETE FROM public.agent_traces WHERE trace_number = 'TRC-789402';