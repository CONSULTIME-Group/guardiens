-- Table de contestation d'avis
CREATE TABLE public.review_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  disputer_id uuid NOT NULL,
  category text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index unique : un seul litige actif par avis
CREATE UNIQUE INDEX review_disputes_unique_pending 
  ON public.review_disputes(review_id) 
  WHERE status = 'pending';

CREATE INDEX idx_review_disputes_disputer ON public.review_disputes(disputer_id);
CREATE INDEX idx_review_disputes_status ON public.review_disputes(status);

-- Validation
CREATE OR REPLACE FUNCTION public.validate_review_dispute()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.category NOT IN ('faux', 'diffamation', 'inapproprie', 'erreur_identite', 'autre') THEN
    RAISE EXCEPTION 'Catégorie invalide: %', NEW.category;
  END IF;
  IF NEW.status NOT IN ('pending', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Statut invalide: %', NEW.status;
  END IF;
  IF length(NEW.reason) < 30 THEN
    RAISE EXCEPTION 'Le motif doit contenir au moins 30 caractères';
  END IF;
  IF length(NEW.reason) > 1000 THEN
    RAISE EXCEPTION 'Le motif ne peut pas dépasser 1000 caractères';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_review_dispute
  BEFORE INSERT OR UPDATE ON public.review_disputes
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_dispute();

CREATE TRIGGER trg_review_disputes_updated_at
  BEFORE UPDATE ON public.review_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.review_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own disputes"
  ON public.review_disputes FOR SELECT
  USING (auth.uid() = disputer_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update disputes"
  ON public.review_disputes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Function pour créer un litige (validation des règles métier)
CREATE OR REPLACE FUNCTION public.create_review_dispute(
  p_review_id uuid,
  p_category text,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_review public.reviews%ROWTYPE;
  v_dispute_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT * INTO v_review FROM public.reviews WHERE id = p_review_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avis introuvable';
  END IF;

  IF v_review.reviewee_id != auth.uid() THEN
    RAISE EXCEPTION 'Seul le destinataire de l''avis peut le contester';
  END IF;

  IF v_review.published = false THEN
    RAISE EXCEPTION 'Cet avis n''est pas encore publié';
  END IF;

  IF now() > v_review.created_at + interval '30 days' THEN
    RAISE EXCEPTION 'Délai de contestation de 30 jours dépassé';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.review_disputes
    WHERE review_id = p_review_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Une contestation est déjà en cours pour cet avis';
  END IF;

  INSERT INTO public.review_disputes (review_id, disputer_id, category, reason)
  VALUES (p_review_id, auth.uid(), p_category, p_reason)
  RETURNING id INTO v_dispute_id;

  -- Notification admin (via notifications table générique - tous les admins)
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT ur.user_id, 'review_dispute', 'Nouvelle contestation d''avis',
    'Un membre conteste un avis reçu. Motif : ' || p_category,
    '/admin/reviews'
  FROM public.user_roles ur WHERE ur.role = 'admin';

  RETURN v_dispute_id;
END;
$$;

-- Function pour résoudre un litige (admin uniquement)
CREATE OR REPLACE FUNCTION public.resolve_review_dispute(
  p_dispute_id uuid,
  p_decision text,
  p_admin_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_dispute public.review_disputes%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  IF p_decision NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Décision invalide';
  END IF;

  SELECT * INTO v_dispute FROM public.review_disputes WHERE id = p_dispute_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contestation introuvable';
  END IF;

  IF v_dispute.status != 'pending' THEN
    RAISE EXCEPTION 'Cette contestation a déjà été résolue';
  END IF;

  UPDATE public.review_disputes
  SET status = p_decision,
      admin_note = p_admin_note,
      resolved_at = now(),
      resolved_by = auth.uid()
  WHERE id = p_dispute_id;

  -- Si acceptée : dépublier l'avis
  IF p_decision = 'accepted' THEN
    UPDATE public.reviews
    SET published = false, moderation_status = 'refuse'
    WHERE id = v_dispute.review_id;
  END IF;

  -- Notifier le contestataire
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    v_dispute.disputer_id,
    'dispute_resolved',
    CASE WHEN p_decision = 'accepted' THEN 'Contestation acceptée' ELSE 'Contestation refusée' END,
    CASE WHEN p_decision = 'accepted' 
      THEN 'Votre contestation a été acceptée. L''avis a été retiré.'
      ELSE 'Votre contestation a été examinée mais n''a pas été retenue.'
    END,
    '/mes-avis'
  );
END;
$$;