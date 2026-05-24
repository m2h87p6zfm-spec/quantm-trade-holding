
-- Tabelle 1: causal_events
CREATE TABLE public.causal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  event_date date NOT NULL,
  event_type text NOT NULL,
  event_description text NOT NULL,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT causal_events_type_check CHECK (event_type IN (
    'government_contract','earnings_beat','earnings_miss','insider_buy','insider_sell',
    'government_investment','partnership_announcement','product_launch',
    'regulatory_approval','regulatory_rejection','analyst_upgrade','analyst_downgrade',
    'macro_interest_rate_change','macro_geopolitical','sentiment_spike_positive','sentiment_spike_negative'
  )),
  CONSTRAINT causal_events_desc_len CHECK (char_length(event_description) <= 500)
);
CREATE INDEX idx_causal_events_ticker_date ON public.causal_events(ticker, event_date DESC);
CREATE INDEX idx_causal_events_ticker_type ON public.causal_events(ticker, event_type);
ALTER TABLE public.causal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY causal_events_public_read ON public.causal_events FOR SELECT TO anon, authenticated USING (true);

-- Tabelle 2: causal_outcomes
CREATE TABLE public.causal_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.causal_events(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  price_at_event numeric(10,4) NOT NULL,
  price_after_3d numeric(10,4),
  price_after_7d numeric(10,4),
  price_after_14d numeric(10,4),
  price_after_30d numeric(10,4),
  price_after_90d numeric(10,4),
  return_3d numeric(10,4),
  return_7d numeric(10,4),
  return_14d numeric(10,4),
  return_30d numeric(10,4),
  return_90d numeric(10,4),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_causal_outcomes_event ON public.causal_outcomes(event_id);
CREATE INDEX idx_causal_outcomes_ticker ON public.causal_outcomes(ticker);
CREATE INDEX idx_causal_outcomes_pending ON public.causal_outcomes(event_id) WHERE price_after_3d IS NULL;
ALTER TABLE public.causal_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY causal_outcomes_public_read ON public.causal_outcomes FOR SELECT TO anon, authenticated USING (true);

-- Tabelle 3: causal_patterns
CREATE TABLE public.causal_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  event_type text NOT NULL,
  total_occurrences integer NOT NULL DEFAULT 0,
  positive_outcomes_3d integer NOT NULL DEFAULT 0,
  positive_outcomes_7d integer NOT NULL DEFAULT 0,
  positive_outcomes_14d integer NOT NULL DEFAULT 0,
  positive_outcomes_30d integer NOT NULL DEFAULT 0,
  positive_outcomes_90d integer NOT NULL DEFAULT 0,
  avg_return_3d numeric(10,4) NOT NULL DEFAULT 0,
  avg_return_7d numeric(10,4) NOT NULL DEFAULT 0,
  avg_return_14d numeric(10,4) NOT NULL DEFAULT 0,
  avg_return_30d numeric(10,4) NOT NULL DEFAULT 0,
  avg_return_90d numeric(10,4) NOT NULL DEFAULT 0,
  repeatability_score numeric(5,2) NOT NULL DEFAULT 0,
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT causal_patterns_unique UNIQUE (ticker, event_type)
);
CREATE INDEX idx_causal_patterns_ticker ON public.causal_patterns(ticker);
ALTER TABLE public.causal_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY causal_patterns_public_read ON public.causal_patterns FOR SELECT TO anon, authenticated USING (true);

-- Tabelle 4: causal_analysis_results
CREATE TABLE public.causal_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  current_events_detected jsonb NOT NULL DEFAULT '[]'::jsonb,
  patterns_applied jsonb NOT NULL DEFAULT '[]'::jsonb,
  causal_score numeric(5,2) NOT NULL DEFAULT 0,
  repeatability_score numeric(5,2) NOT NULL DEFAULT 0,
  causal_verdict text NOT NULL,
  summary_text text NOT NULL DEFAULT '',
  CONSTRAINT causal_results_verdict_check CHECK (causal_verdict IN (
    'STARK_KAUSAL','MODERAT_KAUSAL','SCHWACH_KAUSAL','KEINE_DATEN'
  ))
);
CREATE INDEX idx_causal_results_ticker ON public.causal_analysis_results(ticker, analyzed_at DESC);
ALTER TABLE public.causal_analysis_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY causal_results_public_read ON public.causal_analysis_results FOR SELECT TO anon, authenticated USING (true);
