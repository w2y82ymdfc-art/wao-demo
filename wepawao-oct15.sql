-- Wepawao database update, October 15: tidy-up + AI Moments.
-- Paste ALL of this into Supabase > SQL Editor > New query, then Run. Safe to run more than once.
-- It may warn about "destructive operations": that is expected (it narrows access and replaces the feed function). Nothing is deleted.

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
