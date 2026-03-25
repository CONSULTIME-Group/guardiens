
-- Allow admins to read email_send_log
CREATE POLICY "Admins can read email send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read email_send_state
CREATE POLICY "Admins can read email send state"
ON public.email_send_state
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update email_send_state (for config changes)
CREATE POLICY "Admins can update email send state"
ON public.email_send_state
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read suppressed_emails
CREATE POLICY "Admins can read suppressed emails"
ON public.suppressed_emails
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete suppressed_emails (unblock)
CREATE POLICY "Admins can delete suppressed emails"
ON public.suppressed_emails
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
