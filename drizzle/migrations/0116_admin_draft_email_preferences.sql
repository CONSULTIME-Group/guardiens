-- Lecture limitée aux préférences utiles au diagnostic des brouillons.
-- Aucun élargissement des accès directs à email_preferences.
CREATE OR REPLACE FUNCTION public.admin_draft_email_preferences(p_owner_ids uuid[])
RETURNS TABLE(user_id uuid, product_emails boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT COALESCE(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF cardinality(p_owner_ids) > 500 THEN
    RAISE EXCEPTION 'At most 500 owners per request';
  END IF;
  RETURN QUERY
  SELECT p.id, COALESCE(ep.product_emails, true)
  FROM public.profiles p
  LEFT JOIN public.email_preferences ep ON ep.user_id = p.id
  WHERE p.id = ANY(p_owner_ids)
    AND EXISTS (SELECT 1 FROM public.sits s WHERE s.user_id = p.id AND s.status = 'draft' AND s.published_at IS NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_draft_email_preferences(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_draft_email_preferences(uuid[]) TO authenticated;
