-- 1. ai_memory: add new columns (table already exists)
ALTER TABLE public.ai_memory
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS symbols text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_ai_memory_user_time
  ON public.ai_memory (user_id, created_at DESC);

-- 2. ai_user_profile
CREATE TABLE IF NOT EXISTS public.ai_user_profile (
  user_id uuid PRIMARY KEY,
  risk_level text NOT NULL DEFAULT 'medium',
  investment_style text NOT NULL DEFAULT 'balanced',
  complexity_level text NOT NULL DEFAULT 'medium',
  preferred_response_style text NOT NULL DEFAULT 'analytical',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_user_profile_select_own" ON public.ai_user_profile
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ai_user_profile_insert_own" ON public.ai_user_profile
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_user_profile_update_own" ON public.ai_user_profile
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER ai_user_profile_set_updated_at
  BEFORE UPDATE ON public.ai_user_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. ai_feedback
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id text,
  rating text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_feedback_select_own" ON public.ai_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ai_feedback_insert_own" ON public.ai_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. ai_quant_metrics (public read)
CREATE TABLE IF NOT EXISTS public.ai_quant_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  intrinsic_value numeric,
  margin_of_safety numeric,
  pe_ratio numeric,
  ev_ebitda numeric,
  risk_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_quant_symbol
  ON public.ai_quant_metrics (symbol);

ALTER TABLE public.ai_quant_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_quant_metrics_public_read" ON public.ai_quant_metrics
  FOR SELECT TO anon, authenticated USING (true);

-- 5. ai_market_news (public read)
CREATE TABLE IF NOT EXISTS public.ai_market_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text,
  headline text,
  source text,
  impact_score numeric,
  summary text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_news_symbol
  ON public.ai_market_news (symbol);

ALTER TABLE public.ai_market_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_market_news_public_read" ON public.ai_market_news
  FOR SELECT TO anon, authenticated USING (true);