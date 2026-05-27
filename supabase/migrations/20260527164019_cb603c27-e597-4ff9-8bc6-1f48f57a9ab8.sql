
CREATE TABLE public.scan_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_key text NOT NULL,
  universe text NOT NULL,
  sector text NOT NULL,
  region text NOT NULL,
  total_scanned integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  picks_count integer NOT NULL DEFAULT 0,
  preserved boolean NOT NULL DEFAULT false,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scan_history_scanned_at ON public.scan_history (scanned_at DESC);
CREATE INDEX idx_scan_history_scope_key ON public.scan_history (scope_key, scanned_at DESC);

GRANT SELECT ON public.scan_history TO anon, authenticated;
GRANT ALL ON public.scan_history TO service_role;

ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scan_history_public_read"
ON public.scan_history
FOR SELECT
TO anon, authenticated
USING (true);
