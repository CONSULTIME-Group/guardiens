-- Lot NUR1 bloc B (08/11/2026) : séquence propriétaire de 4 à 3 emails.
-- owner-no-sit-j10 retiré (0 clic sur 54 envois du 09/09 au 01/11).
-- Étapes : 1 onboarding-j1 (J+1), 2 owner-no-sit-j3 (J+3), 3 owner-no-sit-j21 (J+21).
--
-- Parcours en cours :
-- * current_step = 3 (J+10 déjà passé ou sauté) : ramenés à 2 pour recevoir
--   le J+21 devenu étape 3. last_step_at recule de 168 heures pour garder la
--   date prévue : avant, J+21 tombait 264 heures après J+10 ; le moteur
--   compte désormais 432 heures depuis l'étape 2 (504 moins 72).
-- * current_step = 2 : le J+21 arrive 432 heures après le J+3, comme prévu.
-- * current_step = 4 : terminés au passage suivant, sans changement.
-- L'envoi unique du J+21 reste garanti par templateAlreadySent.

DO $$
DECLARE
  seq uuid;
BEGIN
  SELECT id INTO seq FROM public.nurturing_sequences WHERE key = 'onboarding-owner';
  IF seq IS NULL THEN
    RETURN;
  END IF;

  -- Rejouable : rien à faire si J+10 a déjà quitté la séquence.
  IF NOT EXISTS (
    SELECT 1 FROM public.nurturing_steps
    WHERE sequence_id = seq AND template_name = 'owner-no-sit-j10'
  ) THEN
    RETURN;
  END IF;

  UPDATE public.user_journeys
  SET current_step = 2,
      last_step_at = COALESCE(last_step_at, started_at, created_at) - interval '168 hours'
  WHERE sequence_key = 'onboarding-owner'
    AND status = 'active'
    AND current_step = 3;

  DELETE FROM public.nurturing_steps
  WHERE sequence_id = seq AND template_name = 'owner-no-sit-j10';

  UPDATE public.nurturing_steps
  SET step_order = 3
  WHERE sequence_id = seq AND template_name = 'owner-no-sit-j21' AND step_order = 4;
END
$$;
