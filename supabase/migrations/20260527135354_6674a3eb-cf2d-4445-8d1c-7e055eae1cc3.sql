CREATE TABLE public.market_context_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX idx_market_context_expires ON public.market_context_cache (expires_at);

GRANT SELECT ON public.market_context_cache TO authenticated;
GRANT ALL  ON public.market_context_cache TO service_role;

ALTER TABLE public.market_context_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read market context cache"
ON public.market_context_cache
FOR SELECT
TO authenticated
USING (true);
-- No INSERT/UPDATE/DELETE policies for authenticated → writes only via service_role.