-- Permettre l'insertion d'événements analytics par les visiteurs anonymes
-- (page_view, signup_started avant que la session soit créée).
-- Restriction : user_id doit être NULL pour les anonymes (pas d'usurpation).

CREATE POLICY "Anonymous can insert anonymous events"
ON public.analytics_events
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Permettre aussi aux utilisateurs authentifiés d'insérer des events anonymes
-- (utile juste après signup quand la session n'est pas encore propagée
-- et qu'on passe explicitement user_id).
CREATE POLICY "Authenticated can insert events with explicit user_id"
ON public.analytics_events
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());