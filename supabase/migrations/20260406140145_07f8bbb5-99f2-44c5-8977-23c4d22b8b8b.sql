
-- 1. Profiles SELECT
DROP POLICY IF EXISTS "profiles_anon_read_limited" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Vue publique — DROP puis CREATE
DROP VIEW IF EXISTS public.public_profiles CASCADE;

CREATE VIEW public.public_profiles
  WITH (security_invoker = true)
AS
SELECT id, first_name, city, avatar_url, bio,
       completed_sits_count, identity_verified, is_founder
FROM public.profiles WHERE account_status = 'active';

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 3. Trigger anti-modification champs sensibles
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
       OR NEW.is_founder IS DISTINCT FROM OLD.is_founder
       OR NEW.is_manual_super IS DISTINCT FROM OLD.is_manual_super
       OR NEW.account_status IS DISTINCT FROM OLD.account_status
       OR NEW.completed_sits_count IS DISTINCT FROM OLD.completed_sits_count
       OR NEW.cancellation_count IS DISTINCT FROM OLD.cancellation_count
       OR NEW.cancellations_as_proprio IS DISTINCT FROM OLD.cancellations_as_proprio
       OR NEW.email IS DISTINCT FROM OLD.email
    THEN
      RAISE EXCEPTION 'Modification de champs sensibles interdite';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_sensitive_profile_updates ON public.profiles;
CREATE TRIGGER trg_prevent_sensitive_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_sensitive_profile_updates();

-- 4. Fix emergency_sitter_profiles
DROP POLICY IF EXISTS "Users can view all emergency profiles" ON public.emergency_sitter_profiles;
DROP POLICY IF EXISTS "esp_select_own_or_admin" ON public.emergency_sitter_profiles;
CREATE POLICY "esp_select_own_or_admin"
  ON public.emergency_sitter_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Fix sitter-gallery UPDATE
DROP POLICY IF EXISTS "Users can update their own gallery objects" ON storage.objects;
CREATE POLICY "Users can update their own gallery objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'sitter-gallery' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'sitter-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
