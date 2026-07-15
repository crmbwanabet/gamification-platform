import { NextResponse } from 'next/server';
import { getFootballMatches } from '@/lib/altenar/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Small in-memory cache so we don't hammer the sportsbook on every open.
let cache = { at: 0, data: null };
const TTL = 120000; // 2 min

export async function GET() {
  if (cache.data && Date.now() - cache.at < TTL) {
    return NextResponse.json({ matches: cache.data, cached: true });
  }
  try {
    const matches = await getFootballMatches({ limit: 12 });
    cache = { at: Date.now(), data: matches };
    return NextResponse.json({ matches });
  } catch (e) {
    if (cache.data) return NextResponse.json({ matches: cache.data, stale: true });
    return NextResponse.json({ error: 'matches_unavailable', detail: String((e && e.message) || e) }, { status: 502 });
  }
}
