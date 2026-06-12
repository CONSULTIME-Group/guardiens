-- Le trigger BEFORE INSERT échoue toujours car il essaie d'insérer dans
-- sit_status_history(sit_id) AVANT que la ligne sits soit visible : violation FK.
-- On le sépare en deux : AFTER INSERT (pas de OLD) + BEFORE UPDATE OF status.

DROP TRIGGER IF EXISTS trg_track_sit_status_change ON public.sits;

CREATE TRIGGER trg_track_sit_status_change_ins
AFTER INSERT ON public.sits
FOR EACH ROW EXECUTE FUNCTION public.track_sit_status_change();

CREATE TRIGGER trg_track_sit_status_change_upd
AFTER UPDATE OF status ON public.sits
FOR EACH ROW EXECUTE FUNCTION public.track_sit_status_change();