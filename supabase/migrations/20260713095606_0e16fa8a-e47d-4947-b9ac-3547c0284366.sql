CREATE OR REPLACE FUNCTION public._debug_geocode_secret_len()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v int;
BEGIN
  SELECT length(decrypted_secret) INTO v
  FROM vault.decrypted_secrets
  WHERE name = 'GEOCODE_PROFILE_SECRET'
  LIMIT 1;
  RETURN v;
END;
$$;