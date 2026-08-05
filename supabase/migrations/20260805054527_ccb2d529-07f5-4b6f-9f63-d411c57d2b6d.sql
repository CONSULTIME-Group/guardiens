-- 1) Parrainage : ne plus bloquer la suppression d'un membre
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_referred_by_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_referred_by_fkey
  FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2) Anonymisation transactionnelle d'un compte
CREATE OR REPLACE FUNCTION public.anonymize_user_account(_user_id uuid, _new_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prop_ids uuid[];
  _archived_sits int := 0;
  _cancelled_missions int := 0;
BEGIN
  IF _user_id IS NULL OR _new_email IS NULL THEN
    RAISE EXCEPTION 'anonymize_user_account: arguments requis';
  END IF;

  SELECT array_agg(id) INTO _prop_ids FROM public.properties WHERE user_id = _user_id;

  -- a. Données personnelles sans valeur pour les tiers
  IF _prop_ids IS NOT NULL THEN
    DELETE FROM public.pets WHERE property_id = ANY(_prop_ids);
    DELETE FROM public.house_guides WHERE property_id = ANY(_prop_ids);
  END IF;
  DELETE FROM public.house_guides WHERE user_id = _user_id;
  DELETE FROM public.properties WHERE user_id = _user_id;
  DELETE FROM public.sitter_profiles WHERE user_id = _user_id;
  DELETE FROM public.owner_profiles WHERE user_id = _user_id;
  DELETE FROM public.sitter_gallery WHERE user_id = _user_id;
  DELETE FROM public.owner_gallery WHERE user_id = _user_id;
  DELETE FROM public.external_experiences WHERE user_id = _user_id;
  DELETE FROM public.pro_verifications WHERE user_id = _user_id;
  DELETE FROM public.pro_profiles WHERE user_id = _user_id;
  DELETE FROM public.identity_verification_logs WHERE user_id = _user_id;
  DELETE FROM public.emergency_sitter_profiles WHERE user_id = _user_id;
  DELETE FROM public.alert_preferences WHERE user_id = _user_id;
  DELETE FROM public.notification_preferences WHERE user_id = _user_id;
  DELETE FROM public.email_preferences WHERE user_id = _user_id;
  DELETE FROM public.favorites WHERE user_id = _user_id;
  DELETE FROM public.notifications WHERE user_id = _user_id;
  DELETE FROM public.alma_whisper_history WHERE user_id = _user_id;

  -- Retirer de la circulation ce qui reste ouvert (les éléments terminés sont conservés)
  UPDATE public.sits SET status = 'archived'
   WHERE user_id = _user_id AND status IN ('draft', 'published');
  GET DIAGNOSTICS _archived_sits = ROW_COUNT;

  UPDATE public.small_missions SET status = 'cancelled'
   WHERE author_id = _user_id AND status IN ('open', 'in_progress');
  GET DIAGNOSTICS _cancelled_missions = ROW_COUNT;

  -- c. Anonymisation de la fiche, conservée pour rattacher avis et messages
  UPDATE public.profiles SET
    first_name = 'Membre supprimé',
    last_name = '',
    email = _new_email,
    avatar_url = NULL,
    bio = NULL,
    city = NULL,
    postal_code = NULL,
    latitude = NULL,
    longitude = NULL,
    departement_code = NULL,
    date_of_birth = NULL,
    identity_document_url = NULL,
    identity_selfie_url = NULL,
    identity_verification_status = NULL,
    identity_verified = false,
    pro_status = 'none',
    pro_specialty = NULL,
    pro_tagline = NULL,
    pro_pricing_note = NULL,
    pro_business_name = NULL,
    pro_siret = NULL,
    pro_approved_at = NULL,
    account_status = 'deleted',
    available_for_help = false,
    skill_categories = NULL,
    custom_skills = NULL,
    referral_code = NULL,
    referred_by = NULL,
    suspension_reason = NULL,
    updated_at = now()
  WHERE id = _user_id;

  RETURN jsonb_build_object(
    'user_id', _user_id,
    'archived_sits', _archived_sits,
    'cancelled_missions', _cancelled_missions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_user_account(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_user_account(uuid, text) TO service_role;