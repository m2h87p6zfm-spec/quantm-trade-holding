
-- agent_config: lock down completely (server-only)
ALTER TABLE public.agent_config ENABLE ROW LEVEL SECURITY;

-- analysis_scores: lock down (server-only)
ALTER TABLE public.analysis_scores ENABLE ROW LEVEL SECURITY;

-- memory_quality: lock down (server-only)
ALTER TABLE public.memory_quality ENABLE ROW LEVEL SECURITY;

-- chat_sessions (user_id is text)
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_sessions_select_own" ON public.chat_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "chat_sessions_insert_own" ON public.chat_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "chat_sessions_update_own" ON public.chat_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "chat_sessions_delete_own" ON public.chat_sessions
  FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- chat_messages: gated via session ownership
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_select_via_session" ON public.chat_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()::text
    )
  );
CREATE POLICY "chat_messages_insert_via_session" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()::text
    )
  );
CREATE POLICY "chat_messages_delete_via_session" ON public.chat_messages
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()::text
    )
  );

-- conversation_summaries (user_id text)
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_sum_select_own" ON public.conversation_summaries
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "conv_sum_insert_own" ON public.conversation_summaries
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

-- response_feedback (user_id text)
ALTER TABLE public.response_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resp_fb_select_own" ON public.response_feedback
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "resp_fb_insert_own" ON public.response_feedback
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

-- ai_predictions: drop overly permissive read policy
DROP POLICY IF EXISTS "ai_predictions_select_all_for_aggregates" ON public.ai_predictions;

-- update_chat_timestamp: pin search_path
CREATE OR REPLACE FUNCTION public.update_chat_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  update public.chat_sessions
  set updated_at = now()
  where id = new.session_id;
  return new;
end;
$$;
