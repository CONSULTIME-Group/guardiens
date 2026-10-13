-- Lot X3c (13/10/2026) : compte, consentement et mécanique, audit complet du 13/10.
-- Définitions reprises de la production (lecture du 13/10/2026), puis corrigées.
--
-- 1. D-06 : une personne effacée qui se réinscrit retrouve ses emails.
--    L'effacement pose son adresse dans suppressed_emails (motif
--    account_deleted) ; send-transactional-email bloquait ensuite tout email
--    du nouveau compte, quel que soit le motif. À l'inscription confirmée
--    (adresse vérifiée, ou Google), la ligne account_deleted est levée. Les
--    motifs unsubscribe, bounce et complaint restent en place, et l'effacement
--    ne réécrit plus le motif d'une ligne existante (code, account-erasure.ts).
-- 2. D-08 : « Qui peut voir mon profil » et « Afficher ma dernière connexion »
--    sont appliqués par public_profiles et public_helpers (et donc par
--    search_sitter_pool et search_sitter_pool_mobile, qui lisent
--    public_profiles). Profil réservé aux membres vérifiés : visible du membre
--    lui-même, de l'équipe, d'un membre à l'identité vérifiée, et des
--    personnes déjà en lien (conversation, candidature, coup de main).
--    Dernière connexion masquée : last_seen_at et last_active_on à NULL.
--    5 profils restreints et 4 dernières connexions masquées, encore exposés.
-- 3. D-09 : un compte suspendu ou inactif ne publie plus d'annonce, ne
--    candidate plus et n'écrit plus de message (les besoins et réponses
--    d'entraide l'étaient déjà par enforce_mutual_aid_eligibility). Les
--    lectures restent ouvertes. Même indice d'erreur account_not_active.
-- 4. E-08 : trois tâches cron actives visent des fonctions absentes du dépôt.
--    Déprogrammation préparée, commentée : à lancer après lecture des
--    journaux Supabase (une fonction déployée hors dépôt serait arrêtée).

-- 1. D-06 ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lift_erasure_suppression_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Adresse vérifiée seulement : personne ne lève la ligne d'autrui en
  -- s'inscrivant avec son adresse sans la confirmer.
  IF NEW.email IS NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;
  -- Mise à jour sans nouvelle confirmation ni changement d'adresse : rien à faire.
  IF TG_OP = 'UPDATE'
     AND OLD.email_confirmed_at IS NOT NULL
     AND lower(coalesce(OLD.email, '')) = lower(NEW.email) THEN
    RETURN NEW;
  END IF;
  -- Compte effacé (anonymisé, banni) : jamais de levée.
  IF NEW.banned_until IS NOT NULL AND NEW.banned_until > now() THEN
    RETURN NEW;
  END IF;
  IF coalesce(NEW.raw_user_meta_data ->> 'deleted', '') = 'true' THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.suppressed_emails
   WHERE lower(email) = lower(trim(NEW.email))
     AND reason = 'account_deleted';
  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Une inscription ne doit jamais échouer pour cette levée.
  RAISE WARNING 'lift_erasure_suppression_on_signup: %', SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_lift_erasure_suppression ON auth.users;
CREATE TRIGGER trg_lift_erasure_suppression
  AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.lift_erasure_suppression_on_signup();

-- 2. D-08 ---------------------------------------------------------------
-- Lecteur autorisé à voir un profil réservé aux membres vérifiés.
CREATE OR REPLACE FUNCTION public.can_view_restricted_profile(_subject uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    _subject = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles v
       WHERE v.id = auth.uid()
         AND v.identity_verified IS TRUE
         AND coalesce(v.account_status, 'active') = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
       WHERE (c.owner_id = _subject AND c.sitter_id = auth.uid())
          OR (c.sitter_id = _subject AND c.owner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.applications a
        JOIN public.sits s ON s.id = a.sit_id
       WHERE (a.sitter_id = _subject AND s.user_id = auth.uid())
          OR (a.sitter_id = auth.uid() AND s.user_id = _subject)
    )
    OR EXISTS (
      SELECT 1 FROM public.small_mission_responses r
        JOIN public.small_missions m ON m.id = r.mission_id
       WHERE (r.responder_id = _subject AND m.user_id = auth.uid())
          OR (r.responder_id = auth.uid() AND m.user_id = _subject)
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.can_view_restricted_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_restricted_profile(uuid) TO anon, authenticated, service_role;

-- Colonnes, ordre et types inchangés (CREATE OR REPLACE VIEW).
CREATE OR REPLACE VIEW public.public_profiles AS
 SELECT p.id,
    p.first_name,
    p.city,
    p.avatar_url,
    p.bio,
    p.completed_sits_count,
    p.identity_verified,
    p.is_founder,
    p.postal_code,
    p.created_at,
    p.profile_completion,
    round(p.latitude::numeric, 2)::double precision AS latitude_approx,
    round(p.longitude::numeric, 2)::double precision AS longitude_approx,
    p.available_for_help,
    p.skill_categories,
    p.custom_skills,
    p.role,
    -- Lot X3c : dernière connexion masquée sur demande du membre.
    CASE WHEN coalesce(np.show_last_seen, true) THEN p.last_seen_at
         ELSE NULL::timestamp with time zone END AS last_seen_at,
    p.departement_code,
    p.certifications,
    NULLIF(upper(TRIM(BOTH FROM p.country)), ''::text) AS country
   FROM profiles p
     LEFT JOIN notification_preferences np ON np.user_id = p.id
  WHERE p.account_status = 'active'::text
    AND p.first_name IS NOT NULL
    -- Lot X3c : CASE garantit l'ordre, le contrôle ne court que pour les
    -- profils restreints.
    AND CASE WHEN coalesce(np.profile_visibility, 'all') = 'verified'
             THEN public.can_view_restricted_profile(p.id)
             ELSE true END;

CREATE OR REPLACE VIEW public.public_helpers AS
 SELECT p.id,
    p.first_name,
    p.avatar_url,
    p.city,
    round(p.latitude::numeric, 2)::double precision AS latitude_approx,
    round(p.longitude::numeric, 2)::double precision AS longitude_approx,
    p.helps_with,
    (array_cat(COALESCE(op.competences, '{}'::text[]), COALESCE(sp.competences, '{}'::text[])))[1:8] AS competences,
    CASE WHEN coalesce(np.show_last_seen, true)
         THEN (p.last_seen_at AT TIME ZONE 'Europe/Paris'::text)::date
         ELSE NULL::date END AS last_active_on
   FROM profiles p
     LEFT JOIN sitter_profiles sp ON sp.user_id = p.id
     LEFT JOIN owner_profiles op ON op.user_id = p.id
     LEFT JOIN notification_preferences np ON np.user_id = p.id
  WHERE p.account_status = 'active'::text
    AND p.available_for_help = true
    AND p.first_name IS NOT NULL
    AND btrim(p.first_name) <> ''::text
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND CASE WHEN coalesce(np.profile_visibility, 'all') = 'verified'
             THEN public.can_view_restricted_profile(p.id)
             ELSE true END;

-- 3. D-09 ---------------------------------------------------------------
-- Même règle que _shared/account-email-block.ts (lot C2) : statut différent
-- de « active », ou suspension posée sans fin ou pas encore terminée.
CREATE OR REPLACE FUNCTION public.is_account_blocked_for_actions(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = _user_id
       AND (
         coalesce(p.account_status, 'active') <> 'active'
         OR (p.suspended_at IS NOT NULL
             AND (p.suspended_until IS NULL OR p.suspended_until > now()))
       )
  );
$function$;

CREATE OR REPLACE FUNCTION public.enforce_active_account_writes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'sits' THEN
    -- Publier seulement : brouillon, retrait et archivage restent possibles.
    IF NEW.status IS DISTINCT FROM 'published' THEN
      RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM 'published' THEN
      RETURN NEW;
    END IF;
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'applications' THEN
    v_user_id := NEW.sitter_id;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    IF coalesce(NEW.is_system, false) THEN
      RETURN NEW;
    END IF;
    v_user_id := NEW.sender_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- L'équipe garde la main (republication, message de modération).
  IF public.has_role(v_user_id, 'admin'::app_role)
     OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN NEW;
  END IF;

  IF public.is_account_blocked_for_actions(v_user_id) THEN
    RAISE EXCEPTION 'account_not_active'
      USING ERRCODE = 'P0001', HINT = 'account_not_active';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_active_account_sits ON public.sits;
CREATE TRIGGER trg_enforce_active_account_sits
  BEFORE INSERT OR UPDATE OF status ON public.sits
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_account_writes();

DROP TRIGGER IF EXISTS trg_enforce_active_account_applications ON public.applications;
CREATE TRIGGER trg_enforce_active_account_applications
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_account_writes();

DROP TRIGGER IF EXISTS trg_enforce_active_account_messages ON public.messages;
CREATE TRIGGER trg_enforce_active_account_messages
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_account_writes();

-- 4. E-08 ---------------------------------------------------------------
-- Tâches actives sans fonction dans le dépôt (cron.job, 13/10/2026) :
--   157 nudge-suspicious-accounts        0 */4 * * *
--   158 nudge-repeated-cancellations     0 10 * * 4
--   159 nudge-repeated-republished-sits  0 12 * * 5
-- et une tâche inactive vers une fonction absente :
--   156 nudge-dormant-top-sitters        0 11 * * 3
-- À décommenter après lecture des journaux des fonctions dans Supabase
-- (404 attendu). admin_cron_health continue de les suivre tant que la
-- migration 20260920110000_admin_cron_health_partial.sql les liste.
-- SELECT cron.unschedule('nudge-suspicious-accounts');
-- SELECT cron.unschedule('nudge-repeated-cancellations');
-- SELECT cron.unschedule('nudge-repeated-republished-sits');
-- SELECT cron.unschedule('nudge-dormant-top-sitters');
