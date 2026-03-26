-- Admin can read all small missions
CREATE POLICY "Admins can read all missions"
ON public.small_missions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any mission (archive/restore)
CREATE POLICY "Admins can update any mission"
ON public.small_missions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any mission
CREATE POLICY "Admins can delete any mission"
ON public.small_missions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can read all responses
CREATE POLICY "Admins can read all responses"
ON public.small_mission_responses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any response
CREATE POLICY "Admins can delete any response"
ON public.small_mission_responses FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));