create table if not exists bot_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  market_id text,
  payload jsonb,
  created_at timestamptz default now()
);

alter table bot_events enable row level security;

drop policy if exists "read_bot_events" on bot_events;
create policy "read_bot_events"
on bot_events for select
using (true);

drop policy if exists "insert_bot_events" on bot_events;
create policy "insert_bot_events"
on bot_events for insert
with check (true);

create table if not exists bot_controls (
  id uuid primary key default gen_random_uuid(),
  armed boolean default false,
  live_trading boolean default false,
  updated_at timestamptz default now()
);

alter table bot_controls enable row level security;

drop policy if exists "read_bot_controls" on bot_controls;
create policy "read_bot_controls"
on bot_controls for select
using (true);

drop policy if exists "write_bot_controls" on bot_controls;
create policy "write_bot_controls"
on bot_controls for insert
with check (true);

drop policy if exists "update_bot_controls" on bot_controls;
create policy "update_bot_controls"
on bot_controls for update
using (true);
