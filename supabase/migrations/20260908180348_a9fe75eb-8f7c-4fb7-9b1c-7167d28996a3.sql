ALTER FUNCTION public.validate_small_mission() SET search_path = public;
ALTER FUNCTION public.mutual_aid_money_mention(text) SET search_path = public;
ALTER FUNCTION public.guard_money_in_mutual_aid() SET search_path = public;
ALTER FUNCTION public.enforce_mission_response_status_transitions() SET search_path = public;
ALTER FUNCTION public.mission_category_to_skill(text) SET search_path = public;

ALTER TABLE public.backup_qualite_20260908 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.backup_qualite_20260908 FROM anon, authenticated;
GRANT ALL ON public.backup_qualite_20260908 TO service_role;
CREATE POLICY "Admins can read backup_qualite_20260908"
  ON public.backup_qualite_20260908 FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));