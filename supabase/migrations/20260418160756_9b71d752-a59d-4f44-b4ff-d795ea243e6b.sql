
-- 1. Convertir les vues en SECURITY INVOKER (silence les 2 erreurs du linter)
ALTER VIEW public.public_profiles SET (security_invoker = true);
ALTER VIEW public.public_stats SET (security_invoker = true);

-- 2. Restreindre l'INSERT sur notifications au service_role uniquement
-- (empêche un utilisateur de fabriquer ses propres notifications)
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;

-- Seul le service_role (triggers/edge functions) peut créer des notifications
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);
