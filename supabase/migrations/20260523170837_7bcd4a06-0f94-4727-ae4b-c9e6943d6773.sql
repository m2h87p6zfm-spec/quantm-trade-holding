-- agent_messages: messages are immutable; deny updates explicitly
CREATE POLICY "agent_msg_no_update"
  ON public.agent_messages
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- ai_predictions: require a non-null owner
ALTER TABLE public.ai_predictions
  ALTER COLUMN user_id SET NOT NULL;

-- conversation_summaries: owner-scoped UPDATE and DELETE
CREATE POLICY "conv_sum_update_own"
  ON public.conversation_summaries
  FOR UPDATE
  TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "conv_sum_delete_own"
  ON public.conversation_summaries
  FOR DELETE
  TO authenticated
  USING (user_id = (auth.uid())::text);

-- response_feedback: owner-scoped UPDATE and DELETE
CREATE POLICY "resp_fb_update_own"
  ON public.response_feedback
  FOR UPDATE
  TO authenticated
  USING (user_id = (auth.uid())::text)
  WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "resp_fb_delete_own"
  ON public.response_feedback
  FOR DELETE
  TO authenticated
  USING (user_id = (auth.uid())::text);