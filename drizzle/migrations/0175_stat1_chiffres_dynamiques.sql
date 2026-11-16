-- Lot STAT1 (16/11/2026, article juridique refondu le 16/11 et audit éditorial du journal) :
-- les articles écrivaient en dur le nombre d'avis, la note moyenne, les gardes terminées
-- et les accords de garde, chiffres qui se périment dès le lendemain. Cinq clés globales
-- rejoignent public.get_content_stats, lues par le moteur src/lib/contentPlaceholders.ts :
--   avis_publies         avis publiés, avis d'annulation exclus
--   note_moyenne_avis    note moyenne de ces avis, arrondie au dixième (null sans avis)
--   gardes_terminees     gardes non annulées, avec un candidat accepté, finies avant aujourd'hui
--   accords_acceptes     accords de garde acceptés (une ligne par signataire)
--   gardes_avec_accord   gardes portant au moins un accord accepté
-- Valeurs lues en production le 16/11/2026 : 8, 5.0, 7, 13, 9.
-- Seuls des agrégats sortent : aucune ligne, aucun identifiant, aucune adresse IP.
--
-- Fonction reprise mot pour mot depuis la production (pg_get_functiondef du 16/11/2026),
-- même signature, LANGUAGE sql STABLE SECURITY DEFINER, SET search_path TO 'public'.
-- CREATE OR REPLACE garde le propriétaire et les droits en place (proacl constaté le
-- 16/11/2026 : PUBLIC, anon, authenticated, service_role en EXECUTE) : aucun GRANT ni
-- REVOKE ici, les articles publics appellent la fonction en anon.
-- Rejouable. Repère : stat1_chiffres_dynamiques.

CREATE OR REPLACE FUNCTION public.get_content_stats(p_city_slug text DEFAULT NULL::text, p_department_slug text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Repère : stat1_chiffres_dynamiques.
  WITH global_stats AS (
    SELECT jsonb_build_object(
      'total_inscrits', (SELECT count(*) FROM profiles),
      'profils_gardien', (SELECT count(*) FROM profiles WHERE role IN ('sitter', 'both')),
      'profils_proprio', (SELECT count(*) FROM profiles WHERE role IN ('owner', 'both')),
      'inscrits_30j', (SELECT count(*) FROM profiles WHERE created_at >= now() - interval '30 days'),
      'city_guides', (SELECT count(*) FROM city_guides WHERE published),
      'city_guide_places', (SELECT count(*) FROM city_guide_places p JOIN city_guides g ON g.id = p.city_guide_id WHERE g.published),
      'breed_profiles', (SELECT count(*) FROM breed_profiles),
      'villes_couvertes', (SELECT count(*) FROM seo_city_pages WHERE published AND NOT COALESCE(noindex, false) AND slug NOT LIKE 'test-%'),
      'departements_couverts', (SELECT count(*) FROM seo_department_pages WHERE published AND NOT COALESCE(noindex, false)),
      'avis_publies', (SELECT count(*) FROM reviews WHERE published AND review_type IS DISTINCT FROM 'cancellation'),
      'note_moyenne_avis', (SELECT round(avg(overall_rating)::numeric, 1) FROM reviews WHERE published AND review_type IS DISTINCT FROM 'cancellation'),
      'gardes_terminees', (SELECT count(DISTINCT s.id) FROM sits s JOIN applications a ON a.sit_id = s.id AND a.status = 'accepted' WHERE s.end_date < current_date AND s.status <> 'cancelled'),
      'accords_acceptes', (SELECT count(*) FROM garde_accords WHERE accepted),
      'gardes_avec_accord', (SELECT count(DISTINCT garde_id) FROM garde_accords WHERE accepted)
    ) AS g
  ),
  city_stats AS (
    SELECT jsonb_build_object(
      'ville_nom', c.city,
      'ville_departement', c.department,
      'ville_gardiens', c.sitter_count,
      'ville_gardiens_proximite', c.nearby_sitter_count,
      'ville_gardiens_total', COALESCE(c.sitter_count, 0) + COALESCE(c.nearby_sitter_count, 0),
      'ville_annonces_actives', c.active_sits_count
    ) AS v
    FROM seo_city_pages c
    WHERE p_city_slug IS NOT NULL AND c.slug = p_city_slug AND c.published
    LIMIT 1
  ),
  dept_stats AS (
    SELECT jsonb_build_object(
      'departement_nom', d.department,
      'departement_gardiens', d.sitter_count,
      'departement_annonces_actives', d.active_sits_count
    ) AS v
    FROM seo_department_pages d
    WHERE p_department_slug IS NOT NULL AND d.slug = p_department_slug AND d.published
    LIMIT 1
  )
  SELECT (SELECT g FROM global_stats)
    || COALESCE((SELECT v FROM city_stats), '{}'::jsonb)
    || COALESCE((SELECT v FROM dept_stats), '{}'::jsonb);
$function$;
