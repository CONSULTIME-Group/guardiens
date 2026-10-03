-- Invalidation des fiches gardien, y compris leurs transitions d'eligibilite.
-- Sauvegarde des definitions avant remplacement, sans rattrapage de donnees.
CREATE TABLE public._backup_profile_seo_triggers_20261003_1800 (
  kind text NOT NULL,
  name text NOT NULL,
  definition text NOT NULL,
  acl text[],
  taken_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (kind, name)
);
ALTER TABLE public._backup_profile_seo_triggers_20261003_1800 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._backup_profile_seo_triggers_20261003_1800 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_profile_seo_triggers_20261003_1800 TO service_role;
INSERT INTO public._backup_profile_seo_triggers_20261003_1800 (kind, name, definition, acl)
SELECT 'function', p.proname, pg_get_functiondef(p.oid), p.proacl::text[]
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN ('mark_profile_seo_dirty', 'mark_sitter_profile_seo_dirty')
  AND p.pronargs = 0;
INSERT INTO public._backup_profile_seo_triggers_20261003_1800 (kind, name, definition)
SELECT 'trigger', t.tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t
WHERE NOT t.tgisinternal
  AND t.tgrelid IN ('public.profiles'::regclass, 'public.sitter_profiles'::regclass)
  AND t.tgname IN ('profiles_mark_seo_dirty', 'sitter_profiles_mark_seo_dirty');

DO $$
BEGIN
  IF (SELECT count(*) FROM public._backup_profile_seo_triggers_20261003_1800) <> 4 THEN
    RAISE EXCEPTION 'Les quatre definitions SEO attendues doivent etre sauvegardees';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_profile_seo_dirty()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  public_field text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IN ('sitter', 'both') THEN
      NEW.seo_dirty_at := clock_timestamp();
    END IF;
    RETURN NEW;
  END IF;

  -- OLD est essentiel pour la sortie du role gardien.
  IF NOT (COALESCE(NEW.role IN ('sitter', 'both'), false)
          OR COALESCE(OLD.role IN ('sitter', 'both'), false)
          OR OLD.seo_dirty_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  FOREACH public_field IN ARRAY ARRAY[
    'role', 'account_status', 'first_name', 'city', 'bio', 'avatar_url',
    'identity_verified', 'postal_code', 'profile_completion', 'departement_code',
    'certifications', 'is_founder', 'completed_sits_count', 'hero_image_index'
  ] LOOP
    IF to_jsonb(NEW) -> public_field IS DISTINCT FROM to_jsonb(OLD) -> public_field THEN
      -- Version monotone : un acquittement id + date ne perd pas une nouvelle modification.
      NEW.seo_dirty_at := GREATEST(clock_timestamp(), OLD.seo_dirty_at + interval '1 microsecond');
      EXIT;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_mark_seo_dirty ON public.profiles;
CREATE TRIGGER profiles_mark_seo_dirty
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.mark_profile_seo_dirty();

CREATE OR REPLACE FUNCTION public.mark_sitter_profile_seo_dirty()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  previous_user_id uuid;
  current_user_id uuid;
  changed boolean := TG_OP <> 'UPDATE';
  public_field text;
BEGIN
  IF TG_OP <> 'INSERT' THEN previous_user_id := OLD.user_id; END IF;
  IF TG_OP <> 'DELETE' THEN current_user_id := NEW.user_id; END IF;
  IF TG_OP = 'UPDATE' THEN
    changed := OLD.user_id IS DISTINCT FROM NEW.user_id;
    FOREACH public_field IN ARRAY ARRAY[
      'motivation', 'sitter_type', 'accompanied_by', 'lifestyle', 'animal_types',
      'has_vehicle', 'has_license', 'geographic_radius', 'min_stay_duration',
      'is_available', 'competences', 'special_animal_skills', 'preferred_frequency',
      'min_notice', 'preferred_environments', 'farm_animals_ok', 'own_animals',
      'reply_median_minutes', 'travels_with_children', 'travels_with_own_animals',
      'work_during_sit', 'availability_during', 'experience_years', 'languages',
      'interests', 'life_pace', 'meeting_preference'
    ] LOOP
      IF to_jsonb(NEW) -> public_field IS DISTINCT FROM to_jsonb(OLD) -> public_field THEN
        changed := true;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  IF changed THEN
    UPDATE public.profiles
       SET seo_dirty_at = GREATEST(clock_timestamp(), seo_dirty_at + interval '1 microsecond')
     WHERE id IN (previous_user_id, current_user_id)
       AND (role IN ('sitter', 'both') OR seo_dirty_at IS NOT NULL);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sitter_profiles_mark_seo_dirty ON public.sitter_profiles;
CREATE TRIGGER sitter_profiles_mark_seo_dirty
  AFTER INSERT OR UPDATE OR DELETE ON public.sitter_profiles
  FOR EACH ROW EXECUTE FUNCTION public.mark_sitter_profile_seo_dirty();

-- Seul le nombre de photos est public : une legende privee ne change pas le rendu anonyme.
CREATE OR REPLACE FUNCTION public.mark_sitter_gallery_seo_dirty()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  previous_user_id uuid;
  current_user_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id THEN RETURN NEW; END IF;
  IF TG_OP <> 'INSERT' THEN previous_user_id := OLD.user_id; END IF;
  IF TG_OP <> 'DELETE' THEN current_user_id := NEW.user_id; END IF;
  UPDATE public.profiles
     SET seo_dirty_at = GREATEST(clock_timestamp(), seo_dirty_at + interval '1 microsecond')
   WHERE id IN (previous_user_id, current_user_id)
     AND (role IN ('sitter', 'both') OR seo_dirty_at IS NOT NULL);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sitter_gallery_mark_seo_dirty
  AFTER INSERT OR DELETE OR UPDATE OF user_id ON public.sitter_gallery
  FOR EACH ROW EXECUTE FUNCTION public.mark_sitter_gallery_seo_dirty();

REVOKE EXECUTE ON FUNCTION public.mark_profile_seo_dirty() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_sitter_profile_seo_dirty() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_sitter_gallery_seo_dirty() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_profile_seo_dirty() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_sitter_profile_seo_dirty() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_sitter_gallery_seo_dirty() TO service_role;
