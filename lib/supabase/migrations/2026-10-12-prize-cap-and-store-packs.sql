-- ============================================================================
-- 2026-10-12 — World Cup prize outside the weekly cap + gem redemptions off
-- ============================================================================
-- 1. The weekly money cap (ONE is_money purchase per rolling 7 days) ignores
--    World Cup prize rows (prize_key set), so a K10,000 prize never blocks a
--    kwacha pack purchase that week. Patched in place on the LIVE function
--    (pg_get_functiondef) so nothing else in purchase_item changes; it fails
--    loudly if the expected clause isn't there exactly once. CREATE OR REPLACE
--    keeps the existing grants/revokes.
-- 2. "Redeem for kwacha" is gone from the Store (user decision 2026-10-12):
--    coins -> kwacha only through the K1..K50 packs, which stay active. The
--    gem redemption rows are deactivated (rows kept; set active = true to
--    bring them back).
do $$
declare
  f   text := pg_get_functiondef('public.purchase_item(text,uuid)'::regprocedure);
  old text := E'and status <> ''rejected''\n';
  n   int;
begin
  n := (length(f) - length(replace(f, old, ''))) / length(old);
  if n <> 1 then
    raise exception 'purchase_item: expected the weekly-cap clause once, found %', n;
  end if;
  execute replace(f, old, E'and status <> ''rejected''\n         and prize_key is null\n');
end $$;

update public.store_items set active = false
 where redeem_currency in ('emeralds', 'rubies', 'diamonds');
