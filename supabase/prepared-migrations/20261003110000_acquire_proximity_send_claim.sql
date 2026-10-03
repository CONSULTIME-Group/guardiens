-- APPLIQUÉE le 03/10/2026 par ChatGPT, en transaction, sur GO de Jérémie
-- (« fais les correctifs »), avant le déploiement de send-mass-email-proximity
-- (11:54 UTC). Trace : relecture pg_get_functiondef après application
-- (SECURITY DEFINER, search_path public, pg_temp ; EXECUTE refusé à anon et
-- authenticated, accordé à service_role). Fichier conservé hors du dossier
-- des migrations automatiques : NE PAS réappliquer ni déplacer.
--
-- Réservation dédiée aux alertes de proximité. Même table et mêmes clés que
-- acquire_member_email_send_claim, mais acquis seulement sur insertion neuve
-- ou état « retryable ». Aucune reprise de « sending » ni « uncertain » sur
-- ancienneté : une issue ambiguë se réconcilie à la main. La fonction globale,
-- la table, son schéma et sa RLS restent inchangés.

CREATE OR REPLACE FUNCTION public.acquire_proximity_send_claim(p_claim_key text, p_owner_token uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_state text;
BEGIN
  IF p_claim_key IS NULL OR p_claim_key !~ '^[0-9a-f]{64}$' OR p_owner_token IS NULL THEN
    RAISE EXCEPTION 'invalid send claim' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.member_email_send_claims AS existing (claim_key, owner_token, state)
  VALUES (p_claim_key, p_owner_token, 'sending')
  ON CONFLICT (claim_key) DO UPDATE
    SET owner_token = EXCLUDED.owner_token, state = 'sending', updated_at = now()
    WHERE existing.state = 'retryable'
  RETURNING state INTO v_state;
  IF FOUND THEN RETURN 'acquired'; END IF;
  SELECT state INTO v_state FROM public.member_email_send_claims WHERE claim_key = p_claim_key;
  RETURN CASE WHEN v_state = 'sent' THEN 'sent' WHEN v_state = 'uncertain' THEN 'uncertain' ELSE 'busy' END;
END;
$function$;

COMMENT ON FUNCTION public.acquire_proximity_send_claim(text, uuid) IS
  'Alertes de proximité : acquis sur clé neuve ou retryable uniquement, jamais de reprise sur ancienneté (incident 02/10/2026).';

REVOKE ALL ON FUNCTION public.acquire_proximity_send_claim(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.acquire_proximity_send_claim(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.acquire_proximity_send_claim(text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_proximity_send_claim(text, uuid) TO service_role;
