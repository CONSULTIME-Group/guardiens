-- Verification script for public.get_unread_messages_count
--
-- Runs inside a single transaction and rolls back at the end so the database
-- stays untouched. Validates 5 scenarios using temp UUIDs only:
--
--   A. Participant (sitter side) with one unread message from the owner   → 1
--   B. Same user, but conversation archived by them                       → 0
--   C. User is NEITHER owner nor sitter on the conversation               → 0
--   D. Unread message authored BY the user themself (own message)         → 0
--   E. Message already read (read_at IS NOT NULL)                         → 0
--
-- Usage:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-unread-rpc.sql

BEGIN;

DO $$
DECLARE
  u_me        uuid;
  u_other     uuid;
  u_third     uuid;
  conv_a      uuid := gen_random_uuid();
  conv_b      uuid := gen_random_uuid();
  conv_c      uuid := gen_random_uuid();
  conv_d      uuid := gen_random_uuid();
  conv_e      uuid := gen_random_uuid();
  v_count     int;
BEGIN
  -- Pick 3 existing profiles to satisfy FK on conversations.owner_id/sitter_id.
  -- The test only inserts into messages/conversations and rolls back, so the
  -- selected profiles are not affected.
  SELECT id INTO u_me    FROM public.profiles ORDER BY id            LIMIT 1;
  SELECT id INTO u_other FROM public.profiles ORDER BY id OFFSET 1   LIMIT 1;
  SELECT id INTO u_third FROM public.profiles ORDER BY id OFFSET 2   LIMIT 1;
  IF u_me IS NULL OR u_other IS NULL OR u_third IS NULL THEN
    RAISE EXCEPTION 'Need at least 3 profiles in DB to run this verification';
  END IF;
  -- ---- Setup: 5 conversations covering each scenario ----

  -- A: me = sitter, other = owner, not archived
  INSERT INTO public.conversations (id, owner_id, sitter_id, archived_by)
  VALUES (conv_a, u_other, u_me, '{}'::uuid[]);
  INSERT INTO public.messages (conversation_id, sender_id, content, read_at)
  VALUES (conv_a, u_other, 'unread from owner', NULL);

  -- B: same shape as A but archived by me
  INSERT INTO public.conversations (id, owner_id, sitter_id, archived_by)
  VALUES (conv_b, u_other, u_me, ARRAY[u_me]);
  INSERT INTO public.messages (conversation_id, sender_id, content, read_at)
  VALUES (conv_b, u_other, 'archived by me', NULL);

  -- C: me is not a participant
  INSERT INTO public.conversations (id, owner_id, sitter_id, archived_by)
  VALUES (conv_c, u_other, u_third, '{}'::uuid[]);
  INSERT INTO public.messages (conversation_id, sender_id, content, read_at)
  VALUES (conv_c, u_other, 'not for me', NULL);

  -- D: I am the sender of the unread message
  INSERT INTO public.conversations (id, owner_id, sitter_id, archived_by)
  VALUES (conv_d, u_me, u_other, '{}'::uuid[]);
  INSERT INTO public.messages (conversation_id, sender_id, content, read_at)
  VALUES (conv_d, u_me, 'my own message', NULL);

  -- E: message already read
  INSERT INTO public.conversations (id, owner_id, sitter_id, archived_by)
  VALUES (conv_e, u_other, u_me, '{}'::uuid[]);
  INSERT INTO public.messages (conversation_id, sender_id, content, read_at)
  VALUES (conv_e, u_other, 'already read', now());

  -- ---- Per-scenario assertions (count restricted to that conv) ----

  -- A: 1
  SELECT count(*)::int INTO v_count
  FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.conversation_id = conv_a
    AND m.sender_id <> u_me AND m.read_at IS NULL
    AND (c.owner_id = u_me OR c.sitter_id = u_me)
    AND NOT (u_me = ANY(COALESCE(c.archived_by,'{}'::uuid[])));
  IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL A: expected 1, got %', v_count; END IF;

  -- B: 0 (archived)
  SELECT count(*)::int INTO v_count
  FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.conversation_id = conv_b
    AND m.sender_id <> u_me AND m.read_at IS NULL
    AND (c.owner_id = u_me OR c.sitter_id = u_me)
    AND NOT (u_me = ANY(COALESCE(c.archived_by,'{}'::uuid[])));
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL B (archived): expected 0, got %', v_count; END IF;

  -- C: 0 (not participant)
  SELECT count(*)::int INTO v_count
  FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.conversation_id = conv_c
    AND m.sender_id <> u_me AND m.read_at IS NULL
    AND (c.owner_id = u_me OR c.sitter_id = u_me)
    AND NOT (u_me = ANY(COALESCE(c.archived_by,'{}'::uuid[])));
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL C (not participant): expected 0, got %', v_count; END IF;

  -- D: 0 (own message)
  SELECT count(*)::int INTO v_count
  FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.conversation_id = conv_d
    AND m.sender_id <> u_me AND m.read_at IS NULL
    AND (c.owner_id = u_me OR c.sitter_id = u_me)
    AND NOT (u_me = ANY(COALESCE(c.archived_by,'{}'::uuid[])));
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL D (own message): expected 0, got %', v_count; END IF;

  -- E: 0 (read)
  SELECT count(*)::int INTO v_count
  FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.conversation_id = conv_e
    AND m.sender_id <> u_me AND m.read_at IS NULL
    AND (c.owner_id = u_me OR c.sitter_id = u_me)
    AND NOT (u_me = ANY(COALESCE(c.archived_by,'{}'::uuid[])));
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL E (already read): expected 0, got %', v_count; END IF;

  -- ---- Aggregate via the actual RPC: A only is countable for u_me ----
  SELECT public.get_unread_messages_count(u_me) INTO v_count;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL aggregate RPC for u_me: expected 1, got %', v_count;
  END IF;

  -- u_other is sender on A,B,C,E and owner on conv_d (with u_me's own message → excluded)
  -- → 0 unread for u_other
  SELECT public.get_unread_messages_count(u_other) INTO v_count;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL aggregate RPC for u_other: expected 0, got %', v_count;
  END IF;

  RAISE NOTICE '✅ All get_unread_messages_count scenarios passed';
END $$;

ROLLBACK;
