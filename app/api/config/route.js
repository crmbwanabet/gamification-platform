import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_CONFIG } from '@/lib/config/defaults';
import { mergeConfig } from '@/lib/config/merge.mjs';
import { buildStoreCatalog } from '@/lib/store/catalog.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public, read-only merged config. Failure of any DB read degrades to the
// hardcoded defaults — the dashboard being down must never break players.
export async function GET() {
  let rows = [];
  let items = [];
  if (supabaseAdmin) {
    try {
      const [cfgRes, itemRes] = await Promise.all([
        supabaseAdmin.from('platform_config').select('key,value'),
        supabaseAdmin.from('store_items').select('id,name,descr,price_kwacha,price_gems,price_emeralds,price_rubies,price_diamonds,is_money,redeem_currency,redeem_amount,image_url,stock,featured,is_new,sort')
          .eq('active', true).order('sort', { ascending: true }),
      ]);
      rows = cfgRes.data || [];
      items = itemRes.data || [];
      if (cfgRes.error || itemRes.error) console.error('[api/config] degraded to defaults:', cfgRes.error || itemRes.error);
    } catch (e) { console.error('[api/config] degraded to defaults:', e); }
  }
  const config = mergeConfig(DEFAULT_CONFIG, rows);
  // Redemption rows are priced from the merged economy (coinsPerKwacha +
  // gemValues), exactly as purchase_item charges them. Needs the 2026-10-07
  // gem-currencies migration; before it the select errors and the store
  // degrades to empty (players are never blocked).
  config.storeItems = buildStoreCatalog(items, config.economy);
  return NextResponse.json(config, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
  });
}
