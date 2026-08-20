-- Chantier A (décision du 20/08/2026) : le rayon de déplacement gardien
-- passe à 100 km par défaut. Aucune ligne existante n'est modifiée : les
-- profils restés à 30 km (ancien défaut de colonne copié sans question
-- posée) gardent 30 en base. Ce marqueur de silence est relu comme une
-- absence de réponse, soit 100 km effectifs, dans UNE fonction unique.

ALTER TABLE public.sitter_profiles ALTER COLUMN geographic_radius SET DEFAULT 100;

CREATE OR REPLACE FUNCTION public.effective_search_radius(declared integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN declared IS NULL OR declared = 30 THEN 100 ELSE declared END;
$$;

COMMENT ON FUNCTION public.effective_search_radius(integer) IS 'Règle de lecture unique du rayon gardien (décision du 20/08/2026). 30 km est le marqueur de silence, ancien défaut de colonne copié sans question posée : NULL ou 30 se lisent comme une absence de réponse, soit 100 km effectifs. Toute autre valeur est une déclaration respectée au kilomètre près. Miroir client et fonctions edge : supabase/functions/_shared/search-radius.ts. Aucune ligne existante n est réécrite, la règle se joue à la lecture.';

-- Diffusion des nouvelles annonces : l'ancien coalesce(..., 30) en dur est
-- remplacé par la règle de lecture unique. Corps repris à l'identique,
-- seule la ligne du rayon change.
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
  pet_species text[];
  required_skills text[];
  incompatibles jsonb := '[]'::jsonb;
  has_any_coords boolean;
  species_item text;
  sitter_norm text[];
  required_norm text[];
  v_pet_ids uuid[];
  v_conflict_sitter_ids uuid[];
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  -- 1. Récupérer les animaux liés à l'annonce (prioritaire), sinon ceux du logement
  SELECT array_agg(DISTINCT p.species::text)
    INTO pet_species
  FROM public.sit_pets sp2
  JOIN public.pets p ON p.id = sp2.pet_id
  WHERE sp2.sit_id = NEW.id;

  IF pet_species IS NULL AND NEW.property_id IS NOT NULL THEN
    SELECT array_agg(DISTINCT p.species::text)
      INTO pet_species
    FROM public.pets p
    WHERE p.property_id = NEW.property_id;
  END IF;

  IF pet_species IS NULL THEN
    SELECT array_agg(DISTINCT p.species::text)
      INTO pet_species
    FROM public.pets p
    JOIN public.properties prop ON p.property_id = prop.id
    WHERE prop.user_id = NEW.user_id;
  END IF;

  pet_species := COALESCE(pet_species, ARRAY[]::text[]);

  -- 1bis. Compétences exigées par les besoins spécifiques des animaux.
  SELECT array_agg(DISTINCT sn.need)
    INTO required_skills
  FROM public.pets p
  CROSS JOIN LATERAL unnest(p.special_needs) AS sn(need)
  WHERE p.id IN (
    SELECT pet_id FROM public.sit_pets WHERE sit_id = NEW.id
    UNION
    SELECT p2.id FROM public.pets p2 WHERE p2.property_id = NEW.property_id
  );

  IF required_skills IS NULL AND NEW.property_id IS NULL THEN
    SELECT array_agg(DISTINCT sn.need)
      INTO required_skills
    FROM public.pets p
    CROSS JOIN LATERAL unnest(p.special_needs) AS sn(need)
    JOIN public.properties prop ON p.property_id = prop.id
    WHERE prop.user_id = NEW.user_id;
  END IF;

  required_skills := COALESCE(required_skills, ARRAY[]::text[]);

  -- 2. Géolocalisation du logement (fallback : cache de géocodage sur la ville)
  SELECT
    COALESCE(p.latitude, gc.lat),
    COALESCE(p.longitude, gc.lng)
  INTO sit_lat, sit_lng
  FROM public.profiles p
  LEFT JOIN public.geocode_cache gc ON gc.normalized_name = lower(unaccent(coalesce(NEW.city, '')))
  WHERE p.id = NEW.user_id;

  has_any_coords := (sit_lat IS NOT NULL AND sit_lng IS NOT NULL);

  -- 2bis. Gardiens déjà engagés sur une garde confirmée qui chevauche
  SELECT array_agg(DISTINCT s2.assigned_sitter_id)
    INTO v_conflict_sitter_ids
  FROM public.sits s2
  WHERE s2.assigned_sitter_id IS NOT NULL
    AND s2.status IN ('confirmed', 'in_progress')
    AND s2.id IS DISTINCT FROM NEW.id
    AND s2.start_date <= NEW.end_date
    AND s2.end_date >= NEW.start_date;

  -- 3. Boucle sur les gardiens éligibles
  FOR sitter IN
    SELECT
      sp.user_id,
      pr.latitude AS sitter_lat,
      pr.longitude AS sitter_lng,
      sp.animal_types,
      sp.special_animal_skills,
      sp.housing_rules,
      sp.smoker,
      sp.travels_with_children,
      sp.travels_with_own_animals,
      COALESCE(np.sit_notifications_enabled, true) AS notif_enabled,
      sp.geographic_radius
    FROM public.sitter_profiles sp
    JOIN public.profiles pr ON pr.id = sp.user_id
    LEFT JOIN public.notification_preferences np ON np.user_id = sp.user_id
    WHERE
      sp.user_id <> NEW.user_id
      AND NOT (COALESCE(v_conflict_sitter_ids, '{}') @> ARRAY[sp.user_id])
      AND NOT EXISTS (
        SELECT 1 FROM public.blocked_users b
        WHERE (b.blocker_id = NEW.user_id AND b.blocked_id = sp.user_id)
           OR (b.blocker_id = sp.user_id AND b.blocked_id = NEW.user_id)
      )
      AND COALESCE(np.sit_notifications_enabled, true) = true
      AND sp.deleted_at IS NULL
      AND pr.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.account_deletion_requests adr
        WHERE adr.user_id = sp.user_id AND adr.status = 'pending'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.sit_notification_log l
        WHERE l.sit_id = NEW.id AND l.sitter_id = sp.user_id
      )
      -- Limitation au rayon géographique déclaré par le gardien. Règle de
      -- lecture unique (décision du 20/08/2026) : public.effective_search_radius,
      -- 30 km est le marqueur de silence, lu comme 100 km effectifs.
      AND (
        NOT has_any_coords
        OR pr.latitude IS NULL
        OR pr.longitude IS NULL
        OR public.haversine_km(sit_lat, sit_lng, pr.latitude, pr.longitude) <= public.effective_search_radius(sp.geographic_radius)
      )
  LOOP
    -- 4. Exclusions sur incompatibilités DÉCLARÉES uniquement
    IF sitter.animal_types IS NOT NULL AND array_length(sitter.animal_types, 1) > 0 THEN
      sitter_norm := (SELECT array_agg(lower(trim(x))) FROM unnest(sitter.animal_types) AS t(x));

      FOREACH species_item IN ARRAY pet_species LOOP
        IF NOT EXISTS (
          SELECT 1 FROM unnest(sitter_norm) AS s(x)
          WHERE s.x = lower(trim(species_item))
             OR s.x IN ('tous', 'toutes')
             OR (s.x IN ('chien', 'chiens', 'dog', 'dogs') AND lower(species_item) IN ('chien', 'chiens', 'dog', 'dogs'))
             OR (s.x IN ('chat', 'chats', 'cat', 'cats') AND lower(species_item) IN ('chat', 'chats', 'cat', 'cats'))
             OR (s.x IN ('cheval', 'chevaux', 'horse', 'horses', 'poney', 'poneys') AND lower(species_item) IN ('cheval', 'chevaux', 'horse', 'horses', 'poney', 'poneys'))
        ) THEN
          incompatibles := incompatibles || jsonb_build_object('user_id', sitter.user_id, 'reason', 'species_declared', 'species', species_item);
          CONTINUE;
        END IF;
      END LOOP;
    END IF;

    IF array_length(required_skills, 1) > 0 THEN
      required_norm := (SELECT array_agg(lower(trim(x))) FROM unnest(required_skills) AS t(x));
      IF sitter.special_animal_skills IS NULL
         OR array_length(sitter.special_animal_skills, 1) IS NULL
         OR NOT (SELECT array_agg(lower(trim(x))) FROM unnest(sitter.special_animal_skills) AS t(x)) && required_norm THEN
        incompatibles := incompatibles || jsonb_build_object('user_id', sitter.user_id, 'reason', 'missing_skill');
        CONTINUE;
      END IF;
    END IF;

    IF sitter.smoker IS TRUE THEN
      incompatibles := incompatibles || jsonb_build_object('user_id', sitter.user_id, 'reason', 'smoker');
      CONTINUE;
    END IF;

    IF sitter.travels_with_children IS TRUE THEN
      incompatibles := incompatibles || jsonb_build_object('user_id', sitter.user_id, 'reason', 'travels_with_children');
      CONTINUE;
    END IF;

    IF sitter.travels_with_own_animals IS TRUE THEN
      incompatibles := incompatibles || jsonb_build_object('user_id', sitter.user_id, 'reason', 'travels_with_animals');
      CONTINUE;
    END IF;

    -- 5. Notification en base, éligibilité email lue au moment de l'envoi
    INSERT INTO public.notifications (user_id, type, title, message, action_url, data)
    VALUES (
      sitter.user_id,
      'new_sit_nearby',
      'Nouvelle annonce : ' || NEW.title,
      'Une nouvelle garde est disponible à ' || NEW.city || ' du ' ||
        to_char(NEW.start_date, 'DD/MM/YYYY') || ' au ' || to_char(NEW.end_date, 'DD/MM/YYYY'),
      '/sits/' || NEW.id,
      jsonb_build_object(
        'sit_id', NEW.id,
        'owner_id', NEW.user_id,
        'city', NEW.city,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date
      )
    );

    -- 6. Journal de déduplication (même annonce, même gardien)
    INSERT INTO public.sit_notification_log (sit_id, sitter_id, notification_type, status)
    VALUES (NEW.id, sitter.user_id, 'new_sit_nearby', 'pending')
    ON CONFLICT (sit_id, sitter_id) DO NOTHING;

    -- 7. File du digest quotidien (envoi groupé 09:00, fuseau Paris)
    INSERT INTO public.sitter_digest_queue (sitter_id, sit_id)
    VALUES (sitter.user_id, NEW.id)
    ON CONFLICT (sitter_id, sit_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Bloc « occasions manquées » : ajout du sujet rayon. Le gardien qui n'a
-- pas répondu (NULL ou marqueur 30) voit le nombre d'annonces en ligne dans
-- la bande que les 100 km effectifs ajoutent au delà de l'ancien marqueur.
CREATE OR REPLACE FUNCTION public.sitter_missing_opportunities()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_sp public.sitter_profiles%ROWTYPE;
  v_total integer;
  v_sitter_lat double precision;
  v_sitter_lng double precision;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_sp FROM public.sitter_profiles WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Coordonnées du gardien : profil, repli sur le cache de géocodage de sa ville.
  SELECT
    COALESCE(p.latitude, gc.lat),
    COALESCE(p.longitude, gc.lng)
  INTO v_sitter_lat, v_sitter_lng
  FROM public.profiles p
  LEFT JOIN public.geocode_cache gc ON gc.normalized_name = lower(unaccent(coalesce(p.city, '')))
  WHERE p.id = v_uid;

  SELECT count(*) INTO v_total
  FROM public.sits s
  WHERE s.status = 'published';

  RETURN jsonb_build_object(
    'total_sits', v_total,
    'items', jsonb_build_array(
      jsonb_build_object(
        'key', 'radius',
        -- 30 est le marqueur de silence : seule une valeur différente de 30
        -- compte comme réponse. Lecture : public.effective_search_radius.
        'answered', (v_sp.geographic_radius IS NOT NULL AND v_sp.geographic_radius <> 30),
        -- Annonces dans la bande ajoutée par les 100 km effectifs au delà
        -- de l'ancien marqueur de 30 km. Zéro si le gardien est sans
        -- coordonnées : rien de chiffrable, rien d'affiché.
        'concerned', (
          SELECT count(*) FROM (
            SELECT public.haversine_km(
              v_sitter_lat, v_sitter_lng,
              COALESCE(opr.latitude, sgc.lat),
              COALESCE(opr.longitude, sgc.lng)
            ) AS dist
            FROM public.sits s
            LEFT JOIN public.profiles opr ON opr.id = s.user_id
            LEFT JOIN public.geocode_cache sgc ON sgc.normalized_name = lower(unaccent(coalesce(s.city, '')))
            WHERE s.status = 'published'
          ) d
          WHERE d.dist > 30
            AND d.dist <= public.effective_search_radius(NULL)
        )
      ),
      jsonb_build_object(
        'key', 'vehicle',
        'answered', (v_sp.has_vehicle IS NOT NULL OR v_sp.has_license IS NOT NULL),
        'concerned', (
          SELECT count(*)
          FROM public.sits s
          JOIN public.properties pr ON pr.id = s.property_id
          WHERE s.status = 'published' AND pr.car_required = true
        )
      ),
      jsonb_build_object(
        'key', 'species',
        'answered', (v_sp.animal_types IS NOT NULL AND array_length(v_sp.animal_types, 1) > 0),
        'concerned', (
          SELECT count(DISTINCT p.property_id)
          FROM public.sits s
          JOIN public.pets p ON p.property_id = s.property_id
          WHERE s.status = 'published'
        )
      ),
      jsonb_build_object(
        'key', 'work',
        'answered', (v_sp.work_during_sit IS NOT NULL OR v_sp.availability_during IS NOT NULL),
        'concerned', (
          SELECT count(*)
          FROM public.sits s
          JOIN public.owner_profiles op ON op.user_id = s.user_id
          WHERE s.status = 'published' AND op.presence_expected IS NOT NULL
        )
      ),
      jsonb_build_object(
        'key', 'sitter_type',
        'answered', (v_sp.sitter_type IS NOT NULL),
        'concerned', (
          SELECT count(*)
          FROM public.sits s
          JOIN public.owner_profiles op ON op.user_id = s.user_id
          WHERE s.status = 'published'
            AND op.preferred_sitter_types IS NOT NULL
            AND array_length(op.preferred_sitter_types, 1) > 0
        )
      ),
      jsonb_build_object(
        'key', 'pace',
        'answered', (v_sp.life_pace IS NOT NULL OR v_sp.lifestyle IS NOT NULL),
        'concerned', (
          SELECT count(*)
          FROM public.sits s
          JOIN public.owner_profiles op ON op.user_id = s.user_id
          WHERE s.status = 'published' AND op.home_ambiance IS NOT NULL
        )
      ),
      jsonb_build_object(
        'key', 'languages',
        'answered', (v_sp.languages IS NOT NULL AND array_length(v_sp.languages, 1) > 0),
        'concerned', (
          SELECT count(*)
          FROM public.sits s
          JOIN public.owner_profiles op ON op.user_id = s.user_id
          WHERE s.status = 'published'
            AND op.languages IS NOT NULL
            AND array_length(op.languages, 1) > 0
        )
      )
    )
  );
END;
$function$;

-- Sauvegarde datée avant rattachage des photos de logement (règle : toute
-- migration de données écrit d'abord une table de sauvegarde). Remplie
-- juste avant l'écriture, aucune donnée n'est copiée dans cette migration.
CREATE TABLE public._backup_property_photos_20260820 (
  property_id uuid PRIMARY KEY,
  user_id uuid,
  photos text[],
  cover_photo_url text,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public._backup_property_photos_20260820 TO service_role;

ALTER TABLE public._backup_property_photos_20260820 ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public._backup_property_photos_20260820 IS 'Sauvegarde de properties.photos et properties.cover_photo_url avant le rattachage des photos de logement du 20/08/2026. Ne pas supprimer sans validation explicite.';