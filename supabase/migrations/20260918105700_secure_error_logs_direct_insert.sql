-- Les écritures client passent par le RPC SECURITY DEFINER public.log_client_error
-- (déduplication et contrôles conservés). L'insertion directe est révoquée.
REVOKE INSERT ON TABLE public.error_logs FROM anon, authenticated;
