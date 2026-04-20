
-- 1. Repair: create missing sitter_profiles for confirmed sitter/both members
INSERT INTO public.sitter_profiles (user_id)
SELECT p.id FROM public.profiles p
WHERE p.role IN ('sitter','both')
  AND NOT EXISTS (SELECT 1 FROM public.sitter_profiles WHERE user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Repair: create missing owner_profiles for confirmed owner/both members
INSERT INTO public.owner_profiles (user_id)
SELECT p.id FROM public.profiles p
WHERE p.role IN ('owner','both')
  AND NOT EXISTS (SELECT 1 FROM public.owner_profiles WHERE user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Cleanup: remove ghost owner_profiles for pure sitters
DELETE FROM public.owner_profiles
WHERE user_id IN (
  SELECT p.id FROM public.profiles p
  WHERE p.role = 'sitter'
);

-- 4. Cleanup: remove ghost sitter_profiles for pure owners
DELETE FROM public.sitter_profiles
WHERE user_id IN (
  SELECT p.id FROM public.profiles p
  WHERE p.role = 'owner'
);

-- 5. Reinforce: handle_new_user now creates the proper specialized profile immediately
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role text;
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  _role := NEW.raw_user_meta_data ->> 'role';
  IF _role IN ('owner','sitter','both') THEN
    UPDATE public.profiles SET role = _role::public.user_role WHERE id = NEW.id;

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
  END IF;

  RETURN NEW;
END;
$function$;
