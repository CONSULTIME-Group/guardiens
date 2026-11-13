-- Lot SORT2 (12/11/2026) : modification d'une sortie publiée par son organisateur.
-- Un changement de jour, d'heure ou de lieu pose une notification de cloche à
-- chaque inscrit. Une sortie reste datée dans le futur à la modification, et
-- seule une sortie ouverte se modifie. S'applique après 0145.
-- Aucune donnée existante modifiée. Repère : sort2_modification_sortie.

CREATE OR REPLACE FUNCTION public.outings_guard_update() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort2_modification_sortie
BEGIN
  IF NEW.starts_at IS DISTINCT FROM OLD.starts_at AND NEW.starts_at <= now() THEN
    RAISE EXCEPTION 'OUTING_DATE_PAST' USING ERRCODE = 'P0001';
  END IF;
  -- Une sortie annulée garde son contenu : elle se repropose, elle ne se modifie plus.
  IF OLD.status = 'cancelled' AND NEW.status = 'cancelled' AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND (NEW.title, NEW.description, NEW.category, NEW.starts_at, NEW.place_kind, NEW.place_label, NEW.city, NEW.postal_code, NEW.capacity, NEW.reserved, NEW.participation_eur)
         IS DISTINCT FROM
         (OLD.title, OLD.description, OLD.category, OLD.starts_at, OLD.place_kind, OLD.place_label, OLD.city, OLD.postal_code, OLD.capacity, OLD.reserved, OLD.participation_eur) THEN
    RAISE EXCEPTION 'OUTING_CANCELLED_LOCKED' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_outings_guard_update ON public.outings;
CREATE TRIGGER trg_outings_guard_update
  BEFORE UPDATE ON public.outings
  FOR EACH ROW EXECUTE FUNCTION public.outings_guard_update();

CREATE OR REPLACE FUNCTION public.outings_notify_change() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
-- sort2_modification_sortie
BEGIN
  IF NEW.status <> 'open' OR NEW.hidden_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT a.user_id, 'outing_changed', 'Une sortie a changé',
           'Le rendez-vous de « ' || NEW.title || ' » a changé. La fiche est à jour.',
           '/sorties/' || NEW.slug
    FROM public.outing_attendees a
    WHERE a.outing_id = NEW.id AND a.status = 'going';
  EXCEPTION WHEN OTHERS THEN
    NULL; -- la cloche ne bloque jamais une modification
  END;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_outings_notify_change ON public.outings;
CREATE TRIGGER trg_outings_notify_change
  AFTER UPDATE OF starts_at, place_kind, place_label, city ON public.outings
  FOR EACH ROW
  WHEN (OLD.starts_at IS DISTINCT FROM NEW.starts_at OR OLD.place_kind IS DISTINCT FROM NEW.place_kind
        OR OLD.place_label IS DISTINCT FROM NEW.place_label OR OLD.city IS DISTINCT FROM NEW.city)
  EXECUTE FUNCTION public.outings_notify_change();

REVOKE ALL ON FUNCTION public.outings_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.outings_notify_change() FROM PUBLIC, anon, authenticated;
