-- Libération bornée des réservations d'envoi membre.
-- Une réservation 'sending' orpheline (runtime interrompu avant finish) ou
-- 'uncertain' (résultat fournisseur illisible) bloquait sa clé pour toujours,
-- et l'email transactionnel était perdu. Décision assumée : un email perdu
-- (candidature acceptée, garde confirmée) coûte plus cher qu'un rare doublon
-- après expiration. 'sending' redevient acquérable après quinze minutes,
-- 'uncertain' après six heures. 'sent' reste définitif, 'retryable' immédiat.
CREATE OR REPLACE FUNCTION public.acquire_member_email_send_claim(p_claim_key text, p_owner_token uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
       OR (existing.state = 'sending' AND existing.updated_at < now() - interval '15 minutes')
       OR (existing.state = 'uncertain' AND existing.updated_at < now() - interval '6 hours')
  RETURNING state INTO v_state;
  IF FOUND THEN RETURN 'acquired'; END IF;
  SELECT state INTO v_state FROM public.member_email_send_claims WHERE claim_key = p_claim_key;
  RETURN CASE WHEN v_state = 'sent' THEN 'sent' WHEN v_state = 'uncertain' THEN 'uncertain' ELSE 'busy' END;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_member_email_send_claim(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_member_email_send_claim(text, uuid) TO service_role;