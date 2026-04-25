-- Autoriser un sitter à insérer une notification "nouvelle candidature"
-- pour le propriétaire d'une annonce auquel il a postulé.
CREATE POLICY "Sitters can notify owners of new applications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'new_application'
  AND EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id
    WHERE a.sitter_id = auth.uid()
      AND s.user_id = notifications.user_id
  )
);