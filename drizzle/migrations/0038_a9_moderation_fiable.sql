ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS member_message text;
COMMENT ON COLUMN public.reports.member_message IS 'Lot A9 : message envoyé au membre par email. admin_notes reste interne et n est jamais envoyé.';
ALTER TABLE public.review_disputes ADD COLUMN IF NOT EXISTS member_message text;
COMMENT ON COLUMN public.review_disputes.member_message IS 'Lot A9 : message envoyé au membre. admin_note reste interne.';
ALTER TABLE public.sits ADD COLUMN IF NOT EXISTS status_before_hidden text;
COMMENT ON COLUMN public.sits.status_before_hidden IS 'Lot A9 : statut mémorisé au masquage admin, restauré par Remettre en ligne.';
ALTER TABLE public.small_missions ADD COLUMN IF NOT EXISTS status_before_hidden text;
COMMENT ON COLUMN public.small_missions.status_before_hidden IS 'Lot A9 : statut mémorisé au masquage admin, restauré par Restaurer.';

CREATE OR REPLACE FUNCTION public.notify_review_published()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_reviewer_name text;
  v_reviewer_avatar text;
BEGIN
  -- Lot A9 : une republication après masquage de modération ne renotifie pas.
  IF NEW.published = true AND (OLD.published = false OR OLD.published IS NULL)
     AND OLD.moderation_hidden_at IS NULL THEN
    SELECT p.first_name, p.avatar_url INTO v_reviewer_name, v_reviewer_avatar
    FROM public.profiles p WHERE p.id = NEW.reviewer_id;

    INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
    VALUES (
      NEW.reviewee_id,
      'review_published',
      'Nouvel avis reçu',
      coalesce(v_reviewer_name, 'Quelqu''un') || ' vous a laissé un avis (' || NEW.overall_rating || '/5).',
      '/sits/' || NEW.sit_id,
      v_reviewer_name,
      v_reviewer_avatar
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_listing_delete_counts(p_sit_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;
  RETURN jsonb_build_object(
    'applications', (SELECT count(*) FROM public.applications WHERE sit_id = p_sit_id),
    'messages', (SELECT count(*) FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id WHERE c.sit_id = p_sit_id),
    'reviews', (SELECT count(*) FROM public.reviews WHERE sit_id = p_sit_id),
    'badges', (SELECT count(*) FROM public.badge_attributions WHERE sit_id = p_sit_id)
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_listing_delete_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listing_delete_counts(uuid) TO authenticated, service_role;