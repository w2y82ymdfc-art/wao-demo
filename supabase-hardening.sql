-- Wepawao: database tidy-up from Supabase's security and performance checks (October 2026).
-- Paste all of this into Supabase > SQL Editor > New query, then Run. Safe to run more than once.
-- It deletes nothing: it only narrows who can call some functions and adds a few indexes.

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
