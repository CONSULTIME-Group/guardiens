-- Table d'audit des messages admin envoyés depuis le back-office
CREATE TABLE IF NOT EXISTS public.admin_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  recipient_email text,
  recipient_name text,
  conversation_id uuid,
  message_id uuid,
  content text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_message_logs_recipient ON public.admin_message_logs(recipient_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_message_logs_admin ON public.admin_message_logs(admin_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_message_logs_sent_at ON public.admin_message_logs(sent_at DESC);

ALTER TABLE public.admin_message_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent lire le journal
CREATE POLICY "Admins can read admin message logs"
ON public.admin_message_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Aucune insertion / update / delete côté client : tout passe par la RPC SECURITY DEFINER

-- Mise à jour de la RPC d'envoi pour journaliser systématiquement
CREATE OR REPLACE FUNCTION public.admin_send_message_to_user(p_target_user_id uuid, p_content text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_admin uuid := auth.uid();
  v_conv_id uuid;
  v_message_id uuid;
  v_recipient_email text;
  v_recipient_name text;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  IF v_admin = p_target_user_id THEN
    RAISE EXCEPTION 'Impossible d''envoyer un message à soi-même';
  END IF;

  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Le message ne peut pas être vide';
  END IF;

  IF length(p_content) > 5000 THEN
    RAISE EXCEPTION 'Le message ne peut pas dépasser 5000 caractères';
  END IF;

  -- Conversation existante admin↔user sans contexte
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE owner_id = v_admin
    AND sitter_id = p_target_user_id
    AND sit_id IS NULL
    AND small_mission_id IS NULL
    AND long_stay_id IS NULL
    AND context_type IS NULL
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    SELECT id INTO v_conv_id
    FROM public.conversations
    WHERE owner_id = p_target_user_id
      AND sitter_id = v_admin
      AND sit_id IS NULL
      AND small_mission_id IS NULL
      AND long_stay_id IS NULL
      AND context_type IS NULL
    LIMIT 1;
  END IF;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (owner_id, sitter_id, context_type)
    VALUES (v_admin, p_target_user_id, NULL)
    RETURNING id INTO v_conv_id;
  END IF;

  -- Insère le message au nom de l'admin
  INSERT INTO public.messages (conversation_id, sender_id, content, is_system)
  VALUES (v_conv_id, v_admin, p_content, false)
  RETURNING id INTO v_message_id;

  -- Snapshot destinataire pour audit
  SELECT p.email, NULLIF(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), '')
    INTO v_recipient_email, v_recipient_name
  FROM public.profiles p
  WHERE p.id = p_target_user_id;

  -- Journalisation audit (best-effort, ne bloque jamais l'envoi)
  BEGIN
    INSERT INTO public.admin_message_logs (
      admin_id, recipient_id, recipient_email, recipient_name,
      conversation_id, message_id, content
    ) VALUES (
      v_admin, p_target_user_id, v_recipient_email, v_recipient_name,
      v_conv_id, v_message_id, p_content
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_message_logs insert failed: %', SQLERRM;
  END;

  RETURN v_conv_id;
END;
$function$;