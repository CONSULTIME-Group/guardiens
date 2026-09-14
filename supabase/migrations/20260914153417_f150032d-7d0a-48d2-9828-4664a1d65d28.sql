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
  AND p !~ '^\s*#{1,6}\s'
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
  '(.{0,40}(?:6[,.]99\s*[  ]?€|65\s*[  ]?€\s*/?\s*an|abonnement actif|abonnement modice|paie son abonnement|paient leur abonnement|financé par (?:les abonnements|l.abonnement|la contribution) des gardiens|contribution des gardiens|seule source de revenus).{0,40})', 'gi') m
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

INSERT INTO public.content_defect_test_cases (regle_attendue, doit_matcher, texte, origine) VALUES
('stat_non_sourcee', false, '### 81,9 % d''appartements', 'lot 8 titre markdown'),
('stat_non_sourcee', false, '## 42 % de maisons individuelles', 'lot 8 titre markdown'),
('stat_non_sourcee', true, 'La commune compte 74,6 % d''appartements et 23,3 % de maisons.', 'lot 8 paragraphe normal');