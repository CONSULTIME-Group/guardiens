-- Refonte des guides page des tarifs, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot03_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot03_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot03_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot03_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('f5c294a5-2b3f-4630-afd9-aafee77473c4'::uuid,'831afcaf-295b-45dd-a263-2362ad1cf086'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Accueillir son gardien : préparer l’arrivée et la remise des clés

**Pour accueillir votre gardien, convenez de l’heure d’arrivée, de la remise des clés et des informations nécessaires pour vivre chez vous et assurer les tâches prévues.** La transmission peut se faire en personne ou à distance selon votre organisation. Elle doit surtout permettre au gardien de comprendre les consignes et de savoir qui contacter s’il a une question.

Ce guide concerne une garde déjà confirmée. Pour préparer le logement et les documents en amont, utilisez la [liste de préparation de la maison](/actualites/preparer-maison-avant-garde). Ici, l’enjeu est le passage de relais : ce que la personne doit pouvoir faire dès son arrivée.

**Dans ce guide :** [avant l’arrivée](#avant) · [les clés et le logement](#logement) · [les animaux](#animaux) · [à distance](#distance) · [pendant et après](#suivi) · [questions fréquentes](#faq).

## <a id="avant"></a>Avant l’arrivée : confirmer les détails pratiques

Reprenez ensemble la date, l’heure prévue et la manière de signaler un retard. Vérifiez les indications d’accès, le transport et la personne à joindre si vous êtes déjà parti. Si le gardien doit arriver avant votre départ ou repartir après votre retour, convenez explicitement de ces périodes et de l’hébergement.

Une rencontre avant la garde est possible **si vous le souhaitez tous les deux**, sans être obligatoire sur Guardiens. Le temps nécessaire dépend des tâches et du logement ; il n’existe pas une durée de rencontre valable pour tous les séjours.

| Moment | À confirmer | Si quelque chose change |
| --- | --- | --- |
| Avant l’arrivée | Horaire, trajet, accès et contact disponible. | Prévenir et reconvenir de l’organisation. |
| Remise des clés | Ouverture réelle des accès et consignes essentielles. | Mobiliser la personne prévue si l’accès échoue. |
| Début de la garde | Présence effective, soins et premières questions. | Contacter le propriétaire ou le relais convenu. |
| Retour | Horaire, clés et fin des tâches. | Confirmer tout prolongement accepté par les deux. |

Transmettez les coordonnées et les codes en privé à la personne concernée. Ils n’ont pas à apparaître dans l’annonce publique.

## <a id="logement"></a>Montrer le logement sans tout expliquer sur le pas de la porte

Commencez par les accès : serrure, portail, stationnement si nécessaire et fermeture du logement. Vérifiez que le trousseau permet réellement d’ouvrir les portes prévues. Précisez ensuite la chambre, les espaces et les équipements à disposition, ainsi que les zones réservées.

Montrez les tâches convenues : courrier, poubelles, plantes, jardin ou entretien courant. Les équipements particuliers demandent une explication adaptée et les consignes du propriétaire. Une garde n’est pas une invitation à improviser une réparation technique.

Laissez accessibles les informations utiles en cas de problème : contacts, consignes du logement et relais. Le gardien doit savoir où trouver les informations et à qui demander une décision, plutôt que devoir retenir tous les détails d’une visite.

**Exemple fictif à adapter :** « Voici les deux clés à utiliser et la porte qui donne sur le jardin. Les consignes sont dans le guide de la maison. Si le portail ne s’ouvre pas, contactez la personne indiquée plutôt que de forcer le mécanisme. » Complétez avec les particularités réelles de votre logement.

## <a id="animaux"></a>Transmettre les habitudes de chaque animal

Présentez les repas, les sorties, le couchage et les accès autorisés. Expliquez les situations à connaître : réaction aux inconnus, autres animaux, portes ouvertes ou manipulations. Une description précise est plus utile qu’une formule comme « il est toujours gentil ».

Respectez le rythme de l’animal ; un contact spontané ne suffit pas à prouver que toute la garde se passera bien. Si certains gestes doivent être maîtrisés, vérifiez que la personne sait les réaliser. Pour un traitement, les consignes sont celles du vétérinaire ; demandez son aide si une transmission particulière est nécessaire.

Indiquez le vétérinaire, le service de garde identifié, les documents et le transport possible. Pour chaque animal, précisez les changements qui doivent être signalés et la personne à contacter si vous êtes injoignable. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) aide à préparer ces contacts.

## <a id="distance"></a>Si vous ne pouvez pas être présent pour l’arrivée

Convenez d’une remise des clés avec un relais ayant accepté son rôle, ou d’un autre moyen d’accès que vous avez vérifié. Préparez une explication écrite, des photos utiles ou un appel selon les besoins. Le gardien doit pouvoir poser ses questions et confirmer son arrivée.

Vérifiez aussi la prise en charge des animaux entre votre départ et son arrivée. Un décalage de quelques heures peut demander une organisation différente selon leurs besoins. Le fait d’avoir laissé des clés ne confirme pas que quelqu’un est entré et a assuré les soins.

Après confirmation de la garde, le guide de la maison et l’[accord de garde](/actualites/commodat-garde-guardiens) permettent de regrouper les informations ; la signature de l’accord est facultative. Relisez les contacts et les points à convenir, sans présumer qu’un champ vide a été rempli automatiquement.

## <a id="suivi"></a>Pendant la garde et au retour : convenir des nouvelles

Choisissez ensemble la fréquence et le canal des nouvelles, ainsi que la manière de signaler un problème. Il n’existe pas une fréquence universelle qui convient à tous les animaux et à tous les propriétaires. Si une nouvelle attendue manque, contactez la personne et le relais selon l’organisation prévue ; n’attendez pas un délai arbitraire de 24 heures pour vérifier une situation préoccupante.

Au retour, confirmez l’heure et les modalités de départ du gardien. Prévoyez la restitution des clés, les dernières consignes, les éventuels frais convenus et les informations utiles sur les animaux ou le logement.

Vous pourrez ensuite laisser un avis factuel sur l’expérience : ce qui avait été convenu, ce qui a bien fonctionné et les difficultés éventuelles. Un avis précis aide les prochains membres ; il n’a pas à être une recommandation systématique. Pour une vérification finale avant votre départ, utilisez la [checklist de garde des animaux](/actualites/checklist-partir-vacances-animaux).

## <a id="faq"></a>Questions fréquentes sur l’accueil d’un gardien

:::faq
### Faut-il obligatoirement rencontrer le gardien avant la garde ?
Non. Une rencontre est possible si vous le souhaitez tous les deux. Vous pouvez aussi préparer les échanges et la transmission à distance. Dans tous les cas, les accès, les tâches, les besoins des animaux et les contacts doivent être compris avant le début de la garde.

### Combien de temps prévoir pour la remise des clés ?
Le temps dépend des tâches, des animaux et du logement. Convenez d’un créneau permettant de vérifier les points utiles et de répondre aux questions, sans imposer une durée identique à toutes les gardes. Les consignes écrites complètent la transmission.

### Puis-je accueillir le gardien si je suis déjà parti ?
Oui, si vous avez convenu d’un accès fiable, d’un contact disponible et de la prise en charge des animaux avant son arrivée. Demandez une confirmation d’arrivée et prévoyez quoi faire si la personne ne peut pas entrer.

### Comment présenter un animal qui n’aime pas les inconnus ?
Décrivez ses réactions, les contacts qu’il accepte et les consignes déjà établies. Respectez son rythme et vérifiez que le gardien peut assurer les soins nécessaires. Pour une difficulté particulière ou un traitement, préparez la transmission avec le vétérinaire ou le professionnel qui suit l’animal.

### À quelle fréquence demander des nouvelles pendant la garde ?
Convenez ensemble d’une fréquence, d’un canal et de la manière de signaler un problème. Adaptez l’organisation à vos besoins et à ceux des animaux. Si une nouvelle attendue manque ou qu’une situation vous préoccupe, vérifiez avec le gardien et le relais prévu.

### Que vérifier au moment du retour ?
Confirmez les horaires, la restitution des clés, les informations sur les animaux et le logement ainsi que les frais convenus. Si les dates changent, vérifiez que le gardien accepte et peut assurer la modification. Laissez ensuite un avis factuel lorsque vous pouvez décrire l’expérience.
:::

Guardiens est actuellement 100 % gratuit pour les propriétaires et les gardiens ; le séjour se fait en échange de l’hébergement, sans rémunération du gardien. Les dépenses restent à convenir. Une participation aux frais d’infrastructure pourra être envisagée au plus tôt au second semestre 2027, avec un préavis de 30 jours. Les conditions à jour sont sur la [page des tarifs](/tarifs).$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='f5c294a5-2b3f-4630-afd9-aafee77473c4'::uuid AND slug='accueillir-gardien-bonnes-pratiques';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/accueillir-gardien-bonnes-pratiques' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Accueillir son gardien : préparer l’arrivée et la remise des clés'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Pour l’arrivée du gardien, convenez des horaires et des accès, rendez les consignes accessibles et vérifiez ensemble les points pratiques avant votre départ.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Accueillir son gardien : préparer la remise des clés'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Garde confirmée : préparez l’arrivée du gardien, les clés, la visite du logement, les habitudes des animaux et les nouvelles, sur place ou à distance.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux personnes se saluent devant une maison, avec un chien à leurs côtés.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"liste de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"checklist de garde des animaux","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:10:21.231439+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot03_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide chien-chat 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot03_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot03_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Accueillir son gardien : préparer l’arrivée et la remise des clés',
    excerpt='Pour l’arrivée du gardien, convenez des horaires et des accès, rendez les consignes accessibles et vérifiez ensemble les points pratiques avant votre départ.',
    meta_title='Accueillir son gardien : préparer la remise des clés',
    meta_description='Garde confirmée : préparez l’arrivée du gardien, les clés, la visite du logement, les habitudes des animaux et les nouvelles, sur place ou à distance.',
    hero_image_alt='Deux personnes se saluent devant une maison, avec un chien à leurs côtés.',
    internal_links='[{"text":"liste de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"checklist de garde des animaux","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='accueillir-gardien-bonnes-pratiques' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Checklist avant les vacances : vos animaux sont gardés à domicile

**Avant de partir en laissant vos animaux à un gardien, vérifiez que la prise en charge est confirmée, que la personne peut entrer et qu’elle dispose des consignes, des fournitures et des contacts nécessaires.** Cette checklist sert au dernier contrôle. Pour organiser toute la préparation, reportez-vous au [guide de préparation de la maison](/actualites/preparer-maison-avant-garde).

Une liste cochée ne prouve pas qu’une information a été comprise : échangez sur ce qui reste flou. S’il manque une personne pour assurer les besoins des animaux dès votre départ, organisez une prise en charge confirmée ; une annonce publiée ou un message envoyé ne suffit pas.

**Accès rapide :** [la garde et les clés](#garde) · [les animaux](#animaux) · [le logement](#logement) · [les contacts et dépenses](#contacts) · [le dernier contrôle](#depart) · [questions fréquentes](#faq).

## <a id="garde"></a>1. La garde est confirmée et l’accès fonctionne

- [ ] Les dates et les heures d’arrivée et de départ sont convenues.
- [ ] Le gardien a confirmé sa disponibilité et les tâches qu’il peut assurer.
- [ ] La remise des clés est organisée et le trousseau ouvre les accès nécessaires.
- [ ] La personne sait quoi faire si elle est retardée ou ne peut pas entrer.
- [ ] Les périodes entre votre départ et son arrivée, puis entre son départ et votre retour, sont couvertes selon les besoins des animaux.

Vous pouvez vérifier ces points sur place ou à distance. Une rencontre est possible si vous le souhaitez tous les deux, sans être obligatoire sur Guardiens. Le guide pour [accueillir son gardien](/actualites/accueillir-gardien-bonnes-pratiques) détaille ce passage de relais.

## <a id="animaux"></a>2. Les soins de chaque animal sont expliqués

- [ ] Alimentation habituelle, quantités, horaires et emplacement des réserves.
- [ ] Eau, sorties, litière, couchage et accès autorisés.
- [ ] Comportements à connaître, interactions et situations à éviter.
- [ ] Traitements prescrits avec les consignes du vétérinaire, compris par une personne capable de les suivre.
- [ ] Documents utiles, numéro d’identification, matériel et transport possible.

Vérifiez les réserves pour la période convenue et l’organisation d’un éventuel réapprovisionnement. Avec plusieurs animaux, précisez les repas ou espaces à séparer si nécessaire. Les guides de [garde de chien](/actualites/garde-chien-faire-garder-son-chien) et de [garde de chat à domicile](/actualites/garde-chat-domicile-house-sitting) aident à vérifier les besoins propres à chacun.

## <a id="logement"></a>3. Le logement est utilisable et les tâches sont claires

- [ ] Chambre, espaces et équipements à disposition du gardien.
- [ ] Pièces réservées, invités, tabac et règles de vie convenus.
- [ ] Consignes utiles sur fermeture, chauffage, eau et équipements particuliers.
- [ ] Courrier, poubelles, livraisons et tâches courantes acceptées.
- [ ] Consignes de plantes, jardin ou autres installations uniquement si ces tâches sont prévues.

Transmettez les codes et contacts en privé, sans les inscrire dans l’annonce publique. Les consignes techniques doivent permettre un usage compris ; elles ne transforment pas le gardien en professionnel de dépannage.

Pour un besoin particulier, consultez les guides sur [l’arrosage des plantes](/actualites/arroser-plantes-pendant-vacances-guide), [l’entretien du jardin](/actualites/entretenir-jardin-pendant-absence) et [la protection du logement pendant une absence](/actualites/securiser-maison-absence-prolongee).

## <a id="contacts"></a>4. Les contacts, les dépenses et le relais sont préparés

- [ ] Votre contact et celui d’un relais ayant accepté son rôle.
- [ ] Vétérinaire habituel et service de garde identifié pour le lieu et les dates.
- [ ] Professionnels utiles au logement selon ses particularités.
- [ ] Décisions et achats autorisés, montants à convenir, justificatifs et règlement des frais.
- [ ] Solution si la garde s’interrompt ou si votre retour est retardé.

Vérifiez aussi les garanties auprès des assureurs concernés, avec les [points présentés par Service Public pour le home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509). L’[accord de garde](/actualites/commodat-garde-guardiens) est proposé après confirmation et sa signature est facultative ; il ne remplace pas les assurances. Aucun montant de frais ni remplaçant immédiat n’est garanti automatiquement par la plateforme.

Notre [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) permet de convenir de la marche à suivre. Les consignes doivent être accessibles pendant le séjour, y compris si vous êtes injoignable.

## <a id="depart"></a>5. Le dernier contrôle avant de quitter le logement

| Vérification | Question à poser | Si le point manque |
| --- | --- | --- |
| Prise en charge | Qui est présent ou intervient dès mon départ ? | Confirmer un relais adapté. |
| Accès | La personne peut-elle réellement entrer ? | Résoudre les clés et le contact disponible. |
| Soins | Les besoins de chaque animal peuvent-ils être assurés ? | Clarifier ou adapter la garde avec les bons interlocuteurs. |
| Imprévu | Qui peut décider ou intervenir si je ne réponds pas ? | Convenez du relais et des contacts avant de partir. |

Convenez enfin d’une confirmation d’arrivée, du canal et de la fréquence des nouvelles. Gardez un moyen d’échanger qui fonctionne à destination. Si vos dates changent, reconfirmez l’organisation avec le gardien au lieu de supposer qu’il peut prolonger.

Sur Guardiens, le guide de la maison permet de regrouper les informations pratiques après confirmation. Relisez-le pour ce séjour : une consigne ancienne, un numéro obsolète ou un texte à compléter peut laisser une question ouverte malgré une liste apparemment terminée.

## <a id="faq"></a>Questions fréquentes avant de partir avec des animaux gardés chez soi

:::faq
### Cette checklist remplace-t-elle le guide de la maison ?
Non. Elle sert à vérifier les points essentiels avant le départ. Le guide de la maison contient les consignes détaillées à transmettre au gardien, et vos échanges permettent de clarifier ce qui reste incertain.

### Puis-je partir si mon annonce est publiée mais sans garde confirmée ?
Une annonce publiée ne constitue pas une prise en charge. Avant de laisser vos animaux, confirmez qui assure leurs besoins dès votre départ et pendant la période prévue. Organisez une autre solution si la garde n’est pas confirmée.

### Faut-il laisser une autorisation de soins vétérinaires ?
Préparez avec votre vétérinaire les documents utiles et la conduite à tenir pour votre animal. Convenez aussi des contacts, du transport et des dépenses si vous êtes injoignable. Ne supposez pas qu’un document universel autorise tous les gestes ou remplace l’avis du vétérinaire.

### Quels contacts doivent rester accessibles au gardien ?
Votre contact, un relais ayant accepté son rôle, le vétérinaire habituel, un service de garde identifié et les professionnels utiles au logement selon les besoins. Vérifiez les coordonnées et la manière d’y accéder pendant le séjour.

### L’accord signé suffit-il pour être assuré pendant la garde ?
Non. L’accord documente le séjour mais ne crée pas une garantie d’assurance. Vérifiez les couvertures et leurs conditions avec les assureurs concernés avant le départ. Sa signature est facultative sur Guardiens.

### Que faire si je dois rentrer plus tard que prévu ?
Prévenez le gardien et le relais dès que possible. Vérifiez les disponibilités et confirmez la nouvelle organisation. Si le gardien ne peut pas rester, préparez une transmission assurant la continuité de prise en charge des animaux.
:::

La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens, avec un séjour en échange de l’hébergement sans rémunération. Les dépenses convenues restent distinctes. Une participation aux frais d’infrastructure pourra être envisagée au plus tôt au second semestre 2027, avec un préavis de 30 jours ; consultez la [page des tarifs](/tarifs) pour les conditions à jour.$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='831afcaf-295b-45dd-a263-2362ad1cf086'::uuid AND slug='checklist-partir-vacances-animaux';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/checklist-partir-vacances-animaux' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Checklist avant les vacances : vos animaux sont gardés à domicile'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Votre garde est confirmée ? Vérifiez les accès, les soins, les contacts et le relais avant de partir. Si un point essentiel manque, clarifiez-le avec le gardien.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Checklist vacances : animaux gardés à domicile'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Avant le départ : dates, clés, repas, traitements, contacts, dépenses et relais. La checklist pour vérifier la garde de vos animaux à domicile.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un collier en cuir est posé sur une table à côté d’une gamelle de croquettes.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"accueillir son gardien","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"l’arrosage des plantes","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"l’entretien du jardin","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"la protection du logement pendant une absence","url":"/actualites/securiser-maison-absence-prolongee"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:25:10.879588+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot03_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide chien-chat 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot03_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot03_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Checklist avant les vacances : vos animaux sont gardés à domicile',
    excerpt='Votre garde est confirmée ? Vérifiez les accès, les soins, les contacts et le relais avant de partir. Si un point essentiel manque, clarifiez-le avec le gardien.',
    meta_title='Checklist vacances : animaux gardés à domicile',
    meta_description='Avant le départ : dates, clés, repas, traitements, contacts, dépenses et relais. La checklist pour vérifier la garde de vos animaux à domicile.',
    hero_image_alt='Un collier en cuir est posé sur une table à côté d’une gamelle de croquettes.',
    internal_links='[{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"accueillir son gardien","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"l’arrosage des plantes","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"l’entretien du jardin","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"la protection du logement pendant une absence","url":"/actualites/securiser-maison-absence-prolongee"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='checklist-partir-vacances-animaux' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
