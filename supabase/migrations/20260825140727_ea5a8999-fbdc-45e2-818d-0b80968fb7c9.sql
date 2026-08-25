CREATE OR REPLACE FUNCTION public.notify_sitters_on_new_sit()
RETURNS TRIGGER
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

  SELECT array_agg(DISTINCT sn.need)
    INTO required_skills
  FROM public.pets p
  CROSS JOIN LATERAL unnest(string_to_array(coalesce(p.special_needs, ''), ',')) AS sn(need)
  WHERE p.property_id = NEW.property_id
    AND btrim(sn.need) <> '';

  IF required_skills IS NULL AND NEW.property_id IS NULL THEN
    SELECT array_agg(DISTINCT sn.need)
      INTO required_skills
    FROM public.pets p
    CROSS JOIN LATERAL unnest(string_to_array(coalesce(p.special_needs, ''), ',')) AS sn(need)
    JOIN public.properties prop ON p.property_id = prop.id
    WHERE prop.user_id = NEW.user_id
      AND btrim(sn.need) <> '';
  END IF;

  required_skills := COALESCE(required_skills, ARRAY[]::text[]);

  SELECT
    COALESCE(p.latitude, gc.lat),
    COALESCE(p.longitude, gc.lng)
  INTO sit_lat, sit_lng
  FROM public.profiles p
  LEFT JOIN public.geocode_cache gc ON gc.normalized_name = lower(unaccent(coalesce(NEW.city, '')))
  WHERE p.id = NEW.user_id;

  has_any_coords := (sit_lat IS NOT NULL AND sit_lng IS NOT NULL);

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
    SELECT
      sp.user_id,
      pr.latitude AS sitter_lat,
      pr.longitude AS sitter_lng,
      sp.animal_types,
      sp.special_animal_skills,
      sp.smoker,
      sp.travels_with_children,
      sp.travels_with_own_animals,
      COALESCE(ep.new_sit_digest, true) AS notif_enabled,
      sp.geographic_radius
    FROM public.sitter_profiles sp
    JOIN public.profiles pr ON pr.id = sp.user_id
    LEFT JOIN public.email_preferences ep ON ep.user_id = sp.user_id
    WHERE
      sp.user_id <> NEW.user_id
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
      AND (
        NOT has_any_coords
        OR pr.latitude IS NULL
        OR pr.longitude IS NULL
        OR public.haversine_km(sit_lat, sit_lng, pr.latitude, pr.longitude) <= public.effective_search_radius(sp.geographic_radius)
      )
  LOOP
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
        'Une nouvelle garde est disponible à ' || NEW.city || ' du ' ||
          to_char(NEW.start_date, 'DD/MM/YYYY') || ' au ' || to_char(NEW.end_date, 'DD/MM/YYYY'),
        '/sits/' || NEW.id::text
      );
    END IF;

    INSERT INTO public.sitter_digest_queue (sitter_id, sit_id)
    VALUES (sitter.user_id, NEW.id)
    ON CONFLICT (sitter_id, sit_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_sitters_on_new_sit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_sitters_on_new_sit() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_sitters_on_new_sit() FROM authenticated;