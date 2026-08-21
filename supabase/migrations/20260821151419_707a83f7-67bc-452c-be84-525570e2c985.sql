-- 1. email_preferences : politiques restreintes au rôle authenticated
DROP POLICY "Users view own email prefs" ON public.email_preferences;
DROP POLICY "Users insert own email prefs" ON public.email_preferences;
DROP POLICY "Users update own email prefs" ON public.email_preferences;

CREATE POLICY "Users view own email prefs" ON public.email_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own email prefs" ON public.email_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own email prefs" ON public.email_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 2. garde_accords : contrôle admin via la fonction has_role() centralisée
DROP POLICY "garde_accords_admin_select" ON public.garde_accords;

CREATE POLICY "garde_accords_admin_select" ON public.garde_accords
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. small_missions : vue publique limitée aux colonnes d'affichage
CREATE OR REPLACE VIEW public.public_small_missions AS
SELECT
  id,
  user_id,
  slug,
  title,
  description,
  category,
  exchange_offer,
  city,
  postal_code,
  latitude,
  longitude,
  date_needed,
  end_date,
  duration_estimate,
  status,
  mission_type,
  photos,
  pet_species,
  pet_size,
  created_at
FROM public.small_missions
WHERE status = 'open'::small_mission_status
  AND moderation_hidden_at IS NULL
  AND hidden_at IS NULL;

GRANT SELECT ON public.public_small_missions TO anon, authenticated;
GRANT SELECT ON public.public_small_missions TO service_role;

-- Retirer l'accès direct des visiteurs anonymes à la table de base
DROP POLICY "Open missions publicly readable" ON public.small_missions;
REVOKE SELECT ON public.small_missions FROM anon;