-- Wepawao provider bank + La Cara Wepawao (Wepawao Face Challenge).
-- Paste all of this into Supabase > SQL Editor > New query, then tap Run. Safe to run more than once.

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
