-- Tighten ai_outcomes RLS: only readable when caller owns the parent prediction
DROP POLICY IF EXISTS ai_outcomes_select_all ON public.ai_outcomes;

CREATE POLICY ai_outcomes_select_own
ON public.ai_outcomes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ai_predictions p
    WHERE p.id = ai_outcomes.prediction_id
      AND p.user_id = auth.uid()
  )
);

-- Tighten ai_learning_events RLS: only readable when caller owns at least one of the trigger predictions
DROP POLICY IF EXISTS ai_learning_events_select_all ON public.ai_learning_events;

CREATE POLICY ai_learning_events_select_own
ON public.ai_learning_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ai_predictions p
    WHERE p.user_id = auth.uid()
      AND p.id = ANY(ai_learning_events.trigger_prediction_ids)
  )
);