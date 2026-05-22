-- APEX Track Record: anonymized analyses + outcome tracking

CREATE TABLE public.apex_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  name text NOT NULL,
  sector text,
  asset_type text NOT NULL DEFAULT 'Aktie',
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  verdict text NOT NULL,
  confidence_score numeric NOT NULL,
  price_at_analysis numeric NOT NULL,
  indicators jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT apex_verdict_chk CHECK (verdict IN ('KAUF','HALTEN','VERKAUFEN')),
  CONSTRAINT apex_asset_chk CHECK (asset_type IN ('Aktie','ETF'))
);

CREATE INDEX apex_analyses_analyzed_at_idx ON public.apex_analyses (analyzed_at DESC);
CREATE INDEX apex_analyses_ticker_idx ON public.apex_analyses (ticker);
CREATE INDEX apex_analyses_sector_idx ON public.apex_analyses (sector);
CREATE INDEX apex_analyses_verdict_idx ON public.apex_analyses (verdict);

ALTER TABLE public.apex_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY apex_analyses_public_read ON public.apex_analyses
  FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.apex_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL UNIQUE REFERENCES public.apex_analyses(id) ON DELETE CASCADE,
  price_after_30d numeric,
  price_after_60d numeric,
  price_after_90d numeric,
  return_30d numeric,
  return_60d numeric,
  return_90d numeric,
  is_correct boolean,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX apex_outcomes_analysis_id_idx ON public.apex_outcomes (analysis_id);
CREATE INDEX apex_outcomes_is_correct_idx ON public.apex_outcomes (is_correct);

ALTER TABLE public.apex_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY apex_outcomes_public_read ON public.apex_outcomes
  FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER apex_outcomes_updated_at
  BEFORE UPDATE ON public.apex_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
