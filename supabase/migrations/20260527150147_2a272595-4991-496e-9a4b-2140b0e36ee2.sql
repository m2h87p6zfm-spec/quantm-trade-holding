CREATE TABLE public.picks_cache (
  scope_key text PRIMARY KEY,
  universe text NOT NULL,
  sector text NOT NULL,
  region text NOT NULL,
  picks jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_scanned integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.picks_cache TO anon;
GRANT SELECT ON public.picks_cache TO authenticated;
GRANT ALL ON public.picks_cache TO service_role;

ALTER TABLE public.picks_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Picks cache is publicly readable"
ON public.picks_cache
FOR SELECT
USING (true);

CREATE INDEX idx_picks_cache_scanned_at ON public.picks_cache (scanned_at DESC);