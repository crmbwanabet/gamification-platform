// Server-only Altenar sportsbook client (bwanabet).
// Fetches fixtures + 1X2 odds via the batched /api/v2/multi "graphs.makeQuery"
// GraphQL-over-multi endpoint. Pre-match data is public (no auth needed).
// Browsers can't call this directly (CORS + spoofed Origin/Referer) — server only.

const MULTI_URL = 'https://api.bwanabet.co.zm/api/v2/multi';
const ORIGIN = 'https://bwanabet.co.zm';
const SPORT_FOOTBALL = '501';

async function multiQuery(query, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(MULTI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: ORIGIN,
        Referer: ORIGIN + '/',
      },
      body: JSON.stringify([{ module: 'graphs', method: 'makeQuery', options: { query } }]),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error('altenar_http_' + res.status);
    const arr = await res.json();
    const first = Array.isArray(arr) ? arr[0] : arr;
    if (!first || first.error) throw new Error('altenar_err_' + (first && first.message ? first.message : 'unknown'));
    return first.data;
  } finally {
    clearTimeout(timer);
  }
}

// Pull the 1X2 (home / draw / away) rates out of an event's collections→markets→prices.
function extract1x2(ev) {
  for (const col of ev.collections || []) {
    for (const m of col.markets || []) {
      if (m.marketCode === '1x2' || m.marketId === '1') {
        const p = {};
        for (const pr of m.prices || []) {
          if (pr.blocked || !pr.rate) continue;
          if (pr.priceName === '1') p.h = pr.rate;
          else if (pr.priceName === 'X') p.d = pr.rate;
          else if (pr.priceName === '2') p.a = pr.rate;
        }
        if (p.h && p.d && p.a) return p;
      }
    }
  }
  return null;
}

function splitTeams(name) {
  const parts = String(name || '').split(/\s+(?:V|vs|-)\s+/i);
  return { home: (parts[0] || '').trim(), away: (parts[1] || '').trim() };
}

/**
 * Upcoming football fixtures that have an open 1X2 market, soonest first.
 * Returns [{ id, eventId, league, competitionId, home, away, time(ISO), h, d, a, top }].
 */
export async function getFootballMatches({ limit = 12, pageLimit = 80 } = {}) {
  const query = `mutation{ mainEventList(mainEventListInput:{sportId:"${SPORT_FOOTBALL}", page:1, limit:${pageLimit}}){ eventId } }`;
  const data = await multiQuery(query);
  const sports = (data && data.mainEventList) || [];
  const now = Date.now();
  const out = [];
  for (const sport of sports) {
    for (const comp of sport.competitions || []) {
      for (const ev of comp.events || []) {
        const start = Date.parse(ev.eventStartTime);
        if (!start || start <= now) continue; // upcoming only
        const odds = extract1x2(ev);
        if (!odds) continue;
        const { home, away } = splitTeams(ev.eventName);
        if (!home || !away) continue;
        out.push({
          id: String(ev.eventId),
          eventId: String(ev.eventId),
          league: comp.competitionName || sport.sportName || 'Football',
          competitionId: comp.competitionId ? String(comp.competitionId) : null,
          home,
          away,
          time: ev.eventStartTime,
          h: odds.h,
          d: odds.d,
          a: odds.a,
          top: !!ev.top,
        });
      }
    }
  }
  // Featured (top-league) events first, then soonest kickoff.
  out.sort((x, y) => (y.top - x.top) || (Date.parse(x.time) - Date.parse(y.time)));
  return out.slice(0, limit);
}
