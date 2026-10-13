-- Lot X1 (13/10/2026) : quatre parcours débloqués, audit complet du 13/10.
--
-- 1. A-01 : apply_signup_role pose le drapeau interne avant d'écrire le rôle.
--    Sans lui, le garde-fou des champs sensibles du profil refusait tout passage
--    vers owner ou both : 0 compte Google propriétaire en 30 jours, 25 choix
--    propriétaire ou double rôle perdus (signup_form_submitted, méthode google).
-- 2. B-01 : un gardien peut retirer sa candidature tant qu'elle est pending,
--    viewed ou discussing. applications_guard_status_update refusait tout
--    changement de statut hors propriétaire (37 candidatures ouvertes).
--    enforce_application_status_transitions continue de valider la transition.
-- 3. C-01 : une personne qui a proposé son aide lit le besoin quel que soit son
--    statut (en cours, terminé, annulé), hors masquage par l'équipe ; une réponse
--    ne se crée que sur un besoin ouvert et visible. La lecture était limitée aux besoins
--    ouverts et à l'auteur : l'aidant retenu voyait « Mission indisponible » et
--    perdait « Marquer comme terminé » et l'avis. Fonction SECURITY DEFINER pour
--    éviter la boucle avec la politique de small_mission_responses.
-- 4. D-01 : retirer un de ses espaces passe par deactivate_my_space. L'écriture
--    directe de profiles.role depuis les réglages était refusée par le même
--    garde-fou (148 profils double rôle concernés).

-- 1. A-01 ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_signup_role(p_role user_role)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _meta_role text;
  _created timestamptz;
BEGIN
  IF _uid IS NULL OR p_role IS NULL THEN
    RETURN false;
  END IF;
  -- Lot X1 : date de création lue dans auth.users, que le membre n'écrit pas
  -- (profiles.created_at reste modifiable par son titulaire).
  SELECT u.raw_user_meta_data ->> 'role', u.created_at
    INTO _meta_role, _created
    FROM auth.users u WHERE u.id = _uid;
  IF _meta_role IN ('owner','sitter','both') THEN
    RETURN false;
  END IF;
  IF _created IS NULL OR _created < now() - interval '30 minutes' THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN
    RETURN false;
  END IF;
  -- Lot X1 : même drapeau que change_user_role, éteint juste après l'écriture.
  PERFORM set_config('app.allow_internal_profile_update', 'on', true);
  UPDATE public.profiles SET role = p_role WHERE id = _uid;
  PERFORM set_config('app.allow_internal_profile_update', 'off', true);
  IF p_role IN ('sitter','both') THEN
    INSERT INTO public.sitter_profiles (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  IF p_role IN ('owner','both') THEN
    INSERT INTO public.owner_profiles (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN true;
END;
$function$;

-- 2. B-01 ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.applications_guard_status_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
BEGIN
  IF coalesce(current_setting('app.auto_discussing', true), '') = '1' THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('app.quick_action', true), '') = '1' THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('app.system_close', true), '') = '1'
     AND NEW.status = 'cancelled'::application_status THEN
    RETURN NEW;
  END IF;
  -- Lot X1 : retrait par le gardien lui-même, avant toute décision.
  IF NEW.status = 'cancelled'::application_status
     AND OLD.status IN ('pending'::application_status, 'viewed'::application_status, 'discussing'::application_status)
     AND auth.uid() IS NOT NULL
     AND auth.uid() = OLD.sitter_id
     AND NEW.sitter_id = OLD.sitter_id
     AND NEW.sit_id = OLD.sit_id THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT s.user_id INTO v_owner FROM public.sits s WHERE s.id = OLD.sit_id;
    IF auth.uid() IS DISTINCT FROM v_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only the sit owner can change application status';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. C-01 ---------------------------------------------------------------
-- Une réponse ne se crée que sur un besoin ouvert et visible : sans ce verrou,
-- insérer une réponse aurait ouvert la lecture de n'importe quel besoin, même
-- masqué par l'équipe. 0 réponse créée après clôture en base au 13/10/2026.
CREATE OR REPLACE FUNCTION public.enforce_mission_response_open()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status small_mission_status;
  v_owner uuid;
  v_hidden boolean;
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  SELECT m.status, m.user_id, (m.hidden_by IS NOT NULL OR m.moderation_hidden_at IS NOT NULL)
    INTO v_status, v_owner, v_hidden
    FROM public.small_missions m WHERE m.id = NEW.mission_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'mission_missing' USING ERRCODE = 'P0001', HINT = 'mission_missing';
  END IF;
  IF v_owner = NEW.responder_id THEN
    RAISE EXCEPTION 'own_mission' USING ERRCODE = 'P0001', HINT = 'own_mission';
  END IF;
  IF v_status <> 'open'::small_mission_status OR v_hidden THEN
    RAISE EXCEPTION 'mission_closed' USING ERRCODE = 'P0001', HINT = 'mission_closed';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_mission_response_open ON public.small_mission_responses;
CREATE TRIGGER trg_enforce_mission_response_open
  BEFORE INSERT ON public.small_mission_responses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_mission_response_open();

-- Lecture par la personne qui a répondu, sans paramètre d'identité (aucun
-- moyen de savoir si quelqu'un d'autre a répondu à un besoin).
CREATE OR REPLACE FUNCTION public.is_mission_responder(p_mission_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.small_mission_responses r
    WHERE r.mission_id = p_mission_id
      AND r.responder_id = auth.uid()
      AND r.status <> 'withdrawn'::small_mission_response_status
  );
$function$;

REVOKE ALL ON FUNCTION public.is_mission_responder(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_mission_responder(uuid) TO authenticated;

DROP POLICY IF EXISTS "Responders can read missions they answered" ON public.small_missions;
CREATE POLICY "Responders can read missions they answered"
  ON public.small_missions
  FOR SELECT
  TO authenticated
  USING (
    hidden_by IS NULL
    AND moderation_hidden_at IS NULL
    AND public.is_mission_responder(id)
  );

-- 4. D-01 ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deactivate_my_space(p_keep user_role)
 RETURNS user_role
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role public.user_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  IF p_keep IS NULL OR p_keep NOT IN ('owner'::user_role, 'sitter'::user_role) THEN
    RAISE EXCEPTION 'Espace à conserver : owner ou sitter';
  END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'both'::user_role THEN
    RAISE EXCEPTION 'Seul un compte à deux espaces peut en retirer un';
  END IF;

  IF p_keep = 'sitter'::user_role AND EXISTS (
    SELECT 1 FROM public.sits s
    WHERE s.user_id = v_uid
      AND s.status IN ('published'::sit_status, 'confirmed'::sit_status, 'in_progress'::sit_status)
  ) THEN
    RAISE EXCEPTION 'ACTIVE_SITS: une annonce est en ligne ou une garde est prévue, votre espace propriétaire reste ouvert jusqu''à sa fin';
  END IF;

  IF p_keep = 'owner'::user_role AND EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id
    WHERE a.sitter_id = v_uid
      AND a.status = 'accepted'::application_status
      AND s.status IN ('published'::sit_status, 'confirmed'::sit_status, 'in_progress'::sit_status)
  ) THEN
    RAISE EXCEPTION 'ACTIVE_SITTING: une garde est prévue, votre espace gardien reste ouvert jusqu''à sa fin';
  END IF;

  IF p_keep = 'owner'::user_role AND EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id
    WHERE a.sitter_id = v_uid
      AND a.status IN ('pending'::application_status, 'viewed'::application_status,
                       'discussing'::application_status)
      AND s.status IN ('published'::sit_status, 'confirmed'::sit_status, 'in_progress'::sit_status)
  ) THEN
    RAISE EXCEPTION 'ACTIVE_APPLICATIONS: une candidature est encore ouverte, retirez-la avant de retirer votre espace gardien';
  END IF;

  PERFORM set_config('app.allow_internal_profile_update', 'on', true);
  UPDATE public.profiles SET role = p_keep WHERE id = v_uid;
  PERFORM set_config('app.allow_internal_profile_update', 'off', true);
  IF p_keep = 'owner'::user_role THEN
    UPDATE public.sitter_profiles SET is_available = false WHERE user_id = v_uid;
  END IF;
  RETURN p_keep;
END;
$function$;

REVOKE ALL ON FUNCTION public.deactivate_my_space(user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_my_space(user_role) TO authenticated;