CREATE OR REPLACE FUNCTION public.report_mission_content_signal(
  _mission_id uuid,
  _signal_type text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _signal_type NOT IN ('sit_like_mission', 'animal_rehoming_listing') THEN
    RAISE EXCEPTION 'Invalid signal type';
  END IF;
  -- Seul l'auteur de la mission (ou un admin) peut déposer ce signal.
  IF NOT EXISTS (
    SELECT 1 FROM public.small_missions m
    WHERE m.id = _mission_id AND m.user_id = auth.uid()
  ) AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- Idempotent : un seul signal non résolu par mission et par type.
  IF EXISTS (
    SELECT 1 FROM public.admin_signals s
    WHERE s.entity_type = 'mission'
      AND s.entity_id = _mission_id
      AND s.signal_type = _signal_type
      AND s.resolved_at IS NULL
  ) THEN
    RETURN;
  END IF;
  INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
  VALUES (_signal_type, 'warning', 'mission', _mission_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_mission_content_signal(uuid, text, jsonb) TO authenticated;

-- Signaux rétroactifs : les deux missions qui ressemblent à une garde.
INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
SELECT 'sit_like_mission', 'warning', 'mission', m.id,
  jsonb_build_object(
    'title', m.title,
    'city', m.city,
    'excerpt', left(m.title || ' : ' || coalesce(m.description, ''), 200),
    'reason', 'Durée en jours ou semaines + vocabulaire de garde + espèce animale'
  )
FROM public.small_missions m
WHERE m.id IN ('bc7e2241-4fc3-4e48-ac3f-1b2eb8e80457', 'd904024d-6fac-4852-ace3-1e44a58c637f')
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_signals s
    WHERE s.entity_type = 'mission' AND s.entity_id = m.id
      AND s.signal_type = 'sit_like_mission' AND s.resolved_at IS NULL
  );

-- Signaux rétroactifs : les deux annonces de cession ou adoption d'animaux.
INSERT INTO public.admin_signals (signal_type, severity, entity_type, entity_id, metadata)
SELECT 'animal_rehoming_listing', 'warning', 'mission', m.id,
  jsonb_build_object(
    'title', m.title,
    'city', m.city,
    'excerpt', left(m.title || ' : ' || coalesce(m.description, ''), 200),
    'reason', 'Marqueurs de cession ou adoption d animal'
  )
FROM public.small_missions m
WHERE m.id IN ('7b62c85f-fa8e-485c-823c-d28bc183fb82', 'f0fe3c05-df1f-488f-a81b-6b7c73270205')
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_signals s
    WHERE s.entity_type = 'mission' AND s.entity_id = m.id
      AND s.signal_type = 'animal_rehoming_listing' AND s.resolved_at IS NULL
  );