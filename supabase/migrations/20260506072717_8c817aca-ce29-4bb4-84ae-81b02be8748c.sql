-- 1) Allow internal flag in sensitive-fields guard
CREATE OR REPLACE FUNCTION public.trg_prevent_sensitive_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.allow_internal_profile_update', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
     OR NEW.identity_verification_status IS DISTINCT FROM OLD.identity_verification_status
     OR NEW.is_founder IS DISTINCT FROM OLD.is_founder
     OR NEW.completed_sits_count IS DISTINCT FROM OLD.completed_sits_count
     OR NEW.free_months_credit IS DISTINCT FROM OLD.free_months_credit
     OR NEW.cancellations_as_proprio IS DISTINCT FROM OLD.cancellations_as_proprio
     OR NEW.cancellation_count IS DISTINCT FROM OLD.cancellation_count
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
  THEN
    RAISE EXCEPTION 'Modification de champs sensibles interdite';
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Recalc function
CREATE OR REPLACE FUNCTION public.recalc_completed_sits_count(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.allow_internal_profile_update', 'on', true);
  UPDATE public.profiles p
  SET completed_sits_count = (
    SELECT COUNT(DISTINCT r.sit_id)
    FROM public.reviews r
    WHERE r.reviewee_id = _user_id
      AND r.sit_id IS NOT NULL
      AND r.published = true
      AND r.moderation_status = 'valide'
      AND r.review_type <> 'annulation'
  )
  WHERE p.id = _user_id;
END;
$$;

-- 3) Trigger on reviews
CREATE OR REPLACE FUNCTION public.trg_reviews_recalc_completed_sits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_completed_sits_count(OLD.reviewee_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.recalc_completed_sits_count(NEW.reviewee_id);
    IF OLD.reviewee_id IS DISTINCT FROM NEW.reviewee_id THEN
      PERFORM public.recalc_completed_sits_count(OLD.reviewee_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.recalc_completed_sits_count(NEW.reviewee_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS reviews_recalc_completed_sits ON public.reviews;
CREATE TRIGGER reviews_recalc_completed_sits
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.trg_reviews_recalc_completed_sits();

-- 4) Backfill
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT reviewee_id, COUNT(DISTINCT sit_id) AS cnt
    FROM public.reviews
    WHERE sit_id IS NOT NULL
      AND published = true
      AND moderation_status = 'valide'
      AND review_type <> 'annulation'
    GROUP BY reviewee_id
  LOOP
    PERFORM public.recalc_completed_sits_count(r.reviewee_id);
  END LOOP;
END $$;
