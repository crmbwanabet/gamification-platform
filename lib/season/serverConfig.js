import { supabaseAdmin } from '@/lib/supabase/admin';
import { cleanSeasonConfig, seasonDefaults } from './config.mjs';

// Server-only: the season numbers as the client sees them (defaults merged
// with the `season` platform_config row, validated by cleanSeasonConfig).
// Any failure degrades to the defaults.
export async function loadSeasonConfig() {
  if (!supabaseAdmin) return seasonDefaults();
  try {
    const { data, error } = await supabaseAdmin.from('platform_config').select('value').eq('key', 'season').maybeSingle();
    if (error) return seasonDefaults();
    return cleanSeasonConfig(data?.value);
  } catch {
    return seasonDefaults();
  }
}

export const prizeKey = (cfg) => `worldcup:${cfg.id}`;
