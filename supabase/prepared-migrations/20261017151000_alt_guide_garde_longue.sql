-- Description fidèle à la couverture constatée pendant la vérification visuelle.
-- La photo et le contenu du guide restent identiques.
BEGIN;
DO $image_alt$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_alt text := 'Une femme avec un chien et un chat dans un salon, près d’une valise';
BEGIN
  SELECT * INTO before_row FROM public.articles
  WHERE id='4f0c9ffe-1ed1-4612-8f81-f7986aac1272'::uuid
    AND slug='vacances-longues-garde-animal-2-semaines' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guide longue durée introuvable'; END IF;
  IF before_row.hero_image_alt IS NOT DISTINCT FROM new_alt THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-17 11:30:35.456042+00'::timestamptz
    OR before_row.hero_image_alt IS DISTINCT FROM 'Chien allongé sur un canapé attendant le retour de ses propriétaires' THEN
    RAISE EXCEPTION 'Couverture du guide modifiée depuis la préparation';
  END IF;
  UPDATE public.articles SET hero_image_alt=new_alt,updated_at=now()
  WHERE id=before_row.id AND slug=before_row.slug AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Description image : % ligne au lieu de 1',affected; END IF;
END;
$image_alt$;
COMMIT;
