-- Wepawao: the "Wao!" button (October 2026).
-- Paste all of this into Supabase > SQL Editor > New query, then Run. Safe to run more than once.
-- Members tap Wao! on other people's posts. Each member sees only their own Wao!s,
-- and the count of Wao!s on their own posts. Nobody else sees the numbers.

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
