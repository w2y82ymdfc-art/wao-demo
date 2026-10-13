-- Wao! database update (safe to run more than once).
-- Paste ALL of it into Supabase > SQL Editor > New query, then tap Run.
--
-- 1. Up to 4 photos per post + "edited" marker
-- 2. Contacts (invite or request, no duplicates)
-- 3. Moment visibility: Contacts only (default) or Public
-- 4. Written public rules: no prices, no links, no phone numbers,
--    max 3 public moments per 24 hours, hidden after 3 members report it.
--    A moment that breaks a rule stays visible to contacts, with the reason saved.

------------------------------------------------------------------ 1. Photos
alter table public.posts
  add column if not exists image_paths text[] not null default '{}',
  add column if not exists edited_at timestamptz;
alter table public.posts drop constraint if exists posts_image_paths_max4;
alter table public.posts add constraint posts_image_paths_max4 check (cardinality(image_paths) <= 4);
update public.posts set image_paths = array[image_path] where image_path is not null and cardinality(image_paths) = 0;

create or replace function public.posts_mark_edited()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.body is distinct from old.body or new.title is distinct from old.title
     or new.image_paths is distinct from old.image_paths then
    new.edited_at := now();
  end if;
  return new;
end $$;
drop trigger if exists posts_mark_edited on public.posts;
create trigger posts_mark_edited before update on public.posts
  for each row execute function public.posts_mark_edited();

------------------------------------------------------------------ 2. Contacts
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint connections_not_self check (requester_id <> addressee_id)
);
create unique index if not exists connections_unique_pair
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists connections_requester_idx on public.connections (requester_id);
create index if not exists connections_addressee_idx on public.connections (addressee_id);
alter table public.connections enable row level security;

drop policy if exists "Members read own connections" on public.connections;
drop policy if exists "Members send connection requests" on public.connections;
drop policy if exists "Invitee accepts request" on public.connections;
drop policy if exists "Either member removes connection" on public.connections;
create policy "Members read own connections" on public.connections for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));
create policy "Members send connection requests" on public.connections for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');
create policy "Invitee accepts request" on public.connections for update to authenticated
  using (addressee_id = (select auth.uid()))
  with check (addressee_id = (select auth.uid()) and status = 'accepted');
create policy "Either member removes connection" on public.connections for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create or replace function public.connections_set_accepted_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then new.accepted_at := now(); end if;
  return new;
end $$;
drop trigger if exists connections_set_accepted_at on public.connections;
create trigger connections_set_accepted_at before update on public.connections
  for each row execute function public.connections_set_accepted_at();

-- True when the signed-in member and `other` are accepted contacts.
create or replace function public.is_contact(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.connections c
    where c.status = 'accepted'
      and least(c.requester_id, c.addressee_id) = least((select auth.uid()), other)
      and greatest(c.requester_id, c.addressee_id) = greatest((select auth.uid()), other)
  );
$$;
grant execute on function public.is_contact(uuid) to anon, authenticated;

-- Opening someone's invite link connects you right away (the link is their invitation).
create or replace function public.connect_by_invite(p_inviter uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then return 'signed_out'; end if;
  if me = p_inviter then return 'self'; end if;
  if not exists (select 1 from public.profiles where id = p_inviter) then return 'unknown'; end if;
  insert into public.connections (requester_id, addressee_id, status, accepted_at)
  values (p_inviter, me, 'accepted', now())
  on conflict ((least(requester_id, addressee_id)), (greatest(requester_id, addressee_id)))
  do update set status = 'accepted', accepted_at = coalesce(public.connections.accepted_at, now());
  return 'connected';
end $$;
revoke all on function public.connect_by_invite(uuid) from public;
grant execute on function public.connect_by_invite(uuid) to authenticated;

-- New members who joined through an invite link are connected to the inviter automatically.
create or replace function public.handle_new_user()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare
  v_username text;
  v_ref      uuid;
begin
  v_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  v_username := left(coalesce(nullif(v_username, ''), 'user'), 20) || '_' || substr(md5(random()::text), 1, 4);

  begin
    v_ref := nullif(new.raw_user_meta_data->>'referred_by', '')::uuid;
    if v_ref is not null and not exists (select 1 from public.profiles where id = v_ref) then
      v_ref := null;
    end if;
  exception when others then
    v_ref := null;
  end;

  insert into public.profiles (id, display_name, username, referred_by)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)), 40),
    v_username,
    v_ref
  );

  insert into public.profile_emails (profile_id, email, is_primary, verified_at)
  values (new.id, new.email, true, new.email_confirmed_at);

  if v_ref is not null then
    begin
      insert into public.connections (requester_id, addressee_id, status, accepted_at)
      values (v_ref, new.id, 'accepted', now())
      on conflict do nothing;
    exception when others then null;
    end;
  end if;

  return new;
end;
$function$;

------------------------------------------------------------------ 3 + 4. Visibility and public rules
-- Existing moments were posted publicly, so they start as public. New moments default to contacts only.
alter table public.posts add column if not exists visibility text not null default 'public';
alter table public.posts alter column visibility set default 'contacts';
alter table public.posts drop constraint if exists posts_visibility_check;
alter table public.posts add constraint posts_visibility_check check (visibility in ('contacts','public'));
alter table public.posts add column if not exists public_block_reason text;
alter table public.posts drop constraint if exists posts_public_block_reason_check;
alter table public.posts add constraint posts_public_block_reason_check
  check (public_block_reason is null or public_block_reason in ('price','link','phone','daily_cap','reported'));

create or replace function public.posts_check_public_rules()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  txt text;
  n   int;
begin
  if new.kind <> 'update' or new.visibility <> 'public' then
    new.public_block_reason := null;
    return new;
  end if;
  -- Hidden by member reports: stays hidden. Only the reports trigger (depth > 1) can set it.
  if tg_op = 'UPDATE' and old.public_block_reason = 'reported' then
    new.public_block_reason := 'reported';
    return new;
  end if;
  if new.public_block_reason = 'reported' and pg_trigger_depth() > 1 then
    return new;
  end if;

  txt := coalesce(new.title, '') || ' ' || coalesce(new.body, '');
  if txt ~* '\$\s*\d|\d\s*(usd|dollars?|d[oó]lares?)\M' then
    new.public_block_reason := 'price'; return new;
  end if;
  if txt ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|io|app|shop|store|biz|info|ly)\M)' then
    new.public_block_reason := 'link'; return new;
  end if;
  if txt ~ '(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}' then
    new.public_block_reason := 'phone'; return new;
  end if;
  if tg_op = 'INSERT' or old.visibility <> 'public' or old.public_block_reason = 'daily_cap' then
    select count(*) into n from public.posts
     where user_id = new.user_id and kind = 'update' and visibility = 'public'
       and public_block_reason is null and created_at > now() - interval '24 hours' and id <> new.id;
    if n >= 3 then new.public_block_reason := 'daily_cap'; return new; end if;
  end if;
  new.public_block_reason := null;
  return new;
end $$;
drop trigger if exists posts_check_public_rules on public.posts;
create trigger posts_check_public_rules before insert or update on public.posts
  for each row execute function public.posts_check_public_rules();

-- Check existing public moments against the price/link/phone rules (no daily cap for old posts).
update public.posts set visibility = visibility where kind = 'update';

-- Reports: one per member per post; 3 different members hide a public moment.
create unique index if not exists reports_one_per_member on public.reports (reporter_id, post_id);
create or replace function public.reports_hide_post()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.post_id is not null
     and (select count(distinct reporter_id) from public.reports where post_id = new.post_id) >= 3 then
    update public.posts set public_block_reason = 'reported'
     where id = new.post_id and kind = 'update' and visibility = 'public';
  end if;
  return new;
end $$;
drop trigger if exists reports_hide_post on public.reports;
create trigger reports_hide_post after insert on public.reports
  for each row execute function public.reports_hide_post();

-- Who can see a moment: its author, their contacts, and everyone if it is public and passed the rules.
-- Offers and requests (Discover / What I offer) stay public as before.
drop policy if exists "Public read active posts" on public.posts;
create policy "Public read active posts" on public.posts for select to anon
  using (status = 'active' and (expires_at is null or expires_at > now())
         and (kind <> 'update' or (visibility = 'public' and public_block_reason is null)));
drop policy if exists "Members read posts" on public.posts;
create policy "Members read posts" on public.posts for select to authenticated
  using (user_id = (select auth.uid())
         or (status = 'active' and (expires_at is null or expires_at > now())
             and (kind <> 'update'
                  or (visibility = 'public' and public_block_reason is null)
                  or public.is_contact(user_id))));

------------------------------------------------------------------ Feed
drop function if exists public.get_feed(post_kind, text, double precision, double precision, double precision, timestamptz, uuid, integer);
create function public.get_feed(p_kind post_kind DEFAULT NULL, p_category text DEFAULT NULL, p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL, p_radius_km double precision DEFAULT NULL, p_before_created_at timestamptz DEFAULT NULL, p_before_id uuid DEFAULT NULL, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, user_id uuid, author_username text, author_display_name text, author_avatar_url text, kind post_kind, category text, title text, body text, price_cents integer, currency character, location_text text, distance_km double precision, image_path text, image_paths text[], caricature_image_url text, listing_type text, expires_at timestamptz, created_at timestamptz, edited_at timestamptz, visibility text, public_block_reason text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  select
    p.id, p.user_id, pr.username, pr.display_name, pr.avatar_url,
    p.kind, p.category, p.title, p.body,
    p.price_cents, p.currency, p.location_text,
    case when p_lat is not null and p_lng is not null and p.lat is not null and p.lng is not null then
      6371 * 2 * asin(sqrt(
        power(sin(radians(p.lat - p_lat) / 2), 2) +
        cos(radians(p_lat)) * cos(radians(p.lat)) * power(sin(radians(p.lng - p_lng) / 2), 2)
      ))
    end as distance_km,
    p.image_path, p.image_paths, p.caricature_image_url,
    p.listing_type, p.expires_at,
    p.created_at, p.edited_at, p.visibility, p.public_block_reason
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  where p.status = 'active'
    and (p.expires_at is null or p.expires_at > now())
    and (p_kind is null     or p.kind = p_kind)
    and (p_category is null or p.category = p_category)
    and (p.kind <> 'update'
         or p.user_id = (select auth.uid())
         or (p.visibility = 'public' and p.public_block_reason is null)
         or public.is_contact(p.user_id))
    and (p_before_created_at is null or (p.created_at, p.id) < (p_before_created_at, p_before_id))
    and (
      p_radius_km is null or p_lat is null or p_lng is null
      or (
        p.lat is not null and p.lng is not null
        and 6371 * 2 * asin(sqrt(
          power(sin(radians(p.lat - p_lat) / 2), 2) +
          cos(radians(p_lat)) * cos(radians(p.lat)) * power(sin(radians(p.lng - p_lng) / 2), 2)
        )) <= p_radius_km
      )
    )
  order by p.created_at desc, p.id desc
  limit least(coalesce(p_limit, 20), 100);
$function$;
grant execute on function public.get_feed(post_kind, text, double precision, double precision, double precision, timestamptz, uuid, integer) to anon, authenticated;
