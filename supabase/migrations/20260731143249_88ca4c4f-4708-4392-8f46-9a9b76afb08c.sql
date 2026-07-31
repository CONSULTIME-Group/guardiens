-- 1. blocked_users : ne plus révéler l'identité du bloqueur au bloqué
DROP POLICY IF EXISTS "Users can see if blocked" ON public.blocked_users;

CREATE OR REPLACE FUNCTION public.filter_blocked_partners(p_other_ids uuid[])
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT other_id
  FROM unnest(p_other_ids) AS other_id
  WHERE EXISTS (
    SELECT 1 FROM public.blocked_users b
    WHERE (b.blocker_id = auth.uid() AND b.blocked_id = other_id)
       OR (b.blocked_id = auth.uid() AND b.blocker_id = other_id)
  );
$$;

REVOKE ALL ON FUNCTION public.filter_blocked_partners(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.filter_blocked_partners(uuid[]) TO authenticated;

-- 2. past_animals : restreindre la lecture ouverte
DROP POLICY IF EXISTS "Past animals are viewable by authenticated users" ON public.past_animals;

CREATE POLICY "Past animals readable for public sitter profiles"
ON public.past_animals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sitter_profiles s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.id = past_animals.sitter_profile_id
      AND (s.user_id = auth.uid() OR p.profile_completion >= 40)
  )
);