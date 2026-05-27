CREATE TABLE public.translations_cache (
  source_hash TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  source_lang TEXT NOT NULL DEFAULT 'de',
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hit_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (source_hash, target_lang)
);

CREATE INDEX idx_translations_cache_target ON public.translations_cache(target_lang);

GRANT SELECT ON public.translations_cache TO anon, authenticated;
GRANT ALL ON public.translations_cache TO service_role;

ALTER TABLE public.translations_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translations_cache_read_all"
  ON public.translations_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);
