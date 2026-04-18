
-- Table pour logger les erreurs front rencontrées par les utilisateurs
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  user_email text NULL,
  message text NOT NULL,
  stack text NULL,
  source text NULL,           -- fichier/url qui a déclenché
  line_no integer NULL,
  col_no integer NULL,
  url text NULL,              -- page où l'erreur s'est produite
  user_agent text NULL,
  severity text NOT NULL DEFAULT 'error',  -- error | warning | unhandled_rejection
  context jsonb NULL,         -- breadcrumbs, route, action utilisateur
  fingerprint text NOT NULL,  -- hash pour grouper les erreurs identiques
  occurrences integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  resolved_by uuid NULL,
  admin_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_logs_fingerprint ON public.error_logs(fingerprint);
CREATE INDEX idx_error_logs_resolved ON public.error_logs(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_error_logs_last_seen ON public.error_logs(last_seen_at DESC);
CREATE INDEX idx_error_logs_user ON public.error_logs(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Anonymes peuvent insérer (sans user_id)
CREATE POLICY "anon_insert_error_logs"
ON public.error_logs FOR INSERT TO anon
WITH CHECK (user_id IS NULL);

-- Authentifiés peuvent insérer (leur user_id ou null)
CREATE POLICY "auth_insert_error_logs"
ON public.error_logs FOR INSERT TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Seuls les admins voient tout
CREATE POLICY "admin_select_error_logs"
ON public.error_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seuls les admins peuvent mettre à jour (résoudre)
CREATE POLICY "admin_update_error_logs"
ON public.error_logs FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Suppression admin (nettoyage)
CREATE POLICY "admin_delete_error_logs"
ON public.error_logs FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fonction RPC pour upsert avec incrément d'occurrences
CREATE OR REPLACE FUNCTION public.log_client_error(
  _fingerprint text,
  _message text,
  _stack text DEFAULT NULL,
  _source text DEFAULT NULL,
  _line_no integer DEFAULT NULL,
  _col_no integer DEFAULT NULL,
  _url text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _severity text DEFAULT 'error',
  _context jsonb DEFAULT NULL,
  _user_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_id uuid;
  _uid uuid := auth.uid();
BEGIN
  -- Cherche une erreur existante non résolue avec le même fingerprint
  SELECT id INTO _existing_id
  FROM error_logs
  WHERE fingerprint = _fingerprint
    AND resolved_at IS NULL
  ORDER BY last_seen_at DESC
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    UPDATE error_logs
    SET occurrences = occurrences + 1,
        last_seen_at = now(),
        url = COALESCE(_url, url),
        context = COALESCE(_context, context)
    WHERE id = _existing_id;
    RETURN _existing_id;
  ELSE
    INSERT INTO error_logs (
      user_id, user_email, message, stack, source, line_no, col_no,
      url, user_agent, severity, context, fingerprint
    ) VALUES (
      _uid, _user_email, _message, _stack, _source, _line_no, _col_no,
      _url, _user_agent, _severity, _context, _fingerprint
    )
    RETURNING id INTO _existing_id;
    RETURN _existing_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_client_error TO anon, authenticated;
