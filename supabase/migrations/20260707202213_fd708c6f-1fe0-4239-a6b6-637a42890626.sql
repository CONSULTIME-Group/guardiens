
-- 1) applications: split UPDATE policy so sitters cannot self-accept
DROP POLICY IF EXISTS "Application owners can update status" ON public.applications;

CREATE POLICY "Sit owners can update applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.sits s WHERE s.id = applications.sit_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.sits s WHERE s.id = applications.sit_id AND s.user_id = auth.uid()));

CREATE POLICY "Sitters can update own application (non-decision statuses)"
ON public.applications
FOR UPDATE
TO authenticated
USING (auth.uid() = sitter_id)
WITH CHECK (
  auth.uid() = sitter_id
  AND status IN ('pending'::public.application_status,
                 'viewed'::public.application_status,
                 'discussing'::public.application_status,
                 'cancelled'::public.application_status)
);

-- 2) conversations: require verified relationship on INSERT
DROP POLICY IF EXISTS "Participants can create conversations" ON public.conversations;

CREATE POLICY "Participants can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = owner_id OR auth.uid() = sitter_id)
  AND (
    -- Sit-based conversation: sit belongs to owner_id and sitter_id has an application on it
    (
      sit_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sits s
        WHERE s.id = conversations.sit_id
          AND s.user_id = conversations.owner_id
          AND EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.sit_id = s.id AND a.sitter_id = conversations.sitter_id
          )
      )
    )
    OR
    -- Mission-based conversation: mission poster + responder (either direction)
    (
      small_mission_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.small_missions m
        WHERE m.id = conversations.small_mission_id
          AND (
            (m.user_id = conversations.owner_id AND EXISTS (
              SELECT 1 FROM public.small_mission_responses r
              WHERE r.mission_id = m.id AND r.responder_id = conversations.sitter_id
            ))
            OR
            (m.user_id = conversations.sitter_id AND EXISTS (
              SELECT 1 FROM public.small_mission_responses r
              WHERE r.mission_id = m.id AND r.responder_id = conversations.owner_id
            ))
          )
      )
    )
  )
);
