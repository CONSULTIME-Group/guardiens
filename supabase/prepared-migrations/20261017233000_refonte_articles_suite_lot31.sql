-- Refonte des guides aide aux courses à Lyon et déménagement entre particuliers, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot31_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot31_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot31_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot31_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('f823df5c-cbfe-4438-af84-395abfb3c314'::uuid,'8569a535-d61b-4241-bdf7-7ebd28f72567'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Aide aux courses à Lyon : organiser un coup de main pour soi ou un proche

**Pour demander une aide ponctuelle aux courses, précisez ce qu’il faut récupérer, quand et comment remettre les achats.** Si la demande concerne un proche, préparez-la avec son accord et respectez ce qu’il souhaite partager. Sur Guardiens, l’entraide entre particuliers se fait sans rémunération, sans disponibilité locale garantie.

Ce coup de main peut répondre à un besoin limité. Lorsqu’une personne a besoin de soins, d’aide corporelle ou d’un accompagnement durable lié à une perte d’autonomie, il faut une organisation adaptée avec les professionnels ou services compétents.

**Repères :** [définir l’aide](#besoin), [demander pour un proche](#proche), [organiser les courses](#courses), [protéger les informations](#informations), [trouver les relais à Lyon](#relais), [questions fréquentes](#faq).

## <a id="besoin"></a>Quel coup de main demander ?

Décrivez un geste concret : récupérer quelques courses, porter des sacs jusqu’au logement, accompagner une promenade ou aider à comprendre une démarche numérique simple. Une demande limitée permet à la personne qui aide de savoir si elle peut l’assurer.

| Besoin | Ce qu’il faut préciser |
| --- | --- |
| Courses | Liste, lieu d’achat ou de retrait, horaire, volume et façon de régler les achats. |
| Livraison ou colis | Conditions de retrait, encombrement et moment de remise, sans code d’accès publié. |
| Trajet d’un adulte | Départ, arrivée, horaires et accompagnement réellement nécessaire ; permis et assurance à vérifier. |
| Compagnie | Activité souhaitée et créneau convenu avec la personne concernée. |
| Démarche simple | Aide à comprendre ou utiliser un outil, avec la personne présente et maîtresse de ses validations. |

Les [CGU](/cgu) excluent notamment les soins médicaux, paramédicaux et l’aide corporelle, comme la prise de médicaments, les pansements ou la toilette. Un trajet entre particuliers n’est pas une prestation de transport sanitaire. N’organisez pas un coup de main en supposant qu’il remplacera ces services.

## <a id="proche"></a>Peut-on publier une demande pour un parent ou un voisin ?

Un membre peut présenter un besoin pour un proche extérieur à Guardiens **avec son accord**, et rester l’interlocuteur de l’échange du début à la fin. Demandez ce que la personne souhaite, qui peut venir et quelles informations sont nécessaires.

Pour une personne sous protection juridique, la demande doit venir d’elle-même ou de la personne chargée de sa protection, dans la limite de ses pouvoirs. Un lien familial ne permet pas de décider à sa place de toutes les démarches ou de tous les accès.

Dans l’annonce publique, décrivez la tâche plutôt qu’un dossier personnel. Vous pouvez demander une aide pour apporter des courses sans exposer un diagnostic, des documents administratifs, l’adresse exacte ou un code de porte. Ces détails ne servent pas à faire comprendre le besoin.

Si une personne doit entrer au domicile, convenez de son arrivée et de ce qui sera fait avec la personne aidée. Un contrôle de document d’identité, lorsqu’il est affiché sur un profil, ne garantit ni la fiabilité ni une compétence d’accompagnement.

## <a id="courses"></a>Comment préparer la liste, le paiement et la remise ?

Rédigez une liste compréhensible et indiquez les restrictions utiles, les quantités et ce qu’il faut faire si un produit manque. Précisez le poids ou le volume à transporter et les accès : étage, ascenseur et point de remise. La personne reste libre de refuser une charge qu’elle ne peut pas porter.

Pour les achats, privilégiez un règlement que vous effectuez vous-même, par exemple une commande déjà payée à retirer si le commerce le permet. Si une dépense est avancée pour vous, convenez-en avant : les CGU autorisent son remboursement **au montant exact sur présentation du ticket**. Cela se distingue du paiement d’un service, qui est interdit.

La personne qui aide reste étrangère aux moyens de paiement et aux comptes de la personne vulnérable : ne lui confiez ni carte, ni code, ni chéquier ou accès bancaire. Elle ne doit pas solliciter ou accepter un don d’argent, un prêt, une procuration ou un cadeau de valeur. Un merci ou un moment convivial n’est pas une rémunération.

**Exemple à adapter :** « Besoin d’un coup de main pour récupérer une commande de courses déjà réglée et la déposer à Lyon. Deux sacs à transporter ; créneau et accès à préciser ensemble. Je reste l’interlocuteur pour organiser la remise avec la personne concernée. »

## <a id="informations"></a>Et pour une démarche administrative ou numérique ?

Un coup de main peut aider à lire une consigne ou à se repérer sur un site. Gardez la main sur la connexion, les documents et les validations. Ne transmettez pas vos mots de passe dans l’annonce ou la messagerie et ne laissez pas de copies de vos documents sans nécessité.

La [CNIL détaille les précautions d’accompagnement social et numérique](https://www.cnil.fr/fr/professionnels-du-secteur-social-comment-mieux-proteger-les-donnees-de-vos-usagers-demarches-en-ligne), notamment la confidentialité et l’absence de conservation des identifiants après une séance. Ces recommandations visent les intervenants de ce secteur ; elles ne transforment pas un voisin qui aide en représentant autorisé à agir en votre nom.

Si une démarche exige de gérer un dossier ou d’agir à la place de la personne, adressez-vous à un service compétent. [France services propose un accompagnement gratuit dans les démarches](https://www.france-services.gouv.fr/notre-mission/questions-frequentes). Consultez ses informations pour trouver le lieu et l’aide adaptés, sans supposer que toute formalité pourra être achevée sur place.

## <a id="relais"></a>Quels relais connaître à Lyon pour un besoin durable ?

Les [Maisons de la Métropole de Lyon et l’accueil social municipal](https://www.lyon.fr/vie-pratique/action-sociale-et-solidarite/laccueil-social) peuvent orienter sur les difficultés du quotidien et les démarches. Pour l’alimentation, la [Ville de Lyon présente ses aides et relais](https://www.lyon.fr/vie-pratique/action-sociale-et-solidarite/lacces-lalimentation), dont les possibilités autour du portage de repas. Les conditions dépendent de la situation ; une information générale ne garantit pas l’attribution d’une aide.

Ces services et les professionnels adaptés sont à solliciter lorsque le besoin dépasse un échange ponctuel, concerne l’autonomie ou nécessite une continuité. Une publication sur Guardiens ne garantit pas qu’une personne pourra venir, ni qu’elle sera remplacée en cas d’absence.

Pour une demande d’entraide, la plateforme est **actuellement 100 % gratuite**, selon les [conditions tarifaires](/tarifs), et les personnes ne sont pas rémunérées. Les achats restent distincts du service. Le [guide des petites missions](/actualites/petites-missions-entraide-guardiens) explique le parcours ; si vous hésitez à formuler votre besoin, les [conseils pour demander un coup de main](/actualites/oser-demander-coup-de-main-pres-de-chez-soi) peuvent vous aider.

## <a id="faq"></a>Questions fréquentes

:::faq
### Puis-je demander une aide aux courses pour un proche ?
Oui, avec son accord, en restant l’interlocuteur de l’échange. S’il est sous protection juridique, la demande doit venir de lui-même ou de la personne chargée de sa protection, dans la limite de ses pouvoirs.

### Faut-il payer la personne qui aide ?
L’entraide Guardiens se fait sans rémunération et la plateforme est actuellement gratuite. Les achats sont réglés par la personne aidée ou remboursés au montant exact sur ticket lorsqu’une avance a été convenue.

### Peut-on confier une carte bancaire pour faire les courses ?
La personne qui aide une personne vulnérable doit rester étrangère à ses moyens de paiement et à ses comptes. Prévoyez plutôt un règlement effectué par la personne aidée ou une avance convenue avec remboursement exact sur justificatif.

### Peut-on demander une aide à la prise de médicaments ou à la toilette ?
Ces soins et aides corporelles sont exclus de l’entraide Guardiens. Adressez-vous aux professionnels ou services compétents pour organiser une réponse adaptée.

### Qui peut aider à remplir une démarche administrative ?
Un coup de main peut aider à comprendre ou utiliser un outil, en gardant la maîtrise de vos informations. Pour un dossier ou une intervention en votre nom, renseignez-vous auprès de France services ou de l’accueil social.

### Une publication garantit-elle une aide disponible à Lyon ?
Non. Elle permet de présenter le besoin et d’échanger avec les personnes intéressées. Pour un besoin durable ou essentiel, prévoyez une organisation et des relais adaptés en dehors d’une réponse éventuelle.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='f823df5c-cbfe-4438-af84-395abfb3c314'::uuid AND slug='courses-aide-domicile-entraide-senior-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/petites-missions-entraide-guardiens' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Aide aux courses à Lyon : organiser un coup de main pour soi ou un proche'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Une aide ponctuelle pour les courses ou un trajet se prépare avec la personne concernée. Voici ce qu’il faut préciser et les relais utiles à Lyon.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Aide aux courses à Lyon : entraide et solutions utiles'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Courses, compagnie ou démarche simple à Lyon : préparez une aide ponctuelle pour vous ou un proche, avec son accord, et trouvez les relais adaptés.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une adulte apporte des sacs de courses à un homme âgé devant la porte d’un logement.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"CGU","url":"/cgu"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"guide des petites missions","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"conseils pour demander un coup de main","url":"/actualites/oser-demander-coup-de-main-pres-de-chez-soi"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:40:17.231879+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot31_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot31_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot31_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Aide aux courses à Lyon : organiser un coup de main pour soi ou un proche',
    excerpt='Une aide ponctuelle pour les courses ou un trajet se prépare avec la personne concernée. Voici ce qu’il faut préciser et les relais utiles à Lyon.',
    meta_title='Aide aux courses à Lyon : entraide et solutions utiles',
    meta_description='Courses, compagnie ou démarche simple à Lyon : préparez une aide ponctuelle pour vous ou un proche, avec son accord, et trouvez les relais adaptés.',
    hero_image_alt='Une adulte apporte des sacs de courses à un homme âgé devant la porte d’un logement.',
    internal_links='[{"text":"CGU","url":"/cgu"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"guide des petites missions","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"conseils pour demander un coup de main","url":"/actualites/oser-demander-coup-de-main-pres-de-chez-soi"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='courses-aide-domicile-entraide-senior-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Déménagement entre particuliers : préparer un coup de main sans improviser

**Une aide au déménagement se prépare à partir des objets, des accès et des personnes réellement disponibles.** Avant de demander des bras, dites ce qu’il faut déplacer, d’où à où, avec quel véhicule et dans quelles conditions. Trois personnes sur une matinée ne constituent pas une règle valable pour tous les logements.

Sur Guardiens, un coup de main ponctuel entre particuliers se fait sans rémunération. Il peut compléter votre organisation, mais ne remplace pas un déménageur pour une opération qui demande du matériel, des compétences ou une prise en charge professionnelle.

**Repères :** [définir l’aide](#besoin), [rédiger la demande](#demande), [préparer les accès](#preparation), [vérifier les frais et assurances](#assurance), [prévoir les animaux](#animaux), [questions fréquentes](#faq).

## <a id="besoin"></a>Quelle aide demander et quand faire appel à un professionnel ?

Séparez les tâches : préparer les cartons, déplacer ce qui peut l’être sans difficulté particulière, organiser une remise de clés ou donner un coup de main au rangement. Une personne peut accepter une tâche limitée sans pouvoir assurer le chargement de tous les meubles.

Pour une charge lourde ou encombrante, un passage difficile ou un équipement particulier, faites évaluer l’opération par un professionnel. Il n’existe pas de poids ou d’étage en dessous duquel tout portage deviendrait sûr. Un meuble moins lourd peut aussi poser problème selon sa prise, le trajet ou les possibilités des personnes.

Dites quels objets restent à traiter et qui s’en chargera. Ne prévoyez pas de monter un meuble par une fenêtre, de travailler en hauteur ou de démonter une installation électrique avec des personnes venues pour porter des cartons : ces activités ne relèvent pas du coup de main annoncé et certaines sont exclues par les [CGU](/cgu).

## <a id="demande"></a>Quelles informations mettre dans la demande ?

| Information | Ce qu’il faut rendre concret |
| --- | --- |
| Date et créneau | Moment souhaité, marge possible et durée estimée à discuter. |
| Objets | Nombre et volume approximatifs des cartons, meubles, objets fragiles et charges particulières. |
| Accès | Étages, ascenseur et dimensions utiles, escaliers, distance jusqu’au véhicule. |
| Organisation | Aide déjà confirmée, véhicule et matériel prévus, tâche précise proposée. |
| Limites | Ce qui sera confié à un professionnel ou ne doit pas être tenté. |

**Exemple à adapter :** « Besoin d’un coup de main pour déplacer des cartons déjà fermés vers une camionnette. Départ d’un deuxième étage avec ascenseur ; dimensions, stationnement et volume à vérifier ensemble. Le transport du meuble encombrant sera organisé séparément. Créneau à convenir avant confirmation. »

Ce message doit refléter votre situation. N’annoncez pas une durée certaine avant de connaître les conditions et ne comptez pas sur des personnes qui n’ont pas confirmé leur venue. Une publication ne garantit ni réponse, ni équipe, ni remplacement le jour du déménagement.

Le [guide pour demander de l’aide près de chez soi](/actualites/oser-demander-coup-de-main-pres-de-chez-soi) et les [idées de coups de main](/actualites/idees-coups-de-main-entraide-pres-de-chez-soi) peuvent aider à limiter le besoin à une tâche compréhensible.

## <a id="preparation"></a>Que préparer avant l’arrivée des personnes qui aident ?

Fermez et identifiez les cartons, séparez les objets fragiles et dégagez les passages. Vérifiez les accès des deux logements et les conditions d’utilisation de l’ascenseur. Une sangle ou un diable disponible ne signifie pas que toute personne saura ou pourra l’utiliser pour la charge prévue.

Les [repères de l’INRS pour le déménagement professionnel](https://www.inrs.fr/metiers/transport/demenagement/demenagement-agir.html) soulignent notamment l’intérêt des accès dégagés et d’un matériel adapté. Ces repères peuvent vous aider à vérifier les accès et le matériel avant le jour prévu.

Prévoyez du temps et la possibilité de s’arrêter, de reporter une tâche ou de la confier à un professionnel. L’objectif n’est pas de terminer coûte que coûte dans le créneau annoncé. Chaque personne doit pouvoir dire qu’un objet ou un trajet dépasse ses possibilités.

Pour le véhicule, vérifiez réservation, conducteur, contrat de location et stationnement à chaque adresse. Les démarches varient selon la commune et l’occupation prévue : renseignez-vous auprès de la mairie. À titre d’exemple, [Lyon propose une réservation d’emplacement temporaire](https://www.lyon.fr/demarche/stationnement/reserver-un-emplacement-pour-le-stationnement-temporaire-de-vehicules) avec un délai minimal indiqué sur sa page. Ce délai et les conditions lyonnaises ne valent pas pour toute la France.

## <a id="assurance"></a>Quels frais et quelles assurances clarifier ?

La plateforme est **actuellement 100 % gratuite**, selon les [conditions tarifaires](/tarifs). Le coup de main se fait sans rémunération : ni prix horaire, ni pourboire ou cadeau servant de paiement. Vous convenez ensemble d’un merci, d’un moment partagé ou d’une aide une autre fois, sans exiger un échange équivalent avant la publication.

Le camion, le stationnement, les cartons et les dépenses personnelles ne sont pas automatiquement fournis ou pris en charge. Prévoyez-les dans votre organisation. Une dépense avancée pour une autre personne doit avoir été convenue et ne peut être remboursée qu’au montant exact sur justificatif, selon les CGU.

**La gratuité n’assure pas automatiquement les dommages ou blessures.** Demandez à vos assureurs ce que couvrent les contrats pour les personnes qui aident, les objets déplacés et le véhicule. Le contrat d’un utilitaire de location ne couvre pas nécessairement tout le chargement ou toute personne qui le conduit.

[Service Public présente la responsabilité civile habitation](https://www.service-public.gouv.fr/particuliers/vosdroits/F2123) et l’[indemnisation des accidents de la vie courante](https://www.service-public.gouv.fr/particuliers/vosdroits/F3077). L’application dépend des faits et garanties ; Guardiens ne fournit pas d’assurance de déménagement. Une formule générale dans une annonce ne désigne pas à l’avance qui paiera toute casse.

## <a id="animaux"></a>Comment organiser la journée avec un chat ou un chien ?

Prévoyez qui s’occupe de l’animal pendant les ouvertures de portes et les déplacements. Cette responsabilité ne doit pas être confiée implicitement aux personnes qui portent les meubles.

Pour un chat, [Cats Protection conseille de préparer une pièce calme et sécurisée](https://www.cats.org.uk/help-and-advice/caring-for-your-cat/home-and-environment/moving-home-with-your-cat), avec ses ressources et des consignes pour que les personnes présentes n’ouvrent pas la porte par erreur. Adaptez l’organisation à l’animal et demandez conseil au vétérinaire en cas de besoin particulier, sans lui imposer un traitement ou une durée d’adaptation trouvés dans un guide général.

Si vous cherchez une aide ponctuelle pour une promenade ou une présence, décrivez ce besoin séparément. Pour une absence avec une personne qui séjourne réellement dans le logement et assure les tâches convenues, le [guide du house-sitting](/actualites/c-est-quoi-le-house-sitting) présente ce fonctionnement. Un logement vide entre deux baux ne garantit pas à lui seul les conditions d’une garde.

## <a id="faq"></a>Questions fréquentes

:::faq
### Combien de personnes faut-il pour déménager un appartement ?
Cela dépend des objets, des accès, du véhicule et des capacités des personnes. Décrivez la situation et confirmez l’organisation ; un nombre par taille de logement ou par étage ne suffit pas à la déterminer.

### Peut-on demander une aide gratuite au déménagement ?
Un coup de main ponctuel entre particuliers est possible dans le cadre des CGU, sans rémunération. La plateforme est actuellement gratuite, mais véhicule, matériel et autres dépenses restent à organiser.

### Qui paie si un meuble est abîmé ?
Cela dépend des faits et des garanties. Vérifiez avant le déménagement les contrats couvrant les objets, les personnes et le véhicule ; la gratuité ne permet pas de conclure à une couverture automatique.

### Faut-il réserver le stationnement du camion ?
Renseignez-vous auprès de chaque commune selon l’emplacement et l’occupation prévus. Les démarches, délais et coûts varient ; une règle locale ne doit pas être appliquée à toute la France.

### Peut-on demander de porter un objet très lourd ?
Faites évaluer une charge ou un passage difficile par un professionnel adapté. Ni un poids inférieur à un seuil ni la présence de plusieurs personnes ne garantissent qu’une opération est sûre.

### Comment éviter que les animaux passent une porte ouverte ?
Organisez leur prise en charge avant le début et informez toutes les personnes présentes. Pour un chat, une pièce calme sécurisée et clairement signalée peut faire partie de la préparation, selon ses besoins.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='8569a535-d61b-4241-bdf7-7ebd28f72567'::uuid AND slug='demenagement-entraide-locale-france';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/petites-missions-entraide-guardiens' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Déménagement entre particuliers : préparer un coup de main sans improviser'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Décrivez ce qu’il faut déplacer et les accès, confirmez qui vient et préparez le matériel : une aide au déménagement se décide selon les conditions réelles.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Aide au déménagement : bien organiser l’entraide'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Cartons, accès, véhicule, assurance et animaux : préparez une aide ponctuelle au déménagement, sans nombre de personnes ni durée promis pour tous les logements.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Des adultes portent un canapé, des cartons et une plante entre un immeuble et une camionnette.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"CGU","url":"/cgu"},{"text":"guide pour demander de l’aide près de chez soi","url":"/actualites/oser-demander-coup-de-main-pres-de-chez-soi"},{"text":"idées de coups de main","url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:25:10.852926+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot31_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot31_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot31_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Déménagement entre particuliers : préparer un coup de main sans improviser',
    excerpt='Décrivez ce qu’il faut déplacer et les accès, confirmez qui vient et préparez le matériel : une aide au déménagement se décide selon les conditions réelles.',
    meta_title='Aide au déménagement : bien organiser l’entraide',
    meta_description='Cartons, accès, véhicule, assurance et animaux : préparez une aide ponctuelle au déménagement, sans nombre de personnes ni durée promis pour tous les logements.',
    hero_image_alt='Des adultes portent un canapé, des cartons et une plante entre un immeuble et une camionnette.',
    internal_links='[{"text":"CGU","url":"/cgu"},{"text":"guide pour demander de l’aide près de chez soi","url":"/actualites/oser-demander-coup-de-main-pres-de-chez-soi"},{"text":"idées de coups de main","url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='demenagement-entraide-locale-france' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
