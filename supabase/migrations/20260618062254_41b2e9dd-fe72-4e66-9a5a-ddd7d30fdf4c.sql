DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'jam.mars69@gmail.com';
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Aucun compte trouvé pour jam.mars69@gmail.com';
    RETURN;
  END IF;

  DELETE FROM public.pro_profiles WHERE user_id = v_user_id;
  DELETE FROM public.pro_verifications WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END $$;