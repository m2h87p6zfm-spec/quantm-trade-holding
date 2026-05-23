
-- ai_memory: add UPDATE/DELETE own policies
CREATE POLICY "ai_memory_update_own" ON public.ai_memory
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_memory_delete_own" ON public.ai_memory
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ai_predictions: tighten policies, no anonymous rows
DROP POLICY IF EXISTS "ai_predictions_insert_own" ON public.ai_predictions;
DROP POLICY IF EXISTS "ai_predictions_select_own_or_anon" ON public.ai_predictions;

CREATE POLICY "ai_predictions_insert_own" ON public.ai_predictions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_predictions_select_own" ON public.ai_predictions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ai_user_preferences: add INSERT/UPDATE own policies
CREATE POLICY "ai_user_preferences_insert_own" ON public.ai_user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_user_preferences_update_own" ON public.ai_user_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fix search_path on update_chat_timestamp function
CREATE OR REPLACE FUNCTION public.update_chat_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  update chat_sessions
  set updated_at = now()
  where id = new.session_id;
  return new;
end;
$function$;
