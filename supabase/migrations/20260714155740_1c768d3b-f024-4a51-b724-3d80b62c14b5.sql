
-- 1. profiles: bloque l'auto-modification des champs sensibles
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
     OR NEW.identity_verification_status IS DISTINCT FROM OLD.identity_verification_status
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.is_founder IS DISTINCT FROM OLD.is_founder
     OR NEW.pro_status IS DISTINCT FROM OLD.pro_status
     OR NEW.pro_approved_at IS DISTINCT FROM OLD.pro_approved_at
     OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspended_by IS DISTINCT FROM OLD.suspended_by
     OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
     OR NEW.suspended_until IS DISTINCT FROM OLD.suspended_until
     OR NEW.boosted_until IS DISTINCT FROM OLD.boosted_until
     OR NEW.free_months_credit IS DISTINCT FROM OLD.free_months_credit
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.completed_sits_count IS DISTINCT FROM OLD.completed_sits_count
     OR NEW.cancellation_count IS DISTINCT FROM OLD.cancellation_count
     OR NEW.cancellations_as_proprio IS DISTINCT FROM OLD.cancellations_as_proprio
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
  THEN
    RAISE EXCEPTION 'Modification interdite d''un champ sensible du profil';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_sensitive_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_sensitive_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_sensitive_self_update();

-- 2. pro_profiles: bloque l'auto-modification du statut de modération
CREATE OR REPLACE FUNCTION public.prevent_pro_profile_status_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Seul un administrateur peut modifier le statut de modération';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_pro_profile_status_self_update ON public.pro_profiles;
CREATE TRIGGER trg_prevent_pro_profile_status_self_update
BEFORE UPDATE ON public.pro_profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_pro_profile_status_self_update();

-- 3. pro_reviews: bloque l'auto-modification du statut de modération
CREATE OR REPLACE FUNCTION public.prevent_pro_review_status_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.pro_id IS DISTINCT FROM OLD.pro_id
  THEN
    RAISE EXCEPTION 'Seul un administrateur peut modifier le statut de modération';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_pro_review_status_self_update ON public.pro_reviews;
CREATE TRIGGER trg_prevent_pro_review_status_self_update
BEFORE UPDATE ON public.pro_reviews
FOR EACH ROW EXECUTE FUNCTION public.prevent_pro_review_status_self_update();

-- 4. reviews: bloque l'auto-modification du statut de modération et de la publication
CREATE OR REPLACE FUNCTION public.prevent_review_moderation_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    RAISE EXCEPTION 'Seul un administrateur peut modérer un avis';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_review_moderation_self_update ON public.reviews;
CREATE TRIGGER trg_prevent_review_moderation_self_update
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.prevent_review_moderation_self_update();

-- 5. small_mission_responses: le gardien ne peut passer le statut qu'à 'withdrawn' depuis 'pending'
CREATE OR REPLACE FUNCTION public.prevent_mission_response_status_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT m.user_id INTO v_owner FROM public.small_missions m WHERE m.id = NEW.mission_id;

  -- Propriétaire de la mission : peut changer status librement (déjà cadré par la policy RLS)
  IF v_owner = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Répondeur : ne peut modifier status que vers 'withdrawn' à partir de 'pending'
  IF auth.uid() = NEW.responder_id THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (OLD.status = 'pending'::small_mission_response_status
              AND NEW.status = 'withdrawn'::small_mission_response_status) THEN
        RAISE EXCEPTION 'Le gardien ne peut que retirer sa réponse en attente';
      END IF;
    END IF;
    IF NEW.responder_id IS DISTINCT FROM OLD.responder_id
       OR NEW.mission_id IS DISTINCT FROM OLD.mission_id THEN
      RAISE EXCEPTION 'Modification interdite';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Modification interdite';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_mission_response_status_tampering ON public.small_mission_responses;
CREATE TRIGGER trg_prevent_mission_response_status_tampering
BEFORE UPDATE ON public.small_mission_responses
FOR EACH ROW EXECUTE FUNCTION public.prevent_mission_response_status_tampering();
