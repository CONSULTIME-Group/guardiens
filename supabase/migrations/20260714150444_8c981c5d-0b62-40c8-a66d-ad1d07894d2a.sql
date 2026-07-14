
CREATE OR REPLACE FUNCTION public.admin_upsert_vault_secret(p_name text, p_value text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = p_name;
  IF v_id IS NULL THEN
    v_id := vault.create_secret(p_value, p_name, 'auto-synced from edge function env');
  ELSE
    PERFORM vault.update_secret(v_id, p_value, p_name);
  END IF;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_upsert_vault_secret(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_vault_secret(text, text) TO service_role;
