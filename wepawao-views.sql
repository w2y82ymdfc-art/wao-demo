-- Wepawao views and "Wepawao in numbers" (October 21, 2026). Already applied to the Wao project.
-- A view = a moment or VIP message on screen about a second, or a menu opened (api/m.js).
-- One row per viewer per item per day. Members are counted by account ('u:<id>'), visitors by a
-- random device id ('v:<id>'). The owner's own views never count. Only counts are ever shown.
create table if not exists public.views (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('menu', 'vip', 'moment')),
  target uuid not null,                      -- vip_lists.id (menu), vip_messages.id (vip), posts.id (moment)
  list_id uuid references public.vip_lists(id) on delete cascade,
  viewer text not null check (char_length(viewer) between 8 and 70),
  day date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  unique (kind, target, viewer, day)
);
-- Plus: record_view(kind, target, visitor) for anon + authenticated;
-- business_view_stats(list) for the list's owner (menu views by day for 30 days, views per VIP message);
-- community_view_stats() for everyone (weekly views by kind and members, up to 12 weeks).
-- Full definitions: Supabase migrations wepawao_views and wepawao_views_weeks_from_start.
