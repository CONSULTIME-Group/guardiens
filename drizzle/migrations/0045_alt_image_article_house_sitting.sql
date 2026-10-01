-- Correction de l'alt de l'image de l'article c-est-quoi-le-house-sitting (un chien, aucun chat).
-- Retour arrière : UPDATE public.articles a SET hero_image_alt=b.hero_image_alt, updated_at=b.updated_at FROM public._backup_article_house_sitting_20261001c b WHERE a.id=b.id;
CREATE TABLE public._backup_article_house_sitting_20261001c AS SELECT * FROM public.articles WHERE id='6c52710a-3130-49dd-8856-47ec9233feae' AND slug='c-est-quoi-le-house-sitting';
REVOKE ALL ON public._backup_article_house_sitting_20261001c FROM anon, authenticated;
GRANT ALL ON public._backup_article_house_sitting_20261001c TO service_role;
ALTER TABLE public._backup_article_house_sitting_20261001c ENABLE ROW LEVEL SECURITY;
DO $do$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public._backup_article_house_sitting_20261001c;
  IF n <> 1 THEN RAISE EXCEPTION 'sauvegarde: % lignes', n; END IF;
  UPDATE public.articles
  SET hero_image_alt = 'Une propriétaire remet ses clés à une gardienne devant une maison en pierre, un chien attend sur le seuil.', updated_at = now()
  WHERE id='6c52710a-3130-49dd-8856-47ec9233feae' AND slug='c-est-quoi-le-house-sitting' AND updated_at='2026-10-01 13:15:05.080955+00';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'mise a jour: % lignes (edition concurrente ?)', n; END IF;
END $do$;