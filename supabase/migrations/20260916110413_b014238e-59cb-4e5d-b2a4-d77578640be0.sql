CREATE OR REPLACE FUNCTION public.create_default_email_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.email_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'create_default_email_preferences a echoue pour %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_email_preferences ON public.profiles;

CREATE TRIGGER trg_create_default_email_preferences
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_email_preferences();

INSERT INTO public.email_preferences (user_id)
SELECT p.id
FROM public.profiles p
WHERE coalesce(p.account_status, 'active') = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.email_preferences ep WHERE ep.user_id = p.id
  )
ON CONFLICT (user_id) DO NOTHING;