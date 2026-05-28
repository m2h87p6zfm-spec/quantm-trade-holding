-- Restrict Realtime channel subscriptions: authenticated users may only
-- subscribe to topics that contain their own user id. The two app channels
-- ('sub:<uid>:...' for subscription updates and 'price_alerts_self:<uid>:...'
-- for price-alert change events) already embed auth.uid() in the topic.
-- This blocks broadcast/presence access to other users' channels.

DROP POLICY IF EXISTS "realtime_authenticated_own_topic_select" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_authenticated_own_topic_insert" ON realtime.messages;

CREATE POLICY "realtime_authenticated_own_topic_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic())::text LIKE '%' || (auth.uid())::text || '%'
);

CREATE POLICY "realtime_authenticated_own_topic_insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic())::text LIKE '%' || (auth.uid())::text || '%'
);
