
-- 1. Dedup column for the availability nudge
ALTER TABLE public.sits
  ADD COLUMN IF NOT EXISTS availability_nudge_sent_at timestamptz;

-- 2. Auto-flag is_urgent when start_date is close and no applications
CREATE OR REPLACE FUNCTION public.auto_flag_urgent_sits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  WITH targets AS (
    SELECT s.id
    FROM public.sits s
    WHERE s.status = 'published'
      AND s.is_urgent = false
      AND s.start_date IS NOT NULL
      AND s.start_date - CURRENT_DATE BETWEEN 0 AND 6
      AND NOT EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.sit_id = s.id
          AND a.status NOT IN ('rejected','cancelled')
      )
  )
  UPDATE public.sits s
  SET is_urgent = true
  FROM targets t
  WHERE s.id = t.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_flag_urgent_sits() FROM PUBLIC;

-- 3. Helper for the nudge mailer: list pending sits with their department + counts
CREATE OR REPLACE FUNCTION public.list_sits_needing_availability_nudge()
RETURNS TABLE (
  sit_id uuid,
  title text,
  start_date date,
  end_date date,
  city text,
  department text,
  owner_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id AS sit_id,
    s.title,
    s.start_date,
    s.end_date,
    p.city,
    NULLIF(LEFT(COALESCE(p.postal_code, ''), 2), '') AS department,
    s.user_id AS owner_id
  FROM public.sits s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.status = 'published'
    AND s.availability_nudge_sent_at IS NULL
    AND s.created_at < now() - interval '24 hours'
    AND s.start_date >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.sit_id = s.id
        AND a.status NOT IN ('rejected','cancelled')
    );
$$;

REVOKE ALL ON FUNCTION public.list_sits_needing_availability_nudge() FROM PUBLIC;

-- 4. Helper: find gardiens disponibles in a département for a given period
CREATE OR REPLACE FUNCTION public.find_available_sitters_for_nudge(
  p_department text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (user_id uuid, email text, first_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    pr.id AS user_id,
    pr.email,
    pr.first_name
  FROM public.profiles pr
  JOIN public.sitter_profiles sp ON sp.user_id = pr.id
  WHERE pr.role IN ('sitter','both')
    AND pr.email IS NOT NULL
    AND pr.account_status = 'active'
    AND p_department IS NOT NULL
    AND LEFT(COALESCE(pr.postal_code, ''), 2) = p_department
    AND NOT EXISTS (
      SELECT 1 FROM public.suppressed_emails se
      WHERE lower(se.email) = lower(pr.email)
    )
    -- Pas déjà candidat sur cette période avec une garde acceptée
    AND NOT EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.sits s2 ON s2.id = a.sit_id
      WHERE a.sitter_id = pr.id
        AND a.status = 'accepted'
        AND s2.start_date <= p_end_date
        AND s2.end_date >= p_start_date
    );
$$;

REVOKE ALL ON FUNCTION public.find_available_sitters_for_nudge(text, date, date) FROM PUBLIC;
