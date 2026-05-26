
-- 1) analytics_events: restrict INSERT to authenticated + user_id check; add restrictive SELECT
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;

CREATE POLICY "Authenticated can insert own analytics events"
ON public.analytics_events
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can read their own analytics events"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Revoke anon grants on analytics_events (it should not be reachable anonymously anymore)
REVOKE INSERT ON public.analytics_events FROM anon;

-- 2) Lock down SECURITY DEFINER trigger-only functions
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_chat_timestamp() FROM PUBLIC, anon, authenticated;

-- 3) Restrict app-callable SECURITY DEFINER functions to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated;
