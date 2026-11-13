-- Lot VIT2 (13 novembre 2026) : annonce « à la une » de la home.
-- Décision de Jérémie du 13/11 : un admin épingle une garde, elle passe en
-- première carte de la vitrine « En ce moment ». Une seule annonce à la fois.
-- Table à part : la table sits et ses déclencheurs restent tels quels.
-- Repère : vit2_a_la_une.
CREATE TABLE IF NOT EXISTS public.home_featured_sit (
  sit_id uuid PRIMARY KEY REFERENCES public.sits(id) ON DELETE CASCADE,
  featured_at timestamptz NOT NULL DEFAULT now(),
  featured_by uuid
);

COMMENT ON TABLE public.home_featured_sit IS
  'Lot VIT2 : garde épinglée en tête de la vitrine de la home. Une ligne au plus, écrite par admin_set_home_featured.';

ALTER TABLE public.home_featured_sit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "home_featured_sit lisible par tous" ON public.home_featured_sit;
CREATE POLICY "home_featured_sit lisible par tous" ON public.home_featured_sit
  FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON public.home_featured_sit FROM anon, authenticated;
GRANT SELECT ON public.home_featured_sit TO anon, authenticated;
GRANT ALL ON public.home_featured_sit TO service_role;

CREATE OR REPLACE FUNCTION public.admin_set_home_featured(p_sit uuid, p_on boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- vit2_a_la_une : réservé aux admins, une seule annonce épinglée.
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT p_on THEN
    DELETE FROM public.home_featured_sit WHERE sit_id = p_sit;
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sits s WHERE s.id = p_sit AND s.status = 'published') THEN
    RAISE EXCEPTION 'sit_not_published' USING ERRCODE = 'P0001';
  END IF;
  DELETE FROM public.home_featured_sit WHERE sit_id <> p_sit;
  INSERT INTO public.home_featured_sit (sit_id, featured_by)
  VALUES (p_sit, auth.uid())
  ON CONFLICT (sit_id) DO UPDATE SET featured_at = now(), featured_by = excluded.featured_by;
  RETURN true;
END;
$function$;

COMMENT ON FUNCTION public.admin_set_home_featured(uuid, boolean) IS
  'Lot VIT2 : épingle ou retire la garde à la une de la home. Admins seulement.';
REVOKE ALL ON FUNCTION public.admin_set_home_featured(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_home_featured(uuid, boolean) TO authenticated, service_role;
