-- Trigger: create admin_signals row when an owner publishes a sit without coords
CREATE OR REPLACE FUNCTION public.signal_owner_missing_coords()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_lat numeric;
  owner_lon numeric;
  owner_first text;
  owner_city text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  SELECT latitude, longitude, first_name, city
    INTO owner_lat, owner_lon, owner_first, owner_city
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF owner_lat IS NOT NULL AND owner_lon IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if an unresolved signal already exists for this owner
  IF EXISTS (
    SELECT 1 FROM public.admin_signals
    WHERE signal_type = 'owner_missing_coordinates'
      AND entity_type = 'profile'
      AND entity_id = NEW.user_id
      AND resolved_at IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_signals (
    signal_type, severity, entity_type, entity_id, detected_at, metadata
  ) VALUES (
    'owner_missing_coordinates',
    'warning',
    'profile',
    NEW.user_id,
    now(),
    jsonb_build_object(
      'owner_first_name', COALESCE(owner_first, ''),
      'owner_city', COALESCE(owner_city, ''),
      'sit_id', NEW.id,
      'sit_title', COALESCE(NEW.title, '')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_signal_owner_missing_coords ON public.sits;
CREATE TRIGGER trg_signal_owner_missing_coords
AFTER INSERT OR UPDATE OF status ON public.sits
FOR EACH ROW
EXECUTE FUNCTION public.signal_owner_missing_coords();

-- Backfill: one signal per owner currently having a published sit without coords
INSERT INTO public.admin_signals (
  signal_type, severity, entity_type, entity_id, detected_at, metadata
)
SELECT
  'owner_missing_coordinates',
  'warning',
  'profile',
  p.id,
  now(),
  jsonb_build_object(
    'owner_first_name', COALESCE(p.first_name, ''),
    'owner_city', COALESCE(p.city, ''),
    'sit_id', s.id,
    'sit_title', COALESCE(s.title, '')
  )
FROM public.profiles p
JOIN LATERAL (
  SELECT id, title
  FROM public.sits
  WHERE user_id = p.id AND status = 'published'
  ORDER BY created_at DESC
  LIMIT 1
) s ON true
WHERE (p.latitude IS NULL OR p.longitude IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_signals a
    WHERE a.signal_type = 'owner_missing_coordinates'
      AND a.entity_type = 'profile'
      AND a.entity_id = p.id
      AND a.resolved_at IS NULL
  );