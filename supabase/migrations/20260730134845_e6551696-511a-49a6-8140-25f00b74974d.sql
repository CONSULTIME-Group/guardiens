DROP POLICY IF EXISTS "Published sits are publicly readable" ON public.sits;
CREATE POLICY "Public sits are readable by anon"
ON public.sits
FOR SELECT
TO anon
USING (status = ANY (ARRAY['published'::sit_status,'confirmed'::sit_status,'in_progress'::sit_status,'completed'::sit_status,'archived'::sit_status]));