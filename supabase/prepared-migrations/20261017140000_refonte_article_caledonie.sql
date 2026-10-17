-- Refonte ciblée autorisée par Jérémie le 17/10/2026 : guide et un lien entrant.
-- Auteur, couverture, URL, date de publication et indexabilité conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_caledonie_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_caledonie_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_caledonie_20261017 TO service_role;
ALTER TABLE public._backup_articles_caledonie_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('e2e9d23b-17a2-4810-9001-adcf5c5db60f'::uuid,'4f0c9ffe-1ed1-4612-8f81-f7986aac1272'::uuid) ORDER BY id FOR UPDATE;

DO $caledonie$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $caledonie_content_20261017$# Garde de maison en Nouvelle-Calédonie : solutions, prix et préparation

Vous partez quelques jours ou plusieurs semaines et il reste une question à régler : qui va s’occuper de la maison et des animaux ? À Nouméa comme ailleurs en Nouvelle-Calédonie, le bon point de départ est votre quotidien : les repas, les sorties, les déplacements et le temps de présence dont vous avez besoin.

Le **house-sitting**, ou garde de maison par échange, consiste à accueillir un gardien chez vous pendant votre absence. Il est hébergé et s’occupe des animaux et des tâches que vous avez convenues, sans rémunération. Sur Guardiens, vous publiez une annonce, échangez avec les personnes intéressées et choisissez à qui confier vos clés. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.**

**Dans ce guide**

- [Quelle solution choisir pour la maison et les animaux ?](#solutions)
- [Quel budget prévoir en francs CFP ?](#prix)
- [Comment trouver et choisir un gardien ?](#gardien)
- [Que préciser selon le lieu du logement ?](#lieu)
- [Comment organiser le départ et le retour ?](#organisation)
- [Météo et imprévus : quelles consignes laisser ?](#imprevus)
- [Les réponses à vos questions pratiques](#questions)

## <a id="solutions"></a>Garde de maison, visites ou pension : quelle solution choisir ?

Commencez par ce qui doit se passer pendant votre absence. Un chat à nourrir, un chien qui supporte mal de rester seul et une maison sans animaux ne demandent pas la même organisation.

| Solution | Ce qui est prévu | Ce qu’il faut confirmer |
| --- | --- | --- |
| Un proche | Des passages ou un séjour chez vous, selon ses possibilités. | Ses disponibilités sur toutes les dates, les trajets et un relais éventuel. |
| Des visites à domicile | Des passages pour les animaux ou certaines tâches. | Leur fréquence, leur durée et les besoins à couvrir entre les visites. |
| Une pension ou une famille d’accueil | Les animaux sont hébergés ailleurs. | Les conditions d’accueil, les soins acceptés, le transport et le devis. |
| Un gardien hébergé dans votre maison | Il séjourne sur place et suit les consignes convenues. | Ses absences en journée, les tâches, les déplacements et l’usage du logement. |

**Un gardien qui dort chez vous n’est pas nécessairement présent toute la journée.** Expliquez le rythme des animaux et demandez comment la personne compte organiser ses journées. Pour un animal âgé, malade ou qui a des besoins particuliers, préparez les consignes avec son vétérinaire.

Si vous souhaitez comprendre l’échange avant de vous lancer, notre [guide du house-sitting](/actualites/c-est-quoi-le-house-sitting) détaille son fonctionnement. La suite de cet article concerne la préparation d’une garde en Nouvelle-Calédonie.

## <a id="prix"></a>Combien coûte la garde de maison et d’animaux en Nouvelle-Calédonie ?

Les devis se comparent en **francs CFP**, avec une unité clairement indiquée : visite, journée, nuitée ou forfait. Demandez le total pour vos dates et tous vos animaux, ainsi que les conditions d’annulation et les éventuels suppléments.

### Des repères de pension publiés par un professionnel local

Le **Gîte animalier du Caillou, à La Tamoa, Païta**, publie les tarifs suivants pour un seul animal, nourriture comprise. Ils ont été consultés le **17 octobre 2026**.

| Animal et durée du séjour | Tarif affiché par nuit |
| --- | --- |
| Un chien, de 1 à 8 jours | 2 500 F CFP |
| Un chien, de 9 à 30 jours | 2 300 F CFP |
| Un chat, de 1 à 15 jours | 1 500 F CFP |

À titre indicatif, sept nuitées pour un chien à 2 500 F CFP représentent **17 500 F CFP**. Faites confirmer le palier applicable, le nombre de nuitées et les conditions directement sur la [page des tarifs du Gîte animalier du Caillou](https://giteanimalierducaillou.nc/tarifs/). Cet exemple décrit un établissement ; il ne constitue pas une moyenne des prix du territoire ni une garantie de place.

Pour des visites chez vous, demandez un devis au prestataire couvrant votre secteur. Une consultation vétérinaire à domicile correspond à un acte de santé et ne donne pas le prix d’une visite de garde.

### Quelles dépenses restent à prévoir avec Guardiens ?

Sur Guardiens, l’accueil du gardien et les tâches convenues reposent sur un échange, sans rémunération. L’accès à la plateforme est actuellement gratuit. Il reste à convenir des dépenses pratiques :

- nourriture, litière et produits nécessaires aux animaux ;
- voyage et transport jusqu’au logement ;
- courses personnelles, carburant et éventuel usage d’une voiture ;
- dépenses vétérinaires ou interventions à autoriser pendant votre absence.

Précisez qui paie quoi et comment rembourser une avance. Un billet d’avion ou un véhicule ne sont pas automatiquement inclus dans l’accueil d’un gardien.

## <a id="gardien"></a>Comment trouver un gardien de maison en Nouvelle-Calédonie ?

Vous pouvez commencer par votre entourage et les réseaux locaux d’entraide, puis présenter votre besoin sur une plateforme. Sur Guardiens, une annonce datée, avec des photos et des consignes compréhensibles, permet aux personnes intéressées de se projeter.

La [page house-sitting à Nouméa](/house-sitting/noumea) présente le réseau local. **Un profil inscrit n’est pas une personne disponible à vos dates.** Le réseau se construit progressivement et publier une annonce ne garantit pas une candidature.

### Une personne déjà sur le territoire ou venant de l’extérieur ?

Une personne sur place peut plus facilement discuter des trajets et de l’accès au logement. Vous pouvez proposer une rencontre si vous le souhaitez tous les deux.

Si le gardien vient de l’extérieur, vérifiez ensemble son arrivée, ses correspondances et le transport jusqu’à chez vous. Convenez de la marche à suivre en cas de retard avant de caler la transmission des clés. Le séjour de garde doit correspondre à ses dates de présence réelles, pas seulement aux dates inscrites sur votre annonce.

### Comment faire connaissance avant de choisir ?

Les avis et les expériences décrites donnent des éléments de discussion. Une vérification d’identité renseigne sur l’identité de la personne ; elle ne garantit pas la qualité d’une garde.

Posez des questions liées à votre maison :

- A-t-elle déjà vécu avec des animaux ayant des besoins semblables ?
- Combien de temps prévoit-elle de s’absenter dans la journée ?
- Peut-elle assurer les déplacements utiles depuis votre logement ?
- Quelles tâches accepte-t-elle, et lesquelles ne sait-elle pas faire ?
- Comment réagirait-elle à un problème d’accès ou à un animal malade ?

Un appel vidéo permet de montrer les lieux et d’échanger sur ces points. Gardez le temps nécessaire pour décider. Notre guide pour [choisir un gardien](/actualites/choisir-gardien-bons-criteres) aide à préparer la discussion.

## <a id="lieu"></a>Nouméa, Grand Nouméa ou Brousse : que préciser dans l’annonce ?

« Une maison en Nouvelle-Calédonie » ne suffit pas pour comprendre le séjour. Indiquez la commune, le quartier ou le secteur, puis décrivez les accès utiles sans publier les codes ni les informations sensibles du logement.

Pour un logement à Nouméa, à Dumbéa, à Païta ou au Mont-Dore, expliquez comment rejoindre les commerces et les lieux de promenade depuis votre adresse. Ailleurs sur la Grande Terre, précisez aussi le trajet vers le vétérinaire, les particularités de l’accès et les moyens de communication disponibles chez vous. Pour une maison sur une île, clarifiez le trajet jusqu’à cette île et l’arrivée au logement.

Ces informations dépendent de votre maison : évitez de supposer qu’une personne connaît le secteur parce qu’elle connaît déjà le Caillou.

### Faut-il une voiture ?

Si les déplacements du quotidien demandent un véhicule, dites-le dès l’annonce. Si vous envisagez de prêter le vôtre, confirmez avec l’assureur les conditions de conduite et de couverture, puis convenez des frais et des usages autorisés.

### Que raconter de la vie dans la maison ?

Présentez l’hébergement, les animaux et les tâches avec leur fréquence. Pour un jardin, une piscine, un terrain ou du matériel particulier, décrivez ce que vous attendez et le temps que cela représente. Si vous accueillez une personne qui télétravaille, donnez des informations concrètes sur la connexion et l’espace disponible.

**Exemple fictif :** « Nous cherchons une personne pour trois semaines dans notre maison à Païta. Deux chats restent sur place. Il faut les nourrir matin et soir, entretenir leur litière et arroser quelques plantes. Une voiture est nécessaire pour les courses ; son organisation sera à discuter. Une chambre et une connexion internet sont disponibles. »

Le guide pour [rédiger une annonce de garde](/actualites/rediger-bonne-annonce-house-sitting) vous aide à rassembler les informations sans transformer votre annonce en inventaire interminable.

## <a id="organisation"></a>Comment organiser le départ, les clés et le retour ?

Quand vous partez loin, tout ne pourra pas attendre votre retour. Notez les décisions prises ensemble et prévoyez un contact local qui a accepté d’intervenir si nécessaire.

1. **Avant de confirmer**, accordez-vous sur les dates, les personnes accueillies, la présence attendue, les tâches et les dépenses. Posez aussi les limites d’usage du logement : pièces privées, visiteurs, équipements et véhicule.
2. **Avant votre départ**, organisez l’accueil et la remise des clés. Si vous êtes déjà absent, identifiez la personne qui fera la transmission et confirmez ses disponibilités.
3. **Pendant la garde**, choisissez un canal et un rythme pour les nouvelles. Si vous êtes en métropole, tenez compte du décalage horaire et précisez comment distinguer une nouvelle ordinaire d’une urgence.
4. **Pour votre retour**, convenez de l’horaire de fin de garde et du devenir des clés. Si un retard est possible, prévoyez un relais accepté ; une prolongation dépend de l’accord du gardien.

Notre [checklist pour préparer la maison](/actualites/preparer-maison-avant-garde) complète cette organisation. Gardez les codes d’accès et les coordonnées privées dans les consignes partagées avec la personne retenue, plutôt que dans l’annonce publique.

## <a id="imprevus"></a>Quelles consignes laisser pour la météo et les imprévus ?

Préparez une fiche courte que le gardien pourra retrouver facilement, même s’il ne peut pas vous joindre immédiatement.

- **Pour les animaux :** repas, sorties, comportements à connaître, traitements prescrits et coordonnées du vétérinaire habituel. Faites confirmer le recours possible en dehors des horaires d’ouverture et les moyens de transport jusqu’à lui.
- **Pour les dépenses :** qui peut autoriser une intervention, comment la régler et qui contacter en votre absence.
- **Pour le logement :** accès, coupures d’eau et d’électricité, matériel utile, contact local et particularités du terrain.

### En période cyclonique, préparer avant le départ

La Sécurité civile situe la saison cyclonique de novembre à avril. Montrez les abris prévus, le matériel accessible et ce qui peut être mis en sécurité sans danger. Ses consignes demandent notamment d’abriter les animaux domestiques en alerte 1 et de rester confiné en alerte 2.

Le gardien doit suivre les [consignes cycloniques de la Sécurité civile](https://securite-civile.gouv.nc/prevention-des-risques/risques-naturels/cyclones) et la [vigilance de Météo-France Nouvelle-Calédonie](https://meteo.nc/fr/vigilance) en vigueur au moment du séjour. Prévoyez les décisions à prendre si le logement ne permet pas de rester en sécurité. Une tâche d’entretien ne justifie jamais de se mettre en danger.

Pour les précautions sanitaires propres à vos animaux et à votre terrain, demandez au vétérinaire les instructions adaptées, puis transmettez-les. Le gardien n’a pas à établir un diagnostic ni à modifier un traitement.

## <a id="questions"></a>Vos questions sur la garde de maison en Nouvelle-Calédonie

### Peut-on faire garder une maison sans animaux ?

Oui, si l’échange convient aux deux personnes. Décrivez ce qui demande de l’attention : plantes, jardin, courrier ou tâches simples, avec leur fréquence. Le guide de la [garde de maison sans animaux](/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal) donne des exemples à adapter à votre logement.

### Un couple ou une famille peut-il venir garder la maison ?

Discutez-en avant de confirmer : nombre de personnes, couchages, habitudes du foyer et compatibilité avec les animaux. Si un candidat souhaite venir avec son propre animal, les conditions d’accueil et les éventuelles formalités de voyage doivent également être vérifiées avant tout engagement.

### Que faire si personne ne répond à mon annonce ?

Vérifiez que les dates, l’hébergement, les accès et les tâches sont compréhensibles. Indiquez votre éventuelle souplesse sur les dates et présentez votre besoin à votre entourage. Gardez une autre solution avec un proche ou un professionnel disponible : aucune candidature ni aucun remplacement ne sont garantis par la plateforme.

### Quelle assurance vérifier pour une garde en Nouvelle-Calédonie ?

Décrivez l’échange à votre assureur habitation et demandez quelles garanties s’appliquent à votre contrat et à votre logement en Nouvelle-Calédonie. Le gardien confirme de son côté sa couverture pour le séjour. Pour un véhicule prêté ou un logement loué, vérifiez aussi les conditions particulières avant de donner votre accord.

### Et si le gardien annule ou doit partir avant mon retour ?

Contactez le relais prévu et confirmez ce qu’il peut effectivement prendre en charge. S’il faut changer de personne, organisez la transmission des clés, des consignes et des dépenses. Une solution de secours doit avoir été acceptée par quelqu’un ; elle ne peut pas reposer sur la seule présence d’une fonctionnalité sur un site.

### Guardiens est-il gratuit en Nouvelle-Calédonie ?

**Oui, la plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Notre priorité est de construire un réseau de confiance et d’améliorer le service avec vos retours. Une participation aux frais de fonctionnement pourra être envisagée au plus tôt au second semestre 2027, avec un préavis d’au moins 30 jours. Les engagements à jour sont sur la page [tarifs](/tarifs).

Avec Elisa, nous avons créé Guardiens après cinq ans de garde de maisons et d’animaux. Une annonce précise et des échanges simples sont un bon début pour faire connaissance. Si vous essayez le service, [dites-nous ce qui vous a aidé et ce qui manque](/contact) : c’est aussi comme cela que le réseau se construit sur le Caillou.

## Sources vérifiées

- [Gîte animalier du Caillou : tarifs de pension à Païta](https://giteanimalierducaillou.nc/tarifs/), consultés le 17 octobre 2026. Prix d’un établissement, conditions et disponibilité à confirmer directement.
- [Sécurité civile de la Nouvelle-Calédonie : cyclones et consignes](https://securite-civile.gouv.nc/prevention-des-risques/risques-naturels/cyclones), consultées le 17 octobre 2026. Les consignes en vigueur priment pendant le séjour.
- [Météo-France Nouvelle-Calédonie : vigilance](https://meteo.nc/fr/vigilance), consultée le 17 octobre 2026.$caledonie_content_20261017$;
BEGIN
  SELECT * INTO before_row FROM public.articles
  WHERE id='e2e9d23b-17a2-4810-9001-adcf5c5db60f'::uuid AND slug='garde-maison-animaux-nouvelle-caledonie' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guide Calédonie introuvable'; END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Garde de maison en Nouvelle-Calédonie : solutions, prix et préparation'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Vous cherchez quelqu’un pour votre maison et vos animaux pendant votre absence du Caillou ? Voici comment comparer les solutions, prévoir les dépenses et organiser une garde qui correspond à votre quotidien.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde de maison en Nouvelle-Calédonie : prix et conseils'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Comment faire garder sa maison et ses animaux en Nouvelle-Calédonie ? Prix en F CFP, choix du gardien, déplacements et consignes avant votre départ.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"page house-sitting à Nouméa","url":"/house-sitting/noumea"},{"text":"choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"rédiger une annonce de garde","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"checklist pour préparer la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"}]'::jsonb
    AND before_row.tags IS NOT DISTINCT FROM ARRAY['house-sitting','garde de maison','Nouvelle-Calédonie','Nouméa','franc CFP','garde d’animaux','propriétaire','gardien']::text[]
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:25:10.849806+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide Calédonie modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_caledonie_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde Calédonie différente';
  END IF;
  INSERT INTO public._backup_articles_caledonie_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_caledonie_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Garde de maison en Nouvelle-Calédonie : solutions, prix et préparation',
    excerpt='Vous cherchez quelqu’un pour votre maison et vos animaux pendant votre absence du Caillou ? Voici comment comparer les solutions, prévoir les dépenses et organiser une garde qui correspond à votre quotidien.',
    meta_title='Garde de maison en Nouvelle-Calédonie : prix et conseils',
    meta_description='Comment faire garder sa maison et ses animaux en Nouvelle-Calédonie ? Prix en F CFP, choix du gardien, déplacements et consignes avant votre départ.',
    internal_links='[{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"page house-sitting à Nouméa","url":"/house-sitting/noumea"},{"text":"choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"rédiger une annonce de garde","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"checklist pour préparer la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"}]'::jsonb,
    tags=ARRAY['house-sitting','garde de maison','Nouvelle-Calédonie','Nouméa','franc CFP','garde d’animaux','propriétaire','gardien']::text[],
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='garde-maison-animaux-nouvelle-caledonie' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte Calédonie : % ligne au lieu de 1',affected; END IF;
END;
$caledonie$;

DO $maillage$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  marker text := '## <a id="erreurs"></a>Les 5 erreurs à éviter sur une garde longue';
  paragraph text := 'Vous devez aussi organiser la garde loin de votre lieu de séjour ? Notre guide pour [faire garder sa maison en Nouvelle-Calédonie](/actualites/garde-maison-animaux-nouvelle-caledonie) détaille les prix en F CFP, les déplacements et le relais à prévoir quand vous partez du Caillou.';
BEGIN
  SELECT * INTO before_row FROM public.articles
  WHERE id='4f0c9ffe-1ed1-4612-8f81-f7986aac1272'::uuid AND slug='vacances-longues-garde-animal-2-semaines' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guide longues gardes introuvable'; END IF;
  IF position(paragraph in before_row.content)>0 THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:10:17.454465+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide longues gardes modifié depuis la préparation';
  END IF;
  IF (length(before_row.content)-length(replace(before_row.content,marker,'')))/length(marker)<>1 THEN
    RAISE EXCEPTION 'Ancre de maillage absente ou non unique';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_caledonie_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide longues gardes différente';
  END IF;
  INSERT INTO public._backup_articles_caledonie_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_caledonie_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET content=replace(before_row.content,marker,paragraph || E'\n\n' || marker),updated_at=now()
  WHERE id=before_row.id AND slug='vacances-longues-garde-animal-2-semaines' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Maillage Calédonie : % ligne au lieu de 1',affected; END IF;
END;
$maillage$;
COMMIT;

