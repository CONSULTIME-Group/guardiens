
ALTER TABLE public.sits
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unpublished_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_unpublished_reason TEXT;

CREATE TABLE IF NOT EXISTS public.sit_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sit_id UUID NOT NULL REFERENCES public.sits(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_sit_status_history_sit ON public.sit_status_history(sit_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sit_status_history_new_status ON public.sit_status_history(new_status, changed_at DESC);

GRANT SELECT ON public.sit_status_history TO authenticated;
GRANT ALL ON public.sit_status_history TO service_role;

ALTER TABLE public.sit_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all sit status history"
ON public.sit_status_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can read history of their own sits"
ON public.sit_status_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sits s
    JOIN public.properties p ON p.id = s.property_id
    WHERE s.id = sit_status_history.sit_id AND p.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.track_sit_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.sit_status_history (sit_id, old_status, new_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
      NEW.published_at := now();
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.sit_status_history (sit_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    IF NEW.status = 'published' AND OLD.published_at IS NULL THEN
      NEW.published_at := now();
    END IF;
    IF OLD.status = 'published' AND NEW.status <> 'published' THEN
      NEW.unpublished_at := now();
    END IF;
    IF OLD.status <> 'published' AND NEW.status = 'published' THEN
      NEW.unpublished_at := NULL;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_sit_status_change ON public.sits;
CREATE TRIGGER trg_track_sit_status_change
BEFORE INSERT OR UPDATE OF status ON public.sits
FOR EACH ROW EXECUTE FUNCTION public.track_sit_status_change();

UPDATE public.sits
SET published_at = COALESCE(published_at, created_at)
WHERE status = 'published' AND published_at IS NULL;

INSERT INTO public.sit_status_history (sit_id, old_status, new_status, changed_at, reason)
SELECT s.id, NULL, s.status, s.created_at, 'backfill'
FROM public.sits s
WHERE NOT EXISTS (SELECT 1 FROM public.sit_status_history h WHERE h.sit_id = s.id);

CREATE OR REPLACE FUNCTION public.admin_get_recent_sit_status_changes(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID, sit_id UUID, sit_title TEXT, old_status TEXT, new_status TEXT,
  changed_at TIMESTAMPTZ, owner_first_name TEXT, owner_city TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.id, h.sit_id, s.title, h.old_status, h.new_status, h.changed_at,
         p.first_name, p.city
  FROM public.sit_status_history h
  JOIN public.sits s ON s.id = h.sit_id
  JOIN public.properties pr ON pr.id = s.property_id
  JOIN public.profiles p ON p.id = pr.user_id
  WHERE public.has_role(auth.uid(), 'admin')
    AND h.reason IS DISTINCT FROM 'backfill'
    AND h.old_status IS NOT NULL
  ORDER BY h.changed_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_sit_status_changes(INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_recent_account_deletions(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID, user_id UUID, requested_at TIMESTAMPTZ, scheduled_for TIMESTAMPTZ,
  status TEXT, first_name TEXT, city TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.user_id, d.requested_at, d.scheduled_deletion_at, d.status,
         p.first_name, p.city
  FROM public.account_deletion_requests d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY d.requested_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_account_deletions(INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_pending_deletions_count()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(auth.uid(), 'admin') THEN (
    SELECT COUNT(*)::INT FROM public.account_deletion_requests WHERE status = 'pending'
  ) ELSE 0 END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_pending_deletions_count() TO authenticated;
