-- Refonte des guides guide du cadre juridique, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot02_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot02_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot02_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot02_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('ea8e64fd-6533-4a4b-9cf2-ca998620544d'::uuid,'88362997-ebd8-42f7-9b81-4aeb51953b0b'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Hospitalisation : organiser la garde de son chien ou de son chat

**Si votre hospitalisation est imprévue et que votre animal est seul, contactez d’abord une personne de confiance qui peut accéder au logement et assurer les soins nécessaires.** Confirmez ce qu’elle peut faire aujourd’hui, puis organisez les jours suivants. Si vous êtes isolé, signalez cette difficulté à l’équipe qui vous accueille et demandez à être orienté vers le service social.

Un proche, des visites professionnelles, un accueil ou une pension peuvent répondre au besoin selon l’animal et les disponibilités. Un gardien qui séjourne chez vous peut aussi être une option lorsque vous avez le temps de préparer et de confirmer la garde. **Guardiens ne garantit pas de solution immédiate ni de réponse sous un délai donné.**

**Dans ce guide :** [le premier relais](#urgence) · [les solutions](#solutions) · [préparer une hospitalisation prévue](#anticiper) · [les soins de l’animal](#soins) · [une durée incertaine](#duree) · [Guardiens et les dépenses](#guardiens) · [questions fréquentes](#faq).

## <a id="urgence"></a>Hospitalisation imprévue : organiser les premières heures

Appelez la personne qui dispose des clés ou peut convenir d’un accès avec vous : proche, voisin de confiance ou autre contact habituel. Expliquez les besoins de l’animal et demandez une confirmation explicite de sa disponibilité. Avoir envoyé un message ne signifie pas que quelqu’un est intervenu.

Si personne n’est disponible, contactez votre vétérinaire et des professionnels ou structures de garde pour connaître les possibilités réelles. Une association locale ou le service social peut orienter selon la situation ; **ni une place d’accueil ni une aide gratuite ne sont acquises d’avance**.

Un proche peut vous aider à passer les appels et à rassembler les consignes. Convenez de qui prend les décisions et de qui reçoit les nouvelles. Vos identifiants de compte n’ont pas à être partagés pour préparer ces informations.

Une annonce de garde peut servir à rechercher une organisation pour la suite, mais elle ne remplace pas la prise en charge de l’animal aujourd’hui. Le réseau de gardiens d’urgence présenté par Guardiens est un projet à venir, pas un service de relève garanti.

## <a id="solutions"></a>Qui peut garder votre animal pendant l’hospitalisation ?

| Solution | Intérêt possible | Vérification essentielle |
| --- | --- | --- |
| Proche ou voisin de confiance | Un premier relais ou une garde organisée directement. | Disponibilité réelle, accès et capacité à assurer les soins. |
| Visites à domicile | Des passages pour les tâches convenues, en restant dans le logement habituel. | Fréquence, durée et temps sans présence adaptés à l’animal. |
| Gardien qui séjourne chez vous | Une présence dans le logement et les soins acceptés. | Dates, horaires, hébergement et contraintes de chacun. |
| Accueil chez un particulier ou pension | Une prise en charge dans un autre lieu. | Place disponible, adaptation de l’animal et prestations proposées. |
| Association ou dispositif local | Une orientation ou une aide selon le territoire et la situation. | Conditions d’accès, capacité d’accueil et durée possible. |

Il n’existe pas de solution idéale pour toutes les hospitalisations. Comparez le besoin réel : sorties, repas, litière, interactions, traitement et nuits. Un gardien hébergé n’assure pas automatiquement une présence permanente. Les guides de [garde de chien](/actualites/garde-chien-faire-garder-son-chien) et de [garde de chat à domicile](/actualites/garde-chat-domicile-house-sitting) aident à préciser ces critères.

## <a id="anticiper"></a>Hospitalisation prévue : les informations à préparer

Dès que vous disposez d’une période prévisionnelle, cherchez une solution et gardez une alternative tant qu’elle n’est pas confirmée. Décrivez les dates connues et les incertitudes, sans annoncer une durée certaine si le retour dépend de votre prise en charge.

Préparez une fiche accessible avec :

- la personne à contacter et un relais ayant accepté ce rôle ;
- les clés, la remise des accès et une solution si la personne ne peut pas entrer ;
- les besoins de chaque animal, les réserves de nourriture et de fournitures ;
- les consignes prescrites, le vétérinaire, les documents et le transport ;
- les dépenses autorisées, les justificatifs et leur règlement ;
- la façon de donner des nouvelles et de transmettre une modification des dates.

La [liste de préparation de la maison](/actualites/preparer-maison-avant-garde) complète cette fiche. Une rencontre est possible si vous le souhaitez tous les deux ; elle n’est pas imposée sur Guardiens. Vous pouvez aussi organiser les échanges et la transmission à distance.

**Votre annonce peut décrire le besoin sans exposer votre santé.** Le diagnostic, l’établissement, le numéro de chambre et le dossier médical n’ont pas leur place dans un texte public. Indiquez les dates, les tâches et l’interlocuteur prévu ; partagez en privé uniquement les informations nécessaires.

## <a id="soins"></a>Si votre animal a un traitement ou des besoins particuliers

Préparez les consignes avec votre vétérinaire et vérifiez que la personne sait réaliser les gestes prescrits et respecter les horaires. Une expérience générale des animaux, un badge d’identité ou un avis favorable ne prouve pas cette capacité.

Expliquez le régime, les difficultés de mobilité ou de comportement et l’organisation des rendez-vous éventuels. Si les besoins dépassent ce qu’un gardien peut assurer, recherchez une prise en charge adaptée avec le vétérinaire. Ne présentez pas un séjour chez vous comme équivalent à une surveillance médicale.

Convenez de la conduite à tenir si l’état de l’animal change pendant que vous êtes injoignable : contact du vétérinaire, relais, transport et organisation des frais. Notre [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) permet de préparer ces situations.

## <a id="duree"></a>Si l’hospitalisation se prolonge ou si le retour est incertain

Vérifiez la date jusqu’à laquelle la personne peut réellement rester ou intervenir. Un prolongement se discute et se confirme ; il ne découle pas automatiquement de la prolongation de votre séjour à l’hôpital.

Si plusieurs personnes doivent se relayer, préparez les dates, les clés, les consignes et les périodes entre deux prises en charge. Désignez si possible un interlocuteur qui centralise les informations avec votre accord. Le [guide des absences longues](/actualites/vacances-longues-garde-animal-2-semaines) détaille cette continuité.

Anticipez aussi votre retour : pourrez-vous assurer les promenades et les tâches de l’animal immédiatement ? Une aide à ces tâches peut être à rechercher séparément. Le gardien n’est pas un service de soins ou d’aide personnelle à domicile. [L’Assurance Maladie explique la préparation du retour après hospitalisation](https://www.ameli.fr/assure/droits-demarches/maladie-accident-hospitalisation/hospitalisation) et les interlocuteurs pouvant accompagner vos besoins ; cela ne constitue pas une garantie de financement de la garde de votre animal.

## <a id="guardiens"></a>Quand envisager Guardiens et quelles dépenses prévoir ?

Guardiens met en relation des propriétaires et des personnes qui séjournent dans leur logement pour en assurer la garde et les tâches convenues, en échange de l’hébergement et sans rémunération. Cette formule suppose un logement adapté, un calendrier compatible et le temps nécessaire aux échanges. Les gardiens peuvent venir de plus loin ; aucune proximité ni candidature n’est garantie.

Vous publiez le besoin et choisissez parmi les personnes intéressées. Notre guide pour [rédiger une annonce de garde](/actualites/rediger-bonne-annonce-house-sitting) vous aide à décrire l’organisation. Après confirmation, le guide de la maison et un [accord de garde](/actualites/commodat-garde-guardiens) sont disponibles ; sa signature est facultative. Vérifiez également les garanties avec les assureurs concernés.

**La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** La nourriture, la litière, les soins vétérinaires et les autres dépenses convenues restent à prévoir. Pour une prestation payante ou une pension, demandez un devis correspondant aux dates et aux besoins de votre animal, avec les conditions de modification ou d’annulation.

Notre priorité est de construire le réseau et d’améliorer le service avec vos retours. Une participation aux frais d’infrastructure pourra être envisagée au plus tôt au second semestre 2027, avec un préavis de 30 jours. Consultez les conditions à jour sur la [page des tarifs](/tarifs).

## <a id="faq"></a>Questions fréquentes sur la garde pendant une hospitalisation

:::faq
### Je suis hospitalisé aujourd’hui et mon animal est seul : que faire ?
Contactez d’abord une personne de confiance capable d’accéder au logement et d’assurer les besoins immédiats, puis confirmez qu’elle peut intervenir. Si vous êtes isolé, signalez la difficulté à l’équipe qui vous accueille et demandez une orientation vers le service social. Recherchez une solution confirmée pour les jours suivants, sans attendre qu’une annonce produise une réponse.

### Puis-je trouver une garde sur Guardiens en urgence ?
Vous pouvez présenter un besoin de garde, mais aucune candidature ni prise en charge immédiate n’est garantie. Le réseau de gardiens d’urgence est un projet à venir. Organisez d’abord le premier relais si votre animal est sans personne aujourd’hui.

### Mon chat peut-il rester chez moi pendant mon hospitalisation ?
Oui, si une personne assure les passages ou la présence adaptés à ses besoins. Convenez de la fréquence, du temps nécessaire, des repas, de l’eau, de la litière et des soins éventuels. Ne déduisez pas l’organisation du seul nombre de jours d’absence.

### Peut-on confier un animal sous traitement à un gardien ?
Vérifiez avec votre vétérinaire les consignes et la prise en charge nécessaire, puis assurez-vous que la personne peut réellement les suivre. Un profil ou un badge ne certifie pas sa capacité à réaliser des soins. Recherchez une solution adaptée si les besoins dépassent ses possibilités.

### Que faire si la date de sortie de l’hôpital change ?
Prévenez le gardien et le relais dès que possible. Vérifiez leurs disponibilités et confirmez ensemble toute modification. Si la personne ne peut pas prolonger, organisez une autre prise en charge avec transmission des clés et des consignes.

### Quels frais restent à prévoir si la plateforme est gratuite ?
La plateforme est actuellement 100 % gratuite et le gardien est hébergé sans rémunération. Les provisions, la litière, les soins et les autres dépenses convenues restent distincts. Préparez aussi leur règlement si vous n’êtes pas disponible pour répondre pendant l’hospitalisation.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='ea8e64fd-6533-4a4b-9cf2-ca998620544d'::uuid AND slug='faire-garder-animal-pendant-hospitalisation';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/faire-garder-animal-pendant-hospitalisation' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Hospitalisation : organiser la garde de son chien ou de son chat'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Si vous êtes hospitalisé sans solution pour votre animal, contactez d’abord une personne qui peut intervenir. Organisez ensuite la garde selon ses besoins et la durée prévue.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Hospitalisation : faire garder son chien ou son chat'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Hospitalisation prévue ou imprévue : organisez un relais pour votre animal, comparez les gardes et préparez les clés, les soins et le retour.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux personnes se serrent la main au seuil d’une maison, avec un chien et un chat.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"liste de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide des absences longues","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"rédiger une annonce de garde","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:25:16.94305+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot02_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide chien-chat 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot02_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot02_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Hospitalisation : organiser la garde de son chien ou de son chat',
    excerpt='Si vous êtes hospitalisé sans solution pour votre animal, contactez d’abord une personne qui peut intervenir. Organisez ensuite la garde selon ses besoins et la durée prévue.',
    meta_title='Hospitalisation : faire garder son chien ou son chat',
    meta_description='Hospitalisation prévue ou imprévue : organisez un relais pour votre animal, comparez les gardes et préparez les clés, les soins et le retour.',
    hero_image_alt='Deux personnes se serrent la main au seuil d’une maison, avec un chien et un chat.',
    internal_links='[{"text":"garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"liste de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide des absences longues","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"rédiger une annonce de garde","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='faire-garder-animal-pendant-hospitalisation' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Imprévu pendant une garde d’animaux : qui contacter et quoi prévoir ?

**Si un animal semble malade, blessé ou victime d’une intoxication, contactez rapidement un vétérinaire et suivez ses consignes, sans attendre la réponse du propriétaire pour demander cet avis.** Si une personne est en danger immédiat, appelez les secours au 112. Mettez-vous à l’abri lorsqu’une situation présente un danger.

Pour les autres imprévus, l’organisation repose sur trois points : joindre le bon interlocuteur, informer le propriétaire et assurer la continuité de la garde. Guardiens ne garantit pas l’intervention immédiate d’un remplaçant. Ce guide vous aide à préparer les contacts et les décisions, puis à réagir selon la situation.

**Accès rapide :** [quel interlocuteur](#contacts) · [animal malade ou blessé](#animal) · [animal perdu](#disparition) · [problème dans la maison](#maison) · [gardien empêché](#relais) · [préparer la garde](#preparation) · [responsabilités](#responsabilites) · [questions fréquentes](#faq).

## <a id="contacts"></a>Qui contacter selon l’imprévu ?

| Situation | Premier interlocuteur | Organisation à prévoir |
| --- | --- | --- |
| Animal malade, blessé ou ingestion suspecte | Vétérinaire habituel ou service de garde joignable pour le lieu du séjour. | Documents, transport et informations à transmettre. |
| Animal disparu | Propriétaire ou relais, puis démarches de recherche et déclaration de perte. | Identification, photo récente et contacts locaux. |
| Fuite, panne ou accès impossible | Propriétaire, relais et professionnel compétent selon le problème. | Contacts vérifiés et accès aux informations du logement. |
| Gardien empêché de poursuivre | Propriétaire et relais ayant accepté d’aider. | Continuité des soins et transmission des clés. |
| Danger immédiat pour une personne | Secours compétents, notamment le 112. | Mise à l’abri et adresse précise à communiquer. |

Un message à la plateforme peut signaler une difficulté, mais ne remplace pas un vétérinaire, les secours ou un professionnel du logement. Les coordonnées essentielles doivent être accessibles sans devoir rechercher un article pendant l’incident.

## <a id="animal"></a>Si l’animal va mal, mord ou présente un changement préoccupant

Décrivez au vétérinaire ce que vous observez, depuis quand, les traitements connus et les éléments utiles. Une photo ou un emballage peut aider à expliquer une situation si le professionnel le demande. Le diagnostic, les soins et les consignes de transport relèvent du vétérinaire ; n’improvisez pas de traitement.

Prévenez le propriétaire dès que possible en indiquant les faits, le professionnel contacté et la suite proposée. S’il ne répond pas, contactez le relais préparé. Une limite de dépenses convenue ne doit pas retarder la demande d’avis vétérinaire. Conservez les justificatifs et les échanges.

Si un chien mord une personne, il faut aussi organiser les démarches administratives et vétérinaires. [Service Public précise les obligations après une morsure](https://www.service-public.gouv.fr/particuliers/vosdroits/F24028), notamment la déclaration en mairie, la surveillance sanitaire et l’évaluation comportementale. Contactez sans attendre le vétérinaire et la mairie pour les démarches qui vous concernent ; ne présumez pas que le propriétaire a déjà tout effectué.

Si vous pensez que l’animal est décédé, contactez le vétérinaire et le propriétaire pour confirmer la situation et convenir de la suite. Ne concluez pas à vous seul aux causes du décès ou à la responsabilité d’une personne.

## <a id="disparition"></a>Si l’animal s’échappe ou ne se présente pas comme d’habitude

Prévenez rapidement le propriétaire et le relais. Vérifiez les lieux où l’animal peut se cacher, sans vous exposer à un danger et sans laisser un autre animal s’échapper. Rassemblez une photo récente, le numéro d’identification et les informations sur le dernier endroit où il a été vu.

Le détenteur enregistré peut [déclarer la perte auprès d’I-CAD](https://www.i-cad.fr/articles/animal_perdu). Cette démarche se prépare avec le propriétaire ; elle ne nécessite pas d’attendre 24 heures. Signalez également la disparition aux vétérinaires, refuges et fourrières du secteur, et diffusez des informations factuelles utiles aux recherches. Pensez à signaler le retour lorsque l’animal est retrouvé.

L’identification n’est pas un dispositif de géolocalisation. Vérifier les coordonnées enregistrées et savoir qui effectue la déclaration évite de perdre du temps. Un changement de contact administratif ne se fait pas en modifiant physiquement la puce.

## <a id="maison"></a>Si une panne, une fuite ou un problème d’accès survient

Protégez d’abord les personnes et les animaux. Suivez uniquement les consignes du logement que vous comprenez et pouvez appliquer sans danger. Évitez toute manipulation électrique, de gaz ou toute réparation improvisée lorsqu’un risque est présent ; contactez le service compétent.

Pour un problème sans danger immédiat, informez le propriétaire ou son relais : ce qui ne fonctionne plus, depuis quand et les conséquences pour la garde. Demandez l’intervention du professionnel prévu si nécessaire. Conservez les photos et les devis utiles lorsque la situation permet de les prendre.

Si une panne affecte l’eau, le chauffage, l’accès ou la conservation d’un traitement, prévoyez aussi la continuité des besoins de l’animal avec le propriétaire et le vétérinaire selon le cas. Un dépannage du logement et une solution de garde peuvent être nécessaires en parallèle.

## <a id="relais"></a>Si le gardien ne peut plus assurer la garde

Prévenez le propriétaire dès que votre capacité à assurer les tâches devient insuffisante. N’attendez pas une durée de maladie supposée acceptable pour demander de l’aide. Le relais doit correspondre aux besoins réels des animaux, aux dates et à l’accès au logement.

Convenez de la personne ou de la structure qui prend la suite, de la remise des clés et des consignes. **Ne partez pas en laissant les animaux sans prise en charge.** Si votre propre sécurité nécessite une intervention urgente, contactez les secours et signalez aussi les animaux à la personne qui organise le relais.

Le réseau de gardiens d’urgence présenté par Guardiens est un projet à venir. La [page dédiée](/gardien-urgence) ne doit pas être comprise comme la promesse d’un remplaçant disponible immédiatement. Un proche, une prestation professionnelle ou une structure adaptée ne peut intervenir qu’après confirmation de ses possibilités.

Si l’imprévu concerne l’hospitalisation du propriétaire, le [guide de garde pendant une hospitalisation](/actualites/faire-garder-animal-pendant-hospitalisation) aide à organiser le premier relais et les jours suivants.

## <a id="preparation"></a>Ce qu’il faut préparer avant le départ

- **Les contacts accessibles :** propriétaire, relais ayant accepté son rôle, vétérinaire habituel, service de garde identifié et professionnels utiles au logement.
- **Les besoins de chaque animal :** alimentation, sorties, traitements prescrits, documents, identification, transport et changements à signaler.
- **Les accès et la vie dans la maison :** clés, fermeture, zones réservées, consignes des équipements et solution si l’accès échoue.
- **Les décisions et dépenses :** qui peut agir, quels achats sont autorisés, montants à convenir, justificatifs et organisation du règlement des frais.
- **La continuité :** annulation, départ anticipé, retour retardé et transmission à une autre personne.

Le [guide de préparation de la maison](/actualites/preparer-maison-avant-garde) permet de regrouper ces points. Une rencontre est possible si les deux personnes le souhaitent ; les consignes peuvent aussi se préparer à distance. Après confirmation, l’[accord de garde](/actualites/commodat-garde-guardiens) sert de référence commune, avec une signature facultative.

**Exemple fictif de message à adapter :** « Le chauffage ne fonctionne plus depuis ce matin. Les animaux sont avec moi dans la pièce utilisable. J’ai joint le contact prévu ; voici sa réponse. Pouvez-vous confirmer la suite et prévenir notre relais si une autre organisation est nécessaire ? » Décrivez les faits et les actions effectuées, sans minimiser ni attribuer une faute à ce stade.

## <a id="responsabilites"></a>Assurance et responsabilité : conserver les faits

Un incident ne permet pas de conclure automatiquement que le gardien ou le propriétaire est responsable. Gardez les messages, les documents et les justificatifs. Contactez les assureurs concernés selon leurs procédures, puis demandez un conseil adapté si un désaccord persiste.

[Service Public rappelle les garanties à vérifier pour le home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509). Ne déduisez pas une couverture de la seule gratuité, de l’inscription sur une plateforme ou d’un accord signé. Notre [guide du cadre juridique](/actualites/house-sitting-cadre-juridique-france) prépare ces questions sans trancher votre situation individuelle.

## <a id="faq"></a>Questions fréquentes sur les imprévus pendant une garde

:::faq
### Que faire si l’animal tombe malade pendant la garde ?
Contactez rapidement le vétérinaire habituel ou le service de garde adapté au lieu du séjour, décrivez ce que vous observez et suivez ses consignes. Prévenez le propriétaire et le relais dès que possible. N’attendez pas leur réponse pour demander un avis vétérinaire.

### Que faire si le propriétaire ne répond pas ?
Utilisez le contact de relais convenu avant le départ. Pour une urgence, contactez directement le professionnel ou les secours adaptés. Gardez la trace des démarches et continuez à informer le propriétaire dès que possible.

### Faut-il attendre 24 heures pour déclarer un animal perdu ?
Non. Prévenez rapidement le propriétaire et organisez les recherches ainsi que la déclaration de perte auprès d’I-CAD avec le détenteur enregistré. Préparez une photo récente et le numéro d’identification. Pensez à déclarer l’animal retrouvé ensuite.

### Guardiens trouve-t-il un gardien de remplacement immédiatement ?
Aucun remplacement immédiat n’est garanti. Le réseau de gardiens d’urgence est un projet à venir. Préparez un relais ayant accepté son rôle et confirmez la prise en charge avant une transmission de garde.

### Puis-je quitter la garde si je suis malade ?
Prévenez le propriétaire dès que vous ne pouvez plus assurer les tâches nécessaires et organisez un relais. La transmission doit garantir la continuité de prise en charge des animaux. Si votre propre sécurité est menacée, contactez les secours.

### Qui paie les frais ou les dégâts pendant une garde ?
Les dépenses autorisées et leur règlement se conviennent avant le séjour. En cas d’incident, conservez les justificatifs et contactez les assureurs concernés. La responsabilité et la couverture dépendent des faits et des contrats ; elles ne se déduisent pas d’une règle unique pour toutes les gardes.

### Quels documents et contacts préparer avant le départ ?
Rassemblez les consignes de la maison et des animaux, les contacts du propriétaire et du relais, le vétérinaire, le service de garde identifié, les documents utiles et l’organisation des dépenses. Vérifiez que la personne peut y accéder pendant le séjour.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='88362997-ebd8-42f7-9b81-4aeb51953b0b'::uuid AND slug='gerer-imprevu-pendant-garde';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/gerer-imprevu-pendant-garde' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Imprévu pendant une garde d’animaux : qui contacter et quoi prévoir ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un problème est en cours ? Contactez le professionnel adapté à la situation, prévenez le propriétaire et mobilisez le relais convenu. Préparez ces contacts avant la garde.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Imprévus pendant une garde d''animaux : que faire'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Animal malade ou perdu, panne, gardien empêché : qui contacter pendant une garde, comment prévenir le propriétaire et préparer un relais avant le départ.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne tient un téléphone devant un chien assis dans un salon.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page dédiée","url":"/gardien-urgence"},{"text":"guide de garde pendant une hospitalisation","url":"/actualites/faire-garder-animal-pendant-hospitalisation"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"guide du cadre juridique","url":"/actualites/house-sitting-cadre-juridique-france"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:25:11.293413+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot02_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide chien-chat 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot02_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot02_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Imprévu pendant une garde d’animaux : qui contacter et quoi prévoir ?',
    excerpt='Un problème est en cours ? Contactez le professionnel adapté à la situation, prévenez le propriétaire et mobilisez le relais convenu. Préparez ces contacts avant la garde.',
    meta_title='Imprévus pendant une garde d''animaux : que faire',
    meta_description='Animal malade ou perdu, panne, gardien empêché : qui contacter pendant une garde, comment prévenir le propriétaire et préparer un relais avant le départ.',
    hero_image_alt='Une personne tient un téléphone devant un chien assis dans un salon.',
    internal_links='[{"text":"page dédiée","url":"/gardien-urgence"},{"text":"guide de garde pendant une hospitalisation","url":"/actualites/faire-garder-animal-pendant-hospitalisation"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"accord de garde","url":"/actualites/commodat-garde-guardiens"},{"text":"guide du cadre juridique","url":"/actualites/house-sitting-cadre-juridique-france"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='gerer-imprevu-pendant-garde' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
