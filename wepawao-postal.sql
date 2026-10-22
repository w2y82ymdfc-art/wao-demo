-- Wepawao postal frames (October 22, 2026). Run once in Supabase: SQL Editor > New query > paste > Run.
-- Adds an optional "postal" to moments ('morro' = the El Morro art) and returns it in the feed.
-- Existing moments are untouched (no postal). The app shows the postal option only after this runs.
alter table public.posts add column if not exists postal text check (postal in ('morro'));

drop function if exists public.get_feed(post_kind, text, double precision, double precision, double precision, timestamptz, uuid, integer, boolean);
create function public.get_feed(p_kind post_kind DEFAULT NULL, p_category text DEFAULT NULL, p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL, p_radius_km double precision DEFAULT NULL, p_before_created_at timestamptz DEFAULT NULL, p_before_id uuid DEFAULT NULL, p_limit integer DEFAULT 20, p_ai boolean DEFAULT NULL)
 RETURNS TABLE(id uuid, user_id uuid, author_username text, author_display_name text, author_avatar_url text, kind post_kind, category text, title text, body text, price_cents integer, currency character, location_text text, distance_km double precision, image_path text, image_paths text[], caricature_image_url text, listing_type text, expires_at timestamptz, created_at timestamptz, edited_at timestamptz, visibility text, public_block_reason text, ai_moment boolean, ai_prompt text, ai_tool text, postal text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
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
    p.ai_moment, p.ai_prompt, p.ai_tool, p.postal
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
revoke all on function public.get_feed(post_kind, text, double precision, double precision, double precision, timestamptz, uuid, integer, boolean) from public;
grant execute on function public.get_feed(post_kind, text, double precision, double precision, double precision, timestamptz, uuid, integer, boolean) to anon, authenticated;
