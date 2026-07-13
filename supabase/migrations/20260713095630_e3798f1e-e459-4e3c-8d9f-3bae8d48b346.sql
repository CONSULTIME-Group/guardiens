CREATE OR REPLACE FUNCTION public._debug_vault_names()
RETURNS TABLE(name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name FROM vault.decrypted_secrets;
$$;