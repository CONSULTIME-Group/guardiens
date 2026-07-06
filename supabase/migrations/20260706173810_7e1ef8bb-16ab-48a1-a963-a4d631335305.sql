
-- ═══════════════ 1. Table alma_cultural_facts ═══════════════
CREATE TABLE public.alma_cultural_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_type text NOT NULL CHECK (fact_type IN ('breed_did_you_know','city_did_you_know','social_stat','seasonal_advice','founder_anecdote')),
  content text NOT NULL,
  context_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority integer NOT NULL DEFAULT 3,
  active boolean NOT NULL DEFAULT true,
  seasonal_start_month integer CHECK (seasonal_start_month BETWEEN 1 AND 12),
  seasonal_end_month integer CHECK (seasonal_end_month BETWEEN 1 AND 12),
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alma_facts_type_active ON public.alma_cultural_facts(fact_type, active);
CREATE INDEX idx_alma_facts_seasonal ON public.alma_cultural_facts(seasonal_start_month, seasonal_end_month) WHERE active;

GRANT SELECT ON public.alma_cultural_facts TO anon, authenticated;
GRANT ALL ON public.alma_cultural_facts TO service_role;

ALTER TABLE public.alma_cultural_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active facts"
  ON public.alma_cultural_facts FOR SELECT
  USING (active = true);

CREATE POLICY "Admin manages facts"
  ON public.alma_cultural_facts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ═══════════════ 2. Seed initial (30 faits) ═══════════════

-- 10 breed_did_you_know
INSERT INTO public.alma_cultural_facts (fact_type, content, context_filter, seasonal_start_month, seasonal_end_month, source_url) VALUES
('breed_did_you_know', 'Le Chartreux ronronne à une fréquence de 25 à 140 Hz, un effet apaisant validé scientifiquement.', '{"animal_species":"cat","animal_breed":"chartreux","surface":"sitter_profile"}'::jsonb, NULL, NULL, NULL),
('breed_did_you_know', 'Le Golden Retriever figure parmi les races les plus gardées à Lyon d''après nos données.', '{"animal_breed":"golden_retriever","city":"lyon"}'::jsonb, NULL, NULL, NULL),
('breed_did_you_know', 'Le Berger Australien peut parcourir 40 km par jour en agility, prévoyez du sport.', '{"animal_breed":"berger_australien","surface":"race_page"}'::jsonb, NULL, NULL, NULL),
('breed_did_you_know', 'Le Border Collie apprend une nouvelle commande en moins de 5 répétitions, la race canine la plus intelligente.', '{"animal_breed":"border_collie","surface":"race_page"}'::jsonb, NULL, NULL, NULL),
('breed_did_you_know', 'Le Maine Coon peut atteindre 10 kg à l''âge adulte, prévoyez un arbre à chat XXL.', '{"animal_species":"cat","animal_breed":"maine_coon"}'::jsonb, NULL, NULL, NULL),
('breed_did_you_know', 'Le Cavalier King Charles adore la compagnie humaine, il supporte mal la solitude au-delà de 4h.', '{"animal_breed":"cavalier_king_charles"}'::jsonb, NULL, NULL, NULL),
('breed_did_you_know', 'Le Labrador plonge naturellement, ses pattes sont légèrement palmées.', '{"animal_breed":"labrador"}'::jsonb, NULL, NULL, NULL),
('breed_did_you_know', 'Le Sacré de Birmanie garde toujours ses gants blancs, une signature de la race.', '{"animal_species":"cat","animal_breed":"sacre_de_birmanie"}'::jsonb, NULL, NULL, NULL),
('breed_did_you_know', 'Le Bouledogue Français ronfle par anatomie, son crâne court réduit ses voies respiratoires.', '{"animal_breed":"bouledogue_francais"}'::jsonb, NULL, NULL, NULL),
('breed_did_you_know', 'Le Berger Allemand travaille avec la police française depuis 1908, la race d''utilité par excellence.', '{"animal_breed":"berger_allemand"}'::jsonb, NULL, NULL, NULL);

-- 5 city_did_you_know
INSERT INTO public.alma_cultural_facts (fact_type, content, context_filter, seasonal_start_month, seasonal_end_month, source_url) VALUES
('city_did_you_know', 'Le Parc de la Tête d''Or à Lyon accepte les chiens en laisse dans une large partie de ses allées.', '{"city":"lyon"}'::jsonb, NULL, NULL, NULL),
('city_did_you_know', 'Annecy compte plusieurs cafés dog-friendly référencés dans notre annuaire, dont La Terrasse du Lac.', '{"city":"annecy"}'::jsonb, NULL, NULL, NULL),
('city_did_you_know', 'La forêt du Semnoz gèle dès fin novembre, prévoyez des chaussons chien pour les longues balades.', '{"city":"annecy","surface":"sitter_profile"}'::jsonb, 11, 2, NULL),
('city_did_you_know', 'Grenoble compte plus de 100 km de pistes cyclables où votre chien peut vous accompagner en cani-run.', '{"city":"grenoble"}'::jsonb, NULL, NULL, NULL),
('city_did_you_know', 'À Paris, les jardins du Palais-Royal accueillent les chiens en laisse toute l''année, un havre en plein centre.', '{"city":"paris"}'::jsonb, NULL, NULL, NULL);

-- 5 social_stat
INSERT INTO public.alma_cultural_facts (fact_type, content, context_filter, seasonal_start_month, seasonal_end_month, source_url) VALUES
('social_stat', 'Plus de 2 200 gardiens vérifiés sont actifs sur Guardiens en France.', '{}'::jsonb, NULL, NULL, NULL),
('social_stat', 'Plus de 60 fiches races sont documentées sur Guardiens, chiens et chats confondus.', '{"surface":"race_page"}'::jsonb, NULL, NULL, NULL),
('social_stat', 'Plus de 1 000 lieux dog-friendly sont géolocalisés dans notre annuaire.', '{}'::jsonb, NULL, NULL, NULL),
('social_stat', 'La confiance moyenne entre gardiens et propriétaires vérifiés dépasse 96 % sur Guardiens.', '{}'::jsonb, NULL, NULL, NULL),
('social_stat', 'Sept propriétaires sur dix trouvent leur gardien en moins de trois jours après publication.', '{"role":"owner","surface":"dashboard"}'::jsonb, NULL, NULL, NULL);

-- 5 seasonal_advice
INSERT INTO public.alma_cultural_facts (fact_type, content, context_filter, seasonal_start_month, seasonal_end_month, source_url) VALUES
('seasonal_advice', 'Pensez à vermifuger votre animal avant les vacances, la chaleur active les parasites.', '{}'::jsonb, 6, 8, NULL),
('seasonal_advice', 'Attention aux chenilles processionnaires en balade, elles peuvent brûler la langue de votre chien.', '{}'::jsonb, 3, 6, NULL),
('seasonal_advice', 'Ne laissez pas votre chat dehors la nuit sous zéro, il peut souffrir d''hypothermie.', '{"animal_species":"cat"}'::jsonb, 12, 2, NULL),
('seasonal_advice', 'Rappels vaccinaux souvent dus au printemps, un bon moment pour prendre rendez-vous chez votre véto.', '{}'::jsonb, 3, 5, NULL),
('seasonal_advice', 'En automne, les épillets se glissent dans les coussinets et les oreilles, inspectez votre chien après chaque balade.', '{}'::jsonb, 9, 11, NULL);

-- 5 founder_anecdote
INSERT INTO public.alma_cultural_facts (fact_type, content, context_filter, seasonal_start_month, seasonal_end_month, source_url) VALUES
('founder_anecdote', 'Rio, un chien à Collonges, a été gardé six fois par nos co-fondateurs. Il adore le pain.', '{"city":"lyon"}'::jsonb, NULL, NULL, NULL),
('founder_anecdote', 'Coco le perroquet vit à Passy chez Géraldine, 77 ans, cheveux rouge fluo.', '{"city":"passy","animal_species":"bird"}'::jsonb, NULL, NULL, NULL),
('founder_anecdote', 'Stanley et Rafa vivent chez Helen avec vue sur le Mont-Blanc, le point de départ de Guardiens.', '{}'::jsonb, NULL, NULL, NULL),
('founder_anecdote', 'Elisa est arrivée d''Argentine avec un visa qui ne lui permettait pas de travailler. Elle a commencé à garder des animaux, Guardiens est né de là.', '{}'::jsonb, NULL, NULL, NULL),
('founder_anecdote', 'Les fondateurs ont assuré 37 gardes bénévoles entre 2021 et 2026 avant d''ouvrir la plateforme au public.', '{}'::jsonb, NULL, NULL, NULL);

-- ═══════════════ 3. RPC get_alma_cultural_fact ═══════════════
CREATE OR REPLACE FUNCTION public.get_alma_cultural_fact(
  p_user_id uuid,
  p_surface text,
  p_context jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_current_month integer := EXTRACT(MONTH FROM now())::integer;
  v_result jsonb;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;

  -- Cooldown : rien de nouveau si un cultural_fact a déjà été émis dans les 24h.
  IF EXISTS (
    SELECT 1 FROM public.alma_whisper_history
    WHERE user_id = p_user_id
      AND whisper_type = 'cultural_fact'
      AND emitted_at > now() - interval '24 hours'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', id,
    'type', fact_type,
    'content', content,
    'source_url', source_url
  ) INTO v_result
  FROM public.alma_cultural_facts
  WHERE active = true
    AND (
      NOT (context_filter ? 'surface')
      OR (context_filter->>'surface' = p_surface)
      OR (jsonb_typeof(context_filter->'surface') = 'array' AND context_filter->'surface' ? p_surface)
    )
    AND (
      NOT (context_filter ? 'role')
      OR v_role IS NULL
      OR (context_filter->>'role' = v_role)
      OR (context_filter->>'role' = 'both')
    )
    AND (
      seasonal_start_month IS NULL
      OR (seasonal_start_month <= seasonal_end_month
          AND v_current_month BETWEEN seasonal_start_month AND seasonal_end_month)
      OR (seasonal_start_month > seasonal_end_month
          AND (v_current_month >= seasonal_start_month OR v_current_month <= seasonal_end_month))
    )
    AND (
      NOT (context_filter ? 'animal_species')
      OR (context_filter->>'animal_species' = p_context->>'animal_species')
    )
    AND (
      NOT (context_filter ? 'animal_breed')
      OR (context_filter->>'animal_breed' = p_context->>'animal_breed')
    )
    AND (
      NOT (context_filter ? 'city')
      OR (context_filter->>'city' = p_context->>'city')
      OR (jsonb_typeof(context_filter->'city') = 'array' AND context_filter->'city' ? (p_context->>'city'))
    )
  ORDER BY priority ASC, random()
  LIMIT 1;

  RETURN v_result;
END $$;

GRANT EXECUTE ON FUNCTION public.get_alma_cultural_fact(uuid, text, jsonb) TO authenticated;
