
-- ai_learning_events: remove cross-user-leaky SELECT policy; service_role only
DROP POLICY IF EXISTS ai_learning_events_select_own ON public.ai_learning_events;
CREATE POLICY ai_learning_events_no_client_select ON public.ai_learning_events
  FOR SELECT TO anon, authenticated USING (false);

-- agent_config: explicit deny-all for client roles
CREATE POLICY agent_config_no_client_select ON public.agent_config FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY agent_config_no_client_insert ON public.agent_config FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY agent_config_no_client_update ON public.agent_config FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY agent_config_no_client_delete ON public.agent_config FOR DELETE TO anon, authenticated USING (false);

-- analysis_scores: explicit deny-all for client roles
CREATE POLICY analysis_scores_no_client_select ON public.analysis_scores FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY analysis_scores_no_client_insert ON public.analysis_scores FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY analysis_scores_no_client_update ON public.analysis_scores FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY analysis_scores_no_client_delete ON public.analysis_scores FOR DELETE TO anon, authenticated USING (false);

-- memory_quality: explicit deny-all for client roles
CREATE POLICY memory_quality_no_client_select ON public.memory_quality FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY memory_quality_no_client_insert ON public.memory_quality FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY memory_quality_no_client_update ON public.memory_quality FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY memory_quality_no_client_delete ON public.memory_quality FOR DELETE TO anon, authenticated USING (false);
