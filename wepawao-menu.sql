-- Digital menu (beta), applied Oct 21, 2026. Dishes belong to a business's VIP list (vip_lists).
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.vip_lists(id) on delete cascade,
  category text check (char_length(category) <= 40),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 200),
  price_cents integer check (price_cents >= 0 and price_cents < 10000000), -- null = market price
  sold_out boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index menu_items_list_idx on public.menu_items(list_id, sort);
alter table public.menu_items enable row level security;
create policy menu_items_read on public.menu_items for select using (true);
create policy menu_items_insert on public.menu_items for insert with check (exists (select 1 from public.vip_lists l where l.id = list_id and l.owner_id = (select auth.uid())));
create policy menu_items_update on public.menu_items for update using (exists (select 1 from public.vip_lists l where l.id = list_id and l.owner_id = (select auth.uid()))) with check (exists (select 1 from public.vip_lists l where l.id = list_id and l.owner_id = (select auth.uid())));
create policy menu_items_delete on public.menu_items for delete using (exists (select 1 from public.vip_lists l where l.id = list_id and l.owner_id = (select auth.uid())));
create or replace function public.menu_items_touch() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' and (select count(*) from public.menu_items m where m.list_id = new.list_id) >= 300 then
    raise exception 'menu_limit';
  end if;
  return new;
end $$;
create trigger menu_items_touch before insert or update on public.menu_items for each row execute function public.menu_items_touch();

-- Dish photos, applied Oct 21, 2026.
alter table public.menu_items add column image_path text check (char_length(image_path) <= 300);

-- Featured dishes (slideshow), applied Oct 21, 2026. Trigger menu_items_touch also caps featured at 6 (raises featured_limit).
alter table public.menu_items add column featured boolean not null default false;
