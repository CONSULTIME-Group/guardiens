-- Lot P1 (19/10/2026, arène « annonce en ligne lisible ») : seul le
-- propriétaire publie son annonce.
-- Décision de Jérémie du 19/10/2026 : le serveur ne met jamais en ligne un
-- brouillon, même publiable. Exception unique : une publication forcée que
-- Jérémie demande explicitement, faite dans une transaction SQL qui pose
--   SELECT set_config('guardiens.publication_forcee', 'on', true);
-- avant la mise à jour. Le réglage vaut pour cette seule transaction ; un
-- client REST ne peut pas le poser.
-- Constat (sit_status_history) : 8 brouillons sont passés en ligne sans
-- utilisateur connecté entre le 16/09 et le 14/10/2026, sans que leurs
-- propriétaires en soient informés.
-- Périmètre : passage de draft à published, et insertion directe en
-- published, quand aucun utilisateur n'est connecté (auth.uid() vide).
-- Restent libres : la publication par le propriétaire, le bouton admin
-- « Publier à la place » (session admin, journalisé), le retour en ligne
-- après annulation du gardien (confirmed vers published), toutes les autres
-- transitions, et la création de brouillons côté serveur (annonce-noel).
-- Rejouable.
CREATE OR REPLACE FUNCTION public.guard_sit_publish_by_owner_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM 'published'::sit_status THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'draft'::sit_status THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('guardiens.publication_forcee', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'publication_reservee_au_proprietaire'
    USING ERRCODE = 'P0001',
          DETAIL = 'Seul le propriétaire connecté publie son annonce. Publication forcée : set_config(''guardiens.publication_forcee'', ''on'', true) dans la même transaction.';
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_sit_publish_by_owner_session() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_guard_sit_publish_by_owner_session ON public.sits;
CREATE TRIGGER trg_guard_sit_publish_by_owner_session
  BEFORE INSERT OR UPDATE OF status ON public.sits
  FOR EACH ROW EXECUTE FUNCTION public.guard_sit_publish_by_owner_session();
