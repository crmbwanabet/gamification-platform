import { NextResponse } from 'next/server';
import { MINIGAMES, GAME_ECONOMY } from '@/lib/data/platform';
import { CASINO_MISSIONS } from '@/lib/data/missions';
import { DEFAULT_CONFIG } from '@/lib/config/defaults';
import { RTP_MIN, RTP_MAX } from '@/lib/rtp.mjs';

export const runtime = 'nodejs';

// Admin-dashboard catalog: the CODE-DEFINED entities the dashboard can
// override (missions/games) plus the hardcoded defaults. All of this already
// ships in the player bundle — nothing secret. Build-time constant → static.
const mission = (m, pool) => ({
  id: m.id, name: m.name, desc: m.desc, pool, difficulty: m.difficulty,
  target: m.target, type: m.type, gameId: m.gameId || null, reward: m.reward, xp: m.xp,
});

export async function GET() {
  return NextResponse.json({
    // Every candy game carries an editable RTP: the dashboard saves it into the
    // `games` platform_config row as { <id>: { rtp } } (clamped to 97–99%).
    games: MINIGAMES.map(g => ({ id: g.id, name: g.name, ...(DEFAULT_CONFIG.games[g.id]?.rtp != null && { rtp: { default: DEFAULT_CONFIG.games[g.id].rtp, min: RTP_MIN, max: RTP_MAX } }) })),
    // The 4 daily casino-round missions (2026-10-07; the old daily/weekly/
    // permanent pools are parked). mission_overrides keys = these ids.
    missions: CASINO_MISSIONS.map(m => mission(m, 'daily')),
    defaults: DEFAULT_CONFIG,
    // Pay tables are hand-scaled to this hardcoded cap — remote overrides do
    // nothing until the games derive tables from config. Dashboard: read-only.
    maxWinReadOnly: GAME_ECONOMY.MAX_WIN,
  }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' } });
}
