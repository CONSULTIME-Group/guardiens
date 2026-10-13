-- Lot Y1 (13/10/2026) : plafond de candidatures (décision du fondateur du
-- 13/10/2026) et défauts P1 de la passe 4 de l'audit (emails, notifications,
-- push).
--
-- 1. Plafond : une annonce qui atteint son plafond reste publiée, ouverte et
--    visible partout ; seules les nouvelles candidatures sont refusées par
--    trg_guard_application_sit_open (inchangé, erreur SIT_CLOSED « cette
--    annonce a reçu toutes les candidatures prévues »). Seul le propriétaire
--    ferme une annonce (accepting_applications). Les opérations du bloc 1 ont
--    été appliquées en base le 13/10/2026 à 18h ; ce fichier les consigne et
--    retire les deux fonctions devenues inutiles.
-- 2. P4-03 : un besoin effacé emporte ses notifications non lues, un besoin
--    retiré par son auteur retire ses invitations à aider non lues.
-- 3. P4-04 et P4-05 : la diffusion d'une nouvelle annonce écarte les comptes
--    propriétaires seuls et ne crée la notification in-app qu'à 100 km au
--    plus ou dans une zone d'alerte ; deactivate_my_space coupe alertes et
--    file du récapitulatif quand l'espace gardien est retiré.
-- 4. P4-06 : le lien d'un email n'ouvre une session que pour un email
--    immédiat, dans les 2 heures, sur un navigateur sans autre compte.
-- À appliquer après 20261013140000_x3a_proprietaire_gardien.sql et
-- 20261013100000_x1_parcours_debloques.sql (blocs 3 et 4 en reprennent les
-- définitions de production), et avant le redéploiement de email-deep-link.

-- 1. Plafond de candidatures -----------------------------------------------

-- 1a. Plus de fermeture ni de réouverture automatique au plafond (appliqué le
--     13/10 à 18h). Les deux triggers du lot X3a sont retirés, puis leurs
--     fonctions, qui ne servent plus à rien.
DROP TRIGGER IF EXISTS trg_close_sit_when_application_cap_reached ON public.applications;
DROP TRIGGER IF EXISTS trg_reopen_sit_when_application_slot_freed ON public.applications;
DROP FUNCTION IF EXISTS public.close_sit_when_application_cap_reached();
DROP FUNCTION IF EXISTS public.reopen_sit_when_application_slot_freed();

-- 1b. Valeur par défaut du plafond portée à 10 (appliqué le 13/10 à 18h),
--     alignée sur DEFAULT_MAX_APPLICATIONS (src/lib/applicationCap.ts).
ALTER TABLE public.sits ALTER COLUMN max_applications SET DEFAULT 10;

-- 1c. Réouverture des 3 annonces publiées fermées par le rattrapage X3a
--     (appliqué le 13/10 à 18h, gardé ici en commentaire pour mémoire, à ne
--     pas rejouer) :
--
--   UPDATE public.sits s
--      SET accepting_applications = true
--    WHERE s.status = 'published'::sit_status
--      AND s.accepting_applications IS FALSE
--      AND s.max_applications IS NOT NULL
--      AND s.max_applications > 0
--      AND (
--        SELECT count(*) FROM public.applications a
--         WHERE a.sit_id = s.id
--           AND a.status NOT IN ('rejected'::application_status, 'cancelled'::application_status)
--      ) >= s.max_applications;


-- 2. P4-03 : notifications vers des besoins effacés --------------------------
-- 81 « mission_help_needed » sur 367 et 8 « mission_wave_relaunch » sur 36
-- (30 jours au 13/10/2026) menaient à un besoin effacé. Côté site, un besoin
-- ouvert ou en cours que l'auteur retire est désormais clos (cancelled,
-- close_reason author_withdrew), plus effacé (SmallMissionDetail). En base :
-- - un besoin effacé (équipe, modération, besoin déjà clos) emporte les
--   notifications non lues qui pointent vers lui ;
-- - un besoin ouvert ou en cours qui passe en cancelled retire les invitations
--   à aider encore non lues (mission_help_needed) : elles n'ont plus d'objet.
--   Les notifications de clôture créées par
--   trg_close_pending_responses_on_mission_close restent.
CREATE OR REPLACE FUNCTION public.purge_unread_notifications_of_mission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_base := '/petites-missions/' || OLD.id::text;
    DELETE FROM public.notifications n
     WHERE n.read_at IS NULL
       AND (
         n.link = v_base OR n.link LIKE v_base || '?%' OR n.link LIKE v_base || '#%'
         OR (OLD.slug IS NOT NULL AND n.link = '/projets/' || OLD.slug)
       );
    RETURN OLD;
  END IF;

  v_base := '/petites-missions/' || NEW.id::text;
  DELETE FROM public.notifications n
   WHERE n.read_at IS NULL
     AND n.type = 'mission_help_needed'
     AND (n.link = v_base OR n.link LIKE v_base || '?%' OR n.link LIKE v_base || '#%');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_purge_unread_notifications_of_deleted_mission ON public.small_missions;
CREATE TRIGGER trg_purge_unread_notifications_of_deleted_mission
  AFTER DELETE ON public.small_missions
  FOR EACH ROW EXECUTE FUNCTION public.purge_unread_notifications_of_mission();

DROP TRIGGER IF EXISTS trg_purge_help_invitations_of_cancelled_mission ON public.small_missions;
CREATE TRIGGER trg_purge_help_invitations_of_cancelled_mission
  AFTER UPDATE OF status ON public.small_missions
  FOR EACH ROW
  WHEN (OLD.status IN ('open'::small_mission_status, 'in_progress'::small_mission_status)
        AND NEW.status = 'cancelled'::small_mission_status)
  EXECUTE FUNCTION public.purge_unread_notifications_of_mission();

-- Rattrapage : notifications non lues qui pointent déjà vers un besoin effacé
-- (85 lignes au 13/10/2026).
DELETE FROM public.notifications n
 WHERE n.read_at IS NULL
   AND n.link ~ '^/petites-missions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}([?#].*)?$'
   AND NOT EXISTS (
     SELECT 1 FROM public.small_missions m
      WHERE m.id::text = substring(n.link from 19 for 36)
   );

-- 3. P4-04 et P4-05 : diffusion d'une nouvelle annonce ------------------------
-- Définition de production (lot X3a, B-06), trois changements seulement :
-- - P4-04 : un compte au rôle owner sort du réservoir (25 récapitulatifs
--   gardien vers 20 propriétaires en 30 jours) ;
-- - P4-05 : la notification in-app « Nouvelle annonce » ne part qu'à 100 km
--   au plus ou vers une zone d'alerte qui couvre l'annonce (2 020 sur 2 684,
--   soit 75 %, visaient un gardien à plus de 100 km ou sans distance, taux
--   de lecture 2 %). Le push nearby_sit reste rattaché à cette notification
--   et garde son propre contrôle de rayon (push_nearby_target_ok) ;
-- - la file du récapitulatif email (sitter_digest_queue) est inchangée.
CREATE OR REPLACE FUNCTION public.notify_sitters_on_new_sit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sitter RECORD;
  sit_lat double precision;
  sit_lng double precision;
  v_owner_postal text;
  v_sit_dept text;
  v_sit_region text;
  pet_species text[];
  has_any_coords boolean;
  v_conflict_sitter_ids uuid[];
  v_queued integer := 0;
  -- Plafond de diffusion : on ne coupe jamais par une regle de distance, on
  -- classe tout le monde par proximite et on garde les cent premiers.
  c_rank_cap constant integer := 100;
  c_dormant_days constant integer := 90;
  c_dormant_period_days constant integer := 30;
  -- Filtre espece : dans l ancien declencheur il etait inerte (CONTINUE place
  -- dans la boucle interne). Le rendre bloquant est une decision produit, pas
  -- un correctif. Il reste donc derriere un drapeau, desactive par defaut.
  v_species_blocking boolean := false;
  -- Lot X3a (B-06) : refus explicites de l'annonce et du proprietaire.
  v_smokers_refused boolean := false;
  v_children_refused boolean := false;
  v_pets_refused boolean := false;
  -- Lot Y1 (P4-05) : la notification in-app « Nouvelle annonce » ne part que
  -- vers un gardien situé à 100 km au plus, ou dont une zone d'alerte couvre
  -- l'annonce. La file du récapitulatif email reste celle de la production.
  c_notify_max_km constant integer := 100;
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(DISTINCT p.species::text)
    INTO pet_species
  FROM public.pets p
  WHERE p.property_id = NEW.property_id;

  IF pet_species IS NULL THEN
    SELECT array_agg(DISTINCT p.species::text)
      INTO pet_species
    FROM public.pets p
    JOIN public.properties prop ON p.property_id = prop.id
    WHERE prop.user_id = NEW.user_id;
  END IF;

  pet_species := COALESCE(pet_species, ARRAY[]::text[]);

  SELECT
    COALESCE(p.latitude, gc.lat),
    COALESCE(p.longitude, gc.lng),
    p.postal_code
  INTO sit_lat, sit_lng, v_owner_postal
  FROM public.profiles p
  LEFT JOIN public.geocode_cache gc ON gc.normalized_name = lower(unaccent(coalesce(NEW.city, '')))
  WHERE p.id = NEW.user_id;

  has_any_coords := (sit_lat IS NOT NULL AND sit_lng IS NOT NULL);

  SELECT COALESCE(f.enabled, false) INTO v_species_blocking
  FROM public.feature_flags f
  WHERE f.key = 'species_filter_blocking';
  v_species_blocking := COALESCE(v_species_blocking, false);

  -- Lot X3a (B-06) : seul un refus explicite ecarte un gardien.
  SELECT lower(btrim(coalesce(op.smoker_accepted, ''))) = 'non'
    INTO v_smokers_refused
  FROM public.owner_profiles op
  WHERE op.user_id = NEW.user_id;
  v_smokers_refused := COALESCE(v_smokers_refused, false);
  v_children_refused := lower(btrim(coalesce(NEW.accepts_sitter_children, ''))) = 'no';
  v_pets_refused := lower(btrim(coalesce(NEW.accepts_sitter_pets, ''))) = 'no';

  -- Zone administrative de l'annonce, deduite du code postal du proprietaire.
  v_sit_dept := public.dept_code_from_postal(v_owner_postal);
  IF v_sit_dept IS NOT NULL THEN
    SELECT d.code_region INTO v_sit_region FROM public.departements d WHERE d.code = v_sit_dept;
  END IF;

  SELECT array_agg(DISTINCT a2.sitter_id)
    INTO v_conflict_sitter_ids
  FROM public.sits s2
  JOIN public.applications a2 ON a2.sit_id = s2.id
  WHERE a2.sitter_id IS NOT NULL
    AND a2.status = 'accepted'
    AND s2.status IN ('confirmed', 'in_progress')
    AND s2.id IS DISTINCT FROM NEW.id
    AND s2.start_date <= NEW.end_date
    AND s2.end_date >= NEW.start_date;

  FOR sitter IN
    WITH pool AS (
      SELECT
        sp.user_id,
        pr.last_seen_at,
        CASE
          WHEN has_any_coords THEN public.haversine_km(sit_lat, sit_lng, pr.latitude, pr.longitude)
          ELSE NULL
        END AS distance_km
      FROM public.sitter_profiles sp
      JOIN public.profiles pr ON pr.id = sp.user_id
      LEFT JOIN public.email_preferences ep ON ep.user_id = sp.user_id
      WHERE
        sp.user_id <> NEW.user_id
        -- Sans coordonnees, aucune diffusion d'annonce possible : on ignore
        -- ou vit la personne, une relance dediee prendra le relais.
        AND pr.latitude IS NOT NULL
        AND pr.longitude IS NOT NULL
        -- Lot Y1 (P4-04) : un compte propriétaire seul ne peut pas candidater,
        -- il ne reçoit ni notification ni récapitulatif gardien.
        AND pr.role::text IS DISTINCT FROM 'owner'
        AND NOT (COALESCE(v_conflict_sitter_ids, '{}') @> ARRAY[sp.user_id])
        AND NOT EXISTS (
          SELECT 1 FROM public.blocked_users b
          WHERE (b.blocker_id = NEW.user_id AND b.blocked_id = sp.user_id)
             OR (b.blocker_id = sp.user_id AND b.blocked_id = NEW.user_id)
        )
        AND COALESCE(ep.new_sit_digest, true) = true
        AND NOT EXISTS (
          SELECT 1 FROM public.account_deletion_requests adr
          WHERE adr.user_id = sp.user_id AND adr.status = 'pending'
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.sitter_digest_queue q
          WHERE q.sit_id = NEW.id AND q.sitter_id = sp.user_id
        )
        -- Lot X3a (B-06) : exclusion seulement sur refus explicite.
        AND (sp.smoker IS DISTINCT FROM true OR NOT v_smokers_refused)
        AND (sp.travels_with_children IS DISTINCT FROM true OR NOT v_children_refused)
        AND (sp.travels_with_own_animals IS DISTINCT FROM true OR NOT v_pets_refused)
        AND (
          v_species_blocking = false
          OR NOT EXISTS (
          SELECT 1
          FROM unnest(pet_species) AS ps(species)
          WHERE sp.animal_types IS NOT NULL
            AND array_length(sp.animal_types, 1) > 0
            AND NOT EXISTS (
              SELECT 1 FROM unnest(sp.animal_types) AS t(x)
              WHERE lower(trim(t.x)) = lower(trim(ps.species))
                 OR lower(trim(t.x)) IN ('tous', 'toutes')
                 OR (lower(trim(t.x)) IN ('chien', 'chiens', 'dog', 'dogs') AND lower(ps.species) IN ('chien', 'chiens', 'dog', 'dogs'))
                 OR (lower(trim(t.x)) IN ('chat', 'chats', 'cat', 'cats') AND lower(ps.species) IN ('chat', 'chats', 'cat', 'cats'))
                 OR (lower(trim(t.x)) IN ('cheval', 'chevaux', 'horse', 'horses', 'poney', 'poneys') AND lower(ps.species) IN ('cheval', 'chevaux', 'horse', 'horses', 'poney', 'poneys'))
            )
          )
        )
    ),
    scored AS (
      SELECT
        p.user_id,
        p.distance_km,
        CASE
          WHEN p.distance_km IS NULL THEN 0.05
          WHEN p.distance_km <= 20 THEN 1.00
          WHEN p.distance_km <= 40 THEN 0.85
          WHEN p.distance_km <= 60 THEN 0.70
          WHEN p.distance_km <= 100 THEN 0.45
          WHEN p.distance_km <= 200 THEN 0.20
          WHEN p.distance_km <= 300 THEN 0.05
          ELSE 0.00
        END AS proximity_score,
        (p.last_seen_at IS NULL OR p.last_seen_at < now() - make_interval(days => c_dormant_days)) AS dormant,
        -- Priorite absolue hors plafond, uniquement pour les alertes
        -- configurees a la main (source IS NULL). Les 442 alertes issues de
        -- la migration automatique repassent dans le classement normal.
        EXISTS (
          SELECT 1
          FROM public.alert_preferences ap
          LEFT JOIN public.geocode_cache agc
            ON agc.normalized_name = lower(unaccent(coalesce(ap.city, '')))
          WHERE ap.user_id = p.user_id
            AND ap.active = true
            AND ap.source IS NULL
            AND (
              ap.zone_type = 'france'
              OR (ap.zone_type = 'departement' AND v_sit_dept IS NOT NULL AND ap.departement = v_sit_dept)
              OR (ap.zone_type = 'region' AND v_sit_region IS NOT NULL AND ap.region_code = v_sit_region)
              OR (
                ap.zone_type = 'rayon'
                AND (
                  (has_any_coords AND agc.lat IS NOT NULL AND agc.lng IS NOT NULL
                     AND public.haversine_km(sit_lat, sit_lng, agc.lat, agc.lng) <= COALESCE(ap.radius_km, 30))
                  OR (agc.lat IS NULL AND p.distance_km IS NOT NULL AND p.distance_km <= COALESCE(ap.radius_km, 30))
                )
              )
            )
        ) AS alert_priority
      FROM pool p
    ),
    eligible AS (
      SELECT s.*
      FROM scored s
      WHERE NOT s.dormant
         OR s.alert_priority
         -- Dormant : une seule annonce par periode, celle ou il est le mieux
         -- place. Une ligne encore en file et plus lointaine cede la place.
         OR NOT EXISTS (
              SELECT 1 FROM public.sitter_digest_queue q
              WHERE q.sitter_id = s.user_id
                AND q.queued_at > now() - make_interval(days => c_dormant_period_days)
                AND (
                  q.status <> 'queued'
                  OR q.distance_km IS NULL
                  OR s.distance_km IS NULL
                  OR q.distance_km <= s.distance_km
                )
            )
    ),
    ranked AS (
      SELECT
        e.*,
        CASE
          WHEN e.alert_priority THEN 0
          ELSE ROW_NUMBER() OVER (
            PARTITION BY e.alert_priority
            ORDER BY e.proximity_score DESC, e.distance_km ASC NULLS LAST, e.user_id
          )
        END AS rn
      FROM eligible e
    )
    SELECT r.user_id, r.distance_km, r.dormant, r.alert_priority
    FROM ranked r
    WHERE r.alert_priority OR r.rn <= c_rank_cap
    ORDER BY r.alert_priority DESC, r.proximity_score DESC, r.distance_km ASC NULLS LAST
  LOOP
    IF (sitter.alert_priority
        OR (sitter.distance_km IS NOT NULL AND sitter.distance_km <= c_notify_max_km))
       AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = sitter.user_id
        AND n.type = 'new_sit_nearby'
        AND n.link = '/sits/' || NEW.id::text
    ) THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        sitter.user_id,
        'new_sit_nearby',
        'Nouvelle annonce : ' || NEW.title,
        'Une nouvelle garde est disponible'
          || COALESCE(' à ' || NEW.city, '')
          || ' du ' || to_char(NEW.start_date, 'DD/MM/YYYY')
          || ' au ' || to_char(NEW.end_date, 'DD/MM/YYYY'),
        '/sits/' || NEW.id::text
      );
    END IF;

    INSERT INTO public.sitter_digest_queue (sitter_id, sit_id, distance_km)
    VALUES (sitter.user_id, NEW.id, sitter.distance_km)
    ON CONFLICT (sitter_id, sit_id) DO NOTHING;

    -- Dormant retenu alors qu'une ligne plus lointaine attend encore : on
    -- solde l'ancienne pour tenir la promesse d'une seule annonce par mois.
    IF sitter.dormant THEN
      UPDATE public.sitter_digest_queue q
      SET status = 'skipped', skip_reason = 'dormant_monthly_cap'
      WHERE q.sitter_id = sitter.user_id
        AND q.sit_id <> NEW.id
        AND q.status = 'queued'
        AND q.queued_at > now() - make_interval(days => c_dormant_period_days);
    END IF;

    v_queued := v_queued + 1;
  END LOOP;

  IF v_queued = 0 THEN
    INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
    VALUES (
      'sit_published_zero_reach',
      'critical',
      'sit',
      NEW.id,
      jsonb_build_object(
        'city', NEW.city,
        'species', pet_species,
        'has_coords', has_any_coords,
        'detail', 'Publication reussie mais aucun gardien mis en file de diffusion.'
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- P4-04 suite : retirer son espace gardien coupe aussi les alertes d'annonce et
-- solde la file du récapitulatif. Définition de production (lot X1), seul le
-- bloc final p_keep = 'owner' s'enrichit.
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
    -- Lot Y1 (P4-04) : plus d'alerte d'annonce ni de récapitulatif gardien.
    UPDATE public.alert_preferences SET active = false
     WHERE user_id = v_uid AND active IS TRUE;
    UPDATE public.sitter_digest_queue SET status = 'skipped', skip_reason = 'not_sitter_role'
     WHERE sitter_id = v_uid AND status = 'queued';
  END IF;
  RETURN p_keep;
END;
$function$;

-- Rattrapage : lignes encore en file pour un compte au rôle owner (4 au
-- 13/10/2026). Les alertes d'annonce actives de comptes propriétaires seuls
-- (90 au 13/10/2026) ne sont pas touchées ici : leur sort relève d'un
-- arbitrage (alert-digest), le récapitulatif gardien les ignore désormais.
UPDATE public.sitter_digest_queue q
   SET status = 'skipped', skip_reason = 'not_sitter_role'
 WHERE q.status = 'queued'
   AND EXISTS (
     SELECT 1 FROM public.profiles p
      WHERE p.id = q.sitter_id AND p.role = 'owner'::user_role
   );

-- 4. P4-06 : lien d'email qui ouvre une session -------------------------------
-- 434 jetons émis et 92 sessions ouvertes depuis un email en 30 jours ; un
-- email transféré ouvrait le compte pendant 24 heures. Nouvelle règle :
-- - même compte déjà connecté : le lien suit, sans nouvelle session ;
-- - autre compte connecté : rien n'est consommé, la session en place reste ;
-- - aucune session : une session ne s'ouvre que pour un email immédiat
--   (new-message, new-application, first-application-received,
--   review-received, liste alignée sur DEEP_LINK_SESSION_TEMPLATES de
--   send-transactional-email) et dans les 2 heures qui suivent l'envoi ;
--   sinon connexion, destination conservée (reason login_required).
-- Le jeton reste à usage unique et vit 24 heures pour la destination.
-- À appliquer AVANT le redéploiement de email-deep-link (le paramètre
-- p_caller a une valeur par défaut, l'ancienne fonction edge reste servie).
DROP FUNCTION IF EXISTS public.consume_email_deep_link(text);
CREATE OR REPLACE FUNCTION public.consume_email_deep_link(p_token text, p_caller uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_email text;
  c_session_window constant interval := interval '2 hours';
  c_session_templates constant text[] := ARRAY[
    'new-message', 'new-application', 'first-application-received', 'review-received'
  ];
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{40,128}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  SELECT * INTO r FROM public.email_deep_link_tokens WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF r.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'consumed', 'target_path', r.target_path);
  END IF;

  IF r.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired', 'target_path', r.target_path);
  END IF;

  IF r.conversation_id IS NOT NULL THEN
    PERFORM 1 FROM public.conversations c
      WHERE c.id = r.conversation_id
        AND (c.owner_id = r.user_id OR c.sitter_id = r.user_id);
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
    END IF;
  END IF;

  -- Autre compte connecté sur ce navigateur : jeton intact, aucune session.
  IF p_caller IS NOT NULL AND p_caller <> r.user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'other_account', 'target_path', r.target_path);
  END IF;

  -- Même compte déjà connecté : le lien sert de raccourci.
  IF p_caller IS NOT NULL THEN
    UPDATE public.email_deep_link_tokens
       SET consumed_at = now()
     WHERE id = r.id AND consumed_at IS NULL;
    RETURN jsonb_build_object(
      'ok', true,
      'same_account', true,
      'target_path', r.target_path,
      'template_name', r.template_name,
      'message_id', r.message_id
    );
  END IF;

  -- Aucune session : relance ou lien de plus de 2 heures, connexion d'abord.
  IF r.template_name IS NULL
     OR NOT (r.template_name = ANY (c_session_templates))
     OR r.created_at < now() - c_session_window THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'login_required', 'target_path', r.target_path);
  END IF;

  UPDATE public.email_deep_link_tokens
     SET consumed_at = now()
   WHERE id = r.id AND consumed_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'consumed', 'target_path', r.target_path);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = r.user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'email', v_email,
    'target_path', r.target_path,
    'template_name', r.template_name,
    'message_id', r.message_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_email_deep_link(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_email_deep_link(text, uuid) TO service_role;
