
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS admin_notes text;

DO $$
DECLARE
  v_count int;
BEGIN
  WITH targets AS (
    SELECT id FROM public.articles
    WHERE content ILIKE '%1er octobre 2026%'
       OR content ILIKE '%30 septembre 2026%'
       OR content ILIKE '%14/07/2026%'
       OR content ILIKE '%14 juillet 2026%'
       OR content ILIKE '%gratuit jusqu''au%'
       OR content ILIKE '%période gratuite%'
       OR content ILIKE '%6,99 €/mois%'
       OR content ILIKE '%65 €/an%'
       OR content ILIKE '%12 € en oneshot%'
       OR content ILIKE '%10 € pour un mois%'
  )
  UPDATE public.articles a
  SET noindex = true,
      updated_at = now(),
      admin_notes = COALESCE(a.admin_notes, '') ||
        E'\n2026-07-05 pivot pricing gratuit sans deadline : à réécrire éditorialement (retirer dates de bascule et prix affichés, aligner sur baseline getPricingBaseline()).'
  FROM targets t
  WHERE a.id = t.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '% articles mis en noindex temporaire pour révision éditoriale post-pivot pricing.', v_count;
  IF v_count > 15 THEN
    RAISE WARNING 'Plus de 15 articles impactés (%). Prévoir une session de réécriture éditoriale dédiée.', v_count;
  END IF;
END $$;
