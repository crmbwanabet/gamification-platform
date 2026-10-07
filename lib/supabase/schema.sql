-- ============================================================================
-- 100xBet Gamification Platform - Supabase Schema
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_emoji TEXT DEFAULT '😎',
  
  -- Currency
  kwacha INTEGER DEFAULT 500,
  gems INTEGER DEFAULT 10,
  diamonds INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  
  -- Stats
  total_deposits INTEGER DEFAULT 0,
  total_bets INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  
  -- Daily rewards
  daily_streak INTEGER DEFAULT 1,
  daily_day INTEGER DEFAULT 1,
  daily_claimed_at DATE,
  
  -- Game plays remaining (reset daily)
  wheel_plays INTEGER DEFAULT 3,
  scratch_plays INTEGER DEFAULT 5,
  dice_plays INTEGER DEFAULT 5,
  memory_plays INTEGER DEFAULT 3,
  highlow_plays INTEGER DEFAULT 5,
  plays_reset_at DATE DEFAULT CURRENT_DATE,
  
  -- Referrals
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  referral_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MISSIONS TABLE
-- ============================================================================
CREATE TABLE public.missions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target INTEGER DEFAULT 1,
  reward_kwacha INTEGER DEFAULT 0,
  reward_gems INTEGER DEFAULT 0,
  reward_xp INTEGER DEFAULT 0,
  image_key TEXT,
  is_hot BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default missions
INSERT INTO public.missions (id, name, description, target, reward_kwacha, reward_gems, reward_xp, image_key, is_hot) VALUES
  ('retail', 'Retail Therapy', 'Make a purchase in the store', 1, 50, 0, 25, 'shoppingBags', false),
  ('deposit', 'Time to Deposit!', 'Make a deposit', 1, 100, 5, 50, 'creditCards', true),
  ('firstBet', 'Place Your Bet', 'Place your first bet', 1, 30, 0, 15, 'betMission', false),
  ('bet10', 'Regular Player', 'Place 10 bets', 10, 75, 0, 40, 'betMission', false),
  ('win5', 'Winner Winner!', 'Win 5 bets', 5, 150, 10, 60, 'winTrophy', true),
  ('spinWheel', 'Lucky Spinner', 'Spin the wheel 3 times', 3, 50, 0, 30, 'wheel', false);

-- ============================================================================
-- USER MISSION PROGRESS
-- ============================================================================
CREATE TABLE public.user_missions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id TEXT REFERENCES public.missions(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

-- ============================================================================
-- GAME HISTORY
-- ============================================================================
CREATE TABLE public.game_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL, -- 'wheel', 'scratch', 'dice', 'memory', 'highlow'
  result JSONB, -- { prize: {...}, outcome: '...' }
  kwacha_won INTEGER DEFAULT 0,
  gems_won INTEGER DEFAULT 0,
  diamonds_won INTEGER DEFAULT 0,
  xp_won INTEGER DEFAULT 0,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PREDICTIONS
-- ============================================================================
CREATE TABLE public.matches (
  id TEXT PRIMARY KEY,
  league TEXT NOT NULL,
  flag TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_odds DECIMAL(5,2),
  draw_odds DECIMAL(5,2),
  away_odds DECIMAL(5,2),
  match_date TIMESTAMP WITH TIME ZONE,
  reward INTEGER DEFAULT 50,
  is_featured BOOLEAN DEFAULT FALSE,
  result TEXT, -- 'home', 'draw', 'away', NULL if not finished
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.predictions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id TEXT REFERENCES public.matches(id) ON DELETE CASCADE,
  prediction TEXT NOT NULL, -- 'home', 'draw', 'away'
  is_correct BOOLEAN,
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- ============================================================================
-- STORE PURCHASES
-- ============================================================================
CREATE TABLE public.store_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_kwacha INTEGER DEFAULT 0,
  price_gems INTEGER DEFAULT 0,
  image_key TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  stock INTEGER, -- NULL = unlimited
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed store items
INSERT INTO public.store_items (id, name, description, price_kwacha, price_gems, image_key, is_featured, is_new) VALUES
  ('viking', '75 Free Spins - Vikings', 'Vikings Go to Hell slot', 500, 0, 'vikingSpins', true, false),
  ('spins50', '50 Free Spins', 'Any slot game', 300, 0, 'slotMachine', false, false),
  ('freeBet20', 'K20 Free Bet', 'No wagering required', 200, 0, 'freeBets', false, false),
  ('mystery', 'Mystery Box', 'Random premium reward!', 400, 10, 'mysteryBox', false, true),
  ('hoodie', '100xBet Hoodie', 'Limited edition', 1200, 30, 'hoodie1', true, false);

CREATE TABLE public.purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES public.store_items(id),
  kwacha_spent INTEGER DEFAULT 0,
  gems_spent INTEGER DEFAULT 0,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TRANSACTIONS LOG (for auditing)
-- ============================================================================
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'game_win', 'daily_reward', 'mission_complete', 'purchase', 'referral', 'deposit'
  kwacha_change INTEGER DEFAULT 0,
  gems_change INTEGER DEFAULT 0,
  diamonds_change INTEGER DEFAULT 0,
  xp_change INTEGER DEFAULT 0,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- LEADERBOARD VIEW
-- ============================================================================
CREATE VIEW public.leaderboard AS
SELECT 
  id,
  username,
  avatar_emoji,
  kwacha,
  xp,
  RANK() OVER (ORDER BY kwacha DESC) as rank
FROM public.profiles
ORDER BY kwacha DESC
LIMIT 100;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User missions: Users can only access their own
CREATE POLICY "Users can view own missions" ON public.user_missions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own missions" ON public.user_missions
  FOR ALL USING (auth.uid() = user_id);

-- Game history: Users can only view their own
CREATE POLICY "Users can view own game history" ON public.game_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game history" ON public.game_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Predictions: Users can view and create their own
CREATE POLICY "Users can view own predictions" ON public.predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own predictions" ON public.predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Purchases: Users can view their own
CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can make purchases" ON public.purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions: Users can view their own
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Public tables (everyone can read)
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Missions are viewable by everyone" ON public.missions
  FOR SELECT USING (true);

CREATE POLICY "Matches are viewable by everyone" ON public.matches
  FOR SELECT USING (true);

CREATE POLICY "Store items are viewable by everyone" ON public.store_items
  FOR SELECT USING (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Player' || substr(NEW.id::text, 1, 6)),
    UPPER(substr(md5(NEW.id::text), 1, 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Reset daily game plays (call this via cron job or edge function)
CREATE OR REPLACE FUNCTION public.reset_daily_plays()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    wheel_plays = 3,
    scratch_plays = 5,
    dice_plays = 5,
    memory_plays = 3,
    highlow_plays = 5,
    plays_reset_at = CURRENT_DATE
  WHERE plays_reset_at < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX idx_game_history_user_id ON public.game_history(user_id);
CREATE INDEX idx_game_history_played_at ON public.game_history(played_at DESC);
CREATE INDEX idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);

-- ============================================================================
-- CASINO ACTIVITY (LIVE, 2026-10-07) — CRM-fed casino rounds per player/day
-- ============================================================================
-- Unlike the blueprint tables above, this one is real: applied from
-- lib/supabase/migrations/2026-10-07-casino-activity.sql. Service-role only
-- (RLS on, no policies). Written by POST /api/activity/casino-rounds through
-- upsert_casino_rounds(jsonb) (max-wins, idempotent); read by
-- GET /api/missions/progress. `day` = Africa/Lusaka date (UTC+2).
CREATE TABLE IF NOT EXISTS public.casino_activity (
  user_id TEXT NOT NULL,                       -- bwanabet user id
  day DATE NOT NULL,                           -- Lusaka calendar date
  rounds INTEGER NOT NULL DEFAULT 0 CHECK (rounds >= 0), -- absolute daily total
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS casino_activity_day_idx ON public.casino_activity (day);
ALTER TABLE public.casino_activity ENABLE ROW LEVEL SECURITY;
-- upsert_casino_rounds(p_rows jsonb) returns int: insert ... on conflict
-- (user_id, day) do update set rounds = greatest(stored, incoming); execute
-- granted to service_role only. Full definition in the migration file.
