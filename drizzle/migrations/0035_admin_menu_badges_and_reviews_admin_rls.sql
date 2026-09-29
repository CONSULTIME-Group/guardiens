CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_menu_badges()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin only' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'verifications', (SELECT count(*) FROM profiles
       WHERE identity_verification_status IN ('pending','needs_review')
          OR (identity_verification_status = 'not_submitted'
              AND (identity_document_url IS NOT NULL OR identity_selfie_url IS NOT NULL))),
    'experiences', (SELECT count(*) FROM external_experiences WHERE verification_status = 'pending'),
    'skills', (SELECT count(*) FROM skills_library WHERE status = 'pending')
       + (SELECT count(DISTINCT c) FROM (
            SELECT unnest(competences) AS c FROM sitter_profiles WHERE competences IS NOT NULL
            UNION ALL
            SELECT unnest(competences) FROM owner_profiles WHERE competences IS NOT NULL
          ) s
          WHERE c IS NOT NULL AND c <> ''
            AND NOT EXISTS (SELECT 1 FROM competences_validees v WHERE v.label = s.c)),
    'reviewsModeration', (SELECT count(*) FROM reviews WHERE review_type = 'annulation' AND moderation_status = 'en_attente')
       + (SELECT count(*) FROM reviews WHERE review_type = 'annulation' AND response_status = 'en_attente'),
    'reviewDisputes', (SELECT count(*) FROM review_disputes WHERE status = 'pending'),
    'reports', (SELECT count(*) FROM reports WHERE status IN ('new','in_progress')),
    'contactMessages', (SELECT count(*) FROM contact_messages WHERE status IN ('new','en_cours')),
    'adminMessageFailed', (SELECT count(*) FROM admin_message_logs WHERE status = 'failed' AND sent_at >= now() - interval '7 days'),
    'errors', (SELECT count(*) FROM error_logs WHERE resolved_at IS NULL AND severity IS DISTINCT FROM 'ignored_third_party'),
    'guideRequests', (SELECT count(*) FROM guide_requests WHERE status = 'pending'),
    'analysisRequests', (SELECT count(*) FROM analysis_requests WHERE status = 'new'),
    'deletionRequests', (SELECT count(*) FROM account_deletion_requests WHERE status = 'pending'),
    'sitsToStaff', (SELECT count(*) FROM sits s
       WHERE s.status = 'published'
         AND (s.end_date IS NULL OR s.end_date >= v_today)
         AND NOT EXISTS (SELECT 1 FROM applications a
                         WHERE a.sit_id = s.id AND a.status NOT IN ('rejected','cancelled')))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_menu_badges() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_menu_badges() TO authenticated;