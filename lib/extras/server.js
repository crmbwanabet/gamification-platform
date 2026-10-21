import { supabaseAdmin } from '@/lib/supabase/admin';
import { weeklyXpByUser, rankBoard } from './rules.mjs';
import { validateName } from '@/lib/profile/name.mjs';
import { rowsFromAnchors } from '@/lib/season/anchor.mjs';
import { loadAnchors } from '@/lib/season/anchorServer';

// Server-only helpers for the extras routes. Leaderboards are computed from
// player_activity (CRM rows) for one Lusaka week and cached in memory for a
// minute per week, so a busy hour costs one scan per instance per minute.

const PAGE = 1000;
const MAX_PAGES = 100; // 100k rows a week; beyond that the board needs a SQL view
const cache = new Map();

async function weekRows(from, to) {
  const rows = [];
  for (let p = 0; p < MAX_PAGES; p++) {
    const { data, error } = await supabaseAdmin
      .from('player_activity')
      .select('user_id,day,deposits_amount,deposits_count,withdrawals_amount,casino_stake,casino_rounds,sports_stake,sports_slips')
      .gte('day', from).lte('day', to)
      .order('user_id', { ascending: true }).order('day', { ascending: true })
      .range(p * PAGE, p * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/** { [userId]: { xp, name } } from profiles (saved total XP decides the band; names pass the obscenity check). */
async function profilesFor(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500).map(Number).filter(Number.isSafeInteger);
    if (!chunk.length) continue;
    const { data, error } = await supabaseAdmin.from('profiles').select('bwanabet_user_id,xp,state').in('bwanabet_user_id', chunk);
    if (error) throw new Error(error.message);
    for (const p of data || []) {
      const v = validateName(p.state?.displayName);
      out[String(p.bwanabet_user_id)] = { xp: Number(p.xp) || 0, name: v.ok ? v.name : null };
    }
  }
  return out;
}

/** Ranked bands for the week from..to (inclusive). Throws when the tables are unavailable. */
export async function boardFor(from, to, cfg) {
  const key = `${from}:${to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60000) return hit.data;
  // Only activity from each player's first daily reward claim on counts
  // (lib/season/anchor.mjs); players who never claimed one are not ranked.
  const rows = await weekRows(from, to);
  const anchors = await loadAnchors(rows.map(r => r.user_id));
  const xpBy = weeklyXpByUser(rowsFromAnchors(rows, anchors), cfg);
  const ids = Object.keys(xpBy).filter(id => xpBy[id] > 0);
  const prof = await profilesFor(ids);
  // stable order before ranking: whoever reached the XP first can't be known
  // from daily rows, so ties fall back to the player id
  const entries = ids.sort().map(id => ({ userId: id, xp: xpBy[id], totalXp: Math.max(prof[id]?.xp || 0, xpBy[id]), name: prof[id]?.name || null }));
  const data = rankBoard(entries);
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 8) cache.delete(cache.keys().next().value);
  return data;
}

/** The player's row in a board: { band, rank, xp } or null. */
export function findMe(bands, uid) {
  for (const [band, list] of Object.entries(bands)) {
    const r = list.find(x => x.userId === uid);
    if (r) return { band, rank: r.rank, xp: r.xp };
  }
  return null;
}
