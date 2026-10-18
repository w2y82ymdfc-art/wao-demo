-- Wepawao database update (safe to run more than once).
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
------------------------------------------------------------------ Affiliate dashboard
-- A member's sub-affiliates by tier, built from profiles.referred_by (set when someone joins through an invite link).
-- Tier 1 = people you invited, tier 2 = people they invited, tier 3 = the next level.
-- Returns counts, weekly growth for the last p_weeks weeks, and the names of your tier 1 only
-- (tiers 2 and 3 are shown as counts, so members never see who is deeper in someone else's network).
create or replace function public.my_affiliate_tiers(p_weeks integer default 8)
 returns jsonb language sql stable security definer set search_path to ''
as $function$
  with recursive tree as (
    select p.id, p.created_at, 1 as tier
    from public.profiles p
    where p.referred_by = (select auth.uid()) and p.id <> (select auth.uid())
    union all
    select c.id, c.created_at, t.tier + 1
    from public.profiles c
    join tree t on c.referred_by = t.id
    where t.tier < 3 and c.id <> (select auth.uid())
  ),
  weeks as (
    select generate_series(
      date_trunc('week', now()) - make_interval(weeks => greatest(least(coalesce(p_weeks, 8), 26), 1) - 1),
      date_trunc('week', now()), interval '1 week') as wk
  )
  select case when (select auth.uid()) is null then null else jsonb_build_object(
    'tier1', (select count(*) from tree where tier = 1),
    'tier2', (select count(*) from tree where tier = 2),
    'tier3', (select count(*) from tree where tier = 3),
    'week1', (select count(*) from tree where tier = 1 and created_at >= now() - interval '7 days'),
    'week2', (select count(*) from tree where tier = 2 and created_at >= now() - interval '7 days'),
    'week3', (select count(*) from tree where tier = 3 and created_at >= now() - interval '7 days'),
    'weeks', (select coalesce(jsonb_agg(jsonb_build_object(
                'week', w.wk::date,
                't1', (select count(*) from tree where tier = 1 and created_at < w.wk + interval '1 week'),
                't2', (select count(*) from tree where tier = 2 and created_at < w.wk + interval '1 week'),
                't3', (select count(*) from tree where tier = 3 and created_at < w.wk + interval '1 week'))
              order by w.wk), '[]'::jsonb) from weeks w),
    'first_tier', (select coalesce(jsonb_agg(jsonb_build_object(
                     'id', p.id, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'joined', p.created_at)
                   order by p.created_at desc), '[]'::jsonb)
                   from (select pr.* from public.profiles pr join tree t on t.id = pr.id and t.tier = 1
                         order by pr.created_at desc limit 50) p)
  ) end;
$function$;
revoke all on function public.my_affiliate_tiers(integer) from public, anon;
grant execute on function public.my_affiliate_tiers(integer) to authenticated;

-- Whole-community numbers for the banner slideshow (counts only, visible to visitors too).
create or replace function public.affiliate_community_stats()
 returns jsonb language sql stable security definer set search_path to ''
as $function$
  select jsonb_build_object(
    'members', count(*),
    'members_week', count(*) filter (where created_at >= now() - interval '7 days'),
    'invited', count(*) filter (where referred_by is not null),
    'invited_week', count(*) filter (where referred_by is not null and created_at >= now() - interval '7 days')
  ) from public.profiles;
$function$;
grant execute on function public.affiliate_community_stats() to anon, authenticated;
------------------------------------------------------------------ Provider bank (advertisers linked to affiliates)
-- Every advertiser (provider) is sponsored by one affiliate for 12 months.
--   referred: the advertiser came in through an affiliate's advertiser link -> that affiliate sponsors it.
--             An affiliate's own business is a common provider: he can bring it in with his own link.
--   direct:   the advertiser came straight to Wepawao -> it goes into a Wepawao Face Challenge.
-- Wepawao Face Challenge: opens only when an approved direct advertiser is waiting for a sponsor and runs 7 days.
--   Active affiliates enter with a public photo moment; members vote. There are as many winners as
--   direct advertisers in the challenge. No direct advertisers, no challenge. Anyone can win again.
--   The winner's 12 months count from the day Wepawao approved the advertiser, so no payment is missed.
-- Cleared advertising payments inside the 12 months pay 20% / 10% / 5% up the sponsor's tiers.

create table if not exists public.app_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade
);
alter table public.app_admins enable row level security;
drop policy if exists "Admins read admins" on public.app_admins;
create policy "Admins read admins" on public.app_admins for select to authenticated
  using (profile_id = (select auth.uid()));

create or replace function public.is_admin()
 returns boolean language sql stable security definer set search_path to ''
as $$ select exists (select 1 from public.app_admins where profile_id = (select auth.uid())) $$;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.contest_rounds (
  id        uuid primary key default gen_random_uuid(),
  opened_at timestamptz not null default now(),
  ends_at   timestamptz not null,
  status    text not null default 'open' check (status in ('open','closed')),
  closed_at timestamptz
);
create unique index if not exists contest_rounds_one_open on public.contest_rounds ((status)) where status = 'open';
alter table public.contest_rounds enable row level security;

create table if not exists public.providers (
  id            uuid primary key default gen_random_uuid(),
  business_name text not null check (length(business_name) between 2 and 120),
  contact_name  text check (length(contact_name) <= 80),
  contact_email text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(contact_email) <= 200),
  contact_phone text check (length(contact_phone) <= 40),
  website       text check (length(website) <= 200),
  offer         text check (length(offer) <= 1000),
  lang          text not null default 'en',
  owner_id      uuid references public.profiles(id) on delete set null,
  link_from     uuid references public.profiles(id) on delete set null,
  source        text not null check (source in ('referred','direct')),
  status        text not null default 'new' check (status in ('new','active','declined')),
  approved_at   timestamptz,
  round_id      uuid references public.contest_rounds(id) on delete set null,
  sponsor_id    uuid references public.profiles(id) on delete set null,
  sponsor_via   text check (sponsor_via in ('referral','contest')),
  sponsor_start timestamptz,
  sponsor_end   timestamptz,
  created_at    timestamptz not null default now()
);
alter table public.providers enable row level security;  -- read and written only through the functions below

create table if not exists public.contest_entries (
  id         uuid primary key default gen_random_uuid(),
  round_id   uuid not null references public.contest_rounds(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  won        boolean not null default false,
  created_at timestamptz not null default now(),
  unique (round_id, user_id),
  unique (round_id, post_id)
);
alter table public.contest_entries enable row level security;

create table if not exists public.contest_votes (
  entry_id   uuid not null references public.contest_entries(id) on delete cascade,
  voter_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, voter_id)
);
alter table public.contest_votes enable row level security;

create table if not exists public.ad_payments (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.providers(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  cleared_at   timestamptz not null,
  note         text check (length(note) <= 300),
  recorded_by  uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
alter table public.ad_payments enable row level security;

-- Commission lines: each cleared payment inside the sponsor's 12 months, split up three tiers.
create or replace view public.affiliate_commissions with (security_invoker = true) as
  with base as (
    select pay.id as payment_id, pay.provider_id, pay.amount_cents, pay.cleared_at, pr.sponsor_id
    from public.ad_payments pay
    join public.providers pr on pr.id = pay.provider_id
    where pr.sponsor_id is not null
      and pay.cleared_at >= pr.sponsor_start and pay.cleared_at < pr.sponsor_end
  )
  select payment_id, provider_id, cleared_at, sponsor_id as affiliate_id, 1 as tier, 20 as rate,
         (amount_cents * 20 / 100) as commission_cents from base
  union all
  select b.payment_id, b.provider_id, b.cleared_at, u.upline_id, u.tier + 1, case u.tier when 1 then 10 else 5 end,
         (b.amount_cents * case u.tier when 1 then 10 else 5 end / 100)
  from base b join public.affiliate_upline u on u.profile_id = b.sponsor_id and u.tier <= 2;
revoke all on public.affiliate_commissions from anon, authenticated;

-- Active affiliate: a member (not on the Wepawao team) who signed in, posted or commented in the last 30 days.
create or replace function public.is_active_affiliate(p_id uuid)
 returns boolean language sql stable security definer set search_path to ''
as $$
  select p_id is not null
    and not exists (select 1 from public.app_admins a where a.profile_id = p_id)
    and (exists (select 1 from auth.users u where u.id = p_id and u.last_sign_in_at >= now() - interval '30 days')
      or exists (select 1 from public.posts x where x.user_id = p_id and x.created_at >= now() - interval '30 days')
      or exists (select 1 from public.comments c where c.user_id = p_id and c.created_at >= now() - interval '30 days'))
$$;
revoke all on function public.is_active_affiliate(uuid) from public, anon, authenticated;

-- A vote counts when the voter is not the entrant and their account was at least 7 days old when they voted.
create or replace function public.contest_entry_votes(p_entry uuid)
 returns integer language sql stable security definer set search_path to ''
as $$
  select count(*)::int from public.contest_votes v
  join public.contest_entries e on e.id = v.entry_id
  join public.profiles p on p.id = v.voter_id
  where v.entry_id = p_entry and v.voter_id <> e.user_id and p.created_at <= v.created_at - interval '7 days'
$$;
revoke all on function public.contest_entry_votes(uuid) from public, anon, authenticated;

-- Opens a challenge for approved direct advertisers that have no sponsor (joins the open one if there is one).
create or replace function public.contest_open_if_needed()
 returns uuid language plpgsql security definer set search_path to ''
as $$
declare v_round uuid;
begin
  if not exists (select 1 from public.providers where source = 'direct' and status = 'active' and sponsor_id is null) then
    return null;
  end if;
  select id into v_round from public.contest_rounds where status = 'open';
  if v_round is null then
    insert into public.contest_rounds (ends_at) values (now() + interval '7 days') returning id into v_round;
  end if;
  update public.providers set round_id = v_round
  where source = 'direct' and status = 'active' and sponsor_id is null and round_id is distinct from v_round;
  return v_round;
end $$;
revoke all on function public.contest_open_if_needed() from public, anon, authenticated;

-- Closes a challenge whose time is up: the top N entries win the N waiting advertisers, in order.
-- Safe to call any time by anyone; it only acts when the end time has passed.
create or replace function public.contest_settle()
 returns void language plpgsql security definer set search_path to ''
as $$
declare
  v_round public.contest_rounds;
  r record;
begin
  select * into v_round from public.contest_rounds where status = 'open' and ends_at <= now() for update skip locked;
  if v_round.id is null then return; end if;
  for r in
    with prov as (
      select id, approved_at, row_number() over (order by approved_at, created_at) as n
      from public.providers
      where round_id = v_round.id and source = 'direct' and status = 'active' and sponsor_id is null
    ),
    ranked as (
      select e.id as entry_id, e.user_id,
             row_number() over (order by public.contest_entry_votes(e.id) desc, e.created_at) as n
      from public.contest_entries e
      join public.posts x on x.id = e.post_id
      where e.round_id = v_round.id and x.status = 'active' and x.visibility = 'public' and x.public_block_reason is null
    )
    select prov.id as provider_id, prov.approved_at, ranked.entry_id, ranked.user_id
    from prov join ranked on ranked.n = prov.n
  loop
    update public.providers set sponsor_id = r.user_id, sponsor_via = 'contest',
      sponsor_start = coalesce(r.approved_at, now()), sponsor_end = coalesce(r.approved_at, now()) + interval '12 months'
    where id = r.provider_id;
    update public.contest_entries set won = true where id = r.entry_id;
  end loop;
  update public.contest_rounds set status = 'closed', closed_at = now() where id = v_round.id;
  -- Advertisers left without a winner (not enough entries) go into a new challenge.
  perform public.contest_open_if_needed();
end $$;
grant execute on function public.contest_settle() to anon, authenticated;

-- The challenge as everyone sees it (also settles it when its time is up).
create or replace function public.contest_current()
 returns jsonb language plpgsql volatile security definer set search_path to ''
as $$
declare v_round public.contest_rounds; v_last public.contest_rounds; v_me uuid := (select auth.uid());
begin
  perform public.contest_settle();
  select * into v_round from public.contest_rounds where status = 'open';
  select * into v_last from public.contest_rounds where status = 'closed' order by closed_at desc limit 1;
  return jsonb_build_object(
    'open', v_round.id is not null,
    'ends_at', v_round.ends_at,
    'opened_at', v_round.opened_at,
    'prizes', (select count(*) from public.providers where round_id = v_round.id and sponsor_id is null and status = 'active'),
    'can_enter', v_round.id is not null and public.is_active_affiliate(v_me)
                 and not exists (select 1 from public.contest_entries where round_id = v_round.id and user_id = v_me),
    'can_vote', v_me is not null and exists (select 1 from public.profiles where id = v_me and created_at <= now() - interval '7 days'),
    'entries', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'post_id', x.id, 'mine', e.user_id = v_me,
        'name', p.display_name, 'avatar_url', p.avatar_url,
        'body', x.body, 'image_paths', coalesce(x.image_paths, case when x.image_path is not null then array[x.image_path] end),
        'votes', public.contest_entry_votes(e.id),
        'my_vote', exists (select 1 from public.contest_votes v where v.entry_id = e.id and v.voter_id = v_me)
      ) order by public.contest_entry_votes(e.id) desc, e.created_at), '[]'::jsonb)
      from public.contest_entries e
      join public.posts x on x.id = e.post_id
      join public.profiles p on p.id = e.user_id
      where e.round_id = v_round.id and x.status = 'active' and x.visibility = 'public' and x.public_block_reason is null),
    'last_winners', (select coalesce(jsonb_agg(p.display_name order by e.created_at), '[]'::jsonb)
      from public.contest_entries e join public.profiles p on p.id = e.user_id
      where e.round_id = v_last.id and e.won),
    'last_closed_at', v_last.closed_at
  );
end $$;
grant execute on function public.contest_current() to anon, authenticated;

-- Enter with one of your own public photo moments posted since the challenge opened.
create or replace function public.contest_enter(p_post uuid, p_agree boolean)
 returns text language plpgsql security definer set search_path to ''
as $$
declare v_round uuid; v_me uuid := (select auth.uid()); v_post public.posts;
begin
  perform public.contest_settle();
  if v_me is null then return 'sign_in'; end if;
  if not coalesce(p_agree, false) then return 'agree'; end if;
  select id into v_round from public.contest_rounds where status = 'open' and ends_at > now();
  if v_round is null then return 'closed'; end if;
  if not public.is_active_affiliate(v_me) then return 'not_active'; end if;
  if exists (select 1 from public.contest_entries where round_id = v_round and user_id = v_me) then return 'already'; end if;
  select * into v_post from public.posts where id = p_post;
  if v_post.id is null or v_post.user_id <> v_me then return 'not_yours'; end if;
  if v_post.status <> 'active' or v_post.visibility <> 'public' or v_post.public_block_reason is not null then return 'not_public'; end if;
  if coalesce(cardinality(v_post.image_paths), 0) = 0 and v_post.image_path is null then return 'no_photo'; end if;
  if v_post.created_at < (select opened_at from public.contest_rounds where id = v_round) then return 'too_old'; end if;
  insert into public.contest_entries (round_id, user_id, post_id) values (v_round, v_me, p_post);
  return 'ok';
end $$;
grant execute on function public.contest_enter(uuid, boolean) to authenticated;

-- Vote (or take back a vote). Members whose account is at least 7 days old; never your own entry.
create or replace function public.contest_vote(p_entry uuid, p_on boolean)
 returns text language plpgsql security definer set search_path to ''
as $$
declare v_me uuid := (select auth.uid()); v_entry public.contest_entries;
begin
  if v_me is null then return 'sign_in'; end if;
  select e.* into v_entry from public.contest_entries e
  join public.contest_rounds r on r.id = e.round_id and r.status = 'open' and r.ends_at > now()
  where e.id = p_entry;
  if v_entry.id is null then return 'closed'; end if;
  if v_entry.user_id = v_me then return 'own'; end if;
  if not exists (select 1 from public.profiles where id = v_me and created_at <= now() - interval '7 days') then return 'too_new'; end if;
  if p_on then
    insert into public.contest_votes (entry_id, voter_id) values (p_entry, v_me) on conflict do nothing;
  else
    delete from public.contest_votes where entry_id = p_entry and voter_id = v_me;
  end if;
  return 'ok';
end $$;
grant execute on function public.contest_vote(uuid, boolean) to authenticated;

-- Public form: anyone can ask to advertise. p_link is the affiliate from the advertiser link, if any.
create or replace function public.submit_provider(
  p_business text, p_contact text, p_email text, p_phone text, p_website text, p_offer text,
  p_link uuid default null, p_lang text default 'en')
 returns text language plpgsql security definer set search_path to ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_link  uuid := p_link;
  v_src   text;
  v_email text := lower(trim(p_email));
begin
  if coalesce(length(trim(p_business)), 0) < 2 then return 'missing_business'; end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return 'bad_email'; end if;
  if exists (select 1 from public.providers where lower(contact_email) = v_email and created_at > now() - interval '1 day') then
    return 'already_sent';
  end if;
  if v_link is not null and not exists (select 1 from public.profiles where id = v_link) then v_link := null; end if;
  v_src := case when v_link is not null then 'referred' else 'direct' end;
  insert into public.providers (business_name, contact_name, contact_email, contact_phone, website, offer, lang,
                                owner_id, link_from, source, sponsor_id, sponsor_via)
  values (trim(p_business), nullif(trim(p_contact), ''), v_email, nullif(trim(p_phone), ''), nullif(trim(p_website), ''),
          nullif(trim(p_offer), ''), case when p_lang = 'es' then 'es' else 'en' end,
          v_owner, v_link, v_src,
          case when v_src = 'referred' then v_link end, case when v_src = 'referred' then 'referral' end);
  return 'ok';
end $$;
grant execute on function public.submit_provider(text, text, text, text, text, text, uuid, text) to anon, authenticated;

-- What an affiliate sees: the providers they sponsor (business name only) and their commissions by tier.
create or replace function public.my_provider_bank()
 returns jsonb language sql stable security definer set search_path to ''
as $$
  select case when (select auth.uid()) is null then null else jsonb_build_object(
    'providers', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', pr.id, 'business_name', pr.business_name, 'via', pr.sponsor_via, 'status', pr.status,
        'start', pr.sponsor_start, 'end', pr.sponsor_end) order by pr.created_at desc), '[]'::jsonb)
      from public.providers pr where pr.sponsor_id = (select auth.uid()) and pr.status <> 'declined'),
    'commission_cents', (select jsonb_build_object(
        't1', coalesce(sum(commission_cents) filter (where tier = 1), 0),
        't2', coalesce(sum(commission_cents) filter (where tier = 2), 0),
        't3', coalesce(sum(commission_cents) filter (where tier = 3), 0))
      from public.affiliate_commissions where affiliate_id = (select auth.uid())),
    'bank_size', (select count(*) from public.providers where status = 'active'),
    'contests_won', (select count(*) from public.contest_entries where user_id = (select auth.uid()) and won)
  ) end
$$;
grant execute on function public.my_provider_bank() to authenticated;

-- Wepawao Team: the full bank and the challenge.
create or replace function public.admin_provider_bank()
 returns jsonb language plpgsql volatile security definer set search_path to ''
as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  perform public.contest_settle();
  return jsonb_build_object(
    'contest', (select jsonb_build_object('ends_at', r.ends_at,
                  'entries', (select count(*) from public.contest_entries where round_id = r.id))
                from public.contest_rounds r where r.status = 'open'),
    'providers', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', pr.id, 'business_name', pr.business_name, 'contact_name', pr.contact_name, 'contact_email', pr.contact_email,
      'contact_phone', pr.contact_phone, 'website', pr.website, 'offer', pr.offer, 'source', pr.source, 'status', pr.status,
      'owner_name', o.display_name, 'link_name', l.display_name, 'sponsor_name', s.display_name, 'sponsor_via', pr.sponsor_via,
      'in_contest', pr.round_id is not null and pr.sponsor_id is null,
      'start', pr.sponsor_start, 'end', pr.sponsor_end, 'created_at', pr.created_at,
      'paid_cents', (select coalesce(sum(amount_cents), 0) from public.ad_payments where provider_id = pr.id)
    ) order by pr.created_at desc), '[]'::jsonb)
    from public.providers pr
    left join public.profiles o on o.id = pr.owner_id
    left join public.profiles l on l.id = pr.link_from
    left join public.profiles s on s.id = pr.sponsor_id));
end $$;
grant execute on function public.admin_provider_bank() to authenticated;

-- Approve or decline. Approving a referred provider starts its sponsor's 12 months;
-- approving a direct one puts it into the Wepawao Face Challenge (opening one if needed).
create or replace function public.admin_set_provider_status(p_id uuid, p_status text)
 returns text language plpgsql security definer set search_path to ''
as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_status not in ('active','declined') then return 'bad_status'; end if;
  update public.providers set status = p_status,
    approved_at   = case when p_status = 'active' then coalesce(approved_at, now()) else approved_at end,
    round_id      = case when p_status = 'declined' and sponsor_id is null then null else round_id end,
    sponsor_start = case when p_status = 'active' and sponsor_id is not null and sponsor_start is null then now() else sponsor_start end,
    sponsor_end   = case when p_status = 'active' and sponsor_id is not null and sponsor_start is null then now() + interval '12 months' else sponsor_end end
  where id = p_id;
  perform public.contest_open_if_needed();
  -- A challenge with no advertisers left (all declined) closes without winners.
  update public.contest_rounds r set status = 'closed', closed_at = now()
  where r.status = 'open' and not exists (select 1 from public.providers p where p.round_id = r.id and p.sponsor_id is null and p.status = 'active');
  return 'ok';
end $$;
grant execute on function public.admin_set_provider_status(uuid, text) to authenticated;

-- End the open challenge now (the Wepawao Team can close it early).
create or replace function public.admin_end_contest()
 returns text language plpgsql security definer set search_path to ''
as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.contest_rounds set ends_at = now() where status = 'open';
  perform public.contest_settle();
  return 'ok';
end $$;
grant execute on function public.admin_end_contest() to authenticated;

-- Record advertising money once it has cleared into the Wepawao account.
create or replace function public.admin_record_payment(p_id uuid, p_amount_cents integer, p_cleared_at timestamptz default now(), p_note text default null)
 returns text language plpgsql security definer set search_path to ''
as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if coalesce(p_amount_cents, 0) <= 0 then return 'bad_amount'; end if;
  insert into public.ad_payments (provider_id, amount_cents, cleared_at, note, recorded_by)
  values (p_id, p_amount_cents, coalesce(p_cleared_at, now()), nullif(trim(p_note), ''), (select auth.uid()));
  return 'ok';
end $$;
grant execute on function public.admin_record_payment(uuid, integer, timestamptz, text) to authenticated;

-- Community numbers for the banner now include the size of the provider bank.
create or replace function public.affiliate_community_stats()
 returns jsonb language sql stable security definer set search_path to ''
as $function$
  select jsonb_build_object(
    'members', count(*),
    'members_week', count(*) filter (where created_at >= now() - interval '7 days'),
    'invited', count(*) filter (where referred_by is not null),
    'invited_week', count(*) filter (where referred_by is not null and created_at >= now() - interval '7 days'),
    'providers', (select count(*) from public.providers where status = 'active')
  ) from public.profiles;
$function$;

-- The founder's account runs the Wepawao Team panel.
insert into public.app_admins (profile_id) values ('f157918e-fb1e-4063-899e-251f172e8669') on conflict do nothing;

------------------------------------------------------------------ Hardening (October 2026): same as supabase-hardening.sql
------------------------------------------------------------------ 1. Trigger helpers: never called directly
-- These run automatically (on sign-up, on posting, on reports). Nobody needs to call them through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.posts_check_public_rules() from public, anon, authenticated;
revoke execute on function public.reports_hide_post() from public, anon, authenticated;

------------------------------------------------------------------ 2. Internal helper
-- The challenge closes itself from inside contest_current(); no one needs to call this directly.
revoke execute on function public.contest_settle() from public, anon, authenticated;

------------------------------------------------------------------ 3. Signed-in members only (not visitors)
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.connect_by_invite(uuid) from public, anon;
revoke execute on function public.my_provider_bank() from public, anon;
revoke execute on function public.contest_enter(uuid, boolean) from public, anon;
revoke execute on function public.contest_vote(uuid, boolean) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.connect_by_invite(uuid) to authenticated;
grant execute on function public.my_provider_bank() to authenticated;
grant execute on function public.contest_enter(uuid, boolean) to authenticated;
grant execute on function public.contest_vote(uuid, boolean) to authenticated;

------------------------------------------------------------------ 4. Wepawao Team functions: signed-in only
-- They already refuse anyone who is not on the Wepawao Team; visitors now cannot even reach them.
revoke execute on function public.admin_provider_bank() from public, anon;
revoke execute on function public.admin_set_provider_status(uuid, text) from public, anon;
revoke execute on function public.admin_end_contest() from public, anon;
revoke execute on function public.admin_record_payment(uuid, integer, timestamptz, text) from public, anon;
grant execute on function public.admin_provider_bank() to authenticated;
grant execute on function public.admin_set_provider_status(uuid, text) to authenticated;
grant execute on function public.admin_end_contest() to authenticated;
grant execute on function public.admin_record_payment(uuid, integer, timestamptz, text) to authenticated;

-- Still open to visitors on purpose: get_feed (public moments), contest_current (see the challenge),
-- affiliate_community_stats (banner counts), submit_provider (advertiser form), is_contact (feed rules).

------------------------------------------------------------------ 5. Indexes for speed as Wepawao grows
create index if not exists posts_user_id_idx            on public.posts (user_id);
create index if not exists comments_user_id_idx         on public.comments (user_id);
create index if not exists reports_post_id_idx          on public.reports (post_id);
create index if not exists reports_reported_user_idx    on public.reports (reported_user_id);
create index if not exists waos_user_id_idx             on public.waos (user_id);
create index if not exists contest_entries_user_id_idx  on public.contest_entries (user_id);
create index if not exists contest_entries_post_id_idx  on public.contest_entries (post_id);
create index if not exists contest_votes_voter_id_idx   on public.contest_votes (voter_id);
create index if not exists providers_sponsor_id_idx     on public.providers (sponsor_id);
create index if not exists providers_round_id_idx       on public.providers (round_id);
create index if not exists providers_link_from_idx      on public.providers (link_from);
create index if not exists providers_owner_id_idx       on public.providers (owner_id);
create index if not exists ad_payments_provider_id_idx  on public.ad_payments (provider_id);
create index if not exists ad_payments_recorded_by_idx  on public.ad_payments (recorded_by);

------------------------------------------------------------------ AI Moments (October 2026)
-- An AI Moment is a moment with two photos: the original (photo 1) and its AI version (photo 2),
-- plus an optional "How I made it": the prompt and the AI tool used.
alter table public.posts
  add column if not exists ai_moment boolean not null default false,
  add column if not exists ai_prompt text,
  add column if not exists ai_tool   text;
alter table public.posts drop constraint if exists posts_ai_prompt_len;
alter table public.posts add constraint posts_ai_prompt_len check (ai_prompt is null or length(ai_prompt) <= 600);
alter table public.posts drop constraint if exists posts_ai_tool_len;
alter table public.posts add constraint posts_ai_tool_len check (ai_tool is null or length(ai_tool) <= 60);
alter table public.posts drop constraint if exists posts_ai_two_photos;
alter table public.posts add constraint posts_ai_two_photos check (not ai_moment or cardinality(image_paths) >= 2);
create index if not exists posts_ai_feed_idx on public.posts (created_at desc, id desc) where ai_moment;

-- The feed now also returns the AI fields, and can show only AI Moments (p_ai = true).
drop function if exists public.get_feed(post_kind, text, double precision, double precision, double precision, timestamptz, uuid, integer);
drop function if exists public.get_feed(post_kind, text, double precision, double precision, double precision, timestamptz, uuid, integer, boolean);
create function public.get_feed(p_kind post_kind DEFAULT NULL, p_category text DEFAULT NULL, p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL, p_radius_km double precision DEFAULT NULL, p_before_created_at timestamptz DEFAULT NULL, p_before_id uuid DEFAULT NULL, p_limit integer DEFAULT 20, p_ai boolean DEFAULT NULL)
 RETURNS TABLE(id uuid, user_id uuid, author_username text, author_display_name text, author_avatar_url text, kind post_kind, category text, title text, body text, price_cents integer, currency character, location_text text, distance_km double precision, image_path text, image_paths text[], caricature_image_url text, listing_type text, expires_at timestamptz, created_at timestamptz, edited_at timestamptz, visibility text, public_block_reason text, ai_moment boolean, ai_prompt text, ai_tool text)
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
    p.created_at, p.edited_at, p.visibility, p.public_block_reason,
    p.ai_moment, p.ai_prompt, p.ai_tool
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  where p.status = 'active'
    and (p.expires_at is null or p.expires_at > now())
    and (p_kind is null     or p.kind = p_kind)
    and (p_category is null or p.category = p_category)
    and (p_ai is null       or p.ai_moment = p_ai)
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
grant execute on function public.get_feed(post_kind, text, double precision, double precision, double precision, timestamptz, uuid, integer, boolean) to anon, authenticated;

------------------------------------------------------------------ Shared posts for visitors (October 15, 2026)
-- Visitors (and WhatsApp/Messages link previews) can read the second photo and the AI Moment details
-- of PUBLIC posts. Row rules still hide contacts-only and private moments.
grant select (image_paths, edited_at, visibility, public_block_reason, ai_moment, ai_prompt, ai_tool) on public.posts to anon;

------------------------------------------------------------------ Wao! button (October 15, 2026)

revoke all on public.waos from anon;

drop policy if exists "Members read waos" on public.waos;
drop policy if exists "Members read own and received waos" on public.waos;
create policy "Members read own and received waos" on public.waos for select to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid())));

-- Only on posts the member can see, and not on their own posts.
drop policy if exists "Members add own waos" on public.waos;
create policy "Members add own waos" on public.waos for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.posts p where p.id = post_id and p.user_id <> (select auth.uid())));

create index if not exists waos_post_id_idx on public.waos (post_id);

------------------------------------------------------------------ Held-back moments go public by themselves (October 18, 2026)
-- 1. Release a member's held-back public moments, oldest first, while they have room under the limit.
--    Touching the post re-runs the normal public rules, which decide whether it can go public now.
create or replace function public.release_held_posts(p_user uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare
  x uuid;
  r text;
begin
  loop
    select id into x from public.posts
     where user_id = p_user and kind = 'update' and visibility = 'public'
       and public_block_reason = 'daily_cap' and status = 'active'
     order by created_at, id limit 1;
    exit when x is null;
    update public.posts set visibility = 'public' where id = x;
    select public_block_reason into r from public.posts where id = x;
    exit when r is not null;   -- still no room: stop here
  end loop;
end $$;
revoke execute on function public.release_held_posts(uuid) from public, anon, authenticated;

-- 2. Right away when a slot frees up: a public moment is deleted, switched to contacts only, or closed.
create or replace function public.posts_release_on_change()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;
  if old.kind = 'update' and old.visibility = 'public' and old.public_block_reason is null then
    perform public.release_held_posts(old.user_id);
  end if;
  return null;
end $$;
revoke execute on function public.posts_release_on_change() from public, anon, authenticated;
drop trigger if exists posts_release_on_change on public.posts;
create trigger posts_release_on_change
  after delete or update of visibility, status on public.posts
  for each row execute function public.posts_release_on_change();

-- 3. When 24 hours pass: check every 10 minutes for members with held-back moments.
create extension if not exists pg_cron;
create or replace function public.release_all_held_posts()
returns void language plpgsql security definer set search_path to '' as $$
declare u uuid;
begin
  for u in select distinct user_id from public.posts where public_block_reason = 'daily_cap' loop
    perform public.release_held_posts(u);
  end loop;
end $$;
revoke execute on function public.release_all_held_posts() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'wepawao-release-held-posts';
select cron.schedule('wepawao-release-held-posts', '*/10 * * * *', $$select public.release_all_held_posts()$$);

-- Release anything already waiting.
select public.release_all_held_posts();
