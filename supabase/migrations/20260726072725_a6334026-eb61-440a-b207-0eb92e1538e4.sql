-- 1) Conserver la trace de conformité même après suppression du compte
ALTER TABLE public.account_deletion_requests
  DROP CONSTRAINT IF EXISTS account_deletion_requests_user_id_fkey;

ALTER TABLE public.account_deletion_requests
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.account_deletion_requests
  ADD CONSTRAINT account_deletion_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.account_deletion_requests
  ADD COLUMN IF NOT EXISTS requester_email text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'self',
  ADD COLUMN IF NOT EXISTS processed_by uuid,
  ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_adr_requester_email ON public.account_deletion_requests (requester_email);
CREATE INDEX IF NOT EXISTS idx_adr_status ON public.account_deletion_requests (status);

DROP TRIGGER IF EXISTS trg_adr_updated_at ON public.account_deletion_requests;
CREATE TRIGGER trg_adr_updated_at
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Accès admin (lecture + saisie de demandes reçues hors plateforme)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

DROP POLICY IF EXISTS "Admins can view all deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Admins can view all deletion requests"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Admins can insert deletion requests"
  ON public.account_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Admins can update deletion requests"
  ON public.account_deletion_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Autoriser le motif de suppression liée à un effacement de compte
ALTER TABLE public.suppressed_emails DROP CONSTRAINT IF EXISTS suppressed_emails_reason_check;
ALTER TABLE public.suppressed_emails
  ADD CONSTRAINT suppressed_emails_reason_check
  CHECK (reason = ANY (ARRAY['unsubscribe'::text, 'bounce'::text, 'complaint'::text, 'account_deleted'::text]));