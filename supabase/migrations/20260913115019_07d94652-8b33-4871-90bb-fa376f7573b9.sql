CREATE OR REPLACE FUNCTION public.search_alma_knowledge(p_query text, p_limit integer DEFAULT 3)
 RETURNS TABLE(source text, title text, url text, snippet text, rank real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_q tsquery;
  v_q_or tsquery;
  v_norm text := public.immutable_unaccent(coalesce(p_query, ''));
  v_per_source int := 1;
  v_limit int := least(greatest(1, coalesce(p_limit, 3)), 5);
  v_min_share constant real := 0.15;
  v_min_share_article constant real := 0.35;
  v_loose_penalty constant real := 0.5;
  v_rank_weights constant real[] := ARRAY[0.05, 0.2, 0.6, 1.0];
  v_head_weights constant real[] := ARRAY[0, 0, 1, 1];
  v_min_abs constant real := 5e-08;
  v_city_hit boolean := false;
BEGIN
  IF btrim(v_norm) = '' THEN
    RETURN;
  END IF;

  v_q := websearch_to_tsquery('french', v_norm);
  IF v_q IS NULL OR numnode(v_q) = 0 THEN
    v_q := plainto_tsquery('french', v_norm);
  END IF;
  IF v_q IS NULL OR numnode(v_q) = 0 THEN
    RETURN;
  END IF;

  BEGIN
    v_q_or := replace(plainto_tsquery('french', v_norm)::text, '&', '|')::tsquery;
  EXCEPTION WHEN others THEN
    v_q_or := v_q;
  END;
  IF v_q_or IS NULL OR numnode(v_q_or) = 0 THEN
    v_q_or := v_q;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.seo_city_pages c
    WHERE c.published = true
      AND length(c.city) >= 4
      AND lower(v_norm) ~ ('(^|[^a-z0-9])'
            || regexp_replace(lower(public.immutable_unaccent(c.city)), '[^a-z0-9]+', '[^a-z0-9]+', 'g')
            || '([^a-z0-9]|$)')
  ) INTO v_city_hit;

  RETURN QUERY
  WITH art AS (
    SELECT 'article'::text AS src,
           a.title::text AS ttl,
           ('/actualites/' || a.slug)::text AS lnk,
           left(regexp_replace(coalesce(a.excerpt, a.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           ts_rank_cd(v_rank_weights, a.search_tsv, v_q, 6)::real AS raw,
           false AS loose
    FROM public.articles a
    WHERE a.published = true
      AND a.search_tsv @@ v_q
      AND ts_rank_cd(v_head_weights, a.search_tsv, v_q_or, 6) > 0
      AND ts_rank_cd(v_rank_weights, a.search_tsv, v_q, 6) >= v_min_abs
  ),
  faq_strict AS (
    SELECT f.question::text AS ttl,
           left(regexp_replace(coalesce(f.answer, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           ts_rank_cd(v_rank_weights, f.search_tsv, v_q, 6)::real AS raw
    FROM public.faq_entries f
    WHERE f.published = true AND f.search_tsv @@ v_q
  ),
  faq_trgm AS (
    SELECT f.question::text AS ttl,
           left(regexp_replace(coalesce(f.answer, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           similarity(public.immutable_unaccent(lower(f.question)), lower(v_norm))::real AS raw
    FROM public.faq_entries f
    WHERE f.published = true
      AND similarity(public.immutable_unaccent(lower(f.question)), lower(v_norm)) >= 0.30
  ),
  faq AS (
    SELECT 'faq'::text AS src, y.ttl, '/faq'::text AS lnk, min(y.snp) AS snp,
           max(y.raw)::real AS raw, false AS loose
    FROM (SELECT * FROM faq_strict UNION ALL SELECT * FROM faq_trgm) y
    GROUP BY y.ttl
  ),
  tips_base AS (
    SELECT (CASE t.fact_type
              WHEN 'home_care_tip' THEN 'Conseil maison'
              WHEN 'pet_care_tip' THEN 'Conseil animal'
              WHEN 'breed_did_you_know' THEN 'À savoir sur la race'
              WHEN 'seasonal_advice' THEN 'Conseil de saison'
              WHEN 'dog_behavior_tip' THEN 'Comportement du chien'
              WHEN 'cat_behavior_tip' THEN 'Comportement du chat'
              WHEN 'mutual_aid_tip' THEN 'Conseil entraide'
              ELSE 'Conseil'
            END)::text AS ttl,
           left(regexp_replace(coalesce(t.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           to_tsvector('french', public.immutable_unaccent(coalesce(t.content, '') || ' ' || coalesce(t.fact_type, ''))) AS tsv
    FROM public.alma_public_tips t
  ),
  tips_strict AS (
    SELECT b.ttl, b.snp, ts_rank_cd(b.tsv, v_q, 6)::real AS raw, false AS loose
    FROM tips_base b
    WHERE b.tsv @@ v_q
  ),
  tips_loose AS (
    SELECT b.ttl, b.snp, ts_rank_cd(b.tsv, v_q_or, 6)::real AS raw, true AS loose
    FROM tips_base b
    WHERE b.tsv @@ v_q_or
      AND NOT EXISTS (SELECT 1 FROM tips_strict)
      AND NOT EXISTS (SELECT 1 FROM art)
      AND NOT EXISTS (SELECT 1 FROM faq)
  ),
  tips AS (
    SELECT 'conseil'::text AS src, z.ttl, '/conseils'::text AS lnk, z.snp, z.raw, z.loose
    FROM (SELECT * FROM tips_strict UNION ALL SELECT * FROM tips_loose) z
  ),
  villes AS (
    SELECT 'ville'::text AS src,
           coalesce(c.h1_title, c.city)::text AS ttl,
           ('/house-sitting/' || c.slug)::text AS lnk,
           left(regexp_replace(coalesce(c.intro_text, c.content, ''), '<[^>]*>', ' ', 'g'), 600)::text AS snp,
           ts_rank_cd(v_rank_weights, c.search_tsv, v_q, 6)::real AS raw,
           false AS loose
    FROM public.seo_city_pages c
    WHERE v_city_hit = true
      AND c.published = true
      AND c.search_tsv @@ v_q
      AND ts_rank_cd(v_head_weights, c.search_tsv, v_q_or, 6) > 0
      AND ts_rank_cd(v_rank_weights, c.search_tsv, v_q, 6) >= v_min_abs
  ),
  allrows AS (
    SELECT * FROM art
    UNION ALL SELECT * FROM faq
    UNION ALL SELECT * FROM tips
    UNION ALL SELECT * FROM villes
  ),
  scored AS (
    SELECT r.src, r.ttl, r.lnk, r.snp,
           (r.raw / nullif(max(r.raw) OVER (PARTITION BY r.src), 0))::real AS share,
           r.loose
    FROM allrows r
  ),
  kept AS (
    SELECT s.src, s.ttl, s.lnk, s.snp,
           (s.share * CASE WHEN s.loose THEN v_loose_penalty ELSE 1 END)::real AS score,
           row_number() OVER (PARTITION BY s.src ORDER BY s.share DESC, s.ttl) AS rn
    FROM scored s
    WHERE s.share >= CASE WHEN s.src = 'article' THEN v_min_share_article ELSE v_min_share END
  )
  SELECT k.src, k.ttl, k.lnk, k.snp, k.score
  FROM kept k
  WHERE k.rn <= v_per_source
  ORDER BY k.score DESC, k.src, k.ttl
  LIMIT v_limit;
END;
$function$;

DROP FUNCTION IF EXISTS public.profile_completion_missing(uuid);

-- Toute modification de public._calculate_sitter_score ou de
-- public._calculate_owner_score doit etre repercutee ici.
CREATE OR REPLACE FUNCTION public.profile_completion_missing(p_user_id uuid, p_role text DEFAULT NULL)
 RETURNS TABLE(bareme text, champ text, libelle text, points integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_bareme text;
  v_first_name text; v_postal_code text; v_city text; v_country text;
  v_avatar text; v_bio text; v_identity_verified boolean;
  v_location_ok boolean;
  v_interests text[]; v_languages text[]; v_life_pace text;
  v_animal_types text[]; v_home_ambiance text[]; v_preferred_sitter_types text[];
  v_affinity_count integer := 0; v_affinity_score integer := 0;
  v_gallery_count integer;
  v_exists boolean;
  v_rows jsonb := '[]'::jsonb;
BEGIN
  -- Chacun ne lit que son propre dossier. Les administrateurs et le
  -- service_role (auth.uid() nul) gardent l'acces complet.
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> p_user_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;

  SELECT role::text, first_name, postal_code, city, country, avatar_url, bio, identity_verified
    INTO v_role, v_first_name, v_postal_code, v_city, v_country, v_avatar, v_bio, v_identity_verified
    FROM public.profiles WHERE id = p_user_id;

  IF v_role IS NULL THEN RETURN; END IF;

  -- Le role actif regarde par la personne prime, pour eviter deux chiffres
  -- contradictoires sur le meme ecran.
  IF p_role = 'sitter' THEN
    v_bareme := 'gardien';
  ELSIF p_role = 'owner' THEN
    v_bareme := 'proprietaire';
  ELSIF v_role = 'sitter' THEN
    v_bareme := 'gardien';
  ELSIF v_role = 'owner' THEN
    v_bareme := 'proprietaire';
  ELSE
    IF public._calculate_owner_score(p_user_id) > public._calculate_sitter_score(p_user_id)
      THEN v_bareme := 'proprietaire';
      ELSE v_bareme := 'gardien';
    END IF;
  END IF;

  -- Parite avec les fonctions de score : un country vide vaut "inconnu", donc regle France.
  v_location_ok := (
    v_first_name IS NOT NULL AND v_first_name != '' AND (
      (COALESCE(NULLIF(v_country, ''), 'FR') = 'FR' AND v_postal_code IS NOT NULL AND v_postal_code != '')
      OR (COALESCE(NULLIF(v_country, ''), 'FR') != 'FR' AND v_city IS NOT NULL AND v_city != '')
    )
  );

  IF v_bareme = 'gardien' THEN
    IF NOT v_location_ok THEN
      v_rows := v_rows || jsonb_build_object('champ','localisation','libelle','Votre prénom et votre code postal','points',15);
    END IF;
    IF v_avatar IS NULL OR v_avatar = '' THEN
      v_rows := v_rows || jsonb_build_object('champ','photo','libelle','Une photo de vous','points',20);
    END IF;
    IF v_bio IS NULL OR length(v_bio) < 50 THEN
      v_rows := v_rows || jsonb_build_object('champ','bio','libelle','Une présentation d''au moins cinquante caractères','points',15);
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND competences IS NOT NULL AND array_length(competences, 1) > 0
    ) INTO v_exists;
    IF NOT v_exists THEN
      v_rows := v_rows || jsonb_build_object('champ','competences','libelle','Vos compétences de gardien','points',15);
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND lifestyle IS NOT NULL AND array_length(lifestyle, 1) > 0
    ) INTO v_exists;
    IF NOT v_exists THEN
      v_rows := v_rows || jsonb_build_object('champ','lifestyle','libelle','Votre rythme de vie','points',10);
    END IF;
    SELECT count(*) INTO v_gallery_count FROM public.sitter_gallery WHERE user_id = p_user_id;
    IF v_gallery_count = 0 THEN
      v_rows := v_rows || jsonb_build_object('champ','galerie','libelle','Trois photos dans votre galerie','points',10);
    ELSIF v_gallery_count < 3 THEN
      v_rows := v_rows || jsonb_build_object('champ','galerie','libelle','Trois photos dans votre galerie','points',6);
    END IF;
    IF v_identity_verified IS NOT TRUE THEN
      v_rows := v_rows || jsonb_build_object('champ','identite','libelle','La vérification d''identité','points',5);
    END IF;

    SELECT interests, languages, life_pace, animal_types
      INTO v_interests, v_languages, v_life_pace, v_animal_types
      FROM public.sitter_profiles WHERE user_id = p_user_id;
    IF v_interests IS NOT NULL AND array_length(v_interests, 1) >= 3 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_languages IS NOT NULL AND array_length(v_languages, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_life_pace IS NOT NULL AND v_life_pace != '' THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_animal_types IS NOT NULL AND array_length(v_animal_types, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_affinity_count >= 3 THEN v_affinity_score := 10;
    ELSIF v_affinity_count = 2 THEN v_affinity_score := 6;
    ELSIF v_affinity_count = 1 THEN v_affinity_score := 3;
    ELSE v_affinity_score := 0; END IF;
    IF 10 - v_affinity_score > 0 THEN
      v_rows := v_rows || jsonb_build_object('champ','affinites','libelle','Vos affinités, centres d''intérêt, langues, rythme, animaux acceptés','points',10 - v_affinity_score);
    END IF;

  ELSE
    IF NOT v_location_ok THEN
      v_rows := v_rows || jsonb_build_object('champ','localisation','libelle','Votre prénom et votre code postal','points',10);
    END IF;
    IF v_avatar IS NULL OR v_avatar = '' THEN
      v_rows := v_rows || jsonb_build_object('champ','photo','libelle','Une photo de vous','points',10);
    END IF;
    IF v_bio IS NULL OR length(v_bio) < 50 THEN
      v_rows := v_rows || jsonb_build_object('champ','bio','libelle','Une présentation d''au moins cinquante caractères','points',10);
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.owner_profiles
      WHERE user_id = p_user_id AND competences IS NOT NULL AND array_length(competences, 1) > 0
    ) INTO v_exists;
    IF NOT v_exists THEN
      v_rows := v_rows || jsonb_build_object('champ','competences','libelle','Vos compétences','points',10);
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.pets p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE pr.user_id = p_user_id
    ) INTO v_exists;
    IF NOT v_exists THEN
      v_rows := v_rows || jsonb_build_object('champ','animal','libelle','Au moins un animal renseigné','points',20);
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.properties
      WHERE user_id = p_user_id AND description IS NOT NULL AND length(description) >= 50
    ) INTO v_exists;
    IF NOT v_exists THEN
      v_rows := v_rows || jsonb_build_object('champ','logement','libelle','La description de votre logement, cinquante caractères au moins','points',10);
    END IF;
    SELECT EXISTS(SELECT 1 FROM public.owner_gallery WHERE user_id = p_user_id) INTO v_exists;
    IF NOT v_exists THEN
      v_rows := v_rows || jsonb_build_object('champ','galerie','libelle','Des photos de votre logement','points',15);
    END IF;
    IF v_identity_verified IS NOT TRUE THEN
      v_rows := v_rows || jsonb_build_object('champ','identite','libelle','La vérification d''identité','points',5);
    END IF;

    SELECT interests, languages, life_pace, home_ambiance, preferred_sitter_types
      INTO v_interests, v_languages, v_life_pace, v_home_ambiance, v_preferred_sitter_types
      FROM public.owner_profiles WHERE user_id = p_user_id;
    IF v_interests IS NOT NULL AND array_length(v_interests, 1) >= 3 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_languages IS NOT NULL AND array_length(v_languages, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_life_pace IS NOT NULL AND v_life_pace != '' THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_home_ambiance IS NOT NULL AND array_length(v_home_ambiance, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_preferred_sitter_types IS NOT NULL AND array_length(v_preferred_sitter_types, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_affinity_count >= 3 THEN v_affinity_score := 10;
    ELSIF v_affinity_count = 2 THEN v_affinity_score := 6;
    ELSIF v_affinity_count = 1 THEN v_affinity_score := 3;
    ELSE v_affinity_score := 0; END IF;
    IF 10 - v_affinity_score > 0 THEN
      v_rows := v_rows || jsonb_build_object('champ','affinites','libelle','Vos affinités, centres d''intérêt, langues, rythme, ambiance, type de gardien recherché','points',10 - v_affinity_score);
    END IF;
  END IF;

  RETURN QUERY
    SELECT v_bareme, r.champ, r.libelle, r.points
    FROM jsonb_to_recordset(v_rows) AS r(champ text, libelle text, points integer)
    ORDER BY r.points DESC, r.champ;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.profile_completion_missing(uuid, text) TO authenticated, service_role;