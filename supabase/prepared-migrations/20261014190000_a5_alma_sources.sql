-- Lot A5 (14/10/2026) : sources d'Alma conformes à la doctrine.
-- Audit d'Alma en arène du 14/10/2026 (final.md, lot 5) ; textes relus en
-- production le 14/10/2026 (lecture seule) avant écriture de ce fichier.
--
-- Doctrine : la rencontre est proposée si les deux le souhaitent, jamais
-- recommandée, indispensable ni obligatoire ; le réseau des gardiens
-- d'urgence est présenté comme à venir.
--
-- search_alma_knowledge sert à Alma les articles publiés : 6 articles
-- présentaient la rencontre comme recommandée ou indispensable (requête
-- content ~* 'rencontre[^.]{0,80}(essentiel|recommand|indispensable|étape|obligatoire)',
-- 6 lignes le 14/10/2026), et Alma relayait ces phrases. La recette lue dans
-- les deux sens (« recommande une rencontre ») en trouve 3 de plus : 9
-- articles corrigés, 20 phrases.
--
-- Chaque instruction est ciblée (identifiant et slug) et gardée par l'ancien
-- texte : elle ne touche rien qui aurait changé depuis la relecture, et une
-- seconde exécution ne modifie plus aucune ligne (rejouable). Seule la phrase
-- fautive est remplacée (replace()).
--
-- Vérifié en lecture seule le 14/10/2026, déjà conforme, rien à écrire ici :
--   alma_public_tips (vue sur alma_cultural_facts actifs) : 0 « pension »,
--   0 « Halet » ; faits 4e627110 et d51ed6b9 inactifs, 480c7858 et 183d14ea
--   en « Halètement », d67e9c36, 49d45e62, 9fd31991, 374a39df réécrits (lot A1,
--   20261014170000_a1_alma_dit_vrai.sql, appliqué).
-- Les extraits d'articles qui comparent avec la pension (famille comparative)
-- restent un sujet éditorial ; alma-chat les écarte de ses sources
-- (doctrineSources, supabase/functions/_shared/alma-truth.ts).
--
-- Recette après application (attendu : 0) :
--   select count(*) from public.articles
--   where published and (
--     content ~* 'rencontre[^.\n]{0,80}(recommand|indispensable|obligatoire)'
--     or content ~* '(recommand|indispensable|obligatoire)[^.\n]{0,80}rencontr'
--     or content ~* 'rencontrez (les candidats|2-3)');

-- ---------------------------------------------------------------------------
-- 1. choisir-gardien-bons-criteres
-- ---------------------------------------------------------------------------
UPDATE public.articles
SET content = replace(content,
  $a5$## Ce qui compte : la rencontre

Après avoir présélectionné 2-3 profils, rencontrez les candidats en personne. Observez comment ils interagissent avec vos animaux, pas ce qu'ils disent, ce qu'ils font.$a5$,
  $a5$## Faire connaissance avant le départ

Après avoir présélectionné 2 ou 3 profils, échangez avec chacun par la messagerie, puis proposez une rencontre si vous le souhaitez tous les deux. Quand elle a lieu, regardez comment la personne s'y prend avec vos animaux : les gestes en disent long.$a5$)
WHERE id = '32a5c3d1-d4a8-40d1-ac2b-657f4bcb3ab2'
  AND slug = 'choisir-gardien-bons-criteres'
  AND position($a5$rencontrez les candidats en personne. Observez comment ils interagissent$a5$ in content) > 0;

UPDATE public.articles
SET content = replace(content,
  $a5$| La rencontre avant votre départ | Le nombre de photos du profil |$a5$,
  $a5$| L'échange avant votre départ, et la rencontre si vous le souhaitez tous les deux | Le nombre de photos du profil |$a5$)
WHERE id = '32a5c3d1-d4a8-40d1-ac2b-657f4bcb3ab2'
  AND slug = 'choisir-gardien-bons-criteres'
  AND position($a5$| La rencontre avant votre départ | Le nombre de photos du profil |$a5$ in content) > 0;

UPDATE public.articles
SET content = replace(content,
  $a5$Oui, c'est indispensable. Rencontrez 2-3 candidats en personne et observez comment ils interagissent avec vos animaux. Un gardien que vos animaux ont validé avant votre départ n'est plus un inconnu.$a5$,
  $a5$Si vous le souhaitez tous les deux, oui : une rencontre avant la garde aide à faire connaissance, et vos animaux découvrent la personne en votre présence. Vous pouvez aussi vous décider après la messagerie ou un appel vidéo.$a5$)
WHERE id = '32a5c3d1-d4a8-40d1-ac2b-657f4bcb3ab2'
  AND slug = 'choisir-gardien-bons-criteres'
  AND position($a5$Oui, c'est indispensable. Rencontrez 2-3 candidats en personne$a5$ in content) > 0;

UPDATE public.articles
SET content = replace(content,
  $a5$### Combien de candidats faut-il rencontrer avant de choisir ?

Présélectionnez 2 à 3 profils sur la base des avis et des écussons, puis rencontrez-les. Inutile d'en voir plus, au-delà de 3, vous comparez des détails superficiels plutôt que l'essentiel.$a5$,
  $a5$### Combien de candidats présélectionner avant de choisir ?

Présélectionnez 2 ou 3 profils sur la base des avis et des écussons, puis échangez avec eux, et rencontrez-les si vous le souhaitez tous les deux. Trois profils suffisent : au-delà, la comparaison porte sur des détails plutôt que sur l'essentiel.$a5$)
WHERE id = '32a5c3d1-d4a8-40d1-ac2b-657f4bcb3ab2'
  AND slug = 'choisir-gardien-bons-criteres'
  AND position($a5$puis rencontrez-les. Inutile d'en voir plus$a5$ in content) > 0;

-- ---------------------------------------------------------------------------
-- 2. devenir-gardien-guide-complet
-- ---------------------------------------------------------------------------
UPDATE public.articles
SET content = replace(content,
  $a5$**Proposez une rencontre**

Guardiens recommande une rencontre physique avant chaque garde. Proposez-la dans votre message. C'est un signal fort de sérieux.$a5$,
  $a5$**Proposez une rencontre, si vous le souhaitez tous les deux**

Une rencontre avant la garde se fait si vous le souhaitez tous les deux. Vous pouvez la proposer dans votre message, le propriétaire choisit.$a5$)
WHERE id = 'f6c93f52-8254-45cb-b112-e9d877aec504'
  AND slug = 'devenir-gardien-guide-complet'
  AND position($a5$Guardiens recommande une rencontre physique avant chaque garde. Proposez-la dans votre message.$a5$ in content) > 0;

UPDATE public.articles
SET content = replace(content,
  $a5$Rencontrez le propriétaire. Visitez la maison. Notez tout : $a5$,
  $a5$Si vous le souhaitez tous les deux, rencontrez le propriétaire et visitez la maison. Notez tout : $a5$)
WHERE id = 'f6c93f52-8254-45cb-b112-e9d877aec504'
  AND slug = 'devenir-gardien-guide-complet'
  AND position($a5$Rencontrez le propriétaire. Visitez la maison. Notez tout : $a5$ in content) > 0;

-- ---------------------------------------------------------------------------
-- 3. garde-chien-lyon-solutions
-- ---------------------------------------------------------------------------
UPDATE public.articles
SET content = replace(content,
  $a5$- **Rencontre préalable** : indispensable. Une promenade test ou un café à la maison permet à votre chien de valider la personne.$a5$,
  $a5$- **Rencontre préalable** : si vous le souhaitez tous les deux, une promenade test ou un café à la maison permet à votre chien de faire connaissance avec la personne.$a5$)
WHERE id = '82e6449c-ec8f-4af1-93ee-37d5495cc72a'
  AND slug = 'garde-chien-lyon-solutions'
  AND position($a5$- **Rencontre préalable** : indispensable.$a5$ in content) > 0;

-- ---------------------------------------------------------------------------
-- 4. labrador-retriever-guide-race
-- ---------------------------------------------------------------------------
UPDATE public.articles
SET content = replace(content,
  $a5$- Rencontre physique avant la garde recommandée, le Labrador doit vous avoir "validé" en présence du propriétaire$a5$,
  $a5$- Rencontre avant la garde si vous le souhaitez tous les deux : le Labrador fait connaissance avec vous en présence du propriétaire$a5$)
WHERE id = 'e27e5a15-8e68-4d0d-85dc-9bc73543d393'
  AND slug = 'labrador-retriever-guide-race'
  AND position($a5$- Rencontre physique avant la garde recommandée, le Labrador$a5$ in content) > 0;

-- ---------------------------------------------------------------------------
-- 5. proprietaire-preparer-garde-maison
-- ---------------------------------------------------------------------------
UPDATE public.articles
SET content = replace(content,
  $a5$Guardiens recommande une rencontre physique avant chaque garde. Un café, une balade, une visite de la maison. Pas optionnel, recommandé fortement.$a5$,
  $a5$Une rencontre avant la garde se fait si vous le souhaitez tous les deux : un café, une balade, une visite de la maison.$a5$)
WHERE id = 'b57f3a0e-a94c-4105-86d5-dfdcde75c6ed'
  AND slug = 'proprietaire-preparer-garde-maison'
  AND position($a5$Pas optionnel, recommandé fortement.$a5$ in content) > 0;

UPDATE public.articles
SET content = replace(content,
  $a5$Pourquoi : votre gardien a besoin de voir la maison pour comprendre les contraintes. Vos animaux ont besoin de valider la personne en votre présence. Et vous avez besoin de sentir que vous faites confiance à quelqu'un, pas juste à un profil en ligne.$a5$,
  $a5$Quand elle a lieu, votre gardien voit la maison et ses contraintes, vos animaux font connaissance avec la personne en votre présence, et votre confiance s'appuie sur un visage en plus du profil.$a5$)
WHERE id = 'b57f3a0e-a94c-4105-86d5-dfdcde75c6ed'
  AND slug = 'proprietaire-preparer-garde-maison'
  AND position($a5$Pourquoi : votre gardien a besoin de voir la maison pour comprendre les contraintes.$a5$ in content) > 0;

-- ---------------------------------------------------------------------------
-- 6. securite-confiance-house-sitting
-- ---------------------------------------------------------------------------
UPDATE public.articles
SET content = replace(content,
  $a5$| Rencontre physique | Un café ou une balade avant la garde, recommandé sans être obligatoire | Une certitude plutôt qu'une hypothèse |$a5$,
  $a5$| Rencontre physique | Un café ou une balade avant la garde, si vous le souhaitez tous les deux | Une première impression en personne |$a5$)
WHERE id = 'a6982d18-ae4b-4527-825a-beb78ba0914c'
  AND slug = 'securite-confiance-house-sitting'
  AND position($a5$recommandé sans être obligatoire$a5$ in content) > 0;

-- Même tableau : le réseau d'urgence est à venir (doctrine Y3, lot C1).
UPDATE public.articles
SET content = replace(content,
  $a5$| Réseau de Gardiens d'Urgence | Alerte déclenchée depuis l'application, gardiens disponibles sous 15 minutes | Une solution de repli en cours de garde |$a5$,
  $a5$| Réseau de Gardiens d'Urgence | À venir, la page Gardien d'urgence présente le projet | Une solution de repli en cours de garde, à son lancement |$a5$)
WHERE id = 'a6982d18-ae4b-4527-825a-beb78ba0914c'
  AND slug = 'securite-confiance-house-sitting'
  AND position($a5$gardiens disponibles sous 15 minutes$a5$ in content) > 0;

UPDATE public.articles
SET content = replace(content,
  $a5$Guardiens recommande une rencontre physique avant chaque garde. Ce n'est pas obligatoire, c'est fortement conseillé.$a5$,
  $a5$Une rencontre physique avant la garde se fait si vous le souhaitez tous les deux. Vous pouvez aussi vous décider après la messagerie ou un appel vidéo.$a5$)
WHERE id = 'a6982d18-ae4b-4527-825a-beb78ba0914c'
  AND slug = 'securite-confiance-house-sitting'
  AND position($a5$Ce n'est pas obligatoire, c'est fortement conseillé.$a5$ in content) > 0;

UPDATE public.articles
SET content = replace(content,
  $a5$Pourquoi : la confiance ne se construit pas en ligne. Elle se construit en face à face, lors d'un café ou d'une balade. Vous voyez comment le gardien interagit avec votre animal. Votre animal valide la personne en votre présence. Vous partez avec une certitude, pas une hypothèse.$a5$,
  $a5$Quand elle a lieu, lors d'un café ou d'une balade, vous voyez comment le gardien s'y prend avec votre animal, et votre animal fait connaissance avec la personne en votre présence.$a5$)
WHERE id = 'a6982d18-ae4b-4527-825a-beb78ba0914c'
  AND slug = 'securite-confiance-house-sitting'
  AND position($a5$Pourquoi : la confiance ne se construit pas en ligne.$a5$ in content) > 0;

UPDATE public.articles
SET content = replace(content,
  $a5$Demandez une visio préalable à la rencontre physique et n'hésitez pas à proposer une garde courte d'essai$a5$,
  $a5$Proposez un appel vidéo, puis une rencontre si vous le souhaitez tous les deux, et n'hésitez pas à proposer une garde courte d'essai$a5$)
WHERE id = 'a6982d18-ae4b-4527-825a-beb78ba0914c'
  AND slug = 'securite-confiance-house-sitting'
  AND position($a5$Demandez une visio préalable à la rencontre physique$a5$ in content) > 0;

UPDATE public.articles
SET content = replace(content,
  $a5$**Une rencontre physique avant la garde est-elle indispensable ?**

Elle est facultative : beaucoup de propriétaires la proposent, d'autres se décident après la messagerie ou un appel vidéo. La rencontre permet d'évaluer la compatibilité avec votre animal, de transmettre les consignes en personne et de visiter le logement ensemble. Elle constitue le pivot de la confiance et réduit considérablement les risques de mauvaise surprise.$a5$,
  $a5$**Faut-il se rencontrer avant la garde ?**

Si vous le souhaitez tous les deux : certains se rencontrent, d'autres se décident après la messagerie ou un appel vidéo. Quand elle a lieu, la rencontre permet d'évaluer la compatibilité avec votre animal, de transmettre les consignes en personne et de visiter le logement ensemble.$a5$)
WHERE id = 'a6982d18-ae4b-4527-825a-beb78ba0914c'
  AND slug = 'securite-confiance-house-sitting'
  AND position($a5$**Une rencontre physique avant la garde est-elle indispensable ?**$a5$ in content) > 0;

-- ---------------------------------------------------------------------------
-- 7 à 9. Trois articles de plus trouvés par la recette dans l'autre sens
-- (« Guardiens recommande une rencontre », « nous recommandons fortement la
-- rencontre »), relus le 14/10/2026.
-- ---------------------------------------------------------------------------
UPDATE public.articles
SET content = replace(content,
  $a5$- **Quelqu'un que vous avez rencontré avant de partir.** Guardiens recommande une rencontre physique avant chaque garde. Un café en Vieille-Ville, une balade au lac. Vous partez en connaissant la personne, pas juste son profil.$a5$,
  $a5$- **Quelqu'un que vous connaissez avant de partir.** Par la messagerie, et par une rencontre si vous le souhaitez tous les deux : un café en Vieille-Ville, une balade au lac. Vous partez en connaissant la personne, en plus de son profil.$a5$)
WHERE id = '32216cbc-2167-4d1f-b854-f67a7f9665cd'
  AND slug = 'house-sitting-annecy'
  AND position($a5$Guardiens recommande une rencontre physique avant chaque garde. Un café en Vieille-Ville$a5$ in content) > 0;

UPDATE public.articles
SET content = replace(content,
  $a5$Guardiens recommande une première rencontre de 30 minutes avant la garde pour amorcer la familiarisation dans un contexte calme.$a5$,
  $a5$Si vous le souhaitez tous les deux, une première rencontre de 30 minutes avant la garde amorce la familiarisation dans un contexte calme.$a5$)
WHERE id = 'df402e8f-eb39-41be-b0af-f67a3b623fa0'
  AND slug = 'garde-chat-domicile-lyon'
  AND position($a5$Guardiens recommande une première rencontre de 30 minutes$a5$ in content) > 0;

UPDATE public.articles
SET content = replace(content,
  $a5$La remise se fait en main propre lors d'une rencontre préalable.$a5$,
  $a5$La remise se fait en main propre lors d'une rencontre si vous le souhaitez tous les deux, ou selon le moyen convenu dans la messagerie.$a5$)
WHERE id = '4b0e630d-5f5b-45a4-9291-9ec1ffb482c3'
  AND slug = 'comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers'
  AND position($a5$La remise se fait en main propre lors d'une rencontre préalable.$a5$ in content) > 0;

UPDATE public.articles
SET content = replace(content,
  $a5$En cas d'impossibilité géographique avérée (gardien éloigné, déplacement de dernière minute), une visio approfondie est tolérée. Elle ne remplace toutefois pas la visite du logement et la mise en présence avec l'animal. Pour les premières gardes, nous recommandons fortement la rencontre physique : la confiance se construit en face à face.$a5$,
  $a5$Oui, si cela vous convient à tous les deux : la rencontre reste facultative, en visio comme en personne. Une rencontre physique, quand vous la souhaitez tous les deux, permet en plus de visiter le logement et de présenter l'animal.$a5$)
WHERE id = '4b0e630d-5f5b-45a4-9291-9ec1ffb482c3'
  AND slug = 'comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers'
  AND position($a5$nous recommandons fortement la rencontre physique$a5$ in content) > 0;

-- ---------------------------------------------------------------------------
-- Contrôle : aucune des sources ne présente plus la rencontre comme
-- recommandée, indispensable ou obligatoire (avertissement, sans échec).
-- ---------------------------------------------------------------------------
DO $a5$
DECLARE
  v_left int;
BEGIN
  SELECT count(*) INTO v_left
  FROM public.articles
  WHERE published
    AND (content ~* 'rencontre[^.\n]{0,80}(recommand|indispensable|obligatoire)'
      OR content ~* '(recommand|indispensable|obligatoire)[^.\n]{0,80}rencontr'
      OR content ~* 'rencontrez (les candidats|2-3)');
  IF v_left > 0 THEN
    RAISE WARNING 'Lot A5 : % article(s) publié(s) présentent encore la rencontre comme recommandée ou obligatoire', v_left;
  END IF;
END
$a5$;
