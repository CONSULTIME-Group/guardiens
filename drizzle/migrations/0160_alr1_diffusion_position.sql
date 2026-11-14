-- Lot ALR1 (14/11/2026) : une annonce publiée sans position connue n'est plus
-- diffusée au hasard. Audit du système d'alertes du 14/11/2026
-- (claude/audit-systeme-alertes-14-novembre-2026.md, constat A1), « ok go » de
-- Jérémie. Repère : alr1_diffusion_position.
--
-- Constat : notify_sitters_on_new_sit lisait la position du propriétaire au
-- moment de la publication. Quand elle manquait (géocodage pas encore fait),
-- toutes les distances étaient nulles, le classement se faisait par
-- identifiant et la file du récapitulatif recevait toujours les mêmes
-- gardiens. Mesure du 14/11/2026 : 12 annonces sur 46 en 60 jours ; sur 8
-- d'entre elles, 760 envois vers les mêmes 143 gardiens, distance médiane
-- 403 km ; à Clarensac, 12 des 13 gardiens à moins de 30 km n'ont rien reçu.
--
-- Règle livrée :
--   1. Position de l'annonce : celle du propriétaire, sinon la commune de
--      l'annonce (geocode_cache), sinon la commune du profil du propriétaire.
--   2. Sans aucune position : aucune ligne de file, aucune cloche, un signal
--      sit_published_zero_reach qui dit que la diffusion attend la position.
--   3. Une zone « France entière » enregistrée en region + FR (Paramètres,
--      recherche) compte comme France, comme dans send-alert-digest (constat
--      A7 : elle ne donnait jamais la priorité, 5 zones le 14/11/2026).
--   4. Quand la position du propriétaire arrive (profiles.latitude passe de
--      vide à renseignée), ses annonces publiées depuis 14 jours, encore à
--      venir et sans aucune ligne de file sont diffusées, et le signal est
--      fermé (action_taken auto_resolved_diffused).
-- Le corps de la diffusion est repris de pg_get_functiondef en production le
-- 14/11/2026, dans public.notify_sitters_for_sit(uuid), appelée par le
-- déclencheur et par le rejeu ; règles de ciblage, plafonds et cloche
-- inchangés. Aucune donnée modifiée par la migration. Rejouable.

CREATE OR REPLACE FUNCTION public.notify_sitters_for_sit(p_sit_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- alr1_diffusion_position
  v_sit public.sits%ROWTYPE;
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
  c_rank_cap constant integer := 100;
  c_dormant_days constant integer := 90;
  c_dormant_period_days constant integer := 30;
  v_species_blocking boolean := false;
  v_smokers_refused boolean := false;
  v_children_refused boolean := false;
  v_pets_refused boolean := false;
  c_notify_max_km constant integer := 100;
BEGIN
  SELECT * INTO v_sit FROM public.sits WHERE id = p_sit_id;
  IF NOT FOUND OR v_sit.status::text <> 'published' THEN
    RETURN 0;
  END IF;

  SELECT array_agg(DISTINCT p.species::text)
    INTO pet_species
  FROM public.pets p
  WHERE p.property_id = v_sit.property_id;
  IF pet_species IS NULL THEN
    SELECT array_agg(DISTINCT p.species::text)
      INTO pet_species
    FROM public.pets p
    JOIN public.properties prop ON p.property_id = prop.id
    WHERE prop.user_id = v_sit.user_id;
  END IF;
  pet_species := COALESCE(pet_species, ARRAY[]::text[]);

  -- Position : propriétaire, sinon commune de l'annonce, sinon commune du profil.
  SELECT
    COALESCE(p.latitude, gc.lat, gco.lat),
    COALESCE(p.longitude, gc.lng, gco.lng),
    p.postal_code
  INTO sit_lat, sit_lng, v_owner_postal
  FROM public.profiles p
  LEFT JOIN public.geocode_cache gc
    ON gc.normalized_name = lower(unaccent(coalesce(v_sit.city, '')))
   AND coalesce(v_sit.city, '') <> ''
  LEFT JOIN public.geocode_cache gco
    ON gco.normalized_name = lower(unaccent(coalesce(p.city, '')))
   AND coalesce(p.city, '') <> ''
  WHERE p.id = v_sit.user_id;
  has_any_coords := (sit_lat IS NOT NULL AND sit_lng IS NOT NULL);

  IF NOT has_any_coords THEN
    -- Aucune diffusion au hasard : on attend la position (rejeu par
    -- profiles_rediffuse_on_location). Un seul signal ouvert par annonce.
    IF NOT EXISTS (
      SELECT 1 FROM public.admin_signals s
      WHERE s.signal_type = 'sit_published_zero_reach'
        AND s.entity_id = v_sit.id
        AND s.resolved_at IS NULL
    ) THEN
      INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
      VALUES (
        'sit_published_zero_reach',
        'critical',
        'sit',
        v_sit.id,
        jsonb_build_object(
          'city', v_sit.city,
          'species', pet_species,
          'has_coords', false,
          'waiting_location', true,
          'detail', 'Position du propriétaire et de la commune inconnues : diffusion en attente de la position.'
        )
      );
    END IF;
    RETURN 0;
  END IF;

  SELECT COALESCE(f.enabled, false) INTO v_species_blocking
  FROM public.feature_flags f
  WHERE f.key = 'species_filter_blocking';
  v_species_blocking := COALESCE(v_species_blocking, false);
  SELECT lower(btrim(coalesce(op.smoker_accepted, ''))) = 'non'
    INTO v_smokers_refused
  FROM public.owner_profiles op
  WHERE op.user_id = v_sit.user_id;
  v_smokers_refused := COALESCE(v_smokers_refused, false);
  v_children_refused := lower(btrim(coalesce(v_sit.accepts_sitter_children, ''))) = 'no';
  v_pets_refused := lower(btrim(coalesce(v_sit.accepts_sitter_pets, ''))) = 'no';
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
    AND s2.id IS DISTINCT FROM v_sit.id
    AND s2.start_date <= v_sit.end_date
    AND s2.end_date >= v_sit.start_date;
  FOR sitter IN
    WITH pool AS (
      SELECT
        sp.user_id,
        pr.last_seen_at,
        public.haversine_km(sit_lat, sit_lng, pr.latitude, pr.longitude) AS distance_km
      FROM public.sitter_profiles sp
      JOIN public.profiles pr ON pr.id = sp.user_id
      LEFT JOIN public.email_preferences ep ON ep.user_id = sp.user_id
      WHERE
        sp.user_id <> v_sit.user_id
        AND pr.latitude IS NOT NULL
        AND pr.longitude IS NOT NULL
        AND pr.role::text IS DISTINCT FROM 'owner'
        AND NOT (COALESCE(v_conflict_sitter_ids, '{}') @> ARRAY[sp.user_id])
        AND NOT EXISTS (
          SELECT 1 FROM public.blocked_users b
          WHERE (b.blocker_id = v_sit.user_id AND b.blocked_id = sp.user_id)
             OR (b.blocker_id = sp.user_id AND b.blocked_id = v_sit.user_id)
        )
        AND COALESCE(ep.new_sit_digest, true) = true
        AND NOT EXISTS (
          SELECT 1 FROM public.account_deletion_requests adr
          WHERE adr.user_id = sp.user_id AND adr.status = 'pending'
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.sitter_digest_queue q
          WHERE q.sit_id = v_sit.id AND q.sitter_id = sp.user_id
        )
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
              -- « France entière » des Paramètres et de la recherche : region + FR.
              OR (ap.zone_type = 'region' AND ap.region_code = 'FR')
              OR (ap.zone_type = 'departement' AND v_sit_dept IS NOT NULL AND ap.departement = v_sit_dept)
              OR (ap.zone_type = 'region' AND v_sit_region IS NOT NULL AND ap.region_code = v_sit_region)
              OR (
                ap.zone_type = 'rayon'
                AND (
                  (agc.lat IS NOT NULL AND agc.lng IS NOT NULL
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
        AND n.link = '/sits/' || v_sit.id::text
    ) THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        sitter.user_id,
        'new_sit_nearby',
        'Nouvelle annonce : ' || v_sit.title,
        'Une nouvelle garde est disponible'
          || COALESCE(' à ' || v_sit.city, '')
          || ' du ' || to_char(v_sit.start_date, 'DD/MM/YYYY')
          || ' au ' || to_char(v_sit.end_date, 'DD/MM/YYYY'),
        '/sits/' || v_sit.id::text
      );
    END IF;
    INSERT INTO public.sitter_digest_queue (sitter_id, sit_id, distance_km)
    VALUES (sitter.user_id, v_sit.id, sitter.distance_km)
    ON CONFLICT (sitter_id, sit_id) DO NOTHING;
    IF sitter.dormant THEN
      UPDATE public.sitter_digest_queue q
      SET status = 'skipped', skip_reason = 'dormant_monthly_cap'
      WHERE q.sitter_id = sitter.user_id
        AND q.sit_id <> v_sit.id
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
      v_sit.id,
      jsonb_build_object(
        'city', v_sit.city,
        'species', pet_species,
        'has_coords', true,
        'detail', 'Publication reussie mais aucun gardien mis en file de diffusion.'
      )
    );
  ELSE
    -- Diffusion faite : le signal d'attente de position se ferme.
    UPDATE public.admin_signals s
    SET resolved_at = now(), action_taken = 'auto_resolved_diffused'
    WHERE s.signal_type = 'sit_published_zero_reach'
      AND s.entity_id = v_sit.id
      AND s.resolved_at IS NULL
      AND COALESCE((s.metadata->>'waiting_location')::boolean, false);
  END IF;
  RETURN v_queued;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_sitters_for_sit(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_sitters_for_sit(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.notify_sitters_for_sit(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_sitters_for_sit(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_sitters_on_new_sit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- alr1_diffusion_position : mêmes conditions de départ qu'avant le lot.
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;
  PERFORM public.notify_sitters_for_sit(NEW.id);
  RETURN NEW;
END;
$function$;

-- Rejeu quand la position du propriétaire arrive. Ne bloque jamais
-- l'écriture du profil.
CREATE OR REPLACE FUNCTION public.profiles_rediffuse_on_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- alr1_diffusion_position
  v_sit_id uuid;
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL OR OLD.latitude IS NOT NULL THEN
    RETURN NEW;
  END IF;
  FOR v_sit_id IN
    SELECT s.id
    FROM public.sits s
    WHERE s.user_id = NEW.id
      AND s.status::text = 'published'
      AND s.published_at > now() - interval '14 days'
      AND (s.end_date IS NULL OR s.end_date >= current_date)
      AND NOT EXISTS (SELECT 1 FROM public.sitter_digest_queue q WHERE q.sit_id = s.id)
  LOOP
    BEGIN
      PERFORM public.notify_sitters_for_sit(v_sit_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'alr1 rediffusion %: %', v_sit_id, SQLERRM;
    END;
  END LOOP;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_profiles_rediffuse_on_location ON public.profiles;
CREATE TRIGGER trg_profiles_rediffuse_on_location
AFTER UPDATE OF latitude, longitude ON public.profiles
FOR EACH ROW
WHEN (OLD.latitude IS NULL AND NEW.latitude IS NOT NULL)
EXECUTE FUNCTION public.profiles_rediffuse_on_location();
