-- Hub settings: singleton JSONB blob for the entire ContentStore
create table if not exists hub_settings (
  id int primary key,
  content jsonb not null default '{}',
  updated_at timestamptz default now(),
  constraint hub_settings_singleton check (id = 1)
);

create trigger set_hub_settings_updated_at
  before update on hub_settings
  for each row execute function set_updated_at();

alter table hub_settings enable row level security;
create policy "public read hub_settings" on hub_settings for select using (true);
create policy "admin write hub_settings" on hub_settings for all using (is_admin());

-- Seed one empty row so upsert works immediately
insert into hub_settings (id, content)
values (1, '{}')
on conflict (id) do nothing;

-- Community members: separate table for signup submissions
create table if not exists hub_community_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  meta jsonb default '{}',
  created_at timestamptz default now()
);

alter table hub_community_members enable row level security;
create policy "anon insert hub_community_members" on hub_community_members for insert with check (true);
create policy "admin read hub_community_members" on hub_community_members for select using (is_admin());
