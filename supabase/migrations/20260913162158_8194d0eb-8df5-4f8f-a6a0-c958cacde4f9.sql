CREATE TABLE public.alma_journal_shown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  shown_on date NOT NULL DEFAULT current_date,
  acted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX alma_journal_shown_unique ON public.alma_journal_shown (user_id, rule_key, shown_on);
CREATE INDEX alma_journal_shown_user_date ON public.alma_journal_shown (user_id, shown_on DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alma_journal_shown TO authenticated;
GRANT ALL ON public.alma_journal_shown TO service_role;

ALTER TABLE public.alma_journal_shown ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own alma journal rows"
ON public.alma_journal_shown FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all alma journal rows"
ON public.alma_journal_shown FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));