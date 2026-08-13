CREATE TABLE public.refund_events (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references public.refunds(id) on delete cascade,
  type text not null default 'status_change',
  status_from text,
  status_to text,
  actor text not null default 'agent',
  note text,
  amount_cents integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
CREATE INDEX refund_events_refund_id_idx ON public.refund_events(refund_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refund_events TO anon, authenticated;
GRANT ALL ON public.refund_events TO service_role;
ALTER TABLE public.refund_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public demo access" ON public.refund_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.refund_events (refund_id, type, status_from, status_to, actor, note, amount_cents, created_at)
SELECT id, 'created', null, status, 'system', 'Refund record created', amount_cents, created_at FROM public.refunds;