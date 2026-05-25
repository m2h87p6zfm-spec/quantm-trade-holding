-- Lock down client-side writes via explicit deny policies

-- subscriptions: writes happen exclusively via service role (Stripe webhook)
CREATE POLICY "subscriptions_no_client_insert" ON public.subscriptions
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "subscriptions_no_client_update" ON public.subscriptions
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "subscriptions_no_client_delete" ON public.subscriptions
  FOR DELETE TO anon, authenticated USING (false);

-- push_subscriptions: never updated from client (delete+reinsert pattern)
CREATE POLICY "push_subs_no_update" ON public.push_subscriptions
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

-- ai_chat_feedback: feedback is append-only from client
CREATE POLICY "ai_chat_feedback_no_update" ON public.ai_chat_feedback
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "ai_chat_feedback_no_delete" ON public.ai_chat_feedback
  FOR DELETE TO anon, authenticated USING (false);
