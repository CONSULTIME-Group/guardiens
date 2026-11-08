-- Lot PHOTO1 (08/11/2026) : ce que montre chaque photo de la galerie du
-- propriétaire, relevé par l'analyse d'image au moment de l'ajout.
-- Lu par le propriétaire seul (rappel avant publication, carte « Montrez votre
-- maison » sur l'annonce en ligne). Écrit par la fonction analyze-photo-quality
-- avec la clé de service, après contrôle que la photo est dans la galerie du
-- membre. Une photo sans ligne ici compte comme « non analysée » : le rappel se
-- fie alors au nombre de photos.
CREATE TABLE IF NOT EXISTS public.owner_gallery_insights (
  photo_url text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL CHECK (subject IN ('exterieur', 'interieur', 'jardin', 'animal', 'alentours', 'autre')),
  shows_home boolean NOT NULL,
  issues text[] NOT NULL DEFAULT '{}',
  score integer CHECK (score BETWEEN 0 AND 100),
  analyzed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS owner_gallery_insights_user_idx ON public.owner_gallery_insights (user_id);

ALTER TABLE public.owner_gallery_insights ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.owner_gallery_insights FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.owner_gallery_insights TO authenticated;
GRANT ALL ON TABLE public.owner_gallery_insights TO service_role;

DROP POLICY IF EXISTS "owner reads own gallery insights" ON public.owner_gallery_insights;
CREATE POLICY "owner reads own gallery insights"
  ON public.owner_gallery_insights
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Une photo retirée de la galerie retire son relevé.
CREATE OR REPLACE FUNCTION public.purge_owner_gallery_insight()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.owner_gallery_insights i
  WHERE i.photo_url = OLD.photo_url AND i.user_id = OLD.user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.owner_gallery g
      WHERE g.photo_url = OLD.photo_url AND g.user_id = OLD.user_id AND g.id <> OLD.id
    );
  RETURN OLD;
END;
$function$;

REVOKE ALL ON FUNCTION public.purge_owner_gallery_insight() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_purge_owner_gallery_insight ON public.owner_gallery;
CREATE TRIGGER trg_purge_owner_gallery_insight
  AFTER DELETE ON public.owner_gallery
  FOR EACH ROW EXECUTE FUNCTION public.purge_owner_gallery_insight();
