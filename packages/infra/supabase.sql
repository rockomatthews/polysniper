create table if not exists bot_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  market_id text,
  payload jsonb,
  created_at timestamptz default now()
);

alter table bot_events enable row level security;

create policy "read_bot_events"
on bot_events for select
using (true);

create policy "insert_bot_events"
on bot_events for insert
with check (true);
