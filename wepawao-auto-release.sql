-- Wepawao: moments held back by the 3-a-day limit go public by themselves (October 2026).
-- Paste all of this into Supabase > SQL Editor > New query, then Run. Safe to run more than once.

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
