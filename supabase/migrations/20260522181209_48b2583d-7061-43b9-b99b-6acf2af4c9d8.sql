
CREATE TABLE public.agent_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Neuer Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX agent_conversations_user_updated_idx ON public.agent_conversations(user_id, updated_at DESC);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_conv_select_own" ON public.agent_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "agent_conv_insert_own" ON public.agent_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "agent_conv_update_own" ON public.agent_conversations FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "agent_conv_delete_own" ON public.agent_conversations FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER agent_conv_updated_at BEFORE UPDATE ON public.agent_conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.agent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX agent_messages_conv_idx ON public.agent_messages(conversation_id, created_at);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_msg_select_own" ON public.agent_messages FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "agent_msg_insert_own" ON public.agent_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "agent_msg_delete_own" ON public.agent_messages FOR DELETE TO authenticated USING (user_id = auth.uid());
