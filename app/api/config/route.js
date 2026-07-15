import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_CONFIG } from '@/lib/config/defaults';
import { mergeConfig } from '@/lib/config/merge.mjs';

export const runtime = 'nodejs';

// Public, read-only merged config. Failure of any DB read degrades to the
// hardcoded defaults — the dashboard being down must never break players.
export async function GET() {
  let rows = [];
  let items = [];
  if (supabaseAdmin) {
    try {
      const [cfgRes, itemRes] = await Promise.all([
        supabaseAdmin.from('platform_config').select('key,value'),
        supabaseAdmin.from('store_items').select('id,name,descr,price_kwacha,price_gems,image_url,stock,featured,is_new,sort')
          .eq('active', true).order('sort', { ascending: true }),
      ]);
      rows = cfgRes.data || [];
      items = itemRes.data || [];
    } catch (e) { /* defaults */ }
  }
  const config = mergeConfig(DEFAULT_CONFIG, rows);
  config.storeItems = items
    .filter(i => i.stock === null || i.stock > 0)
    .map(i => ({
      id: i.id, name: i.name, desc: i.descr,
      price: { kwacha: i.price_kwacha, ...(i.price_gems ? { gems: i.price_gems } : {}) },
      imageUrl: i.image_url || null, featured: i.featured, isNew: i.is_new,
    }));
  return NextResponse.json(config, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
  });
}
