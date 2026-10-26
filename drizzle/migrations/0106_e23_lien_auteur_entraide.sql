-- Lot E23 « L'auteur revient sur sa fiche » (go de Jérémie le 26/10/2026).
--
-- Constat (claude/verif-boucle-entraide-26-octobre-2026.md) : les emails
-- d'entraide reçus par l'auteur d'un besoin menaient à la fiche publique. Sans
-- session, l'auteur voyait la vue visiteur et repartait sans lire la réponse.
--
-- send-transactional-email émet désormais un lien profond vers la fiche pour
-- mission-response-received, mission-response-waiting et mission-wave-status.
-- Ici, les deux emails immédiats (réponse reçue, état de la vague) rejoignent la
-- liste des gabarits dont le bouton ouvre une session pendant 2 heures (règle
-- Y1). La relance à 24 h passe par la connexion, puis revient sur la fiche.
--
-- Seule la liste c_session_templates change. Droits inchangés (CREATE OR
-- REPLACE conserve les ACL). Rejouable.
-- Retour arrière : rejouer la définition sans les deux noms ajoutés.

CREATE OR REPLACE FUNCTION public.consume_email_deep_link(p_token text, p_caller uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_email text;
  c_session_window constant interval := interval '2 hours';
  c_session_templates constant text[] := ARRAY[
    'new-message', 'new-application', 'first-application-received', 'review-received',
    'mission-response-received', 'mission-wave-status'
  ];
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{40,128}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;
  SELECT * INTO r FROM public.email_deep_link_tokens WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;
  IF r.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'consumed', 'target_path', r.target_path);
  END IF;
  IF r.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired', 'target_path', r.target_path);
  END IF;
  IF r.conversation_id IS NOT NULL THEN
    PERFORM 1 FROM public.conversations c
      WHERE c.id = r.conversation_id
        AND (c.owner_id = r.user_id OR c.sitter_id = r.user_id);
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
    END IF;
  END IF;
  IF p_caller IS NOT NULL AND p_caller <> r.user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'other_account', 'target_path', r.target_path);
  END IF;
  IF p_caller IS NOT NULL THEN
    UPDATE public.email_deep_link_tokens
       SET consumed_at = now()
     WHERE id = r.id AND consumed_at IS NULL;
    RETURN jsonb_build_object(
      'ok', true,
      'same_account', true,
      'target_path', r.target_path,
      'template_name', r.template_name,
      'message_id', r.message_id
    );
  END IF;
  IF r.template_name IS NULL
     OR NOT (r.template_name = ANY (c_session_templates))
     OR r.created_at < now() - c_session_window THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'login_required', 'target_path', r.target_path);
  END IF;
  UPDATE public.email_deep_link_tokens
     SET consumed_at = now()
   WHERE id = r.id AND consumed_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'consumed', 'target_path', r.target_path);
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = r.user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'email', v_email,
    'target_path', r.target_path,
    'template_name', r.template_name,
    'message_id', r.message_id
  );
END;
$function$;
