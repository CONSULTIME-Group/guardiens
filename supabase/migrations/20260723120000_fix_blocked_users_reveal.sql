-- Retire la policy qui expose l'identité du bloqueur au bloqué.
DROP POLICY IF EXISTS "Users can see if blocked" ON public.blocked_users;

-- Fonction SECURITY DEFINER : filtre la liste d'IDs partenaires que l'appelant
-- doit masquer (parce qu'il les a bloqués OU parce qu'ils l'ont bloqué),
-- sans jamais retourner l'identité d'un bloqueur non déjà connu du caller.
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
