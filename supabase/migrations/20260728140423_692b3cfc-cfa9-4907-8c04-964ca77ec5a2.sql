CREATE OR REPLACE FUNCTION public.enforce_reviews_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Drapeau transactionnel pose par les publications legitimes
  -- (auto_publish_reviews, publish_stale_reviews).
  IF coalesce(current_setting('app.review_publisher', true), 'off') = 'on' THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Identites immuables cote auteur.
  IF NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
     OR NEW.reviewee_id IS DISTINCT FROM OLD.reviewee_id THEN
    RAISE EXCEPTION 'reviewer_id/reviewee_id are immutable';
  END IF;

  -- L'auteur ne peut plus alterer notes / commentaire / statut de moderation
  -- une fois l'avis publie ou modere.
  IF COALESCE(OLD.published, false) = true
     OR COALESCE(OLD.moderation_status, 'pending') <> 'pending' THEN
    IF NEW.overall_rating       IS DISTINCT FROM OLD.overall_rating
       OR NEW.comment           IS DISTINCT FROM OLD.comment
       OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
       OR NEW.published         IS DISTINCT FROM OLD.published THEN
      RAISE EXCEPTION 'review is locked once published or moderated';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_review_moderation_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(current_setting('app.review_publisher', true), 'off') = 'on' THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
     OR NEW.published IS DISTINCT FROM OLD.published
     OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
     OR NEW.reviewee_id IS DISTINCT FROM OLD.reviewee_id
     OR NEW.sit_id IS DISTINCT FROM OLD.sit_id
     OR NEW.review_type IS DISTINCT FROM OLD.review_type
  THEN
    RAISE EXCEPTION 'Seul un administrateur peut moderer un avis';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reviews_guard_moderation_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(current_setting('app.review_publisher', true), 'off') = 'on' THEN
    RETURN NEW;
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
       OR NEW.published IS DISTINCT FROM OLD.published
       OR NEW.response_status IS DISTINCT FROM OLD.response_status THEN
      RAISE EXCEPTION 'Only admins can change moderation_status, published or response_status';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_publish_reviews()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  other_review_exists BOOLEAN;
  v_sit_id UUID;
BEGIN
  v_sit_id := NEW.sit_id;

  -- Reciprocite : il suffit qu'un autre avis existe sur la meme garde, quel que
  -- soit son statut de publication. Sinon un avis deja publie en forcage solo
  -- empechait definitivement la publication du second.
  SELECT EXISTS (
    SELECT 1 FROM public.reviews
    WHERE sit_id = v_sit_id
      AND id != NEW.id
  ) INTO other_review_exists;

  IF other_review_exists THEN
    PERFORM set_config('app.review_publisher', 'on', true);
    UPDATE public.reviews
    SET published = true, moderation_status = 'valide'
    WHERE sit_id = v_sit_id AND published = false;
    PERFORM set_config('app.review_publisher', 'off', true);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.publish_stale_reviews(p_days integer DEFAULT 14)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('app.review_publisher', 'on', true);
  UPDATE public.reviews
  SET published = true, moderation_status = 'valide'
  WHERE published = false
    AND created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM set_config('app.review_publisher', 'off', true);
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.publish_stale_reviews(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_stale_reviews(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_stale_reviews(integer) TO service_role;