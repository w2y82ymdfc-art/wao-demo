-- Wepawao: who opened a member's shared link (October 16, 2026). Already applied to the Wao project.
-- One row per visitor per member per day. Only visitors who are not signed in are counted.
create table if not exists public.link_visits (
  id bigint generated always as identity primary key,
  ref uuid not null references public.profiles(id) on delete cascade,
  visitor text not null check (char_length(visitor) between 8 and 64),
  source text not null check (source in ('invite', 'post')),
  post_id uuid references public.posts(id) on delete set null,
  day date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  unique (ref, visitor, day)
);
create index if not exists link_visits_ref_idx on public.link_visits (ref, created_at);
alter table public.link_visits enable row level security;
revoke all on public.link_visits from anon, authenticated;

create or replace function public.record_link_visit(p_ref uuid, p_visitor text, p_source text, p_post uuid default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if (select auth.uid()) is not null then return; end if;
  if p_visitor is null or char_length(p_visitor) not between 8 and 64 then return; end if;
  if p_source not in ('invite', 'post') then return; end if;
  if not exists (select 1 from public.profiles where id = p_ref) then return; end if;
  insert into public.link_visits (ref, visitor, source, post_id)
  values (p_ref, p_visitor, p_source,
          case when p_post is not null and exists (select 1 from public.posts where id = p_post) then p_post end)
  on conflict (ref, visitor, day) do nothing;
end $$;
revoke all on function public.record_link_visit(uuid, text, text, uuid) from public;
grant execute on function public.record_link_visit(uuid, text, text, uuid) to anon, authenticated;

create or replace function public.my_link_stats()
returns jsonb language sql stable security definer set search_path to '' as $$
  select case when (select auth.uid()) is null then null else jsonb_build_object(
    'opens', (select count(*) from public.link_visits where ref = (select auth.uid())),
    'opens_week', (select count(*) from public.link_visits where ref = (select auth.uid()) and created_at >= now() - interval '7 days'),
    'visitors', (select count(distinct visitor) from public.link_visits where ref = (select auth.uid())),
    'from_posts', (select count(*) from public.link_visits where ref = (select auth.uid()) and source = 'post'),
    'joined', (select count(*) from public.profiles where referred_by = (select auth.uid()) and id <> (select auth.uid())),
    'since', (select min(created_at) from public.link_visits where ref = (select auth.uid()))
  ) end
$$;
revoke all on function public.my_link_stats() from public, anon;
grant execute on function public.my_link_stats() to authenticated;
