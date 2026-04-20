
-- ============================================================
-- PASSE 1 — Refonte messagerie : contexte, lazy-create, purge
-- ============================================================

-- 1. Nouveaux types
DO $$ BEGIN
  CREATE TYPE public.conversation_context AS ENUM (
    'sit_application',   -- A : candidature à une annonce de garde
    'sitter_inquiry',    -- B : propriétaire sonde un gardien
    'mission_help',      -- C : entraide / petite mission
    'owner_pitch',       -- D : gardien contacte propriétaire spontanément
    'long_stay'          -- E : longue durée
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Colonnes nouvelles sur conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS context_type public.conversation_context,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_message_sent boolean NOT NULL DEFAULT false;

-- Backfill context_type pour les conversations existantes (déduit du contexte)
UPDATE public.conversations SET context_type = 
  CASE 
    WHEN sit_id IS NOT NULL THEN 'sit_application'::public.conversation_context
    WHEN small_mission_id IS NOT NULL THEN 'mission_help'::public.conversation_context
    WHEN long_stay_id IS NOT NULL THEN 'long_stay'::public.conversation_context
    ELSE 'sitter_inquiry'::public.conversation_context  -- défaut prudent
  END
WHERE context_type IS NULL;

-- Backfill last_message_at + first_message_sent depuis messages
UPDATE public.conversations c SET 
  last_message_at = sub.last_at,
  first_message_sent = true
FROM (
  SELECT conversation_id, MAX(created_at) AS last_at
  FROM public.messages
  WHERE is_system = false
  GROUP BY conversation_id
) sub
WHERE c.id = sub.conversation_id;

-- 3. Purge des conversations parasites (vides ou self-chat)
DELETE FROM public.conversations
WHERE owner_id = sitter_id
   OR NOT EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id = conversations.id);

-- 4. Nouvelle contrainte d'unicité contextualisée (remplace l'ancienne)
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_sit_id_owner_id_sitter_id_key;

-- Index uniques partiels par contexte (évite les doublons par paire+contexte)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_unique_sit
  ON public.conversations (sit_id, owner_id, sitter_id)
  WHERE sit_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_unique_mission
  ON public.conversations (small_mission_id, owner_id, sitter_id)
  WHERE small_mission_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_unique_longstay
  ON public.conversations (long_stay_id, owner_id, sitter_id)
  WHERE long_stay_id IS NOT NULL;

-- Pour les conversations privées (sondage/pitch), une seule par paire
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_unique_private
  ON public.conversations (owner_id, sitter_id, context_type)
  WHERE sit_id IS NULL AND small_mission_id IS NULL AND long_stay_id IS NULL;

-- Index de tri
CREATE INDEX IF NOT EXISTS idx_conv_last_message_at
  ON public.conversations (last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conv_context_type
  ON public.conversations (context_type);

-- 5. Préférence propriétaire : accepter ou non les pitches spontanés
ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS accept_unsolicited_pitches boolean NOT NULL DEFAULT false;

-- 6. RPC atomique : get_or_create_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_other_user_id uuid,
  p_context_type public.conversation_context,
  p_sit_id uuid DEFAULT NULL,
  p_small_mission_id uuid DEFAULT NULL,
  p_long_stay_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_owner_id uuid;
  v_sitter_id uuid;
  v_conv_id uuid;
  v_other_role text;
  v_my_role text;
  v_accept_pitches boolean;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  IF v_me = p_other_user_id THEN
    RAISE EXCEPTION 'Impossible de démarrer une conversation avec soi-même';
  END IF;

  -- Résolution owner_id / sitter_id selon le contexte
  IF p_context_type IN ('sit_application', 'long_stay') THEN
    -- Le propriétaire de l'annonce détient l'objet
    IF p_sit_id IS NOT NULL THEN
      SELECT user_id INTO v_owner_id FROM sits WHERE id = p_sit_id;
    ELSIF p_long_stay_id IS NOT NULL THEN
      SELECT user_id INTO v_owner_id FROM long_stays WHERE id = p_long_stay_id;
    END IF;
    IF v_owner_id IS NULL THEN
      RAISE EXCEPTION 'Annonce introuvable';
    END IF;
    -- Le sitter est l'autre partie
    v_sitter_id := CASE WHEN v_me = v_owner_id THEN p_other_user_id ELSE v_me END;
    IF v_me <> v_owner_id THEN v_sitter_id := v_me; END IF;
    -- Garantir que les deux IDs sont corrects
    IF v_owner_id <> v_me AND v_owner_id <> p_other_user_id THEN
      RAISE EXCEPTION 'Vous ne participez pas à cette annonce';
    END IF;
    v_sitter_id := CASE WHEN v_owner_id = v_me THEN p_other_user_id ELSE v_me END;

  ELSIF p_context_type = 'mission_help' THEN
    -- Pour entraide : peu importe qui est "owner", on garde la convention :
    -- owner_id = créateur de la mission, sitter_id = aidant
    IF p_small_mission_id IS NOT NULL THEN
      SELECT user_id INTO v_owner_id FROM small_missions WHERE id = p_small_mission_id;
    END IF;
    IF v_owner_id IS NULL THEN
      RAISE EXCEPTION 'Mission introuvable';
    END IF;
    v_sitter_id := CASE WHEN v_owner_id = v_me THEN p_other_user_id ELSE v_me END;

  ELSIF p_context_type = 'sitter_inquiry' THEN
    -- B : propriétaire (v_me) sonde un gardien (p_other_user_id)
    v_owner_id := v_me;
    v_sitter_id := p_other_user_id;

  ELSIF p_context_type = 'owner_pitch' THEN
    -- D : gardien (v_me) pitche un propriétaire (p_other_user_id)
    -- Vérifier que le propriétaire accepte les contacts spontanés
    SELECT accept_unsolicited_pitches INTO v_accept_pitches
    FROM owner_profiles WHERE user_id = p_other_user_id;
    IF NOT COALESCE(v_accept_pitches, false) THEN
      RAISE EXCEPTION 'Ce membre ne reçoit pas de propositions spontanées' USING ERRCODE = 'P0001';
    END IF;
    v_owner_id := p_other_user_id;
    v_sitter_id := v_me;
  END IF;

  IF v_owner_id IS NULL OR v_sitter_id IS NULL THEN
    RAISE EXCEPTION 'Impossible de résoudre les participants';
  END IF;

  IF v_owner_id = v_sitter_id THEN
    RAISE EXCEPTION 'Impossible de démarrer une conversation avec soi-même';
  END IF;

  -- Recherche conversation existante
  IF p_sit_id IS NOT NULL THEN
    SELECT id INTO v_conv_id FROM conversations
    WHERE sit_id = p_sit_id AND owner_id = v_owner_id AND sitter_id = v_sitter_id LIMIT 1;
  ELSIF p_small_mission_id IS NOT NULL THEN
    SELECT id INTO v_conv_id FROM conversations
    WHERE small_mission_id = p_small_mission_id AND owner_id = v_owner_id AND sitter_id = v_sitter_id LIMIT 1;
  ELSIF p_long_stay_id IS NOT NULL THEN
    SELECT id INTO v_conv_id FROM conversations
    WHERE long_stay_id = p_long_stay_id AND owner_id = v_owner_id AND sitter_id = v_sitter_id LIMIT 1;
  ELSE
    SELECT id INTO v_conv_id FROM conversations
    WHERE owner_id = v_owner_id AND sitter_id = v_sitter_id 
      AND sit_id IS NULL AND small_mission_id IS NULL AND long_stay_id IS NULL
      AND context_type = p_context_type
    LIMIT 1;
  END IF;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  -- Création
  INSERT INTO conversations (owner_id, sitter_id, sit_id, small_mission_id, long_stay_id, context_type)
  VALUES (v_owner_id, v_sitter_id, p_sit_id, p_small_mission_id, p_long_stay_id, p_context_type)
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation TO authenticated;

-- 7. Trigger : mettre à jour last_message_at et first_message_sent
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_system THEN RETURN NEW; END IF;
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      first_message_sent = true,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conv_on_message ON public.messages;
CREATE TRIGGER trg_update_conv_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message();
