
-- 1) Expose pro_status, pro_specialty, last_seen_at on public_profiles view
CREATE OR REPLACE VIEW public.public_profiles AS
 SELECT id,
    first_name,
    city,
    avatar_url,
    bio,
    completed_sits_count,
    identity_verified,
    is_founder,
    postal_code,
    created_at,
    profile_completion,
    round(latitude::numeric, 2)::double precision AS latitude_approx,
    round(longitude::numeric, 2)::double precision AS longitude_approx,
    available_for_help,
    skill_categories,
    custom_skills,
    role,
    pro_status,
    pro_specialty,
    last_seen_at
   FROM profiles
  WHERE account_status = 'active'::text AND first_name IS NOT NULL;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2) Fix handle_new_user: set role in INSERT so the sensitive-field guard trigger does not fire on UPDATE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
BEGIN
  _role := NEW.raw_user_meta_data ->> 'role';

  IF _role IN ('owner','sitter','both') THEN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, _role::public.user_role)
    ON CONFLICT (id) DO NOTHING;

    IF _role IN ('sitter','both') THEN
      INSERT INTO public.sitter_profiles (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;

    IF _role IN ('owner','both') THEN
      INSERT INTO public.owner_profiles (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  ELSE
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Anchor LLM-refusal patterns to the very beginning of the text so legitimate
--    sentences containing "je suis désolée mais…" or "Pourriez-vous me fournir…"
--    mid-message are no longer rejected. LLM refusals always START with these phrases.
CREATE OR REPLACE FUNCTION public.is_llm_refusal_text(_txt text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    _txt ~* '^\s*je ne peux pas (rédiger|écrire|produire|générer)'
    OR _txt ~* '^\s*je suis (désolée?|navrée?),? mais je ne peux'
    OR _txt ~* '^\s*je suis incapable de (rédiger|écrire|produire|générer|vous aider|répondre)'
    OR _txt ~* '^\s*je ne suis pas en mesure de (rédiger|écrire|produire|générer|vous aider|répondre)'
    OR _txt ~* '^\s*(pourrais|pourriez|peux)-(tu|vous) me fournir (les détails|davantage|plus de|des informations)'
    OR _txt ~* '^\s*je n''ai pas (assez )?(d''|de )?(éléments|informations|détails|contexte) (pour|sur|afin)'
    OR _txt ~* '^\s*impossible de rédiger',
    false
  );
$$;
