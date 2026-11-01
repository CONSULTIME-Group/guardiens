-- Nettoyage du 01/11/2026 (demande de Jérémie) : notifications qui mènent à
-- une annonce ou à un besoin supprimé.
--
-- Constat en base le 01/11 : 436 notifications pointaient vers une annonce
-- supprimée (415 « new_sit_nearby », dont 411 non lues et comptées dans la
-- cloche), 9 vers un besoin d'entraide supprimé. Un clic menait jusqu'ici à
-- « Mes annonces » (corrigé côté page par le lot C1 : « Cette annonce a été
-- retirée »). La purge existante (trg_purge_new_sit_nearby_on_unpublish) ne
-- couvre que les changements de statut, jamais la suppression.
--
-- 1. Sauvegarde des lignes retirées.
-- 2. Suppression des notifications orphelines.
-- 3. Déclencheurs AFTER DELETE sur sits et small_missions : à la suppression,
--    les notifications qui y mènent partent avec elles.
-- Rejouable.

CREATE TABLE IF NOT EXISTS public._backup_notifications_orphelines_20261101 (LIKE public.notifications INCLUDING ALL);
ALTER TABLE public._backup_notifications_orphelines_20261101 ENABLE ROW LEVEL SECURITY;

WITH n AS (
  SELECT id,
         (regexp_match(link, '^/(?:sits|annonces)/([0-9a-f-]{36})'))[1] AS sit_ref,
         (regexp_match(link, '^/petites-missions/([^/?#]+)'))[1] AS mission_ref,
         type
    FROM public.notifications
), orphans AS (
  SELECT n.id FROM n
   WHERE (n.sit_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sits s WHERE s.id::text = n.sit_ref))
      OR (n.mission_ref IS NOT NULL AND n.type LIKE 'mission%'
          AND NOT EXISTS (SELECT 1 FROM public.small_missions m WHERE m.id::text = n.mission_ref OR m.slug = n.mission_ref))
), saved AS (
  INSERT INTO public._backup_notifications_orphelines_20261101
  SELECT x.* FROM public.notifications x JOIN orphans o ON o.id = x.id
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
DELETE FROM public.notifications x USING orphans o WHERE o.id = x.id;

CREATE OR REPLACE FUNCTION public.purge_notifications_of_deleted_sit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  DELETE FROM public.notifications n
   WHERE n.link ~ ('^/(sits|annonces)/' || OLD.id::text || '([/?#]|$)');
  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_purge_notifications_on_sit_delete ON public.sits;
CREATE TRIGGER trg_purge_notifications_on_sit_delete
  AFTER DELETE ON public.sits
  FOR EACH ROW EXECUTE FUNCTION public.purge_notifications_of_deleted_sit();

CREATE OR REPLACE FUNCTION public.purge_notifications_of_deleted_mission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  DELETE FROM public.notifications n
   WHERE n.link ~ ('^/petites-missions/' || OLD.id::text || '([/?#]|$)')
      OR (OLD.slug IS NOT NULL AND OLD.slug <> ''
          AND n.link ~ ('^/petites-missions/' || regexp_replace(OLD.slug, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '([/?#]|$)'));
  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_purge_notifications_on_mission_delete ON public.small_missions;
CREATE TRIGGER trg_purge_notifications_on_mission_delete
  AFTER DELETE ON public.small_missions
  FOR EACH ROW EXECUTE FUNCTION public.purge_notifications_of_deleted_mission();

REVOKE ALL ON FUNCTION public.purge_notifications_of_deleted_sit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_notifications_of_deleted_mission() FROM PUBLIC, anon, authenticated;
