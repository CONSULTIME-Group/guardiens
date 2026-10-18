-- Refonte des guides jardinage-grenoble-annecy, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot33_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot33_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot33_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot33_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('746dd0ef-85c2-48b3-855f-7da8514f8f75'::uuid,'0772cb38-0044-41b3-96b0-b5e06c19f6cd'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Entraide jardinage à Grenoble : préparer un coup de main ponctuel

**Pour trouver une aide ponctuelle au jardin à Grenoble, décrivez une tâche précise plutôt que « remettre tout le jardin en état ».** Désherber un petit carré à la main, préparer des semis ou planter quelques végétaux ne demande pas la même organisation. La personne intéressée doit comprendre le travail, les accès et le matériel avant d’accepter.

Sur Guardiens, vous pouvez présenter ce besoin à un réseau d’entraide entre particuliers. La plateforme est **actuellement 100 % gratuite** et le coup de main se fait sans rémunération. Une publication ne garantit ni une réponse dans votre quartier ni un jardin terminé à une date donnée.

**Repères :** [choisir une tâche](#tache), [préparer la demande](#demande), [convenir des conditions](#conditions), [trouver un jardin collectif](#collectif), [prévoir une absence](#absence), [questions fréquentes](#faq).

## <a id="tache"></a>Quels petits travaux de jardinage demander ?

Partez de ce que vous souhaitez faire ensemble et de ce qui peut être réalisé dans des conditions adaptées. Le mot « petit » ne rend pas automatiquement une tâche simple : un bac lourd, une pente ou un outil mal connu peuvent changer la situation.

| Exemple de besoin | Ce qu’il faut décrire |
| --- | --- |
| Désherbage manuel | Zone concernée, végétaux à conserver et état du sol. |
| Semis ou plantations | Nombre de contenants, plants disponibles et emplacement prévu. |
| Préparation d’un potager | Travail attendu, surface et outils déjà présents. |
| Arrosage ponctuel | Plantes identifiées, accès à l’eau et consignes adaptées aux restrictions. |
| Rangement de petits accessoires | Volume, accès au rangement et charges à manipuler. |

Les [CGU](/cgu) excluent notamment les travaux en hauteur, l’élagage et l’abattage, la construction, ainsi que les interventions électriques. Une clôture à construire ou une branche à couper en hauteur ne devient pas une mission admissible parce qu’elle se trouve dans un jardin. Les activités professionnelles et réglementées ne relèvent pas non plus de cette entraide.

Pour une intervention technique, dangereuse ou un entretien à assurer durablement, adressez-vous à un professionnel adapté. N’attendez pas d’un voisin volontaire qu’il apporte une qualification ou un équipement qu’il n’a pas déclaré avoir.

## <a id="demande"></a>Que mettre dans une demande à Grenoble ?

Indiquez le secteur, un créneau possible et une tâche délimitée. Gardez l’adresse exacte et les codes d’accès pour l’échange privé, une fois les conditions convenues. Une photo du travail à faire peut aider si elle ne montre pas d’informations personnelles ou de tiers sans leur accord.

Décrivez les accès réels : étage pour une terrasse, marches, distance à parcourir avec le matériel, chemin étroit ou terrain irrégulier. Ne déduisez pas la difficulté du seul nom du quartier.

**Exemple à adapter :** « À Grenoble, je cherche un coup de main pour désherber à la main un carré de potager et préparer quelques plantations. Je serai présent. Outils manuels disponibles ; surface, accès et créneau à préciser ensemble. »

Le formulaire sert à **publier un besoin**. Si vous souhaitez plutôt aider, présentez vos compétences et vos limites dans les [savoir-faire de votre profil](/profile?section=savoir-faire). Le [guide des petites missions](/actualites/petites-missions-entraide-guardiens) détaille ce parcours.

## <a id="conditions"></a>Outils, achats, eau : que convenir avant de commencer ?

Confirmez la tâche acceptée, le temps dont chacun dispose, les outils et les protections nécessaires. Personne n’est tenu d’utiliser une machine qu’il ne maîtrise pas ou de soulever une charge qu’il ne peut pas porter. Arrêtez si les conditions ne correspondent pas à ce qui avait été décrit.

Précisez qui fournit les plants, le terreau ou les consommables. L’entraide sans rémunération ne rend pas ces achats gratuits. Une dépense avancée pour l’autre peut être remboursée au montant exact sur justificatif si cela a été convenu ; elle ne doit pas servir à payer le service. Vous n’avez pas à inventer un échange d’heures équivalentes : voyez ensemble ce qui convient, selon le cadre des CGU.

Pour l’eau, consultez [VigiEau à l’adresse concernée](https://vigieau.gouv.fr/) et les consignes applicables. Une habitude d’arrosage ne remplace pas une restriction en cours. Vérifiez aussi les conditions d’utilisation du lieu et demandez à votre assureur ce que couvre votre contrat pour l’aide envisagée : Guardiens ne fournit pas une assurance qui couvrirait tous les dommages.

Vous pouvez vous rencontrer avant si vous le souhaitez tous les deux. Un document d’identité contrôlé, lorsqu’un profil en fait état, ne prouve pas une compétence de jardinage et ne garantit pas le déroulement de l’échange.

## <a id="collectif"></a>Et pour jardiner avec d’autres sans avoir son propre terrain ?

Un jardin collectif répond à un autre besoin : cultiver et apprendre avec un groupe dans la durée. La Ville répertorie notamment le [jardin partagé Beauvert, accompagné par la Maison des Habitants Capuche](https://www.grenoble.fr/lieu/3240/137-le-jardin-partage-beauvert.htm?UTB_RESET=1). Contactez le gestionnaire pour connaître le fonctionnement actuel, les possibilités de participation et les règles d’accès.

Ce n’est pas une annonce Guardiens et cette fiche ne signifie pas qu’une parcelle est disponible. Dans un espace collectif, obtenez l’accord du gestionnaire avant d’organiser l’intervention d’une personne extérieure. Un jardin public ouvert à la promenade n’est pas un terrain où chacun peut planter ou prélever librement.

## <a id="absence"></a>Besoin d’aide seulement pendant vos vacances ?

Distinguez une séance de jardinage d’un passage régulier pendant une absence. Le [guide d’arrosage à Grenoble](/actualites/arroser-plantes-vacances-grenoble) aide à préparer les accès, les consignes et le relais. Pour une maison à occuper avec des tâches d’entretien convenues, consultez plutôt les [conseils pour entretenir un jardin pendant une garde](/actualites/entretenir-jardin-pendant-absence).

La gratuité actuelle de la plateforme suit les [conditions tarifaires](/tarifs). Si la tâche est essentielle à une date précise, prévoyez une solution de relais avant de compter sur une réponse éventuelle.

## <a id="faq"></a>Questions fréquentes

:::faq
### Quel jardinage peut-on demander sur Guardiens à Grenoble ?
Une aide ponctuelle et délimitée, comme un désherbage manuel ou des plantations, si les conditions sont adaptées aux personnes. Les travaux dangereux, en hauteur, d’élagage, d’abattage ou de construction sont notamment exclus.

### Faut-il payer la personne qui vient aider ?
Non, l’entraide se fait sans rémunération et la plateforme est actuellement gratuite. Les achats restent distincts ; une avance convenue peut être remboursée au montant exact sur justificatif.

### Peut-on publier une offre de jardinage dans le formulaire de mission ?
Ce formulaire sert à présenter un besoin. Pour proposer votre aide, renseignez plutôt vos savoir-faire dans votre profil et échangez sur les demandes qui vous conviennent.

### Faut-il fournir les outils ?
Précisez avant l’échange qui fournit chaque outil et dans quelles conditions il peut être utilisé. N’attendez pas de matériel ou de compétence non convenus.

### Comment participer au jardin partagé Beauvert ?
Consultez la fiche de la Ville et contactez le gestionnaire indiqué pour connaître les modalités actuelles. Une fiche publique ne garantit ni une place ni l’accès libre aux parcelles.

### Une demande garantit-elle une aide avant mon départ ?
Non. Confirmez les conditions avec une personne intéressée et prévoyez un relais si la tâche ne peut pas attendre. Les passages d’arrosage pendant une absence demandent une organisation spécifique.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='746dd0ef-85c2-48b3-855f-7da8514f8f75'::uuid AND slug='jardinage-entraide-locale-grenoble';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/jardinage-entraide-locale-grenoble' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Entraide jardinage à Grenoble : préparer un coup de main ponctuel'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un potager à reprendre ou des plantations à préparer ? Décrivez une tâche limitée, les accès et le matériel, puis échangez avant de convenir du coup de main.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Entraide jardinage à Grenoble : demander un coup de main'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Désherbage manuel, plantations ou petit potager à Grenoble : précisez la tâche, les accès et le matériel pour organiser une entraide sans rémunération.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux adultes échangent une paire de gants au milieu de bacs de potager, avec des montagnes en arrière-plan.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"CGU","url":"/cgu"},{"text":"savoir-faire de votre profil","url":"/profile?section=savoir-faire"},{"text":"guide des petites missions","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"guide d’arrosage à Grenoble","url":"/actualites/arroser-plantes-vacances-grenoble"},{"text":"conseils pour entretenir un jardin pendant une garde","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:25:17.862483+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot33_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot33_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot33_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Entraide jardinage à Grenoble : préparer un coup de main ponctuel',
    excerpt='Un potager à reprendre ou des plantations à préparer ? Décrivez une tâche limitée, les accès et le matériel, puis échangez avant de convenir du coup de main.',
    meta_title='Entraide jardinage à Grenoble : demander un coup de main',
    meta_description='Désherbage manuel, plantations ou petit potager à Grenoble : précisez la tâche, les accès et le matériel pour organiser une entraide sans rémunération.',
    hero_image_alt='Deux adultes échangent une paire de gants au milieu de bacs de potager, avec des montagnes en arrière-plan.',
    internal_links='[{"text":"CGU","url":"/cgu"},{"text":"savoir-faire de votre profil","url":"/profile?section=savoir-faire"},{"text":"guide des petites missions","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"guide d’arrosage à Grenoble","url":"/actualites/arroser-plantes-vacances-grenoble"},{"text":"conseils pour entretenir un jardin pendant une garde","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='jardinage-entraide-locale-grenoble' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Entraide jardinage à Annecy : jardin, terrasse ou balcon

**Un coup de main au jardin à Annecy commence par une tâche claire, des accès décrits et l’accord de la personne responsable du lieu.** Quelques pots sur un balcon, un carré de potager ou un massif ne demandent pas les mêmes gestes. Présentez ce que vous souhaitez faire, sans supposer qu’une matinée ou une paire de bras conviendra à tout.

Guardiens permet de demander une aide ponctuelle entre particuliers, sans rémunération. La plateforme est **actuellement 100 % gratuite** ; plants, terreau ou autres achats restent à prévoir séparément. Une demande ne garantit pas qu’une personne sera disponible dans votre quartier.

**Repères :** [définir le besoin](#besoin), [vérifier les règles du lieu](#lieu), [préparer les conditions](#preparation), [formuler la demande](#demande), [découvrir les jardins partagés](#jardins), [questions fréquentes](#faq).

## <a id="besoin"></a>Quelle aide ponctuelle demander ?

Décrivez le résultat attendu et les gestes envisagés : préparer quelques contenants, semer, planter ou désherber manuellement une zone délimitée. La personne doit pouvoir évaluer si cela correspond à ses capacités, au matériel disponible et au temps dont elle dispose.

| Espace concerné | Informations utiles |
| --- | --- |
| Balcon | Étage, ascenseur, poids des contenants et protection de ce qui se trouve en dessous. |
| Terrasse | Accès, circulation, point d’eau et emplacement des pots. |
| Massif ou petit potager | Zone à traiter, végétaux à conserver et outils nécessaires. |
| Jardin collectif | Gestionnaire, autorisation d’intervention et règlement du site. |

Un jardin n’autorise pas tous les travaux sur Guardiens. Les [CGU](/cgu) excluent notamment la hauteur, l’élagage et l’abattage, la construction et les interventions électriques. N’y publiez pas une demande de taille en hauteur ou de montage d’un ouvrage comme un simple coup de main de jardinage. Les activités professionnelles et réglementées sont également exclues.

Faites appel au professionnel adapté lorsque l’intervention demande des compétences, un équipement ou une prise en charge que l’échange entre particuliers ne peut pas assurer.

## <a id="lieu"></a>Peut-on intervenir sur un balcon ou dans un jardin de résidence ?

Vérifiez les règles applicables au lieu avant d’organiser le travail. Un espace proche de votre logement peut être une partie commune, ou une partie commune dont vous avez seulement la jouissance privative. Cela ne donne pas le droit de le transformer librement.

Consultez votre règlement et, si nécessaire, le syndic, le bailleur ou le gestionnaire. [Service Public explique le rôle du règlement de copropriété](https://www.service-public.gouv.fr/particuliers/vosdroits/F2589) dans l’utilisation des espaces. Ne déplacez pas une installation, ne plantez pas dans une zone commune et n’organisez pas une intervention extérieure en supposant l’accord collectif acquis.

Sur un balcon, précisez aussi comment acheminer les sacs et contenants. Si leur poids, une fixation ou l’état du support pose question, faites vérifier la situation par l’interlocuteur compétent ; une personne volontaire ne peut pas confirmer la capacité d’une structure à l’œil.

## <a id="preparation"></a>Que préparer avant le coup de main ?

Convenez du créneau, des tâches acceptées et du matériel fourni. Expliquez ce qui peut être déplacé ou touché, où se trouvent les plantes à conserver et comment seront rangés les accessoires. Ne présentez pas un outil motorisé comme adapté à tous les débutants.

Pour les achats, privilégiez ce que vous fournissez vous-même. Si quelqu’un avance une dépense convenue pour vous, son remboursement au montant exact sur justificatif est distinct d’une rémunération, interdite dans ce cadre. Vous n’avez pas à proposer une prestation équivalente en retour ; le formulaire rappelle un remerciement ou un coup de main à convenir ensemble.

Pour l’arrosage, vérifiez [VigiEau à l’adresse du jardin](https://vigieau.gouv.fr/) et les règles du site. Il n’existe pas un horaire ou un volume à reprendre pour toutes les situations d’Annecy. Prévoyez également les accès et la fermeture du lieu, sans publier de code ou d’adresse précise dans l’annonce.

Interrogez votre assureur sur le coup de main envisagé, les personnes et les dommages couverts. Guardiens ne fournit pas une assurance générale de jardinage. Une rencontre préalable est possible si vous le souhaitez tous les deux ; un contrôle de document d’identité ne garantit pas une compétence.

## <a id="demande"></a>Comment formuler une demande facile à comprendre ?

**Exemple à adapter :** « À Annecy, je cherche un coup de main pour préparer quelques pots et planter les végétaux que je fournis. Terrasse accessible par un escalier ; pas de travail en hauteur. Je serai présent, avec outils manuels et terreau. Créneau et charges à confirmer ensemble. »

Ajoutez le secteur, la tâche et les contraintes utiles. Une photo peut aider sans exposer des voisins, des documents ou des accès privés. Préférez une zone limitée à « refaire le jardin », puis confirmez les conditions avec la personne intéressée.

Le [guide des petites missions](/actualites/petites-missions-entraide-guardiens) explique comment publier ce besoin. Pour **proposer votre aide**, présentez plutôt vos [savoir-faire dans votre profil](/profile?section=savoir-faire). La demande de mission et la présentation des compétences sont deux démarches différentes.

## <a id="jardins"></a>Jardins partagés d’Annecy : une autre façon de jardiner ensemble

La Ville met à disposition un [règlement des jardins partagés et familiaux, version 2024](https://www.annecy.fr/fileadmin/form_definitions/Reglement_interieur_general_jardins_partages_familiaux_2024.pdf). Il distingue les jardins gérés par la Ville avec des référents et ceux gérés par des associations, avec des conditions d’attribution et des listes d’attente. Une démarche Guardiens ne vous attribue pas une parcelle municipale.

Pour une parcelle déjà attribuée, vérifiez les conditions d’aide ou de remplacement avec le gestionnaire. Le règlement prévoit notamment une information écrite de la Ville ou de l’association lors d’un remplacement ponctuel par une personne extérieure. Le bénéficiaire garde ses obligations ; il ne peut pas transférer librement le droit de cultiver.

Consultez la Ville ou l’association pour les modalités actuelles, les éventuels frais et l’accès au site. L’entraide gratuite sur Guardiens n’implique pas que tous les jardins collectifs soient gratuits ou ouverts sans inscription.

Si votre besoin porte seulement sur des passages pendant les vacances, le [guide d’arrosage à Annecy](/actualites/arroser-plantes-vacances-annecy) traite cette organisation. Pour une absence avec une maison à occuper et des tâches convenues, consultez les [conseils d’entretien du jardin pendant une garde](/actualites/entretenir-jardin-pendant-absence). Les [conditions tarifaires](/tarifs) précisent la gratuité actuelle de la plateforme.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on demander de l’aide pour quelques pots sur un balcon à Annecy ?
Oui, pour une tâche ponctuelle admissible et adaptée aux personnes. Décrivez l’étage, les accès, les charges et le matériel ; vérifiez les règles du lieu avant d’intervenir.

### L’aide au jardin est-elle payante sur Guardiens ?
Le coup de main se fait sans rémunération et la plateforme est actuellement gratuite. Les fournitures restent distinctes ; une dépense avancée et convenue peut être remboursée au montant exact sur justificatif.

### Puis-je demander une taille d’arbre en hauteur ?
Non. Les travaux en hauteur, l’élagage et l’abattage font notamment partie des exclusions des CGU. Adressez-vous à un professionnel adapté.

### Comment proposer mes compétences de jardinage ?
Renseignez les savoir-faire de votre profil en précisant ce que vous savez et souhaitez faire. Le formulaire de petite mission sert à présenter un besoin, pas à publier une offre de service.

### Guardiens permet-il d’obtenir une parcelle dans un jardin partagé d’Annecy ?
Non. L’attribution relève de la Ville ou de l’association gestionnaire, selon leurs conditions et disponibilités. Consultez les informations municipales et le règlement du jardin concerné.

### Peut-on se faire remplacer dans un jardin municipal pendant une absence ?
Vérifiez les règles auprès du gestionnaire. Le règlement municipal consulté prévoit notamment de prévenir par écrit la Ville ou l’association pour un remplacement ponctuel par une personne extérieure, sans transfert du droit de cultiver.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='0772cb38-0044-41b3-96b0-b5e06c19f6cd'::uuid AND slug='jardinage-entraide-quartier-annecy';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/jardinage-entraide-quartier-annecy' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Entraide jardinage à Annecy : jardin, terrasse ou balcon'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Quelques plantations, un carré à désherber ou des pots à préparer : organisez une aide ponctuelle à Annecy en tenant compte des accès et des règles du lieu.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Entraide jardinage à Annecy : jardin, balcon et potager'
    AND before_row.meta_description IS NOT DISTINCT FROM 'À Annecy, préparez un coup de main au jardin ou sur un balcon : tâche, accès, matériel, accord du gestionnaire et jardins partagés municipaux.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux adultes jardinent dans des massifs fleuris, avec des maisons, un lac et des montagnes en arrière-plan.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"CGU","url":"/cgu"},{"text":"guide des petites missions","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"savoir-faire dans votre profil","url":"/profile?section=savoir-faire"},{"text":"guide d’arrosage à Annecy","url":"/actualites/arroser-plantes-vacances-annecy"},{"text":"conseils d’entretien du jardin pendant une garde","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:40:17.152843+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot33_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot33_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot33_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Entraide jardinage à Annecy : jardin, terrasse ou balcon',
    excerpt='Quelques plantations, un carré à désherber ou des pots à préparer : organisez une aide ponctuelle à Annecy en tenant compte des accès et des règles du lieu.',
    meta_title='Entraide jardinage à Annecy : jardin, balcon et potager',
    meta_description='À Annecy, préparez un coup de main au jardin ou sur un balcon : tâche, accès, matériel, accord du gestionnaire et jardins partagés municipaux.',
    hero_image_alt='Deux adultes jardinent dans des massifs fleuris, avec des maisons, un lac et des montagnes en arrière-plan.',
    internal_links='[{"text":"CGU","url":"/cgu"},{"text":"guide des petites missions","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"savoir-faire dans votre profil","url":"/profile?section=savoir-faire"},{"text":"guide d’arrosage à Annecy","url":"/actualites/arroser-plantes-vacances-annecy"},{"text":"conseils d’entretien du jardin pendant une garde","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='jardinage-entraide-quartier-annecy' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
