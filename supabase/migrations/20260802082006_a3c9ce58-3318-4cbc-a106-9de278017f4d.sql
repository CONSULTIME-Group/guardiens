-- 1. conversations.sit_id : ON DELETE SET NULL (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversations_sit_id_fkey'
      AND conrelid = 'public.conversations'::regclass
      AND confdeltype <> 'n'
  ) THEN
    ALTER TABLE public.conversations DROP CONSTRAINT conversations_sit_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversations_sit_id_fkey'
      AND conrelid = 'public.conversations'::regclass
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_sit_id_fkey
      FOREIGN KEY (sit_id) REFERENCES public.sits(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Index de paire sans contexte : non unique
DROP INDEX IF EXISTS public.idx_conv_unique_pair_no_context;

CREATE INDEX IF NOT EXISTS idx_conv_pair_no_context
  ON public.conversations (owner_id, sitter_id)
  WHERE sit_id IS NULL AND small_mission_id IS NULL AND context_type IS NOT NULL;