-- Filtre espece rendu reversible : drapeau feature_flags.species_filter_blocking,
-- desactive par defaut, comportement anterieur (filtre inerte) restaure.
INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('species_filter_blocking', false, 'Exclut de la diffusion les gardiens dont les especes declarees ne couvrent pas celles de l annonce. Desactive par defaut.')
ON CONFLICT (key) DO NOTHING;

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
  -- Filtre espece : dans l'ancien declencheur il etait inerte (CONTINUE place
  -- dans la boucle interne). Le rendre bloquant est une decision produit, pas
  -- un correctif. Il reste donc derriere un drapeau, desactive par defaut.
  v_species_blocking boolean := false;
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
        AND sp.smoker IS DISTINCT FROM true
        AND sp.travels_with_children IS DISTINCT FROM true
        AND sp.travels_with_own_animals IS DISTINCT FROM true
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

COMMENT ON FUNCTION public.notify_sitters_on_new_sit() IS
  'Diffusion des annonces : exclusions dures inchangees, classement par proximite seule, plafond de 100, priorite hors plafond aux alertes configurees a la main (source IS NULL), gardiens sans coordonnees hors diffusion, dormants limites a une annonce par mois. Ecrit distance_km en file.';