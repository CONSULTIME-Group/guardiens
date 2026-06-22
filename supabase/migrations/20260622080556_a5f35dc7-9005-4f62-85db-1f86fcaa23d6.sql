-- 1. Garde accords: remove broader sitter read policy that exposed owner's row.
-- garde_accords_own_select already covers each user reading their own accord.
DROP POLICY IF EXISTS garde_accords_sitter_read ON public.garde_accords;

-- 2. Realtime authorization: restrict sits: and applications: channel topics
--    to participants only (owner of the sit, or sitter with an application).
CREATE POLICY "realtime_sits_participants_only"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    (realtime.topic() LIKE 'sits:%' AND EXISTS (
      SELECT 1 FROM public.sits s
      WHERE realtime.topic() = 'sits:' || s.id::text
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.sit_id = s.id AND a.sitter_id = auth.uid()
          )
        )
    ))
    OR
    (realtime.topic() LIKE 'applications:%' AND EXISTS (
      SELECT 1 FROM public.sits s
      WHERE realtime.topic() = 'applications:' || s.id::text
        AND (
          s.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.sit_id = s.id AND a.sitter_id = auth.uid()
          )
        )
    ))
  );
