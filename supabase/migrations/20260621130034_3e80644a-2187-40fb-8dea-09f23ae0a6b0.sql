
-- ============================================================
-- Module Questions & conseils
-- ============================================================

-- ENUMS
CREATE TYPE public.community_question_category AS ENUM ('animaux', 'jardin', 'maison', 'garde', 'autre');
CREATE TYPE public.community_question_status AS ENUM ('open', 'resolved', 'closed');

-- ============================================================
-- TABLE: community_questions
-- ============================================================
CREATE TABLE public.community_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.community_question_category NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 20 AND 4000),
  tags TEXT[] NOT NULL DEFAULT '{}',
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status public.community_question_status NOT NULL DEFAULT 'open',
  accepted_answer_id UUID,
  views_count INTEGER NOT NULL DEFAULT 0,
  answers_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  reports_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cq_status_created ON public.community_questions(status, created_at DESC) WHERE is_hidden = false;
CREATE INDEX idx_cq_category ON public.community_questions(category) WHERE is_hidden = false;
CREATE INDEX idx_cq_author ON public.community_questions(author_id);

GRANT SELECT ON public.community_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_questions TO authenticated;
GRANT ALL ON public.community_questions TO service_role;

ALTER TABLE public.community_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read visible questions"
ON public.community_questions FOR SELECT
USING (is_hidden = false OR auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated create own questions"
ON public.community_questions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Author update own questions"
ON public.community_questions FOR UPDATE TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Author delete own questions"
ON public.community_questions FOR DELETE TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- TABLE: community_answers
-- ============================================================
CREATE TABLE public.community_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.community_questions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_answer_id UUID REFERENCES public.community_answers(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 10 AND 4000),
  helpful_count INTEGER NOT NULL DEFAULT 0,
  is_author_pick BOOLEAN NOT NULL DEFAULT false,
  reports_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ca_question ON public.community_answers(question_id, created_at);
CREATE INDEX idx_ca_author ON public.community_answers(author_id);

ALTER TABLE public.community_questions
  ADD CONSTRAINT fk_accepted_answer FOREIGN KEY (accepted_answer_id)
  REFERENCES public.community_answers(id) ON DELETE SET NULL;

GRANT SELECT ON public.community_answers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_answers TO authenticated;
GRANT ALL ON public.community_answers TO service_role;

ALTER TABLE public.community_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read visible answers"
ON public.community_answers FOR SELECT
USING (is_hidden = false OR auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated create own answers"
ON public.community_answers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Author update own answers"
ON public.community_answers FOR UPDATE TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Author or admin delete answers"
ON public.community_answers FOR DELETE TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- TABLE: community_answer_votes (helpful)
-- ============================================================
CREATE TABLE public.community_answer_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  answer_id UUID NOT NULL REFERENCES public.community_answers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (answer_id, user_id)
);

CREATE INDEX idx_cav_answer ON public.community_answer_votes(answer_id);

GRANT SELECT ON public.community_answer_votes TO authenticated;
GRANT INSERT, DELETE ON public.community_answer_votes TO authenticated;
GRANT ALL ON public.community_answer_votes TO service_role;

ALTER TABLE public.community_answer_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own votes"
ON public.community_answer_votes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Insert own vote"
ON public.community_answer_votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own vote"
ON public.community_answer_votes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Generic updated_at
CREATE TRIGGER trg_cq_updated_at
  BEFORE UPDATE ON public.community_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ca_updated_at
  BEFORE UPDATE ON public.community_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- answers_count maintenance
CREATE OR REPLACE FUNCTION public.community_answers_count_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_questions
      SET answers_count = answers_count + 1
      WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_questions
      SET answers_count = GREATEST(answers_count - 1, 0)
      WHERE id = OLD.question_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_ca_count_ins
  AFTER INSERT ON public.community_answers
  FOR EACH ROW EXECUTE FUNCTION public.community_answers_count_trigger();

CREATE TRIGGER trg_ca_count_del
  AFTER DELETE ON public.community_answers
  FOR EACH ROW EXECUTE FUNCTION public.community_answers_count_trigger();

-- helpful_count maintenance
CREATE OR REPLACE FUNCTION public.community_helpful_count_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_answers
      SET helpful_count = helpful_count + 1
      WHERE id = NEW.answer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_answers
      SET helpful_count = GREATEST(helpful_count - 1, 0)
      WHERE id = OLD.answer_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_cav_count_ins
  AFTER INSERT ON public.community_answer_votes
  FOR EACH ROW EXECUTE FUNCTION public.community_helpful_count_trigger();

CREATE TRIGGER trg_cav_count_del
  AFTER DELETE ON public.community_answer_votes
  FOR EACH ROW EXECUTE FUNCTION public.community_helpful_count_trigger();

-- Auto-hide at 3 reports (questions + answers)
CREATE OR REPLACE FUNCTION public.community_auto_hide_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.reports_count >= 3 AND NEW.is_hidden = false THEN
    NEW.is_hidden := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cq_auto_hide
  BEFORE UPDATE OF reports_count ON public.community_questions
  FOR EACH ROW EXECUTE FUNCTION public.community_auto_hide_trigger();

CREATE TRIGGER trg_ca_auto_hide
  BEFORE UPDATE OF reports_count ON public.community_answers
  FOR EACH ROW EXECUTE FUNCTION public.community_auto_hide_trigger();

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_questions;
