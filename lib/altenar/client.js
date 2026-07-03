// Server-only Altenar sportsbook client (bwanabet).
// Fetches TOP-league football fixtures + 1X2 odds via the batched /api/v2/multi
// "graphs.makeQuery" GraphQL-over-multi endpoint. Pre-match data is public (no
// auth). Browsers can't call this directly (CORS + spoofed Origin/Referer).

const MULTI_URL = 'https://api.bwanabet.co.zm/api/v2/multi';
const ORIGIN = 'https://bwanabet.co.zm';
const SPORT_FOOTBALL = '501';

async function multiQuery(query, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(MULTI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: ORIGIN, Referer: ORIGIN + '/' },
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

// 1X2 (home / draw / away) rates from an event's collections→markets→prices.
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

const CACHE = { leagues: { at: 0, data: null }, matches: { at: 0, data: null } };

// The operator's curated top football leagues (country + exact competition name).
async function getTopFootballLeagues() {
  if (CACHE.leagues.data && Date.now() - CACHE.leagues.at < 600000) return CACHE.leagues.data;
  const data = await multiQuery('mutation{ topLeagueList{ competitionId competitionName country sportId priority } }');
  const list = ((data && data.topLeagueList) || [])
    .filter((l) => String(l.sportId) === SPORT_FOOTBALL && l.country && l.competitionName)
    .map((l) => ({ country: l.country, competitionName: l.competitionName, competitionId: String(l.competitionId), priority: l.priority || 0 }));
  CACHE.leagues = { at: Date.now(), data: list };
  return list;
}

// Upcoming fixtures (with 1X2 odds) for one league.
async function getLeagueEvents(country, competitionName) {
  const q = `mutation{ eventList(eventListInput:{ sportId: ${SPORT_FOOTBALL}, markets: ["1x2"], topEvents: false, country: ${JSON.stringify(country)}, competitionName: ${JSON.stringify(competitionName)} }){ competitions{ competitionId country competitionName events{ eventId eventName eventStartTime top collections{ markets{ marketCode prices{ priceName rate blocked } } } } } } }`;
  const data = await multiQuery(q);
  const out = [];
  for (const item of (data && data.eventList) || []) {
    for (const c of item.competitions || []) {
      for (const e of c.events || []) out.push({ ev: e, competitionName: c.competitionName, competitionId: c.competitionId });
    }
  }
  return out;
}

/**
 * Upcoming TOP-league football fixtures with an open 1X2 market, soonest first.
 * Returns [{ id, eventId, league, competitionId, home, away, time(ISO), h, d, a, top }].
 */
export async function getFootballMatches({ limit = 12 } = {}) {
  if (CACHE.matches.data && Date.now() - CACHE.matches.at < 120000) return CACHE.matches.data;
  const leagues = await getTopFootballLeagues();
  const settled = await Promise.allSettled(leagues.map((l) => getLeagueEvents(l.country, l.competitionName)));
  const now = Date.now();
  const out = [];
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    for (const { ev, competitionName, competitionId } of r.value) {
      const start = Date.parse(ev.eventStartTime);
      if (!start || start <= now) continue; // upcoming only
      const odds = extract1x2(ev);
      if (!odds) continue;
      const { home, away } = splitTeams(ev.eventName);
      if (!home || !away) continue;
      out.push({
        id: String(ev.eventId),
        eventId: String(ev.eventId),
        league: competitionName,
        competitionId: competitionId ? String(competitionId) : null,
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
  out.sort((x, y) => Date.parse(x.time) - Date.parse(y.time));
  const sliced = out.slice(0, limit);
  CACHE.matches = { at: Date.now(), data: sliced };
  return sliced;
}
