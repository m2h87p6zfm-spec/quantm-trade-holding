
-- ai_learning_events: explicit deny INSERT/DELETE for anon/authenticated.
-- Writes happen exclusively via service_role (RLS bypassed).
DROP POLICY IF EXISTS ai_learning_events_no_client_insert ON public.ai_learning_events;
DROP POLICY IF EXISTS ai_learning_events_no_client_delete ON public.ai_learning_events;
DROP POLICY IF EXISTS ai_learning_events_no_client_update ON public.ai_learning_events;

CREATE POLICY ai_learning_events_no_client_insert
  ON public.ai_learning_events FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY ai_learning_events_no_client_delete
  ON public.ai_learning_events FOR DELETE TO anon, authenticated
  USING (false);

CREATE POLICY ai_learning_events_no_client_update
  ON public.ai_learning_events FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

-- self_healing_logs: remove NULL user_id loophole. Authenticated users may
-- only insert rows attributed to themselves; service_role handles system logs.
DROP POLICY IF EXISTS shl_insert_own ON public.self_healing_logs;

CREATE POLICY shl_insert_own
  ON public.self_healing_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
