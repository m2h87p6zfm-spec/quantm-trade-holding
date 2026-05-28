
-- Explicit deny-write policies for tables that are public-read but server-write only.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'ai_market_news',
    'ai_quant_metrics',
    'apex_analyses',
    'apex_outcomes',
    'ai_outcomes',
    'causal_analysis_results',
    'causal_events',
    'causal_outcomes',
    'causal_patterns',
    'market_context_cache',
    'picks_cache',
    'scan_history',
    'translations_cache'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_no_client_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_no_client_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_no_client_delete', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (false)',
      t || '_no_client_insert', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false)',
      t || '_no_client_update', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO anon, authenticated USING (false)',
      t || '_no_client_delete', t
    );
  END LOOP;
END $$;
