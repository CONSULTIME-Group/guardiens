CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_unique_pair_no_context
  ON public.conversations (owner_id, sitter_id)
  WHERE sit_id IS NULL
    AND small_mission_id IS NULL
    AND context_type IS NOT NULL;