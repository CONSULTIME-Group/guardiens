-- Table d'historique des changements de dates sur les annonces
CREATE TABLE public.sit_date_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sit_id uuid NOT NULL REFERENCES public.sits(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_by_role text,
  old_start_date date,
  old_end_date date,
  new_start_date date,
  new_end_date date,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sit_date_changes_sit_id ON public.sit_date_changes(sit_id, changed_at DESC);

ALTER TABLE public.sit_date_changes ENABLE ROW LEVEL SECURITY;

-- Le propriétaire de l'annonce peut voir l'historique
CREATE POLICY "Owner can view date history"
ON public.sit_date_changes FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.sits s WHERE s.id = sit_id AND s.user_id = auth.uid())
);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all date history"
ON public.sit_date_changes FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger : log automatique sur changement de start_date ou end_date
CREATE OR REPLACE FUNCTION public.log_sit_date_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role text := 'user';
BEGIN
  IF (OLD.start_date IS DISTINCT FROM NEW.start_date)
     OR (OLD.end_date IS DISTINCT FROM NEW.end_date) THEN

    IF v_actor IS NULL THEN
      v_role := 'system';
    ELSIF public.has_role(v_actor, 'admin'::app_role) THEN
      v_role := 'admin';
    ELSIF v_actor = NEW.user_id THEN
      v_role := 'owner';
    END IF;

    INSERT INTO public.sit_date_changes (
      sit_id, changed_by, changed_by_role,
      old_start_date, old_end_date,
      new_start_date, new_end_date
    ) VALUES (
      NEW.id, v_actor, v_role,
      OLD.start_date, OLD.end_date,
      NEW.start_date, NEW.end_date
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_sit_date_change
AFTER UPDATE ON public.sits
FOR EACH ROW
EXECUTE FUNCTION public.log_sit_date_change();

-- Backfill : enregistre l'historique connu pour l'annonce de Patricia
INSERT INTO public.sit_date_changes (
  sit_id, changed_by_role,
  old_start_date, old_end_date,
  new_start_date, new_end_date,
  changed_at
)
SELECT
  '293fab2e-b32d-45a0-9c04-36a4f43c484f'::uuid,
  'admin',
  '2026-06-21'::date, '2026-07-05'::date,
  '2026-06-14'::date, '2026-06-28'::date,
  now()
WHERE EXISTS (SELECT 1 FROM public.sits WHERE id = '293fab2e-b32d-45a0-9c04-36a4f43c484f');