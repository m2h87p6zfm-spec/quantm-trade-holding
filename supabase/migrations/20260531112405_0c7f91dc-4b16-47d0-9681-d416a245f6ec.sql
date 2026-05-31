ALTER TABLE public.apex_outcomes
  ADD COLUMN IF NOT EXISTS price_after_7d numeric,
  ADD COLUMN IF NOT EXISTS return_7d numeric;