
CREATE TABLE public.user_portfolio_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  symbol text NOT NULL,
  qty numeric NOT NULL,
  entry numeric NOT NULL,
  side text NOT NULL CHECK (side IN ('LONG','SHORT')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  broker_current_price numeric,
  broker_current_value numeric,
  broker_invested numeric,
  broker_pnl_abs numeric,
  broker_pnl_pct numeric,
  broker_currency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

CREATE INDEX idx_upp_user ON public.user_portfolio_positions(user_id);

ALTER TABLE public.user_portfolio_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "upp_select_own" ON public.user_portfolio_positions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "upp_insert_own" ON public.user_portfolio_positions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "upp_update_own" ON public.user_portfolio_positions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "upp_delete_own" ON public.user_portfolio_positions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_upp_updated_at
  BEFORE UPDATE ON public.user_portfolio_positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
