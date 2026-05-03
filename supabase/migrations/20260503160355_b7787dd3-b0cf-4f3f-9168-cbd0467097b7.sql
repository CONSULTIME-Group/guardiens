
CREATE OR REPLACE FUNCTION public.find_duplicate_gmail_account(_user_id uuid)
RETURNS TABLE(canonical_email text, canonical_user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id, lower(email) AS email
    FROM public.profiles
    WHERE id = _user_id
  ),
  parts AS (
    SELECT
      me.id,
      split_part(me.email, '@', 1) AS local,
      split_part(me.email, '@', 2) AS domain
    FROM me
  ),
  norm AS (
    SELECT
      id,
      domain,
      replace(local, '.', '') AS local_nodot
    FROM parts
    WHERE domain IN ('gmail.com', 'googlemail.com')
  )
  SELECT p.email, p.id
  FROM public.profiles p, norm
  WHERE p.id <> norm.id
    AND lower(split_part(p.email, '@', 2)) IN ('gmail.com', 'googlemail.com')
    AND replace(lower(split_part(p.email, '@', 1)), '.', '') = norm.local_nodot
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_duplicate_gmail_account(uuid) TO authenticated;
