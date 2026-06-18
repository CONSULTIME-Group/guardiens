
-- Colonnes d'agrégat sur pro_profiles
ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

-- Table des avis
CREATE TABLE IF NOT EXISTS public.pro_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pro_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pro_reviews_pro ON public.pro_reviews(pro_id) WHERE status = 'approved';

GRANT SELECT ON public.pro_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_reviews TO authenticated;
GRANT ALL ON public.pro_reviews TO service_role;

ALTER TABLE public.pro_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public peut lire les avis approuves"
  ON public.pro_reviews FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authentifie peut creer son avis"
  ON public.pro_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Auteur peut modifier son avis"
  ON public.pro_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Auteur ou admin peut supprimer"
  ON public.pro_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin peut moderer"
  ON public.pro_reviews FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fonction d'agrégat
CREATE OR REPLACE FUNCTION public.refresh_pro_rating(_pro_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pro_profiles p
  SET rating_avg = sub.avg,
      rating_count = sub.cnt
  FROM (
    SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), NULL) AS avg,
           COUNT(*) AS cnt
    FROM public.pro_reviews
    WHERE pro_id = _pro_id AND status = 'approved'
  ) sub
  WHERE p.id = _pro_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_pro_reviews_refresh()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.refresh_pro_rating(OLD.pro_id);
    RETURN OLD;
  ELSE
    PERFORM public.refresh_pro_rating(NEW.pro_id);
    IF (TG_OP = 'UPDATE' AND OLD.pro_id <> NEW.pro_id) THEN
      PERFORM public.refresh_pro_rating(OLD.pro_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS pro_reviews_refresh ON public.pro_reviews;
CREATE TRIGGER pro_reviews_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.pro_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_pro_reviews_refresh();

DROP TRIGGER IF EXISTS pro_reviews_updated_at ON public.pro_reviews;
CREATE TRIGGER pro_reviews_updated_at
  BEFORE UPDATE ON public.pro_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
