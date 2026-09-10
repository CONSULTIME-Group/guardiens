CREATE TABLE public.alma_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surface TEXT NOT NULL,
  active_role TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  register TEXT,
  refusal_reason TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.alma_conversations IS 'Journal des échanges conversationnels avec Alma (lot 1). Sert au pilotage admin et au plafond quotidien.';

CREATE INDEX idx_alma_conversations_user_created ON public.alma_conversations (user_id, created_at DESC);

GRANT SELECT ON public.alma_conversations TO authenticated;
GRANT ALL ON public.alma_conversations TO service_role;

ALTER TABLE public.alma_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read alma conversations"
ON public.alma_conversations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));