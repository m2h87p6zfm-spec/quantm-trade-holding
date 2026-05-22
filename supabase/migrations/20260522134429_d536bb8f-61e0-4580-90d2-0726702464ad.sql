
-- Feedback events
CREATE TABLE public.ai_chat_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  session_id text NULL,
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  user_prompt text NOT NULL DEFAULT '',
  assistant_message text NOT NULL DEFAULT '',
  reason text NULL,
  response_length int NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_chat_feedback_user_created_idx ON public.ai_chat_feedback (user_id, created_at DESC);
CREATE INDEX ai_chat_feedback_session_idx ON public.ai_chat_feedback (session_id);

ALTER TABLE public.ai_chat_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback (public chat). user_id must match auth.uid() if provided.
CREATE POLICY ai_chat_feedback_insert_any ON public.ai_chat_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Authenticated users can read their own feedback
CREATE POLICY ai_chat_feedback_select_own ON public.ai_chat_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Adaptive user preference profile
CREATE TABLE public.ai_user_preferences (
  user_id uuid PRIMARY KEY,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  positive_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  negative_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_user_preferences_select_own ON public.ai_user_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER ai_user_preferences_set_updated_at
  BEFORE UPDATE ON public.ai_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
