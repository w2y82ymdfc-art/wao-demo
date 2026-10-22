-- Business managers: an owner invites a manager with a link; the manager signs in with their own
-- Wepawao account and can then work the business page (menu, logo, VIP messages, stats).
-- Only the owner can add or remove managers, delete the business or hand it to someone else.

create table if not exists public.vip_managers (
  list_id uuid not null references public.vip_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
create index if not exists vip_managers_user_idx on public.vip_managers (user_id);
alter table public.vip_managers enable row level security;

-- Single-use invite links, valid 7 days. Only reachable through the functions below.
create table if not exists public.vip_manager_invites (
  token uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.vip_lists(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
alter table public.vip_manager_invites enable row level security;

-- True when the signed-in member owns or manages the business.
create or replace function public.can_manage_vip(p_list uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vip_lists where id = p_list and owner_id = (select auth.uid()))
      or exists (select 1 from public.vip_managers where list_id = p_list and user_id = (select auth.uid()))
$$;

-- Managers: the owner sees and removes them; a manager sees and can leave their own row.
drop policy if exists vip_managers_read on public.vip_managers;
create policy vip_managers_read on public.vip_managers for select to authenticated
  using (user_id = (select auth.uid()) or exists (select 1 from public.vip_lists l where l.id = list_id and l.owner_id = (select auth.uid())));
drop policy if exists vip_managers_delete on public.vip_managers;
create policy vip_managers_delete on public.vip_managers for delete to authenticated
  using (user_id = (select auth.uid()) or exists (select 1 from public.vip_lists l where l.id = list_id and l.owner_id = (select auth.uid())));

-- Owner creates an invite link.
create or replace function public.create_vip_manager_invite(p_list uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_token uuid;
begin
  if not exists (select 1 from public.vip_lists where id = p_list and owner_id = (select auth.uid())) then
    raise exception 'only_owner' using errcode = 'P0001';
  end if;
  delete from public.vip_manager_invites where expires_at < now();
  insert into public.vip_manager_invites (list_id) values (p_list) returning token into v_token;
  return v_token;
end $$;

-- A signed-in member opens the link: they become a manager and the link is used up.
create or replace function public.accept_vip_manager_invite(p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_list uuid; v_name text;
begin
  if v_uid is null then raise exception 'sign_in' using errcode = 'P0001'; end if;
  select i.list_id into v_list from public.vip_manager_invites i where i.token = p_token and i.expires_at > now();
  if v_list is null then raise exception 'invite_invalid' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.vip_lists where id = v_list and owner_id = v_uid) then
    insert into public.vip_managers (list_id, user_id) values (v_list, v_uid) on conflict do nothing;
    delete from public.vip_manager_invites where token = p_token;
  end if;
  select name into v_name from public.vip_lists where id = v_list;
  return jsonb_build_object('list_id', v_list, 'name', v_name);
end $$;

-- Owner's view of the managers, with names.
create or replace function public.vip_list_managers(p_list uuid)
returns table (user_id uuid, display_name text, username text, avatar_url text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.display_name, p.username, p.avatar_url, m.created_at
  from public.vip_managers m left join public.profiles p on p.id = m.user_id
  where m.list_id = p_list and exists (select 1 from public.vip_lists l where l.id = p_list and l.owner_id = (select auth.uid()))
  order by m.created_at
$$;

revoke all on function public.create_vip_manager_invite(uuid), public.accept_vip_manager_invite(uuid), public.vip_list_managers(uuid) from public, anon;
grant execute on function public.create_vip_manager_invite(uuid), public.accept_vip_manager_invite(uuid), public.vip_list_managers(uuid), public.can_manage_vip(uuid) to authenticated;

-- Owners and managers can work the business: details and logo, menu, VIP messages.
drop policy if exists vip_lists_update on public.vip_lists;
create policy vip_lists_update on public.vip_lists for update to authenticated
  using (public.can_manage_vip(id)) with check (public.can_manage_vip(id));
-- Nobody hands the business to someone else from the app.
create or replace function public.vip_lists_keep_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id and (select auth.uid()) is not null then
    raise exception 'only_owner' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists vip_lists_keep_owner on public.vip_lists;
create trigger vip_lists_keep_owner before update on public.vip_lists for each row execute function public.vip_lists_keep_owner();

drop policy if exists menu_items_insert on public.menu_items;
create policy menu_items_insert on public.menu_items for insert with check (public.can_manage_vip(list_id));
drop policy if exists menu_items_update on public.menu_items;
create policy menu_items_update on public.menu_items for update using (public.can_manage_vip(list_id)) with check (public.can_manage_vip(list_id));
drop policy if exists menu_items_delete on public.menu_items;
create policy menu_items_delete on public.menu_items for delete using (public.can_manage_vip(list_id));

drop policy if exists vip_messages_insert on public.vip_messages;
create policy vip_messages_insert on public.vip_messages for insert to authenticated with check (public.can_manage_vip(list_id));
drop policy if exists vip_messages_delete on public.vip_messages;
create policy vip_messages_delete on public.vip_messages for delete to authenticated using (public.can_manage_vip(list_id));

-- Managers see the business stats too.
create or replace function public.business_view_stats(p_list uuid)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public.can_manage_vip(p_list) then return null; end if;
  return jsonb_build_object(
    'menu_total', (select count(*) from public.views where kind = 'menu' and list_id = p_list),
    'menu_week', (select count(*) from public.views where kind = 'menu' and list_id = p_list and created_at >= now() - interval '7 days'),
    'menu_people', (select count(distinct viewer) from public.views where kind = 'menu' and list_id = p_list),
    'vip_total', (select count(*) from public.views where kind = 'vip' and list_id = p_list),
    'since', (select min(created_at) from public.views where list_id = p_list),
    'days', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'menu', coalesce(x.menu, 0), 'vip', coalesce(x.vip, 0)) order by d), '[]'::jsonb)
      from generate_series(((now() at time zone 'America/Puerto_Rico')::date - 29), (now() at time zone 'America/Puerto_Rico')::date, interval '1 day') d
      left join (select (created_at at time zone 'America/Puerto_Rico')::date dd,
                        count(*) filter (where kind = 'menu') menu, count(*) filter (where kind = 'vip') vip
                 from public.views where list_id = p_list group by 1) x on x.dd = d::date),
    'messages', (select coalesce(jsonb_object_agg(target::text, n), '{}'::jsonb)
      from (select target, count(distinct viewer) n from public.views where kind = 'vip' and list_id = p_list group by target) s)
  );
end $function$;
