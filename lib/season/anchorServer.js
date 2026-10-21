import { supabaseAdmin } from '@/lib/supabase/admin';
import { anchorDay } from './anchor.mjs';

// Server-only: read the reward anchor (profiles.first_daily_at, see
// lib/season/anchor.mjs) for one or many players.

/** The player's anchor day or null (no profile, no daily claim yet). Throws on a DB error. */
export async function loadAnchor(uid) {
  const id = Number(uid);
  if (!Number.isSafeInteger(id)) return null;
  const { data, error } = await supabaseAdmin.from('profiles').select('first_daily_at').eq('bwanabet_user_id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return anchorDay(data?.first_daily_at);
}

/** { [userId]: anchorDay } for the players that have one. Throws on a DB error. */
export async function loadAnchors(ids) {
  const out = {};
  const nums = [...new Set((ids || []).map(Number).filter(Number.isSafeInteger))];
  for (let i = 0; i < nums.length; i += 500) {
    const { data, error } = await supabaseAdmin.from('profiles')
      .select('bwanabet_user_id,first_daily_at').in('bwanabet_user_id', nums.slice(i, i + 500)).not('first_daily_at', 'is', null);
    if (error) throw new Error(error.message);
    for (const p of data || []) {
      const d = anchorDay(p.first_daily_at);
      if (d) out[String(p.bwanabet_user_id)] = d;
    }
  }
  return out;
}
