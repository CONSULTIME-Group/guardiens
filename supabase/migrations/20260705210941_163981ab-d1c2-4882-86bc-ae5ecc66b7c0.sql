
-- Helper standalone : normalisation espèce -> code canonique
CREATE OR REPLACE FUNCTION public._normalize_species_pg(v text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF v IS NULL THEN RETURN NULL; END IF;
  v := lower(trim(v));
  RETURN CASE v
    WHEN 'chien' THEN 'dog' WHEN 'chiens' THEN 'dog'
    WHEN 'chat' THEN 'cat' WHEN 'chats' THEN 'cat'
    WHEN 'oiseau' THEN 'bird' WHEN 'oiseaux' THEN 'bird'
    WHEN 'rongeur' THEN 'rodent' WHEN 'rongeurs' THEN 'rodent'
    WHEN 'reptiles' THEN 'reptile'
    WHEN 'cheval' THEN 'horse' WHEN 'chevaux' THEN 'horse'
    WHEN 'animal de ferme' THEN 'farm_animal'
    WHEN 'animaux de ferme' THEN 'farm_animal'
    WHEN 'tous' THEN 'all'
    ELSE v
  END;
END;
$$;

REVOKE ALL ON FUNCTION public._normalize_species_pg(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._normalize_species_pg(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.calculate_affinity_score_pg(
  owner_id uuid,
  sitter_id uuid
) RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_pref RECORD;
  v_sitter RECORD;
  v_owner_species text[];
  v_sitter_animals text[];
  v_evaluated integer := 0;
  v_points numeric := 0;
  v_max_weight constant integer := 9;
  v_inter integer;
  v_ratio numeric;
  v_ambiance numeric;
  v_life_pace text;
BEGIN
  SELECT sp.* INTO v_sitter
  FROM public.sitter_profiles sp
  WHERE sp.user_id = sitter_id
  LIMIT 1;

  IF v_sitter IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_owner_pref
  FROM public.owner_profiles
  WHERE user_id = owner_id
  LIMIT 1;

  SELECT array_agg(DISTINCT public._normalize_species_pg(pt.species::text))
  INTO v_owner_species
  FROM public.properties pr
  JOIN public.pets pt ON pt.property_id = pr.id
  WHERE pr.user_id = owner_id
    AND pt.species IS NOT NULL;

  IF v_sitter.animal_types IS NOT NULL THEN
    SELECT array_agg(public._normalize_species_pg(x))
    INTO v_sitter_animals
    FROM unnest(v_sitter.animal_types) AS x;
  END IF;

  -- 1. Animaux (poids 2)
  IF v_owner_species IS NOT NULL AND array_length(v_owner_species, 1) > 0
     AND v_sitter_animals IS NOT NULL AND array_length(v_sitter_animals, 1) > 0
  THEN
    v_evaluated := v_evaluated + 1;
    IF 'all' = ANY(v_sitter_animals) THEN
      v_inter := array_length(v_owner_species, 1);
    ELSE
      SELECT count(*)::int INTO v_inter
      FROM unnest(v_owner_species) x
      WHERE x = ANY(v_sitter_animals);
    END IF;
    IF v_inter > 0 THEN
      v_ratio := LEAST(1, v_inter::numeric / array_length(v_owner_species, 1));
      v_points := v_points + v_ratio * 2;
    END IF;
  END IF;

  -- 2. Présence (poids 2) : approximation via availability_during
  IF v_owner_pref.presence_expected IS NOT NULL
     AND v_sitter.availability_during IS NOT NULL
  THEN
    v_evaluated := v_evaluated + 1;
    IF v_owner_pref.presence_expected = '100% sur place' THEN
      v_points := v_points + 2;
    ELSIF position(lower(v_sitter.availability_during) in lower(v_owner_pref.presence_expected)) > 0
       OR position(lower(v_owner_pref.presence_expected) in lower(v_sitter.availability_during)) > 0
    THEN
      v_points := v_points + 2;
    ELSE
      v_points := v_points + 1;
    END IF;
  END IF;

  -- 3. Rythme (poids 1) : sitter lifestyle array vs owner life_pace
  IF v_owner_pref.life_pace IS NOT NULL AND v_sitter.lifestyle IS NOT NULL
     AND array_length(v_sitter.lifestyle, 1) > 0
  THEN
    v_life_pace := lower(v_owner_pref.life_pace);
    v_evaluated := v_evaluated + 1;
    IF EXISTS (SELECT 1 FROM unnest(v_sitter.lifestyle) x WHERE lower(x) = v_life_pace) THEN
      v_points := v_points + 1;
    ELSIF v_life_pace = 'equilibre' AND EXISTS (
      SELECT 1 FROM unnest(v_sitter.lifestyle) x WHERE lower(x) IN ('calme','actif')
    ) THEN
      v_points := v_points + 0.5;
    ELSIF v_life_pace IN ('calme','actif') AND EXISTS (
      SELECT 1 FROM unnest(v_sitter.lifestyle) x WHERE lower(x) = 'equilibre'
    ) THEN
      v_points := v_points + 0.5;
    END IF;
  END IF;

  -- 4. Langues (poids 1)
  IF v_owner_pref.languages IS NOT NULL AND array_length(v_owner_pref.languages, 1) > 0
     AND v_sitter.languages IS NOT NULL AND array_length(v_sitter.languages, 1) > 0
  THEN
    v_evaluated := v_evaluated + 1;
    IF v_owner_pref.languages && v_sitter.languages THEN
      v_points := v_points + 1;
    END IF;
  END IF;

  -- 5. Intérêts (poids 1)
  IF v_owner_pref.interests IS NOT NULL AND array_length(v_owner_pref.interests, 1) > 0
     AND v_sitter.interests IS NOT NULL AND array_length(v_sitter.interests, 1) > 0
  THEN
    v_evaluated := v_evaluated + 1;
    SELECT count(*)::int INTO v_inter
    FROM unnest(v_owner_pref.interests) x
    WHERE x = ANY(v_sitter.interests);
    IF v_inter >= 2 THEN
      v_points := v_points + 1;
    ELSIF v_inter = 1 THEN
      v_points := v_points + 0.5;
    END IF;
  END IF;

  -- 6. Profil idéal (poids 1)
  IF v_owner_pref.preferred_sitter_types IS NOT NULL
     AND array_length(v_owner_pref.preferred_sitter_types, 1) > 0
     AND v_sitter.sitter_type IS NOT NULL
     AND NOT ('Sans préférence' = ANY(v_owner_pref.preferred_sitter_types))
  THEN
    v_evaluated := v_evaluated + 1;
    IF EXISTS (
      SELECT 1 FROM unnest(v_owner_pref.preferred_sitter_types) x
      WHERE lower(v_sitter.sitter_type) LIKE '%' || lower(split_part(x, '·', 1)) || '%'
    ) THEN
      v_points := v_points + 1;
    ELSIF 'Gardien·ne expérimenté·e' = ANY(v_owner_pref.preferred_sitter_types)
      AND v_sitter.experience_years IS NOT NULL AND v_sitter.experience_years <> '0'
    THEN
      v_points := v_points + 1;
    END IF;
  END IF;

  -- 7. Ambiance foyer (poids 1)
  IF v_owner_pref.home_ambiance IS NOT NULL
     AND array_length(v_owner_pref.home_ambiance, 1) > 0
     AND (v_sitter.lifestyle IS NOT NULL OR v_sitter.interests IS NOT NULL)
  THEN
    v_evaluated := v_evaluated + 1;
    v_ambiance := 0;

    IF 'Cocon casanier' = ANY(v_owner_pref.home_ambiance)
       AND v_sitter.lifestyle IS NOT NULL
       AND EXISTS (SELECT 1 FROM unnest(v_sitter.lifestyle) x WHERE lower(x) = 'calme')
    THEN v_ambiance := GREATEST(v_ambiance, 1); END IF;

    IF 'Calme et posé' = ANY(v_owner_pref.home_ambiance)
       AND v_sitter.lifestyle IS NOT NULL
       AND EXISTS (SELECT 1 FROM unnest(v_sitter.lifestyle) x WHERE lower(x) IN ('calme','equilibre'))
    THEN v_ambiance := GREATEST(v_ambiance, 1); END IF;

    IF 'Sportif outdoor' = ANY(v_owner_pref.home_ambiance) THEN
      IF v_sitter.lifestyle IS NOT NULL
         AND EXISTS (SELECT 1 FROM unnest(v_sitter.lifestyle) x WHERE lower(x) = 'actif')
      THEN v_ambiance := GREATEST(v_ambiance, 1); END IF;
      IF v_sitter.interests IS NOT NULL
         AND v_sitter.interests && ARRAY['Randonnée','Course à pied','Vélo','Ski','Sports nautiques']::text[]
      THEN v_ambiance := GREATEST(v_ambiance, 1); END IF;
    END IF;

    IF 'Campagne' = ANY(v_owner_pref.home_ambiance)
       AND v_sitter.interests IS NOT NULL
       AND v_sitter.interests && ARRAY['Randonnée','Jardinage']::text[]
    THEN v_ambiance := GREATEST(v_ambiance, 0.5); END IF;

    IF 'Famille animée' = ANY(v_owner_pref.home_ambiance)
       AND v_sitter.sitter_type IS NOT NULL
       AND (lower(v_sitter.sitter_type) LIKE '%famille%' OR lower(v_sitter.sitter_type) LIKE '%couple%')
    THEN v_ambiance := GREATEST(v_ambiance, 1); END IF;

    v_points := v_points + v_ambiance;
  END IF;

  IF v_evaluated < 3 THEN
    RETURN NULL;
  END IF;

  RETURN GREATEST(0, LEAST(100, round((v_points / v_max_weight) * 100)::int));
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_affinity_score_pg(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_affinity_score_pg(uuid, uuid) TO authenticated, service_role;

-- Cron 18h UTC (20h Paris été)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sitter-daily-digest') THEN
    PERFORM cron.schedule(
      'sitter-daily-digest',
      '0 18 * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-sitter-daily-digest',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
        ),
        body := '{}'::jsonb
      );
      $cron$
    );
  END IF;
END $$;
