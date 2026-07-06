-- Strictly restrict non-sender updates on messages to the read_at column only.
-- The previous guard listed a few columns to protect; switch to a strict allow-list
-- so any future column addition remains protected by default.
CREATE OR REPLACE FUNCTION public.messages_guard_participant_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  new_val text;
  old_val text;
BEGIN
  -- Sender may update their own message freely (already gated by RLS to sender).
  IF auth.uid() IS NOT DISTINCT FROM OLD.sender_id THEN
    RETURN NEW;
  END IF;

  -- Non-sender: only read_at may change. Compare every column.
  FOR r IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages'
  LOOP
    IF r.column_name = 'read_at' THEN
      CONTINUE;
    END IF;
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', r.column_name, r.column_name)
      INTO new_val, old_val
      USING NEW, OLD;
    IF new_val IS DISTINCT FROM old_val THEN
      RAISE EXCEPTION 'Only the sender can modify column % of a message', r.column_name;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;