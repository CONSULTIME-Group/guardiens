CREATE OR REPLACE FUNCTION public.detect_content_defects(p_content text)
 RETURNS TABLE(rule_code text, excerpt text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
WITH src AS (SELECT coalesce(p_content,'') AS c),
     para AS (SELECT p FROM src, regexp_split_to_table(src.c, E'\n\n+') AS p),
     clean AS (SELECT regexp_replace(regexp_replace(p, '\]\([^)]*\)', ']', 'g'), 'href="[^"]*"', '', 'g') AS p FROM para),
     sansecusson AS (SELECT regexp_replace(regexp_replace(src.c,
        '(«\s*|")(Identité|ID|Gardien Pro)\s+vérifiée?(\s*»|")', 'ECUSSON', 'gi'),
        'badge\s+(«\s*|")?Gardien Pro vérifié(\s*»|")?', 'BADGEPRO', 'gi') AS c FROM src)
SELECT 'stat_non_sourcee', left(p,240) FROM para
WHERE p ~ '[0-9]+([.,][0-9]+)?\s*%|[0-9]+([.,][0-9]+)?\s+(millions?|milliards?)'
  AND p !~ '\]\(http' AND p !~* 'href='
  AND p !~* 'complet|complét|seuil|auto-validation|confiance est élevée'
  AND p !~* 'insee|ifop|ipsos|facco|ssmsi|nielseniq|odoxa|opinionway|fondation de france|santé?vet|crédoc|credoc|cerlis|ministère|légifrance|legifrance|atout france|cci |ordres de grandeur'
  AND p !~* '100\s?%\s?d.intérieur|inachevée à|m²'
  AND p !~* 'croquette|friandise|calorique|ration|alimentation|gamelle|pâtée|protéines animales|repas'
UNION ALL
SELECT 'mot_double', m[1] FROM src, regexp_matches(src.c, '([A-Za-zÀ-ÿ]{4,}) \1\M', 'gi') m
WHERE lower(m[1]) NOT IN ('vous','nous','faire')
  AND m[1] !~ '^[A-ZÀ-Þ]'
UNION ALL
SELECT 'apostrophe_doublee', m[1] FROM src, regexp_matches(src.c, '(.{0,25}''''.{0,25})', 'g') m
UNION ALL
SELECT 'texte_desaccentue', left(p,240) FROM clean
WHERE (SELECT count(*) FROM regexp_matches(clean.p,
  '\m(proprietaire|duree|modele|necessaire|securite|presence|verifie|experience|premiere|generalement|specifique|reserve|prefere|apres|tres|deja|etre|meme|donnee|reference|numero|telephone|adresse|periode|preparer|decouvrez|regulier|frequence|coordonnees|hopital|veterinaire|categorie|premieres|derniere)\M','g')) >= 3
UNION ALL
SELECT 'artefact_substitution', m[1] FROM src, regexp_matches(src.c,
  '(.{0,35}(?:[dlnmts]''France|de le France|r[ée]gion France|communes personnes|villes personnes|coin personnes|gens du coin du coin|quartier personnes).{0,35})', 'gi') m
UNION ALL
SELECT 'ponctuation_interdite', m[1] FROM src, regexp_matches(src.c, '(.{0,35}[—–].{0,35})', 'g') m
UNION ALL
SELECT 'vocabulaire_proscrit', m[1] FROM src, regexp_matches(src.c, '(.{0,35}(?:\m(?:un|une|des|le|la|les|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|leur|leurs|ce|cet|cette|ces)\s+voisin(?:e|s|es)?\M|à vie\M|pour toujours).{0,35})', 'gi') m
UNION ALL
SELECT 'concurrent_cite', m[1] FROM src, regexp_matches(src.c,
  '(.{0,30}(?:trustedhousesitters|nomador|animaute|holidog|emprunte mon toutou|\mrover\M).{0,30})', 'gi') m
UNION ALL
SELECT 'promesse_hors_baseline', m[1] FROM src, regexp_matches(src.c,
  '(.{0,40}(?:100\s?%\s?gratuit|totalement gratuit|toujours gratuit|restera(?:ient|ont)? gratuit|resteront gratuit|annonce gratuite|inscription gratuite|aucune date de fin|ne (?:paierez|payerez|paiera) jamais|sans jamais rien payer|sans jamais (?:avoir à payer|débourser)|gratuité totale|jusqu.à nouvel ordre).{0,40})', 'gi') m
UNION ALL
SELECT 'prix_guardiens', m[1] FROM src, regexp_matches(src.c,
  '(.{0,40}(?:6[,.]99\s*[  ]?€|65\s*[  ]?€\s*/?\s*an|abonnement actif|abonnement modique|paie son abonnement|paient leur abonnement|financé par (?:les abonnements|l.abonnement|la contribution) des gardiens|contribution des gardiens|seule source de revenus).{0,40})', 'gi') m
UNION ALL
SELECT 'date_bascule', m[1] FROM src, regexp_matches(src.c,
  '(.{0,40}(?:14\s+juillet\s+2026|14/07/2026|1er\s+octobre\s+2026|30\s+septembre\s+2026|gratuit\w*\s+jusqu.au).{0,40})', 'gi') m
UNION ALL
SELECT 'verification_revendiquee', m[1] FROM sansecusson, regexp_matches(sansecusson.c,
  '(.{0,40}(?:(?:vérifi|contrôl)\w*[^\S\n]+(?:manuelle?ment|à la main)|vérification[^.\n]{0,30}(?:obligatoire|manuelle)|gardiens?(?:[^\S\n]+(?!non\M)\S+){0,3}[^\S\n]+vérifiés?\M|profils?(?:[^\S\n]+(?!non\M)\S+){0,2}[^\S\n]+vérifiés?\M|jamais[^\S\n]+par[^\S\n]+un[^\S\n]+algorithme|yeux[^\S\n]+humains|chaque[^\S\n]+(?:gardien|membre|profil)[^\S\n]+(?:est|passe|doit)[^.\n]{0,40}vérifi|doit[^\S\n]+soumettre[^\S\n]+une[^\S\n]+pièce).{0,40})', 'gi') m
UNION ALL
SELECT 'rencontre_obligatoire', m[1] FROM src, regexp_matches(src.c,
  '(.{0,40}(?:rencontre[^.]{0,50}(?:est\s+)?obligatoire|(?:rencontre|garde|visite)[^.]{0,40}non négociable|non négociable[^.]{0,40}(?:rencontre|garde|visite)|Guardiens impose|nous imposons|nous exigeons|aucune garde ne peut être confirmée|vous devez rencontrer).{0,40})', 'gi') m
UNION ALL
SELECT 'lien_interne_mort', x.l FROM (
  SELECT DISTINCT m[1] AS l FROM src, regexp_matches(src.c, '\((/actualites/[a-z0-9-]+)\)', 'g') m) x
WHERE NOT EXISTS (SELECT 1 FROM public.articles a WHERE '/actualites/'||a.slug = x.l AND a.published AND NOT coalesce(a.noindex,false))
$function$;

CREATE OR REPLACE FUNCTION public.check_content_quality(p_seuil_alertes integer DEFAULT NULL::integer, p_forcer_erreur boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_debut timestamptz := clock_timestamp();
  v_tests_ko int; v_tests_total int; v_alertes int; v_cibles int;
  v_hors_gel int; v_gel int; v_seuil int; v_signaux jsonb := '[]'::jsonb; v_res jsonb;
  v_sys uuid := '00000000-0000-0000-0000-0000000c0de1';
  v_geles text[];
BEGIN
  IF p_forcer_erreur THEN RAISE EXCEPTION 'Test volontaire du chemin d erreur'; END IF;

  SELECT coalesce(array_agg(slug), ARRAY[]::text[]) INTO v_geles
  FROM content_freeze WHERE frozen_until >= current_date;

  SELECT count(*) FILTER (WHERE verdict='FAIL'), count(*) INTO v_tests_ko, v_tests_total FROM v_detector_selftest;

  UPDATE content_quality_alerts SET resolved_at = now() WHERE resolved_at IS NULL;
  INSERT INTO content_quality_alerts(article_id, slug, rule_code, excerpt, source_table)
  SELECT v.row_id::uuid, v.label, v.rule_code, v.excerpt, v.source_table FROM v_content_defects v;

  SELECT count(*), count(DISTINCT slug),
         count(*) FILTER (WHERE slug <> ALL(v_geles)),
         count(*) FILTER (WHERE slug = ANY(v_geles))
    INTO v_alertes, v_cibles, v_hors_gel, v_gel
  FROM content_quality_alerts WHERE resolved_at IS NULL;

  v_seuil := coalesce(p_seuil_alertes, v_gel);

  IF v_tests_ko > 0 THEN
    INSERT INTO admin_signals(signal_type, severity, entity_type, entity_id, metadata)
    VALUES ('content_detector_broken', 'critical', 'content', v_sys,
      jsonb_build_object('tests_ko', v_tests_ko, 'tests_total', v_tests_total,
        'cas', (SELECT jsonb_agg(jsonb_build_object('id',id,'regle',regle_attendue,'texte',left(texte,120)))
                FROM v_detector_selftest WHERE verdict='FAIL')))
    ON CONFLICT (signal_type, entity_id) WHERE resolved_at IS NULL
    DO UPDATE SET metadata = EXCLUDED.metadata, severity = EXCLUDED.severity, detected_at = now();
    v_signaux := v_signaux || jsonb_build_array('content_detector_broken');
  END IF;

  IF v_hors_gel > 0 THEN
    INSERT INTO admin_signals(signal_type, severity, entity_type, entity_id, metadata)
    VALUES ('content_defect_outside_freeze', 'critical', 'content', v_sys,
      jsonb_build_object('nombre', v_hors_gel,
        'details', (SELECT jsonb_agg(jsonb_build_object('table',source_table,'cible',slug,'regle',rule_code,'extrait',left(excerpt,120)))
                    FROM content_quality_alerts WHERE resolved_at IS NULL AND slug <> ALL(v_geles))))
    ON CONFLICT (signal_type, entity_id) WHERE resolved_at IS NULL
    DO UPDATE SET metadata = EXCLUDED.metadata, severity = EXCLUDED.severity, detected_at = now();
    v_signaux := v_signaux || jsonb_build_array('content_defect_outside_freeze');
  END IF;

  IF v_alertes > v_seuil THEN
    INSERT INTO admin_signals(signal_type, severity, entity_type, entity_id, metadata)
    VALUES ('content_quality_drift', 'warning', 'content', v_sys,
      jsonb_build_object('alertes', v_alertes, 'seuil', v_seuil, 'cibles', v_cibles))
    ON CONFLICT (signal_type, entity_id) WHERE resolved_at IS NULL
    DO UPDATE SET metadata = EXCLUDED.metadata, severity = EXCLUDED.severity, detected_at = now();
    v_signaux := v_signaux || jsonb_build_array('content_quality_drift');
  END IF;

  v_res := jsonb_build_object(
    'tests_total', v_tests_total, 'tests_ko', v_tests_ko,
    'alertes_ouvertes', v_alertes, 'cibles', v_cibles,
    'alertes_hors_gel', v_hors_gel, 'alertes_sur_pages_gelees', v_gel,
    'pages_gelees_actives', cardinality(v_geles), 'seuil_applique', v_seuil,
    'signaux_emis', v_signaux, 'calcule_le', to_char(now() AT TIME ZONE 'Europe/Paris','YYYY-MM-DD HH24:MI'));

  -- cron_run_log.status est contraint a success / partial / failed
  INSERT INTO cron_run_log(edge_name, started_at, finished_at, status, metrics)
  VALUES ('check-content-quality', v_debut, clock_timestamp(),
          CASE WHEN v_signaux = '[]'::jsonb THEN 'success' ELSE 'partial' END, v_res);

  RETURN v_res;

-- On journalise SANS relever l exception : un RAISE annulerait l INSERT dans la meme
-- transaction et la trace serait perdue. Le consommateur de l alerte est cron_run_log.
EXCEPTION WHEN OTHERS THEN
  INSERT INTO cron_run_log(edge_name, started_at, finished_at, status, metrics, error_message)
  VALUES ('check-content-quality', v_debut, clock_timestamp(), 'failed',
          jsonb_build_object('sqlstate', SQLSTATE), SQLERRM);
  RETURN jsonb_build_object('status','failed','erreur',SQLERRM,'sqlstate',SQLSTATE,
    'calcule_le', to_char(now() AT TIME ZONE 'Europe/Paris','YYYY-MM-DD HH24:MI'));
END; $function$;

INSERT INTO public.content_defect_test_cases (regle_attendue, doit_matcher, texte, origine) VALUES
  ('vocabulaire_proscrit', true,  'Pour une absence courte, elle demande l''aide d''un voisin.', 'nom de personne'),
  ('vocabulaire_proscrit', false, 'Le Finistère voisin offre des balades côtières remarquables.', 'adjectif de proximité, département'),
  ('vocabulaire_proscrit', false, 'Les promenades dans le voisinage rythment les journées du chien.', 'emploi géographique, voisinage'),
  ('mot_double', true,  'Il a mangé mangé trop vite et a régurgité son repas.', 'répétition réelle en minuscules'),
  ('mot_double', false, 'Le couple a passé ses vacances à Bora Bora avec son chien.', 'nom propre répété'),
  ('mot_double', false, 'La poule domestique descend de Gallus gallus domesticus.', 'nom scientifique'),
  ('mot_double', false, 'Vous pouvez faire faire quelques exercices simples à votre chiot.', 'tournure correcte, faire faire');