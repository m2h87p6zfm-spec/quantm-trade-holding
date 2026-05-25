-- Restrict ai_chat_feedback inserts to authenticated users only
DROP POLICY IF EXISTS ai_chat_feedback_insert_any ON public.ai_chat_feedback;

CREATE POLICY ai_chat_feedback_insert_auth
ON public.ai_chat_feedback
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Explicitly deny all client writes to market_cache (server-only table)
CREATE POLICY market_cache_no_client_insert
ON public.market_cache
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY market_cache_no_client_update
ON public.market_cache
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY market_cache_no_client_delete
ON public.market_cache
FOR DELETE
TO anon, authenticated
USING (false);

CREATE POLICY market_cache_no_client_select
ON public.market_cache
FOR SELECT
TO anon, authenticated
USING (false);