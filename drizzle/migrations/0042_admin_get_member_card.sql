-- Lot A12 : fiche membre admin, lecture seule. Aucune table, aucune colonne, aucune écriture.
-- Ne lit aucun contenu de message entre membres (table messages jamais consultée).
CREATE OR REPLACE FUNCTION public.admin_get_member_card(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'identity', (
      SELECT jsonb_build_object(
        'id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'avatar_url', p.avatar_url,
        'city', p.city,
        'postal_code', p.postal_code,
        'role', p.role,
        'roles', COALESCE((SELECT jsonb_agg(ur.role ORDER BY ur.role) FROM public.user_roles ur WHERE ur.user_id = p.id), '[]'::jsonb),
        'account_status', COALESCE(p.account_status, 'active'),
        'created_at', p.created_at,
        'last_seen_at', p.last_seen_at,
        'identity_verified', COALESCE(p.identity_verified, false),
        'identity_verification_status', COALESCE(p.identity_verification_status, 'not_submitted'),
        'identity_verified_at', (SELECT max(l.created_at) FROM public.identity_verification_logs l WHERE l.user_id = p.id AND l.result IN ('approved','verified','auto_approved')),
        'identity_last_log_at', (SELECT max(l.created_at) FROM public.identity_verification_logs l WHERE l.user_id = p.id),
        'has_identity_documents', (p.identity_document_url IS NOT NULL OR p.identity_selfie_url IS NOT NULL),
        'email', p.email,
        'email_confirmed', (SELECT u.email_confirmed_at IS NOT NULL FROM auth.users u WHERE u.id = p.id),
        'is_manual_super', COALESCE((SELECT m.is_manual_super FROM public.profile_moderation m WHERE m.profile_id = p.id), false),
        'is_founder', COALESCE(p.is_founder, false),
        'profile_completion', COALESCE(p.profile_completion, 0)
      )
      FROM public.profiles p WHERE p.id = p_user_id
    ),
    'owner', jsonb_build_object(
      'sits_by_status', COALESCE((SELECT jsonb_object_agg(s.status, s.n) FROM (SELECT status, count(*) n FROM public.sits WHERE user_id = p_user_id GROUP BY status) s), '{}'::jsonb),
      'recent_sits', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'created_at' DESC) FROM (
        SELECT jsonb_build_object('id', s.id, 'title', s.title, 'start_date', s.start_date, 'end_date', s.end_date,
               'status', s.status, 'created_at', s.created_at,
               'applications_count', (SELECT count(*) FROM public.applications a WHERE a.sit_id = s.id)) x
        FROM public.sits s WHERE s.user_id = p_user_id ORDER BY s.created_at DESC LIMIT 5) t), '[]'::jsonb)
    ),
    'sitter', jsonb_build_object(
      'applications_by_status', COALESCE((SELECT jsonb_object_agg(a.status, a.n) FROM (SELECT status, count(*) n FROM public.applications WHERE sitter_id = p_user_id GROUP BY status) a), '{}'::jsonb),
      'completed_sits', COALESCE((SELECT completed_sits_count FROM public.profiles WHERE id = p_user_id), 0),
      'is_available', (SELECT sp.is_available FROM public.sitter_profiles sp WHERE sp.user_id = p_user_id LIMIT 1),
      'recent_applications', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'created_at' DESC) FROM (
        SELECT jsonb_build_object('id', a.id, 'sit_id', a.sit_id, 'sit_title', s.title, 'status', a.status, 'created_at', a.created_at) x
        FROM public.applications a LEFT JOIN public.sits s ON s.id = a.sit_id
        WHERE a.sitter_id = p_user_id ORDER BY a.created_at DESC LIMIT 5) t), '[]'::jsonb)
    ),
    'mutual_aid', jsonb_build_object(
      'missions_by_status', COALESCE((SELECT jsonb_object_agg(m.status, m.n) FROM (SELECT status, count(*) n FROM public.small_missions WHERE user_id = p_user_id GROUP BY status) m), '{}'::jsonb),
      'responses_by_status', COALESCE((SELECT jsonb_object_agg(r.status, r.n) FROM (SELECT status, count(*) n FROM public.small_mission_responses WHERE responder_id = p_user_id GROUP BY status) r), '{}'::jsonb)
    ),
    'reviews', jsonb_build_object(
      'received_count', (SELECT count(*) FROM public.reviews WHERE reviewee_id = p_user_id AND published = true AND moderation_hidden_at IS NULL),
      'received_avg', (SELECT round(avg(overall_rating)::numeric, 1) FROM public.reviews WHERE reviewee_id = p_user_id AND published = true AND moderation_hidden_at IS NULL),
      'given_count', (SELECT count(*) FROM public.reviews WHERE reviewer_id = p_user_id),
      'hidden_count', (SELECT count(*) FROM public.reviews WHERE (reviewee_id = p_user_id OR reviewer_id = p_user_id) AND moderation_hidden_at IS NOT NULL)
    ),
    'reports', jsonb_build_object(
      'targeting_by_status', COALESCE((SELECT jsonb_object_agg(r.status, r.n) FROM (SELECT COALESCE(status, 'pending') status, count(*) n FROM public.reports WHERE target_type IN ('user','profile') AND target_id = p_user_id GROUP BY 1) r), '{}'::jsonb),
      'made_count', (SELECT count(*) FROM public.reports WHERE reporter_id = p_user_id)
    ),
    'messaging', jsonb_build_object(
      'conversations_count', (SELECT count(*) FROM public.conversations WHERE owner_id = p_user_id OR sitter_id = p_user_id),
      'last_activity_at', (SELECT max(COALESCE(last_message_at, updated_at, created_at)) FROM public.conversations WHERE owner_id = p_user_id OR sitter_id = p_user_id),
      'last_conversation_id', (SELECT id FROM public.conversations WHERE owner_id = p_user_id OR sitter_id = p_user_id ORDER BY COALESCE(last_message_at, updated_at, created_at) DESC LIMIT 1)
    ),
    'team_messages', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'sent_at' DESC) FROM (
      SELECT jsonb_build_object('id', l.id, 'sent_at', l.sent_at, 'status', l.status,
             'excerpt', left(COALESCE(l.content, ''), 140), 'error_message', l.error_message,
             'conversation_id', l.conversation_id) x
      FROM public.admin_message_logs l WHERE l.recipient_id = p_user_id ORDER BY l.sent_at DESC LIMIT 5) t), '[]'::jsonb),
    'moderation', (
      SELECT jsonb_build_object('admin_notes', m.admin_notes, 'suspension_reason', COALESCE(m.suspension_reason, (SELECT suspension_reason FROM public.profiles WHERE id = p_user_id)))
      FROM (SELECT 1) one LEFT JOIN public.profile_moderation m ON m.profile_id = p_user_id
    ),
    'history', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'created_at' DESC) FROM (
      SELECT jsonb_build_object('id', h.id, 'created_at', h.created_at, 'action', h.action, 'note', h.note,
             'admin_name', NULLIF(trim(COALESCE(ap.first_name, '') || ' ' || COALESCE(ap.last_name, '')), '')) x
      FROM public.admin_action_logs h LEFT JOIN public.profiles ap ON ap.id = h.admin_id
      WHERE h.target_id = p_user_id ORDER BY h.created_at DESC LIMIT 20) t), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_member_card(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_member_card(uuid) TO authenticated;
COMMENT ON FUNCTION public.admin_get_member_card(uuid) IS 'Lot A12 : fiche membre admin, lecture seule, refus hors admin, aucun contenu de message entre membres.';