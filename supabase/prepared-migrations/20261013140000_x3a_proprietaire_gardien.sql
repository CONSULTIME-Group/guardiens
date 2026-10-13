-- Lot X3a (13/10/2026) : défauts P1 des parcours propriétaire et gardien,
-- audit complet du 13/10 (constats A-04, A-08, B-02, B-04, B-05, B-06, B-17).
-- À appliquer après 20261013100000_x1_parcours_debloques.sql : le bloc 7
-- reprend applications_guard_status_update dans sa version X1.
--
-- 1. A-04 : get_public_sit rend à l'auteur sa propre annonce quel que soit son
--    statut (expirée, annulée, brouillon). 14 annonces expirées, 2 annulées et
--    31 notifications « Nouvelle candidature » menaient au renvoi « retirée ou
--    annulée » (base, 13/10/2026).
-- 2. A-08 : une garde terminée puis archivée reste ouverte aux avis
--    (sit_is_reviewable, politique d'insertion de reviews). 1 garde archivée
--    le 16/08 sans aucun avis.
-- 3. B-02 : quand le gardien retenu annule sa participation, sa candidature
--    passe en cancelled et l'annonce est republiée si la garde n'a pas commencé,
--    dans la même transaction que l'avis d'annulation.
-- 4. B-04 : « Votre candidature a bien été annulée » ne part plus que pour un
--    retrait fait par le gardien lui-même. 34 gardiens avaient reçu ce message
--    après l'expiration de l'annonce.
-- 5. B-05 : le plafond de candidatures se tient côté serveur : refus d'une
--    candidature sur une annonce fermée ou au plafond, fermeture automatique
--    au plafond. 3 annonces publiées dépassaient leur plafond.
-- 6. B-06 : le digest gardien n'écarte un gardien fumeur, avec enfants ou avec
--    animaux que si l'annonce (ou le propriétaire pour le tabac) le refuse
--    explicitement. 71 gardiens géolocalisés étaient écartés d'office.
-- 7. B-17 : sans changer de statut, un gardien ne modifie plus les champs de
--    sa candidature qui ne lui appartiennent pas ; drapeau dédié pour
--    l'annulation de participation (bloc 3).
-- 8. get_my_applications expose sit_cancelled_by_me : le gardien lit
--    « Participation annulée » au lieu de « Annonce annulée par le propriétaire ».

-- 1. A-04 ---------------------------------------------------------------
-- Seule la condition de statut change : l'auteur connecté lit sa ligne quel
-- que soit le statut (le brouillon l'était déjà). Le masquage des dates ne
-- s'applique jamais à l'auteur (COALESCE inchangé).
CREATE OR REPLACE FUNCTION public.get_public_sit(p_param text)
 RETURNS TABLE(id uuid, slug text, user_id uuid, property_id uuid, status text, title text, city text, country text, start_date date, end_date date, environments text[], daily_routine text, open_to text[], accepting_applications boolean, max_applications integer, specific_expectations text, owner_message text, flexible_dates boolean, flexibility_notes text, accepts_sitter_pets text, accepts_sitter_children text, published_at timestamp with time zone, cover_photo_url text, dates_hidden boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH s AS (
    SELECT *
    FROM public.sits
    WHERE (
      CASE
        WHEN p_param ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN sits.id = p_param::uuid
        ELSE sits.slug = p_param
      END
    )
      AND (
        sits.status::text = ANY (ARRAY['published','confirmed','in_progress','completed','archived'])
        -- Lot X3a (A-04) : l'auteur lit sa propre annonce quel que soit son statut.
        OR (auth.uid() IS NOT NULL AND auth.uid() = sits.user_id)
      )
    LIMIT 1
  ), h AS (
    SELECT s.*,
      (
        s.status::text = ANY (ARRAY['confirmed','in_progress','completed','archived'])
        AND (s.end_date IS NULL OR s.end_date >= current_date)
        -- CORRECTIF 02/08/2026 : coalesce obligatoire. Pour un visiteur anonyme,
        -- auth.uid() est NULL, donc « auth.uid() = user_id » valait NULL, le OR
        -- valait NULL, et NOT NULL valait NULL : hide n'etait jamais vrai et les
        -- dates d absence, la routine, la description et le message d hote de
        -- toute garde confirmee etaient exposes a tout internaute.
        AND NOT COALESCE(
          auth.uid() = s.user_id
          OR EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.sit_id = s.id AND a.sitter_id = auth.uid() AND a.status = 'accepted'
          ),
          false
        )
      ) AS hide
    FROM s
  )
  SELECT
    h.id, h.slug, h.user_id, h.property_id, h.status::text, h.title, h.city, h.country,
    CASE WHEN h.hide THEN NULL ELSE h.start_date END,
    CASE WHEN h.hide THEN NULL ELSE h.end_date END,
    h.environments::text[],
    CASE WHEN h.hide THEN NULL ELSE h.daily_routine END,
    h.open_to::text[], h.accepting_applications, h.max_applications,
    CASE WHEN h.hide THEN NULL ELSE h.specific_expectations END,
    CASE WHEN h.hide THEN NULL ELSE h.owner_message END,
    h.flexible_dates,
    CASE WHEN h.hide THEN NULL ELSE h.flexibility_notes END,
    h.accepts_sitter_pets, h.accepts_sitter_children, h.published_at, h.cover_photo_url,
    h.hide
  FROM h;
$function$;

-- 2. A-08 ---------------------------------------------------------------
-- Une garde est ouverte aux avis quand elle est terminée, ou archivée après
-- avoir été terminée (transition completed vers archived dans
-- sit_status_history, date de fin passée). Une garde annulée puis archivée
-- n'y entre jamais. SECURITY DEFINER : le gardien ne lit ni l'annonce
-- archivée ni son historique sous la RLS.
CREATE OR REPLACE FUNCTION public.sit_is_reviewable(p_sit_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.sits s
    WHERE s.id = p_sit_id
      AND (
        s.status = 'completed'::sit_status
        OR (
          s.status = 'archived'::sit_status
          AND s.end_date IS NOT NULL
          AND s.end_date < current_date
          AND EXISTS (
            SELECT 1 FROM public.sit_status_history h
            WHERE h.sit_id = s.id
              AND h.old_status = 'completed'
              AND h.new_status = 'archived'
          )
        )
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.sit_is_reviewable(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sit_is_reviewable(uuid) TO authenticated;

-- Même politique qu'en production, le test « status = completed » remplacé
-- par sit_is_reviewable. Les avis d'annulation passent toujours par
-- create_avis_annulation (SECURITY DEFINER), hors de cette politique.
DROP POLICY IF EXISTS "Users can create reviews for their sits" ON public.reviews;
CREATE POLICY "Users can create reviews for their sits"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND (
      EXISTS (
        SELECT 1 FROM public.sits
        WHERE sits.id = reviews.sit_id
          AND sits.user_id = auth.uid()
          AND public.sit_is_reviewable(sits.id)
      )
      OR EXISTS (
        SELECT 1 FROM public.applications
        WHERE applications.sit_id = reviews.sit_id
          AND applications.sitter_id = auth.uid()
          AND applications.status = 'accepted'::application_status
          AND public.sit_is_reviewable(applications.sit_id)
      )
    )
  );

-- 3. B-02 ---------------------------------------------------------------
-- Annulation de participation par le gardien retenu : tout se fait ici, dans
-- la transaction de l'avis d'annulation. L'annonce passe d'abord en cancelled
-- (les triggers notify_sit_cancelled et trigger_update_cancellations
-- préviennent le propriétaire et comptent l'annulation, candidature encore
-- acceptée), puis la candidature passe en cancelled, puis l'annonce est
-- republiée si la garde commence après aujourd'hui. Le navigateur du gardien
-- n'écrit plus rien sur sits ni applications (la RLS l'en empêchait sans
-- erreur). Côté propriétaire, rien ne change.
CREATE OR REPLACE FUNCTION public.create_avis_annulation(p_sit_id uuid, p_reviewer_id uuid, p_reviewee_id uuid, p_cancelled_by_role text, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_review_id uuid;
  v_actor_id uuid := auth.uid();
  v_owner_id uuid;
  v_sitter_id uuid;
  v_sit_status text;
  v_sit_title text;
  v_start_date date;
  v_expected_role text;
  v_expected_reviewee uuid;
BEGIN
  IF v_actor_id IS NULL OR p_reviewer_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION 'Accès non autorisé : reviewer_id invalide';
  END IF;

  -- Lock the current relationship while authorizing and recording this cancellation.
  SELECT user_id, status::text, title, start_date
    INTO v_owner_id, v_sit_status, v_sit_title, v_start_date
  FROM public.sits WHERE id = p_sit_id FOR UPDATE;
  IF NOT FOUND OR v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Accès non autorisé : participation non vérifiée';
  END IF;

  IF v_sit_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cette garde est déjà annulée';
  END IF;

  BEGIN
    SELECT sitter_id INTO STRICT v_sitter_id
    FROM public.applications
    WHERE sit_id = p_sit_id AND status = 'accepted'
    FOR UPDATE;
  EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN
    RAISE EXCEPTION 'Annulation impossible : gardien accepté non identifié de façon unique';
  END;

  IF v_sitter_id IS NULL OR v_sitter_id = v_owner_id THEN
    RAISE EXCEPTION 'Annulation impossible : participants invalides';
  END IF;

  IF v_actor_id = v_owner_id THEN
    v_expected_role := 'proprio';
    v_expected_reviewee := v_sitter_id;
  ELSIF v_actor_id = v_sitter_id THEN
    v_expected_role := 'gardien';
    v_expected_reviewee := v_owner_id;
  ELSE
    RAISE EXCEPTION 'Accès non autorisé : participation non vérifiée';
  END IF;

  IF p_cancelled_by_role IS DISTINCT FROM v_expected_role
     OR p_reviewee_id IS DISTINCT FROM v_expected_reviewee THEN
    RAISE EXCEPTION 'Accès non autorisé : rôle ou destinataire incohérent';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) < 20 THEN
    RAISE EXCEPTION 'La raison doit contenir au moins 20 caractères';
  END IF;
  IF length(p_reason) > 300 THEN
    RAISE EXCEPTION 'La raison ne peut pas dépasser 300 caractères';
  END IF;

  -- Atomique : l'index unique partiel (sit_id, reviewer_id) WHERE review_type = 'annulation'
  -- absorbe la course, la cible du ON CONFLICT le rend explicite.
  INSERT INTO public.reviews (
    sit_id, reviewer_id, reviewee_id,
    review_type, cancelled_by_role, cancellation_reason,
    moderation_status, overall_rating, created_at
  ) VALUES (
    p_sit_id, p_reviewer_id, p_reviewee_id,
    'annulation', p_cancelled_by_role, p_reason,
    'en_attente', 1, now()
  )
  ON CONFLICT (sit_id, reviewer_id) WHERE review_type = 'annulation' DO NOTHING
  RETURNING id INTO v_review_id;

  IF v_review_id IS NULL THEN
    RAISE EXCEPTION 'Avis déjà existant pour cette garde';
  END IF;

  UPDATE public.sits SET
    status = 'cancelled',
    cancelled_by = p_reviewer_id,
    cancelled_at = now()
  WHERE id = p_sit_id;

  -- Lot X3a (B-02) : le gardien retenu se retire de la garde.
  IF v_actor_id = v_sitter_id THEN
    -- Sa candidature acceptée passe en cancelled, par le seul drapeau que
    -- applications_guard_status_update accepte pour accepted vers cancelled.
    PERFORM set_config('app.sitter_cancel_participation', '1', true);
    UPDATE public.applications
       SET status = 'cancelled'::application_status
     WHERE sit_id = p_sit_id
       AND sitter_id = v_sitter_id
       AND status = 'accepted'::application_status;
    PERFORM set_config('app.sitter_cancel_participation', '', true);

    -- Garde à venir : l'annonce revient en ligne pour d'autres gardiens, et
    -- le propriétaire le lit dans sa cloche (en plus de « Garde annulée »).
    IF v_start_date IS NOT NULL AND v_start_date > current_date THEN
      UPDATE public.sits SET
        status = 'published',
        accepting_applications = true
      WHERE id = p_sit_id;

      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        v_owner_id,
        'sit_republished',
        'Annonce de nouveau en ligne',
        'Votre annonce « ' || coalesce(v_sit_title, 'votre garde') || ' » est de nouveau ouverte aux candidatures.',
        '/sits/' || p_sit_id
      );
    END IF;
  END IF;

  RETURN v_review_id;
END;
$function$;

-- 4. B-04 ---------------------------------------------------------------
-- La notification « Candidature annulée » ne part que pour un retrait fait
-- par le gardien lui-même : jamais pour une clôture système (expiration,
-- archivage, close_orphan_applications), une annulation décidée par le
-- propriétaire ou l'annulation de participation (bloc 3, prévenue autrement).
CREATE OR REPLACE FUNCTION public.notify_application_cancelled_by_sitter()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_sit_title text;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Lot X3a (B-04) : retrait volontaire du gardien seulement.
    IF coalesce(current_setting('app.system_close', true), '') = '1'
       OR coalesce(current_setting('app.sitter_cancel_participation', true), '') = '1'
       OR auth.uid() IS NULL
       OR auth.uid() IS DISTINCT FROM NEW.sitter_id THEN
      RETURN NEW;
    END IF;

    SELECT s.title INTO v_sit_title FROM public.sits s WHERE s.id = NEW.sit_id;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.sitter_id,
      'application_cancelled',
      'Candidature annulée',
      'Votre candidature pour « ' || coalesce(v_sit_title, 'une garde') || ' » a bien été annulée.',
      '/sits/' || NEW.sit_id
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. B-05 ---------------------------------------------------------------
-- Avant l'insertion : une candidature directe ne se crée que sur une annonce
-- publiée, ouverte, sous son plafond. Le verrou FOR UPDATE sur l'annonce
-- sérialise deux candidatures simultanées autour du plafond. Les propositions
-- privées (app.via_proposal_rpc, annonce en brouillon), le service_role et
-- l'admin passent. Même décompte que src/lib/applicationCap.ts (hors
-- rejected et cancelled).
CREATE OR REPLACE FUNCTION public.guard_application_sit_open()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_accepting boolean;
  v_max integer;
  v_live integer;
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR coalesce(current_setting('app.via_proposal_rpc', true), '') = '1'
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT s.status::text, s.accepting_applications, s.max_applications
    INTO v_status, v_accepting, v_max
    FROM public.sits s
   WHERE s.id = NEW.sit_id
   FOR UPDATE;

  IF v_status IS NULL OR v_status <> 'published' OR v_accepting IS FALSE THEN
    RAISE EXCEPTION 'SIT_CLOSED: cette annonce n''accepte plus de candidatures'
      USING ERRCODE = 'P0001', HINT = 'sit_closed';
  END IF;

  IF v_max IS NOT NULL AND v_max > 0 THEN
    SELECT count(*) INTO v_live
      FROM public.applications a
     WHERE a.sit_id = NEW.sit_id
       AND a.status NOT IN ('rejected'::application_status, 'cancelled'::application_status);
    IF v_live >= v_max THEN
      RAISE EXCEPTION 'SIT_CLOSED: cette annonce a reçu toutes les candidatures prévues'
        USING ERRCODE = 'P0001', HINT = 'sit_closed';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_application_sit_open ON public.applications;
CREATE TRIGGER trg_guard_application_sit_open
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_application_sit_open();

-- Après l'insertion : au plafond, l'annonce se ferme aux candidatures. Le
-- propriétaire la rouvre en relevant son plafond (ApplicationCapSection).
CREATE OR REPLACE FUNCTION public.close_sit_when_application_cap_reached()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max integer;
  v_live integer;
BEGIN
  SELECT s.max_applications INTO v_max FROM public.sits s WHERE s.id = NEW.sit_id;
  IF v_max IS NULL OR v_max <= 0 THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO v_live
    FROM public.applications a
   WHERE a.sit_id = NEW.sit_id
     AND a.status NOT IN ('rejected'::application_status, 'cancelled'::application_status);
  IF v_live >= v_max THEN
    UPDATE public.sits
       SET accepting_applications = false
     WHERE id = NEW.sit_id
       AND status = 'published'::sit_status
       AND accepting_applications IS DISTINCT FROM false;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_close_sit_when_application_cap_reached ON public.applications;
CREATE TRIGGER trg_close_sit_when_application_cap_reached
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.close_sit_when_application_cap_reached();

-- Rattrapage : les annonces publiées déjà au plafond se ferment (3 au 13/10/2026).
UPDATE public.sits s
   SET accepting_applications = false
 WHERE s.status = 'published'::sit_status
   AND s.max_applications IS NOT NULL
   AND s.max_applications > 0
   AND s.accepting_applications IS DISTINCT FROM false
   AND (
     SELECT count(*) FROM public.applications a
      WHERE a.sit_id = s.id
        AND a.status NOT IN ('rejected'::application_status, 'cancelled'::application_status)
   ) >= s.max_applications;

-- 6. B-06 ---------------------------------------------------------------
-- Définition de production, seul le réservoir change : un gardien fumeur
-- n'est écarté que si le propriétaire refuse les fumeurs
-- (owner_profiles.smoker_accepted = « Non »), un gardien avec enfants ou avec
-- ses animaux que si l'annonce dit « no » (accepts_sitter_children,
-- accepts_sitter_pets). « discuss », « yes » ou une valeur absente laissent
-- passer, comme le moteur d'affinité (_shared/affinity/score.ts).
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
    IF NOT EXISTS (
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

-- 7. B-17 ---------------------------------------------------------------
-- Version X1 en production, avec deux ajouts :
-- a) en tête, le gardien ne change ni l'annonce visée, ni le titulaire, ni
--    les champs écrits par le propriétaire ou le système (date d'envoi,
--    lecture, signal de tarif, motif et date de refus), statut changé ou non.
--    Placé avant tout le reste pour que le retrait ne serve pas de véhicule.
--    Aucun écran gardien n'écrit ces colonnes (viewed_at n'est écrit que par
--    mark_sit_applications_viewed, côté propriétaire).
-- b) app.sitter_cancel_participation, posé par create_avis_annulation (bloc 3),
--    seul chemin accepted vers cancelled pour le gardien retenu.
CREATE OR REPLACE FUNCTION public.applications_guard_status_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
BEGIN
  -- Lot X3a (B-17) : champs de la candidature hors de portée du gardien.
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.sitter_id
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND (NEW.sit_id IS DISTINCT FROM OLD.sit_id
          OR NEW.sitter_id IS DISTINCT FROM OLD.sitter_id
          OR NEW.created_at IS DISTINCT FROM OLD.created_at
          OR NEW.viewed_at IS DISTINCT FROM OLD.viewed_at
          OR NEW.pricing_flag IS DISTINCT FROM OLD.pricing_flag
          OR NEW.decline_reason IS DISTINCT FROM OLD.decline_reason
          OR NEW.decline_variant IS DISTINCT FROM OLD.decline_variant
          OR NEW.declined_at IS DISTINCT FROM OLD.declined_at) THEN
    RAISE EXCEPTION 'Modification interdite d''un champ de la candidature'
      USING ERRCODE = '42501';
  END IF;
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
  -- Lot X3a (B-02) : annulation de participation, depuis create_avis_annulation.
  IF coalesce(current_setting('app.sitter_cancel_participation', true), '') = '1'
     AND NEW.status = 'cancelled'::application_status
     AND OLD.status = 'accepted'::application_status THEN
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

-- 8. get_my_applications ------------------------------------------------
-- Même lecture qu'en production, une colonne ajoutée en dernier :
-- sit_cancelled_by_me (le gardien a lui-même annulé sa participation).
-- Le type de retour change : DROP puis CREATE, droits rétablis à l'identique
-- (authenticated et service_role).
DROP FUNCTION IF EXISTS public.get_my_applications();
CREATE FUNCTION public.get_my_applications()
 RETURNS TABLE(application_id uuid, status application_status, created_at timestamp with time zone, viewed_at timestamp with time zone, sit_id uuid, sit_status sit_status, sit_title text, sit_start_date date, sit_end_date date, sit_city text, owner_id uuid, cover_photo text, content_visible boolean, sit_cancelled_by_me boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    a.id,
    a.status,
    a.created_at,
    a.viewed_at,
    s.id,
    s.status,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL ELSE s.title END,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL ELSE s.start_date::date END,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL ELSE s.end_date::date END,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL ELSE s.city END,
    s.user_id,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL
         ELSE (SELECT p.photos[1] FROM properties p WHERE p.id = s.property_id) END,
    (s.status <> 'draft'::sit_status),
    (s.cancelled_by IS NOT NULL AND s.cancelled_by = a.sitter_id AND a.status = 'cancelled'::application_status)
  FROM applications a
  JOIN sits s ON s.id = a.sit_id
  WHERE a.sitter_id = auth.uid()
  ORDER BY a.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_my_applications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_applications() TO authenticated, service_role;
