-- Lots GL1 à GL3 (13/10/2026) : guides locaux ancrés sur un lieu réel, lieux sourcés.
--
-- Constat : le 10/10/2026, /guides/saint-ludger (annonce à Saint Ludger,
-- Québec) est publié avec 20 lieux écrits par l'IA et situés en France. Un
-- guide n'était identifié que par le nom de sa ville : aucun pays, aucune
-- coordonnée, homonymes confondus (le déclencheur rangeait aussi « G0 » comme
-- département d'un code postal canadien). 1 078 lieux sur 1 423 sans source.
--
-- 1. city_guides : pays, coordonnées du centre, état du sourcing.
--    places_sourced_at non nul = la page n'affiche plus que les lieux sourcés.
-- 2. city_guide_places : distance au centre et nature du lieu (forêt, sentier...).
-- 3. guide_requests : pays et coordonnées (arrondies au kilomètre) du
--    propriétaire, pour départager les homonymes.
-- 4. Rattrapage des demandes et du pays des guides existants.
-- 5. Déclencheur de demande de guide : pays, coordonnées, département
--    seulement en France, slug suffixé pour un homonyme éloigné.
-- 6. Un lieu sourcé n'existe qu'une fois par guide (index unique), les
--    doublons existants sont retirés.
-- 7. Notes Google effacées : les conditions de Google (Places API, 5.4)
--    n'autorisent à conserver que l'identifiant du lieu. L'identifiant reste.

-- 1
ALTER TABLE public.city_guides ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'FR';
ALTER TABLE public.city_guides ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.city_guides ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.city_guides ADD COLUMN IF NOT EXISTS places_sourced_at timestamptz;
ALTER TABLE public.city_guides ADD COLUMN IF NOT EXISTS places_source_attempted_at timestamptz;
ALTER TABLE public.city_guides ADD COLUMN IF NOT EXISTS places_source_result text;
-- Nouveau guide sans lieu à sa création : publié par la file dès qu'il est sourcé.
ALTER TABLE public.city_guides ADD COLUMN IF NOT EXISTS publish_when_sourced boolean NOT NULL DEFAULT false;

-- 2
ALTER TABLE public.city_guide_places ADD COLUMN IF NOT EXISTS distance_km numeric(6,1);
ALTER TABLE public.city_guide_places ADD COLUMN IF NOT EXISTS place_kind text;

-- 3
ALTER TABLE public.guide_requests ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.guide_requests ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.guide_requests ADD COLUMN IF NOT EXISTS longitude double precision;

-- Distance en kilomètres entre deux points (haversine), sans extension.
CREATE OR REPLACE FUNCTION public.guide_distance_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision
LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN NULL
  ELSE 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  )) END
$$;

-- Suffixe d'un homonyme : département (2 ou 3 chiffres) en France, pays ailleurs.
-- Même règle que homonymSlug (supabase/functions/_shared/guide-places/source.ts).
CREATE OR REPLACE FUNCTION public.guide_homonym_slug(p_slug text, p_country text, p_postal text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE v_pc text := trim(coalesce(p_postal, '')); v_dept text;
BEGIN
  IF upper(coalesce(nullif(trim(p_country), ''), 'FR')) <> 'FR' THEN
    RETURN p_slug || '-' || lower(trim(p_country));
  END IF;
  v_dept := CASE WHEN v_pc ~ '^9[78]' THEN left(v_pc, 3) ELSE left(v_pc, 2) END;
  IF v_dept ~ '^\d{2,3}$' THEN RETURN p_slug || '-' || v_dept; END IF;
  RETURN p_slug || '-fr';
END;
$$;

-- 4. Rattrapage des demandes : lieu du propriétaire de l'annonce la plus
-- récente, au même code postal que la demande (un homonyme d'un autre pays ne
-- déplace jamais la demande), annonces actives d'abord.
UPDATE public.guide_requests gr
SET (country, latitude, longitude) = (
  SELECT upper(coalesce(nullif(trim(p.country), ''), 'FR')),
         round(p.latitude::numeric, 2)::double precision,
         round(p.longitude::numeric, 2)::double precision
  FROM public.sits s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE public.slugify_city(p.city) = gr.slug
    AND coalesce(p.postal_code, '') = coalesce(gr.postal_code, '')
    AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  ORDER BY (s.status::text IN ('published', 'confirmed', 'in_progress')) DESC, s.created_at DESC
  LIMIT 1
)
WHERE gr.latitude IS NULL
  AND EXISTS (
    SELECT 1 FROM public.sits s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE public.slugify_city(p.city) = gr.slug
      AND coalesce(p.postal_code, '') = coalesce(gr.postal_code, '')
      AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  );

-- Pays des guides existants hors France, tiré de leur demande.
UPDATE public.city_guides cg
SET country = gr.country
FROM public.guide_requests gr
WHERE (gr.city_guide_id = cg.id OR gr.slug = cg.slug)
  AND gr.country IS NOT NULL AND gr.country <> 'FR'
  AND cg.country = 'FR'
  AND cg.latitude IS NULL;

-- 5. Déclencheur de demande de guide
CREATE OR REPLACE FUNCTION public.upsert_guide_request_from_sit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_city text; v_postal text; v_country text; v_lat double precision; v_lon double precision;
  v_dept text; v_base text; v_slug text;
  v_guide record;
BEGIN
  IF NEW.status NOT IN ('published', 'confirmed', 'in_progress') THEN RETURN NEW; END IF;

  SELECT p.city, p.postal_code, upper(coalesce(nullif(trim(p.country), ''), 'FR')), p.latitude, p.longitude
  INTO v_city, v_postal, v_country, v_lat, v_lon
  FROM public.profiles p WHERE p.id = NEW.user_id;

  IF v_city IS NULL OR length(trim(v_city)) = 0 THEN RETURN NEW; END IF;

  v_base := public.slugify_city(v_city);
  IF v_base IS NULL OR v_base = '' THEN RETURN NEW; END IF;
  v_slug := v_base;

  -- Département seulement pour un code postal français.
  v_dept := CASE
    WHEN v_country = 'FR' AND coalesce(v_postal, '') ~ '^\d{5}$'
      THEN CASE WHEN v_postal ~ '^9[78]' THEN left(v_postal, 3) ELSE left(v_postal, 2) END
    ELSE NULL END;

  v_lat := round(v_lat::numeric, 2)::double precision;
  v_lon := round(v_lon::numeric, 2)::double precision;

  -- Guide existant au même nom : homonyme si autre pays ou à plus de 25 km.
  SELECT id, country, latitude, longitude INTO v_guide
  FROM public.city_guides WHERE slug = v_base AND published = true LIMIT 1;
  IF v_guide.id IS NOT NULL AND (
       coalesce(v_guide.country, 'FR') <> v_country
       OR coalesce(public.guide_distance_km(v_guide.latitude, v_guide.longitude, v_lat, v_lon), 0) > 25
     ) THEN
    v_slug := public.guide_homonym_slug(v_base, v_country, v_postal);
    SELECT id, country, latitude, longitude INTO v_guide
    FROM public.city_guides WHERE slug = v_slug AND published = true LIMIT 1;
  END IF;

  IF v_guide.id IS NOT NULL THEN
    UPDATE public.guide_requests
    SET status = 'created', city_guide_id = v_guide.id, last_seen_at = now()
    WHERE slug = v_slug AND status = 'pending';
    RETURN NEW;
  END IF;

  INSERT INTO public.guide_requests (city, slug, postal_code, department, country, latitude, longitude,
    status, active_sits_count, last_seen_at, first_requested_at)
  VALUES (v_city, v_slug, v_postal, v_dept, v_country, v_lat, v_lon, 'pending', 1, now(), now())
  ON CONFLICT (slug) DO UPDATE
  SET city = EXCLUDED.city,
      postal_code = COALESCE(public.guide_requests.postal_code, EXCLUDED.postal_code),
      department = COALESCE(public.guide_requests.department, EXCLUDED.department),
      country = COALESCE(public.guide_requests.country, EXCLUDED.country),
      latitude = COALESCE(public.guide_requests.latitude, EXCLUDED.latitude),
      longitude = COALESCE(public.guide_requests.longitude, EXCLUDED.longitude),
      last_seen_at = now(),
      status = CASE
        WHEN public.guide_requests.status = 'dismissed' THEN 'dismissed'
        WHEN public.guide_requests.status = 'created' THEN 'created'
        ELSE 'pending'
      END;

  UPDATE public.guide_requests
  SET active_sits_count = (
    SELECT COUNT(*) FROM public.sits s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE public.slugify_city(p.city) = v_base
      AND upper(coalesce(nullif(trim(p.country), ''), 'FR')) = v_country
      AND s.status IN ('published', 'confirmed', 'in_progress')
  )
  WHERE slug = v_slug;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_guide_request_from_sit() FROM PUBLIC, anon, authenticated;

-- 6. Un lieu sourcé une seule fois par guide (les lieux sans source, NULL, ne
-- se gênent pas entre eux).
DELETE FROM public.city_guide_places a
USING public.city_guide_places b
WHERE a.source_url IS NOT NULL
  AND a.city_guide_id = b.city_guide_id
  AND a.source_url = b.source_url
  AND (a.created_at, a.id) > (b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS city_guide_places_guide_source_unique
  ON public.city_guide_places (city_guide_id, source_url);

-- 7. Notes Google effacées, identifiant conservé.
UPDATE public.city_guide_places
SET google_rating = NULL, google_rating_count = NULL
WHERE google_rating IS NOT NULL OR google_rating_count IS NOT NULL;
