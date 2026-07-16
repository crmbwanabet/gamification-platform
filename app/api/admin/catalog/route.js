import { NextResponse } from 'next/server';
import { MINIGAMES, GAME_ECONOMY } from '@/lib/data/platform';
import { DAILY_MISSION_POOL, WEEKLY_MISSIONS, PERMANENT_MISSIONS } from '@/lib/data/missions';
import { DEFAULT_CONFIG } from '@/lib/config/defaults';

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
    games: MINIGAMES.map(g => ({ id: g.id, name: g.name })),
    missions: [
      ...DAILY_MISSION_POOL.map(m => mission(m, 'daily')),
      ...WEEKLY_MISSIONS.map(m => mission(m, 'weekly')),
      ...PERMANENT_MISSIONS.map(m => mission(m, 'permanent')),
    ],
    defaults: DEFAULT_CONFIG,
    // Pay tables are hand-scaled to this hardcoded cap — remote overrides do
    // nothing until the games derive tables from config. Dashboard: read-only.
    maxWinReadOnly: GAME_ECONOMY.MAX_WIN,
  }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' } });
}
