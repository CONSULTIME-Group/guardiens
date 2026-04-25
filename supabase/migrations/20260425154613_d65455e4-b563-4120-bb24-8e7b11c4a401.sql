CREATE OR REPLACE FUNCTION public.log_client_error(
  _fingerprint text,
  _message text,
  _stack text DEFAULT NULL::text,
  _source text DEFAULT NULL::text,
  _line_no integer DEFAULT NULL::integer,
  _col_no integer DEFAULT NULL::integer,
  _url text DEFAULT NULL::text,
  _user_agent text DEFAULT NULL::text,
  _severity text DEFAULT 'error'::text,
  _context jsonb DEFAULT NULL::jsonb,
  _user_email text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _existing_id uuid;
  _existing_last_seen timestamptz;
  _uid uuid := auth.uid();
  -- Fenêtre anti-bursts : si la même empreinte a été vue il y a moins
  -- de _dedupe_window, on ignore silencieusement (pas d'incrément, pas d'insert).
  _dedupe_window interval := interval '5 seconds';
BEGIN
  -- Cherche une erreur existante non résolue avec le même fingerprint
  SELECT id, last_seen_at
    INTO _existing_id, _existing_last_seen
  FROM error_logs
  WHERE fingerprint = _fingerprint
    AND resolved_at IS NULL
  ORDER BY last_seen_at DESC
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    -- Déduplication serveur : si la dernière occurrence est très récente,
    -- on n'incrémente pas — protège contre les bursts (multi-onglets,
    -- boucles serrées, plusieurs clients en simultané) qui passeraient
    -- malgré le throttle local côté navigateur.
    IF _existing_last_seen IS NOT NULL
       AND now() - _existing_last_seen < _dedupe_window THEN
      RETURN _existing_id;
    END IF;

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
$function$;

-- Index pour accélérer la recherche d'empreinte non résolue + tri par dernière vue
CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint_unresolved
  ON public.error_logs (fingerprint, last_seen_at DESC)
  WHERE resolved_at IS NULL;