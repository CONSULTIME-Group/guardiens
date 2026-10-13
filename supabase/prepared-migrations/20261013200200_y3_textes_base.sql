-- Lot Y3 (13/10/2026) : textes stockés en base conformes à la doctrine.
-- Audit passe 5 (doctrine et textes visibles) du 13/10/2026, textes relus en
-- production le 13/10/2026 (lecture seule) avant écriture de ce fichier.
--
-- Doctrine : « Guardiens est gratuit », dit simplement, sans restriction aux
-- propriétaires ni abonnement ; rencontre toujours facultative ; aucune
-- comparaison avec d'autres acteurs (pension, pet-sitter) ; seuil de profil
-- 40 % ; textes positifs.
--
-- Chaque instruction est ciblée (identifiant ou slug) et gardée par l'ancien
-- texte : elle ne touche rien qui aurait changé depuis la relecture, et une
-- seconde exécution ne modifie plus aucune ligne (rejouable). Les textes longs
-- sont corrigés par replace() sur la phrase fautive seulement.
--
-- Lignes visées (relecture du 13/10/2026) :
--   articles                2 lignes (P5-02, P5-18)
--   faq_entries             9 lignes (P5-04 : 4, P2 P5-29, P5-34, P5-38, P5-41 ;
--                           9 UPDATE ciblés, une ligne chacun, relecture du
--                           13/10/2026)
--   seo_department_pages  101 lignes (P5-16, P2 P5-46)
--   seo_city_pages        107 lignes (P5-07 : 83 « gratuit pour les
--                           propriétaires », 43 « sans frais pour les
--                           propriétaires », 67 « sans frais, sans engagement »,
--                           avec recouvrement)
-- Écarté : les comparaisons de fond avec la pension dans les articles (famille
-- comparative, 43 articles) et dans 125 pages ville relèvent d'un lot
-- éditorial, une réécriture par motif y casserait le sens.
--
-- Hors périmètre de ce fichier (relecture indépendante du 13/10/2026,
-- R-y-relecture, point B ; constats faits sur une simulation de Y3 en
-- lecture seule), à traiter dans un lot éditorial séparé, relu à la main :
--   seo_city_pages.content       65 pages gardent « sans engagement »
--                                (« gratuites aujourd'hui, et ce, sans
--                                engagement », « sans frais et sans
--                                engagement », « se font sans engagement ») ;
--   seo_city_pages.content       30 pages disent une gratuité datée ou
--                                provisoire (« gratuit… aujourd'hui »,
--                                « offre de lancement », « phase de
--                                lancement ») ;
--   seo_city_pages.intro_text    7 introductions avec « sans engagement » ;
--   meta_description, h1_title,  9 pages avec « sans engagement » dans un
--   meta_title, excerpt          champ lu par les moteurs.
-- Ce fichier ne contient pas ces réécritures.
--
-- Sauvegarde (relecture, point C) : les lignes visées sont copiées dans
-- public._backup_y3_textes_20261013 avant toute réécriture. CREATE TABLE IF
-- NOT EXISTS … AS garde le fichier rejouable : une seconde exécution ne
-- réécrit pas la copie. RLS activée et droits retirés à PUBLIC, anon et
-- authenticated (les droits par défaut du schéma public ouvriraient sinon la
-- table en lecture et en écriture à anon).


-- ═══ 0. Sauvegarde des lignes visées ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public._backup_y3_textes_20261013 AS
SELECT 'articles'::text AS src, id::text AS row_id, content AS old_text, NULL::text AS old_text2 FROM public.articles
 WHERE id IN ('87ae0e1f-f8d3-4bc9-a575-cb6d345c799e','82e6449c-ec8f-4af1-93ee-37d5495cc72a')
UNION ALL SELECT 'faq_entries', id::text, answer, question FROM public.faq_entries
 WHERE id IN ('3322cc84-1b6b-4270-87e9-f1697694e9d3','751cf9e0-6a27-41bc-8b6d-b405e1ef8a57','d3808396-da82-45fb-b273-0fc28745e0d3','0d1e4ab0-5b28-4f16-b6de-c38c456cb514','f29103b1-a546-4d41-9f4e-526520d60285','aab6d381-624c-4be3-8897-7cb189650725','91f64d7e-79a3-492c-a9a4-c0fecb8ed589','438d3d27-388e-4669-b47a-da79340fd837','c3ab8ed2-846a-4bae-8d41-cbd9a3412441')
UNION ALL SELECT 'seo_department_pages', id::text, intro_text, NULL FROM public.seo_department_pages
 WHERE intro_text LIKE '%, à domicile et sans mise en pension,%' OR intro_text LIKE '%avec des gardiens recommandés par la communauté%'
UNION ALL SELECT 'seo_city_pages', id::text, content, intro_text FROM public.seo_city_pages
 WHERE content ~ 'gratuite?s? pour les propriétaires' OR intro_text ~ 'gratuite?s? pour les propriétaires'
    OR content LIKE '%sans frais pour les propriétaires%' OR intro_text LIKE '%sans frais pour les propriétaires%'
    OR content LIKE '% sans frais, sans engagement%';
ALTER TABLE public._backup_y3_textes_20261013 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._backup_y3_textes_20261013 FROM PUBLIC, anon, authenticated;


-- ═══ 1. Articles publiés ═══════════════════════════════════════════════════

-- P5-02 · garde-a-domicile-vs-pension : un abonnement annuel affirmé (faux).
UPDATE public.articles
SET content = replace(content,
  $y3$Vous ne payez que votre abonnement annuel à la plateforme, soit l'équivalent de deux nuits de pension pour un an de gardes.$y3$,
  $y3$Guardiens est gratuit : le gardien est logé, vos animaux restent chez eux, et l'échange se fait en temps et en services.$y3$)
WHERE id = '87ae0e1f-f8d3-4bc9-a575-cb6d345c799e'
  AND slug = 'garde-a-domicile-vs-pension'
  AND position($y3$Vous ne payez que votre abonnement annuel à la plateforme$y3$ in content) > 0;

-- P5-18 · garde-chien-lyon-solutions : « Contrairement aux plateformes payantes ».
UPDATE public.articles
SET content = replace(content,
  $y3$Contrairement aux plateformes payantes ou aux pensions coûteuses, **le service de garde sur Guardiens est sans frais**.$y3$,
  $y3$Sur Guardiens, la garde est un échange : le gardien est logé, vos animaux restent chez eux, et **Guardiens est gratuit**.$y3$)
WHERE id = '82e6449c-ec8f-4af1-93ee-37d5495cc72a'
  AND slug = 'garde-chien-lyon-solutions'
  AND position($y3$Contrairement aux plateformes payantes ou aux pensions coûteuses$y3$ in content) > 0;


-- ═══ 2. FAQ publiée (rendue en JSON-LD FAQPage par /faq) ═══════════════════

-- P5-04 · « Comment fonctionne Guardiens ? » : la rencontre n'est pas une étape.
UPDATE public.faq_entries
SET answer = replace(replace(replace(answer,
  $y3$Les gardiens de sa zone postulent. Il choisit, on se rencontre en vrai, et la garde démarre une fois que les deux parties sont à l'aise.$y3$,
  $y3$Les gardiens à proximité postulent. Il échange avec eux et choisit ; une rencontre se propose si vous le souhaitez, et la garde démarre une fois que les deux parties sont à l'aise.$y3$),
  $y3$**Ce qui fait la différence : la rencontre physique.** Avant chaque garde, on encourage un café, une balade avec le chien, un tour de la maison ensemble. La confiance ne se crée pas en ligne, elle se vit.$y3$,
  $y3$**Se voir, si vous le souhaitez.** Avant une garde, un café, une balade avec le chien ou un tour de la maison ensemble aident à faire connaissance. La rencontre reste facultative, la décision vous appartient.$y3$),
  $y3$C'est ce qu'on appelle les [petites missions](/petites-missions).$y3$,
  $y3$C'est ce qu'on appelle l'[entraide](/petites-missions).$y3$)
WHERE id = '3322cc84-1b6b-4270-87e9-f1697694e9d3'
  AND position($y3$Il choisit, on se rencontre en vrai$y3$ in answer) > 0;

-- P5-04 · « Les propriétaires paient-ils quelque chose ? » : gratuité pour tous,
-- sans « pour les propriétaires » ni « pas une promotion temporaire ».
UPDATE public.faq_entries
SET question = $y3$Combien coûte Guardiens ?$y3$,
    answer = $y3$Guardiens est gratuit, pour tous les membres.

Publier une annonce, recevoir et consulter les candidatures, échanger avec les gardiens, laisser un avis : tout est inclus. Aucune commission n'est prélevée sur les gardes.

L'entraide fonctionne de la même façon pour tous les membres, propriétaires comme gardiens : l'échange se fait en temps et en savoir-faire.$y3$
WHERE id = '751cf9e0-6a27-41bc-8b6d-b405e1ef8a57'
  AND question = $y3$Les propriétaires paient-ils quelque chose ?$y3$
  AND position($y3$pas une promotion temporaire$y3$ in answer) > 0;

-- P5-04 · « C'est quoi les petites missions ? » : seuil réel 40 %, identité non
-- exigée, plus d'abonnement ni de « Pas d'euros, jamais ».
UPDATE public.faq_entries
SET answer = replace(replace(replace(answer,
  $y3$Des échanges de services entre membres, sans argent, jamais.$y3$,
  $y3$Des échanges de services entre membres, en temps et en savoir-faire.$y3$),
  $y3$Pas d'euros, jamais. C'est une ligne non négociable. Pas par principe idéologique, mais parce que dès qu'il y a de l'argent, la relation change. Ce qu'on construit ici, c'est autre chose.$y3$,
  $y3$L'échange se fait en temps et en savoir-faire : c'est ce qui garde la relation simple entre gens du coin.$y3$),
  $y3$Les petites missions sont accessibles à tous les membres (gardiens comme propriétaires) dès que le profil est complété à 60% et l'identité vérifiée. Pas besoin d'abonnement.$y3$,
  $y3$Les coups de main sont ouverts à tous les membres, gardiens comme propriétaires, dont le profil atteint 40 %.$y3$)
WHERE id = 'd3808396-da82-45fb-b273-0fc28745e0d3'
  AND position($y3$complété à 60% et l'identité vérifiée$y3$ in answer) > 0;

-- P5-04 · « C'est quoi la différence entre Guardiens et un pet-sitter
-- classique ? » : aucune comparaison, ce que Guardiens apporte.
UPDATE public.faq_entries
SET question = $y3$Que vous apporte Guardiens ?$y3$,
    answer = replace(replace(replace(answer,
  $y3$Un pet-sitter se déplace chez vous une ou deux fois par jour pour nourrir vos animaux, les promener, et repartir. Entre les visites, ils sont seuls, et chaque passage est facturé.

Chez Guardiens, le gardien$y3$,
  $y3$Chez Guardiens, le gardien$y3$),
  $y3$Un animal qui dort dans son propre panier dort mieux qu'un animal en pension.$y3$,
  $y3$Un animal qui dort dans son propre panier garde ses repères.$y3$),
  $y3$Et si quelque chose se passe mal : quelqu'un est sur place. Pas un numéro à appeler.$y3$,
  $y3$Et si quelque chose se passe mal, quelqu'un est sur place.$y3$)
WHERE id = '0d1e4ab0-5b28-4f16-b6de-c38c456cb514'
  AND question = $y3$C'est quoi la différence entre Guardiens et un pet-sitter classique ?$y3$;

-- P2 P5-29 · « Peut-on se rencontrer avant de confirmer la garde ? » : possible,
-- jamais décisif ni obligatoire.
UPDATE public.faq_entries
SET answer = replace(replace(replace(replace(replace(answer,
  $y3$Oui, et on le recommande vivement.$y3$,
  $y3$Oui, si vous le souhaitez tous les deux.$y3$),
  $y3$C'est même l'un des principes fondateurs de Guardiens. La confiance ne se crée pas en ligne. Elle se crée autour d'un café,$y3$,
  $y3$La confiance se construit volontiers autour d'un café,$y3$),
  $y3$Cette rencontre n'a pas besoin d'être formelle.$y3$,
  $y3$Cette rencontre peut rester toute simple.$y3$),
  $y3$C'est systématiquement ce moment-là qui décide si la garde se fait ou non, pas le profil en ligne.$y3$,
  $y3$Beaucoup de propriétaires aiment se voir avant la garde ; c'est une possibilité, la décision reste la vôtre.$y3$),
  $y3$Aucune garde n'est confirmée sans que vous ayez choisi.$y3$,
  $y3$La garde est confirmée quand vous avez choisi.$y3$)
WHERE id = 'f29103b1-a546-4d41-9f4e-526520d60285'
  AND position($y3$Oui, et on le recommande vivement.$y3$ in answer) > 0;

-- P2 P5-29 · « Comment préparer ma maison… » : la rencontre, si on le souhaite.
UPDATE public.faq_entries
SET answer = replace(answer,
  $y3$**Ce qui compte le plus : la rencontre avant la garde.**$y3$,
  $y3$**Se voir avant la garde, si vous le souhaitez.**$y3$)
WHERE id = 'aab6d381-624c-4be3-8897-7cb189650725'
  AND position($y3$**Ce qui compte le plus : la rencontre avant la garde.**$y3$ in answer) > 0;

-- P2 P5-34 · « Est-ce que les gardiens sont payés ? » : sans frais de pension.
UPDATE public.faq_entries
SET answer = replace(replace(answer,
  $y3$Le propriétaire repart sans débourser de frais de pension.$y3$,
  $y3$Le propriétaire part l'esprit léger, ses animaux restent chez eux.$y3$),
  $y3$Pour les petites missions d'entraide, le principe est le même : jamais d'argent.$y3$,
  $y3$Pour les coups de main d'entraide, le principe est le même : l'échange se fait en temps et en savoir-faire.$y3$)
WHERE id = '91f64d7e-79a3-492c-a9a4-c0fecb8ed589'
  AND position($y3$sans débourser de frais de pension$y3$ in answer) > 0;

-- P2 P5-38 · « Comment savoir si un gardien est fiable ? » : tournures
-- négatives et rencontre présentée comme le filtre décisif.
UPDATE public.faq_entries
SET answer = replace(replace(answer,
  $y3$Ce n'est pas un titre décerné, c'est calculé automatiquement. Ça ne ment pas.$y3$,
  $y3$Le label se calcule automatiquement à partir de ces trois critères.$y3$),
  $y3$**La rencontre physique.** C'est le filtre le plus puissant. Un café ensemble, une balade avec le chien, vous sentez si le courant passe. On a gardé 37 maisons en 5 ans : aucune vérification en ligne ne remplace dix minutes en vrai.$y3$,
  $y3$**La rencontre, si vous le souhaitez.** Un café ensemble, une balade avec le chien : vous sentez si le courant passe. Nous l'avons vécu dans les 37 maisons que nous avons gardées en 5 ans.$y3$)
WHERE id = '438d3d27-388e-4669-b47a-da79340fd837'
  AND position($y3$Ça ne ment pas.$y3$ in answer) > 0;

-- P2 P5-41 · « Que se passe-t-il si je refuse une demande d'urgence ? » :
-- « dashboard » et tournure négative.
UPDATE public.faq_entries
SET answer = replace(replace(answer,
  $y3$Ce n'est pas une sanction arbitraire, c'est la contrepartie$y3$,
  $y3$C'est la contrepartie$y3$),
  $y3$depuis votre dashboard$y3$,
  $y3$depuis votre tableau de bord$y3$)
WHERE id = 'c3ab8ed2-846a-4bae-8d41-cbd9a3412441'
  AND position($y3$depuis votre dashboard$y3$ in answer) > 0;


-- ═══ 3. Introductions des pages département (P5-16, P5-46) ═════════════════
-- 101 introductions sur 103 : « à domicile et sans mise en pension »
-- (comparaison) et « gardiens recommandés par la communauté » (aucune
-- fonction de recommandation n'existe ; les avis, eux, sont publics).

UPDATE public.seo_department_pages
SET intro_text = replace(intro_text, $y3$, à domicile et sans mise en pension,$y3$, $y3$, chez vous,$y3$)
WHERE intro_text LIKE $y3$%, à domicile et sans mise en pension,%$y3$;

UPDATE public.seo_department_pages
SET intro_text = replace(intro_text, $y3$avec des gardiens recommandés par la communauté$y3$, $y3$avec des gardiens dont les avis sont publics$y3$)
WHERE intro_text LIKE $y3$%avec des gardiens recommandés par la communauté%$y3$;


-- ═══ 4. Pages ville (P5-07) ═════════════════════════════════════════════════
-- « gratuit(e)(s) pour les propriétaires » (83 pages) et « sans frais pour les
-- propriétaires » (43 pages) laissent entendre un accès gardien payant : la
-- gratuité vaut pour tous les membres (accord de l'adjectif conservé).
-- « postuler sans frais, sans engagement » (67 pages) : vocabulaire
-- d'abonnement, remplacé par « postuler librement ».

UPDATE public.seo_city_pages
SET content = regexp_replace(content, 'gratuit(e?)(s?) pour les propriétaires', 'gratuit\1\2 pour tous les membres', 'g')
WHERE content ~ 'gratuite?s? pour les propriétaires';

UPDATE public.seo_city_pages
SET intro_text = regexp_replace(intro_text, 'gratuit(e?)(s?) pour les propriétaires', 'gratuit\1\2 pour tous les membres', 'g')
WHERE intro_text ~ 'gratuite?s? pour les propriétaires';

UPDATE public.seo_city_pages
SET content = replace(content, $y3$sans frais pour les propriétaires$y3$, $y3$sans frais pour tous les membres$y3$)
WHERE content LIKE $y3$%sans frais pour les propriétaires%$y3$;

UPDATE public.seo_city_pages
SET intro_text = replace(intro_text, $y3$sans frais pour les propriétaires$y3$, $y3$sans frais pour tous les membres$y3$)
WHERE intro_text LIKE $y3$%sans frais pour les propriétaires%$y3$;

UPDATE public.seo_city_pages
SET content = replace(content, $y3$ sans frais, sans engagement$y3$, $y3$ librement$y3$)
WHERE content LIKE $y3$% sans frais, sans engagement%$y3$;
