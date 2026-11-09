-- Lot L9 (09/11/2026, arène tableau de bord v2) : « Guide lu » en base.
--
-- Le gardien retenu qui ouvre le guide de la maison (lisible à J-7) le marque
-- lu sur sa candidature acceptée ; le propriétaire le lit sur l'accueil
-- (« Anne a lu le guide de la maison. ») dans la lecture des annonces déjà
-- faite (applications(id, status, sitter_id, guide_read_at)), sans lecture
-- de plus. La première lecture fait foi, une relecture ne change rien.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS guide_read_at timestamptz;

COMMENT ON COLUMN public.applications.guide_read_at IS
  'Lot L9 : première ouverture du guide de la maison par le gardien retenu (mark_house_guide_read).';

CREATE OR REPLACE FUNCTION public.mark_house_guide_read(p_property_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  -- Candidature acceptée du membre sur une garde confirmée ou en cours de ce
  -- logement, guide ouvert (7 jours avant le début, règle de house_guides).
  WITH target AS (
    SELECT a.id
    FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id
    WHERE a.sitter_id = auth.uid()
      AND a.status = 'accepted'::application_status
      AND a.guide_read_at IS NULL
      AND s.property_id = p_property_id
      AND s.status IN ('confirmed', 'in_progress')
      AND s.start_date IS NOT NULL
      AND (now() AT TIME ZONE 'Europe/Paris')::date >= s.start_date - 7
      AND (s.end_date IS NULL OR (now() AT TIME ZONE 'Europe/Paris')::date <= s.end_date)
  ), updated AS (
    UPDATE public.applications a
       SET guide_read_at = now()
      FROM target t
     WHERE a.id = t.id
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count > 0;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.mark_house_guide_read(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_house_guide_read(uuid) TO authenticated, service_role;
