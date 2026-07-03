import { NextResponse } from 'next/server';
import { getFootballResults } from '@/lib/altenar/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAY = 86400000;
const dstr = (t) => new Date(t).toISOString().slice(0, 10);

// POST { events: [{ eventId, time }] } → { results: { [eventId]: { hs, as, score, outcome } } }
// Looks up final scores for the given kickoffs; events without a published
// result are simply absent from the response (match not finished / postponed).
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }
  const events = (Array.isArray(body?.events) ? body.events : [])
    .filter((e) => e && e.eventId && Number.isFinite(Date.parse(e.time)))
    .slice(0, 50);
  if (!events.length) return NextResponse.json({ results: {} });

  const wanted = new Set(events.map((e) => String(e.eventId)));
  const times = events.map((e) => Date.parse(e.time));
  const from = Math.min(...times);
  const till = Math.max(...times) + DAY; // a kickoff can finish past midnight UTC
  const results = {};
  try {
    for (let t = from; t <= till; t += 3 * DAY) {
      const map = await getFootballResults(dstr(t), dstr(Math.min(t + 2 * DAY, till)));
      for (const [id, r] of Object.entries(map)) if (wanted.has(id)) results[id] = r;
      if (Object.keys(results).length === wanted.size) break;
    }
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: 'results_unavailable', detail: String((e && e.message) || e) }, { status: 502 });
  }
}
