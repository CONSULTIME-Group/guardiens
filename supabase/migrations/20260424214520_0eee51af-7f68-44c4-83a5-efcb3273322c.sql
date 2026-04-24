-- ============================================================================
-- Table de configuration des poids de répartition des hero par catégorie.
-- Modèle "singleton" : une seule ligne (id = 1) contient les 4 poids actifs.
-- Lecture publique (les visiteurs anonymes en ont besoin pour calculer leur hero).
-- Écriture réservée aux admins via has_role().
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hero_weights (
  id INTEGER PRIMARY KEY DEFAULT 1,
  weight_animals    INTEGER NOT NULL DEFAULT 40,
  weight_home       INTEGER NOT NULL DEFAULT 20,
  weight_mutual_aid INTEGER NOT NULL DEFAULT 20,
  weight_village    INTEGER NOT NULL DEFAULT 20,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,

  -- Verrou singleton : on ne veut JAMAIS qu'une 2e ligne apparaisse.
  CONSTRAINT hero_weights_singleton CHECK (id = 1),
  -- Poids strictement positifs (la somme n'a pas besoin d'être 100,
  -- les poids sont normalisés par le code client).
  CONSTRAINT hero_weights_positive CHECK (
    weight_animals    >= 0 AND
    weight_home       >= 0 AND
    weight_mutual_aid >= 0 AND
    weight_village    >= 0
  ),
  -- Au moins une catégorie doit avoir un poids non nul, sinon la sélection
  -- serait indéfinie.
  CONSTRAINT hero_weights_nonzero_total CHECK (
    weight_animals + weight_home + weight_mutual_aid + weight_village > 0
  )
);

-- Ligne par défaut (40 / 20 / 20 / 20) — alignée sur les valeurs actuelles
-- du code dans src/lib/heroBank.ts.
INSERT INTO public.hero_weights (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Trigger updated_at standard (réutilise la fonction du projet).
CREATE TRIGGER hero_weights_set_updated_at
BEFORE UPDATE ON public.hero_weights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.hero_weights ENABLE ROW LEVEL SECURITY;

-- Lecture : tout le monde (anon + authenticated). Les poids ne sont pas sensibles.
CREATE POLICY "hero_weights_read_all"
ON public.hero_weights
FOR SELECT
USING (true);

-- Écriture : admins uniquement (UPDATE seulement, pas d'INSERT/DELETE car singleton).
CREATE POLICY "hero_weights_admin_update"
ON public.hero_weights
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ── Realtime ────────────────────────────────────────────────────────────────
-- On veut que les changements admin se propagent en direct à tous les onglets
-- ouverts (notamment la page de debug et les profils en cours d'affichage).
ALTER PUBLICATION supabase_realtime ADD TABLE public.hero_weights;
ALTER TABLE public.hero_weights REPLICA IDENTITY FULL;