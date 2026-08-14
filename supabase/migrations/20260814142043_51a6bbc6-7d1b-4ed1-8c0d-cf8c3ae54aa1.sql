CREATE TABLE public.agent_traces (
  id uuid primary key default gen_random_uuid(),
  trace_number text not null unique,
  agent_name text not null default 'Bookly CX Agent',
  agent_version text,
  model text,
  channel text not null default 'chat',
  customer_id uuid references public.customers(id) on delete set null,
  customer_email text,
  order_id uuid references public.orders(id) on delete set null,
  ticket_id uuid references public.support_tickets(id) on delete set null,
  subject text not null default 'Support conversation',
  summary text,
  intent text,
  outcome text not null default 'unresolved',
  status text not null default 'completed',
  sentiment text,
  escalated boolean not null default false,
  tags text[] not null default '{}'::text[],
  tool_calls integer not null default 0,
  message_count integer not null default 0,
  duration_ms integer,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  transcript_text text,
  created_at timestamptz not null default now()
);

CREATE TABLE public.agent_trace_messages (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid not null references public.agent_traces(id) on delete cascade,
  seq integer not null default 0,
  role text not null default 'agent',
  speaker text,
  content text not null default '',
  occurred_at timestamptz not null default now(),
  duration_ms integer,
  tool_name text,
  tool_input jsonb,
  tool_output jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

CREATE INDEX agent_traces_started_at_idx ON public.agent_traces (started_at DESC);
CREATE INDEX agent_traces_customer_idx ON public.agent_traces (customer_id);
CREATE INDEX agent_traces_email_idx ON public.agent_traces (customer_email);
CREATE INDEX agent_trace_messages_trace_idx ON public.agent_trace_messages (trace_id, seq);

GRANT ALL ON public.agent_traces TO service_role;
GRANT ALL ON public.agent_trace_messages TO service_role;

ALTER TABLE public.agent_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_trace_messages ENABLE ROW LEVEL SECURITY;