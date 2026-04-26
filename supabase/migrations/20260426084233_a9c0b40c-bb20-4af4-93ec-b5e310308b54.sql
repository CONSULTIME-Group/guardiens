-- 1) Table de demandes de guides locaux
CREATE TABLE IF NOT EXISTS public.guide_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city text NOT NULL,
  slug text NOT NULL,
  postal_code text,
  department text,
  status text NOT NULL DEFAULT 'pending',
  active_sits_count integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  first_requested_at timestamptz NOT NULL DEFAULT now(),
  city_guide_id uuid,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS guide_requests_slug_unique
  ON public.guide_requests (slug);

CREATE INDEX IF NOT EXISTS guide_requests_status_idx
  ON public.guide_requests (status);

ALTER TABLE public.guide_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view guide requests"
  ON public.guide_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert guide requests"
  ON public.guide_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update guide requests"
  ON public.guide_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete guide requests"
  ON public.guide_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.validate_guide_request_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'created', 'dismissed') THEN
    RAISE EXCEPTION 'guide_requests.status must be pending, created or dismissed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guide_request_status
  BEFORE INSERT OR UPDATE ON public.guide_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_guide_request_status();

CREATE TRIGGER trg_guide_request_updated_at
  BEFORE UPDATE ON public.guide_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.slugify_city(input text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE v text;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  v := lower(trim(input));
  v := translate(v, 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy');
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := regexp_replace(v, '^-+|-+$', '', 'g');
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_guide_request_from_sit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_city text; v_postal text; v_dept text; v_slug text; v_existing_guide_id uuid;
BEGIN
  IF NEW.status NOT IN ('published', 'confirmed', 'in_progress') THEN RETURN NEW; END IF;

  SELECT p.city, p.postal_code INTO v_city, v_postal
  FROM public.profiles p WHERE p.id = NEW.user_id;

  IF v_city IS NULL OR length(trim(v_city)) = 0 THEN RETURN NEW; END IF;

  v_slug := public.slugify_city(v_city);
  IF v_slug IS NULL OR v_slug = '' THEN RETURN NEW; END IF;

  v_dept := NULLIF(LEFT(COALESCE(v_postal, ''), 2), '');

  SELECT id INTO v_existing_guide_id FROM public.city_guides
  WHERE slug = v_slug AND published = true LIMIT 1;

  IF v_existing_guide_id IS NOT NULL THEN
    UPDATE public.guide_requests
    SET status = 'created', city_guide_id = v_existing_guide_id, last_seen_at = now()
    WHERE slug = v_slug AND status = 'pending';
    RETURN NEW;
  END IF;

  INSERT INTO public.guide_requests (city, slug, postal_code, department, status, active_sits_count, last_seen_at, first_requested_at)
  VALUES (v_city, v_slug, v_postal, v_dept, 'pending', 1, now(), now())
  ON CONFLICT (slug) DO UPDATE
  SET city = EXCLUDED.city,
      postal_code = COALESCE(public.guide_requests.postal_code, EXCLUDED.postal_code),
      department = COALESCE(public.guide_requests.department, EXCLUDED.department),
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
    WHERE public.slugify_city(p.city) = v_slug
      AND s.status IN ('published', 'confirmed', 'in_progress')
  )
  WHERE slug = v_slug;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sit_upsert_guide_request
  AFTER INSERT OR UPDATE OF status, user_id ON public.sits
  FOR EACH ROW EXECUTE FUNCTION public.upsert_guide_request_from_sit();

CREATE OR REPLACE FUNCTION public.link_guide_request_on_city_guide_publish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.published = true AND NEW.slug IS NOT NULL THEN
    UPDATE public.guide_requests
    SET status = 'created', city_guide_id = NEW.id, updated_at = now()
    WHERE slug = NEW.slug AND status IN ('pending', 'dismissed');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_city_guide_link_request
  AFTER INSERT OR UPDATE OF published, slug ON public.city_guides
  FOR EACH ROW EXECUTE FUNCTION public.link_guide_request_on_city_guide_publish();

-- Backfill initial : utilise sits.created_at (pas d'updated_at)
INSERT INTO public.guide_requests (city, slug, postal_code, department, status, active_sits_count, last_seen_at, first_requested_at)
SELECT
  p.city,
  public.slugify_city(p.city) AS slug,
  MAX(p.postal_code) AS postal_code,
  NULLIF(LEFT(MAX(COALESCE(p.postal_code, '')), 2), '') AS department,
  'pending',
  COUNT(*),
  MAX(s.created_at),
  MIN(s.created_at)
FROM public.sits s
JOIN public.profiles p ON p.id = s.user_id
WHERE s.status IN ('published', 'confirmed', 'in_progress')
  AND p.city IS NOT NULL
  AND length(trim(p.city)) > 0
  AND public.slugify_city(p.city) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.city_guides cg
    WHERE cg.slug = public.slugify_city(p.city) AND cg.published = true
  )
GROUP BY p.city, public.slugify_city(p.city)
ON CONFLICT (slug) DO NOTHING;