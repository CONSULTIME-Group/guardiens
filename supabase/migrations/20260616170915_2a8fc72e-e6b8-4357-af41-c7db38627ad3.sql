
-- 1. error_logs: restreindre user_email lors des inserts
DROP POLICY IF EXISTS auth_insert_error_logs ON public.error_logs;
DROP POLICY IF EXISTS anon_insert_error_logs ON public.error_logs;

CREATE POLICY auth_insert_error_logs ON public.error_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    ((user_id IS NULL) OR (user_id = auth.uid()))
    AND (
      user_email IS NULL
      OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY anon_insert_error_logs ON public.error_logs
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND user_email IS NULL);

-- 2. house_guides: supprimer la policy redondante, garder la version consolidée
DROP POLICY IF EXISTS "Confirmed sitters can view house guide" ON public.house_guides;
-- sitter_view_house_guide_during_sit reste : owner OU sitter pendant la garde OU admin
