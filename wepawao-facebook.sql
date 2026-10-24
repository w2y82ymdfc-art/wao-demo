-- "Also post on Facebook": each business can keep the link to its own Facebook Page.
-- After an event is posted on Wepawao, the owner or a manager taps one button: the post text and
-- the event link are copied, and the business's Facebook Page opens so they paste it there.
-- No Meta app or approval is involved. Owners and managers can already update vip_lists
-- (policy vip_lists_update in wepawao-managers.sql), so they can save this link too.

alter table public.vip_lists add column if not exists facebook_url text;

alter table public.vip_lists drop constraint if exists vip_lists_facebook_url_check;
alter table public.vip_lists add constraint vip_lists_facebook_url_check
  check (facebook_url is null or (length(facebook_url) <= 300 and facebook_url ~* '^https://([a-z0-9-]+\.)?(facebook\.com|fb\.com|fb\.me)/'));
