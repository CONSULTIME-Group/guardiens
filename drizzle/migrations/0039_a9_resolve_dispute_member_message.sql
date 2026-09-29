CREATE OR REPLACE FUNCTION public.resolve_review_dispute_v2(p_dispute_id uuid, p_decision text, p_admin_note text DEFAULT NULL, p_member_message text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_dispute public.review_disputes%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;
  IF p_decision NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Décision invalide';
  END IF;
  IF p_member_message IS NOT NULL AND length(p_member_message) > 2000 THEN
    RAISE EXCEPTION 'Message au membre trop long';
  END IF;
  SELECT * INTO v_dispute FROM public.review_disputes WHERE id = p_dispute_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contestation introuvable';
  END IF;
  IF v_dispute.status != 'pending' THEN
    RAISE EXCEPTION 'Cette contestation a déjà été résolue';
  END IF;

  UPDATE public.review_disputes
  SET status = p_decision,
      admin_note = NULLIF(trim(coalesce(p_admin_note, '')), ''),
      member_message = NULLIF(trim(coalesce(p_member_message, '')), ''),
      resolved_at = now(),
      resolved_by = auth.uid()
  WHERE id = p_dispute_id;

  IF p_decision = 'accepted' THEN
    UPDATE public.reviews
    SET published = false, moderation_status = 'refuse'
    WHERE id = v_dispute.review_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    v_dispute.disputer_id,
    'dispute_resolved',
    CASE WHEN p_decision = 'accepted' THEN 'Contestation acceptée' ELSE 'Contestation examinée' END,
    CASE WHEN p_decision = 'accepted'
      THEN 'Votre contestation a été acceptée : l''avis est retiré de votre profil.'
      ELSE 'Après relecture, l''avis respecte nos règles de publication et reste en ligne.'
    END,
    '/mes-avis'
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.resolve_review_dispute_v2(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_review_dispute_v2(uuid, text, text, text) TO authenticated, service_role;
COMMENT ON FUNCTION public.resolve_review_dispute(uuid, text, text) IS 'DEPRECATED: remplacée par resolve_review_dispute_v2 (lot A9, message au membre séparé).';