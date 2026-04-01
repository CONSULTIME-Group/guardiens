
-- ÉTAPE 1: Table competences_validees
CREATE TABLE IF NOT EXISTS public.competences_validees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL UNIQUE,
  categorie text NOT NULL CHECK (categorie IN ('jardin','animaux','competences_savoirs','coups_de_main')),
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Seed
INSERT INTO public.competences_validees (label, categorie) VALUES
('Potager', 'jardin'),
('Arrosage', 'jardin'),
('Taille de haies', 'jardin'),
('Tonte de pelouse', 'jardin'),
('Compostage', 'jardin'),
('Jardinage naturel', 'jardin'),
('Soins chiens', 'animaux'),
('Soins chats', 'animaux'),
('Promenade chiens', 'animaux'),
('Soins chevaux', 'animaux'),
('Soins animaux de ferme', 'animaux'),
('Premiers secours animaux', 'animaux'),
('Administration médicaments animaux', 'animaux'),
('Cuisine', 'competences_savoirs'),
('Cuisine végétarienne', 'competences_savoirs'),
('Pâtisserie', 'competences_savoirs'),
('Anglais courant', 'competences_savoirs'),
('Espagnol courant', 'competences_savoirs'),
('Italien courant', 'competences_savoirs'),
('Allemand courant', 'competences_savoirs'),
('Aide aux devoirs', 'competences_savoirs'),
('Informatique', 'competences_savoirs'),
('Photographie', 'competences_savoirs'),
('Courses', 'coups_de_main'),
('Aide au déménagement', 'coups_de_main'),
('Montage de meubles', 'coups_de_main'),
('Petits travaux', 'coups_de_main'),
('Réception de colis', 'coups_de_main'),
('Relevé de courrier', 'coups_de_main'),
('Aide aux personnes âgées', 'coups_de_main'),
('Conduite', 'coups_de_main')
ON CONFLICT (label) DO NOTHING;

-- ÉTAPE 3: Colonnes competences sur owner_profiles et sitter_profiles
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS competences text[] DEFAULT '{}';
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS competences_disponible boolean DEFAULT false;
ALTER TABLE public.sitter_profiles ADD COLUMN IF NOT EXISTS competences text[] DEFAULT '{}';

-- ÉTAPE 2: Trigger usage_count
CREATE OR REPLACE FUNCTION public.update_competence_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.competences_validees
  SET usage_count = (
    SELECT COUNT(*) FROM (
      SELECT unnest(competences) as comp FROM public.sitter_profiles
      UNION ALL
      SELECT unnest(competences) as comp FROM public.owner_profiles
    ) all_comps
    WHERE comp = competences_validees.label
  )
  WHERE label = ANY(NEW.competences);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS update_competence_count_sitter ON public.sitter_profiles;
CREATE TRIGGER update_competence_count_sitter
AFTER UPDATE OF competences ON public.sitter_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_competence_usage_count();

DROP TRIGGER IF EXISTS update_competence_count_owner ON public.owner_profiles;
CREATE TRIGGER update_competence_count_owner
AFTER UPDATE OF competences ON public.owner_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_competence_usage_count();

-- ÉTAPE 4: RLS
ALTER TABLE public.competences_validees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competences_validees_public_read"
ON public.competences_validees FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "competences_validees_admin_write"
ON public.competences_validees FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ÉTAPE 5: Index
CREATE INDEX IF NOT EXISTS idx_competences_validees_categorie ON public.competences_validees (categorie);
CREATE INDEX IF NOT EXISTS idx_competences_validees_usage ON public.competences_validees (usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_owner_profiles_competences ON public.owner_profiles USING GIN (competences);
CREATE INDEX IF NOT EXISTS idx_sitter_profiles_competences ON public.sitter_profiles USING GIN (competences);
