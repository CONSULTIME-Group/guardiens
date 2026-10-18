-- Refonte des guides jardinage-lyon-labrador, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot34_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot34_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot34_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot34_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('623caac4-3e9a-489a-9ab0-af7c277f244c'::uuid,'e27e5a15-8e68-4d0d-85dc-9bc73543d393'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Entraide jardinage à Lyon : demander une aide ou rejoindre un jardin collectif

**À Lyon, une aide ponctuelle dans votre jardin et la participation à un jardin collectif répondent à deux besoins différents.** Pour quelques plantations ou un désherbage manuel, décrivez une tâche délimitée et ses conditions. Pour cultiver avec un groupe dans la durée, renseignez-vous sur les jardins partagés et familiaux auprès de leurs gestionnaires.

Guardiens permet de demander un coup de main entre particuliers, sans rémunération. La plateforme est **actuellement 100 % gratuite**, selon les [conditions tarifaires](/tarifs), mais une publication ne garantit pas de trouver une personne disponible dans votre secteur.

**Repères :** [choisir la bonne solution](#solution), [décrire la tâche](#demande), [préparer les conditions](#conditions), [jardiner collectivement à Lyon](#collectif), [prévoir les vacances](#vacances), [questions fréquentes](#faq).

## <a id="solution"></a>Quel type d’aide cherchez-vous ?

| Votre besoin | La démarche à préparer |
| --- | --- |
| Un coup de main ponctuel dans votre jardin | Décrire la tâche, les accès, les outils et votre disponibilité. |
| Présenter vos compétences pour aider | Renseigner les savoir-faire de votre profil et vos limites. |
| Cultiver avec un groupe | Contacter un jardin collectif et connaître ses conditions de participation. |
| Entretenir durablement un espace ou réaliser une intervention technique | Consulter un professionnel adapté au travail demandé. |
| Faire arroser pendant une absence | Préparer passages, consignes, accès et relais. |

Le jardinage admissible sur Guardiens doit rester ponctuel et compatible avec les [CGU](/cgu). Sont notamment exclus le travail en hauteur, l’élagage et l’abattage, la construction et les interventions électriques, ainsi que les activités professionnelles ou réglementées. La bonne volonté ne remplace pas une compétence ou un équipement.

## <a id="demande"></a>Comment décrire un coup de main utile ?

Remplacez « jardin à refaire » par une tâche observable : désherber manuellement une zone, préparer des semis, planter des végétaux fournis ou ranger de petits accessoires. Indiquez le secteur et un créneau, sans exposer publiquement l’adresse précise ou les codes d’accès.

Les conditions comptent davantage qu’une catégorie de quartier. Une cour, un balcon ou un jardin peuvent présenter des marches, un accès étroit, des charges à porter ou des espaces communs. Précisez-les au lieu de supposer que tous les jardins de l’ouest lyonnais demandent le même entretien ou que certaines catégories d’habitants seront disponibles.

**Exemple à adapter :** « À Lyon, je cherche un coup de main pour désherber à la main un petit massif et planter les végétaux que je fournis. Je serai présent. Accès par une cour, outils manuels disponibles ; surface et créneau à confirmer ensemble. »

Le formulaire de petite mission sert à **publier un besoin**. Si vous voulez aider, présentez vos [savoir-faire dans votre profil](/profile?section=savoir-faire). Les [petites missions d’entraide](/actualites/petites-missions-entraide-guardiens) expliquent ce parcours ; les [idées de coups de main](/actualites/idees-coups-de-main-entraide-pres-de-chez-soi) peuvent vous aider à délimiter une première tâche.

## <a id="conditions"></a>Matériel, achats et accès : qu’est-ce qu’on confirme ?

Convenez des gestes acceptés et du temps dont chacun dispose, sans promettre un résultat complet sur une après-midi. Décrivez les outils fournis, les protections nécessaires, les charges et les règles d’utilisation. Une personne doit pouvoir refuser un outil qu’elle ne maîtrise pas et arrêter si la situation est différente de celle décrite.

Dans un immeuble ou un espace collectif, vérifiez le règlement et l’accord du responsable avant de faire intervenir quelqu’un, de déplacer une installation ou de planter. Un espace accessible n’est pas nécessairement un espace que vous pouvez modifier.

Les fournitures restent distinctes du service : précisez qui apporte les plants, le terreau et les consommables. Une avance convenue peut être remboursée au montant exact sur justificatif. Ce remboursement ne rémunère pas le travail, et vous n’avez pas à inventer une prestation d’une valeur équivalente en retour.

Pour l’eau, consultez [VigiEau à l’adresse concernée](https://vigieau.gouv.fr/) et les consignes locales. Ne reprenez pas un horaire d’arrosage valable ailleurs ou une année précédente. Interrogez aussi votre assureur sur le coup de main envisagé : Guardiens ne fournit pas une assurance générale couvrant l’échange.

Vous pouvez vous rencontrer si vous le souhaitez tous les deux. Lorsqu’un profil affiche un document d’identité contrôlé, cela ne certifie ni une compétence de jardinier ni la fiabilité de l’intervention.

## <a id="collectif"></a>Où se renseigner sur les jardins collectifs à Lyon ?

La Ville présente [les formes de jardinage collectif à Lyon](https://www.lyon.fr/vie-pratique/nature-en-ville/la-nature-senracine-lyon) : jardins de rue, jardins partagés et jardins familiaux. Les jardins partagés s’organisent autour d’un projet associatif ; pour une parcelle familiale, la page municipale oriente vers les associations gestionnaires.

Cette ressource permet de chercher un interlocuteur pour votre projet. Elle ne signifie pas qu’une parcelle est disponible, que tous les jardins sont accessibles sans inscription ou que tous les frais sont pris en charge. Contactez le gestionnaire pour les conditions actuelles, les ouvertures et les possibilités d’engagement.

Si vous voulez végétaliser au pied de votre immeuble sur l’espace public, passez par le cadre municipal concerné. Un appel à l’entraide sur Guardiens ne vaut pas autorisation d’intervenir dans la rue ou dans un parc.

## <a id="vacances"></a>Et si le besoin revient pendant votre absence ?

Le [guide d’arrosage à Lyon](/actualites/arroser-plantes-vacances-lyon) traite les passages, les accès et les consignes pendant les vacances. Pour un jardin associé à une maison occupée par un gardien, consultez les [conseils d’entretien pendant une garde](/actualites/entretenir-jardin-pendant-absence).

Séparez ces besoins d’une séance ponctuelle de jardinage. Si un passage ou une intervention est essentiel, confirmez l’organisation et prévoyez un relais avant de compter sur une réponse éventuelle.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on demander un coup de main au jardin à Lyon ?
Oui, pour une tâche ponctuelle, délimitée et admissible au regard des CGU. Décrivez les accès, le matériel et les gestes attendus avant de convenir des conditions avec une personne intéressée.

### Faut-il payer ou proposer un service équivalent en retour ?
L’entraide Guardiens se fait sans rémunération. Vous n’avez pas à calculer une équivalence d’heures ; les éventuels achats avancés et convenus peuvent être remboursés au montant exact sur justificatif.

### Comment proposer mon aide en jardinage ?
Présentez vos savoir-faire et vos limites dans votre profil. Le formulaire de petite mission sert à publier un besoin, pas une offre de prestation.

### Peut-on demander un élagage ou du travail en hauteur ?
Non. Ces interventions font partie des exclusions des CGU, comme l’abattage et la construction. Adressez-vous à un professionnel adapté.

### Où trouver un jardin partagé à Lyon ?
La page municipale sur la nature en ville présente les formes de jardins collectifs et leurs interlocuteurs. Contactez le gestionnaire pour connaître les modalités actuelles ; une place n’est pas garantie.

### La gratuité de Guardiens inclut-elle les plants et le matériel ?
Non. La plateforme est actuellement gratuite et le service sans rémunération, mais les fournitures doivent être prévues séparément. Convenez de qui les apporte et de toute dépense à avancer.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='623caac4-3e9a-489a-9ab0-af7c277f244c'::uuid AND slug='jardinage-entraide-quartier-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/jardinage-entraide-quartier-lyon' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Entraide jardinage à Lyon : demander une aide ou rejoindre un jardin collectif'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Besoin de quelques plantations ou envie de jardiner avec d’autres ? Voici comment préparer une demande précise et trouver les ressources municipales à Lyon.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Entraide jardinage à Lyon : aide ponctuelle et jardins'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez un coup de main au jardin à Lyon : tâche, matériel, accès et frais. Distinguez l’entraide ponctuelle des jardins collectifs et d’un service payant.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une adulte jardine avec un sécateur et un arrosoir dans une cour plantée entourée d’immeubles.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"conditions tarifaires","url":"/tarifs"},{"text":"CGU","url":"/cgu"},{"text":"savoir-faire dans votre profil","url":"/profile?section=savoir-faire"},{"text":"petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"idées de coups de main","url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi"},{"text":"guide d’arrosage à Lyon","url":"/actualites/arroser-plantes-vacances-lyon"},{"text":"conseils d’entretien pendant une garde","url":"/actualites/entretenir-jardin-pendant-absence"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:55:11.098201+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot34_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot34_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot34_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Entraide jardinage à Lyon : demander une aide ou rejoindre un jardin collectif',
    excerpt='Besoin de quelques plantations ou envie de jardiner avec d’autres ? Voici comment préparer une demande précise et trouver les ressources municipales à Lyon.',
    meta_title='Entraide jardinage à Lyon : aide ponctuelle et jardins',
    meta_description='Préparez un coup de main au jardin à Lyon : tâche, matériel, accès et frais. Distinguez l’entraide ponctuelle des jardins collectifs et d’un service payant.',
    hero_image_alt='Une adulte jardine avec un sécateur et un arrosoir dans une cour plantée entourée d’immeubles.',
    internal_links='[{"text":"conditions tarifaires","url":"/tarifs"},{"text":"CGU","url":"/cgu"},{"text":"savoir-faire dans votre profil","url":"/profile?section=savoir-faire"},{"text":"petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"idées de coups de main","url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi"},{"text":"guide d’arrosage à Lyon","url":"/actualites/arroser-plantes-vacances-lyon"},{"text":"conseils d’entretien pendant une garde","url":"/actualites/entretenir-jardin-pendant-absence"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='jardinage-entraide-quartier-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Faire garder son Labrador : repas, sorties et précautions à transmettre

**Pour préparer la garde d’un Labrador, partez de ses habitudes réelles : repas, objets qu’il peut saisir, promenades, repos et absences déjà bien vécues.** La réputation de chien facile ne permet pas de prévoir sa réaction avec un inconnu, un autre animal ou un nouvel environnement.

Un gardien doit comprendre ce qu’il pourra assurer, y compris la tenue en laisse, les accès à sécuriser et un éventuel suivi vétérinaire. Le house-sitting permet une présence dans le logement selon les conditions convenues ; il ne garantit pas une présence permanente ni la disparition d’une difficulté de comportement.

**Repères :** [préparer la fiche](#fiche), [organiser les repas](#repas), [prévoir les sorties](#sorties), [transmettre le suivi](#sante), [choisir le gardien](#gardien), [questions fréquentes](#faq).

## <a id="fiche"></a>Quelles informations donner avant la garde ?

Décrivez des situations plutôt que des qualités générales. « Il tire à la vue d’un chien », « il cherche dans les sacs » ou « il se repose dans cette pièce » aide davantage que « il aime tout le monde ». Précisez aussi les réactions aux visiteurs, aux manipulations, aux enfants et aux autres animaux.

| Point à transmettre | Informations utiles |
| --- | --- |
| Repas | Aliment habituel, quantité mesurée, horaires et friandises autorisées. |
| Sorties | Parcours connus, équipement, réactions en laisse et conditions de rappel. |
| Présence | Habitudes d’absence, signes observés et relais possible. |
| Logement | Accès interdits, poubelles, rangements, portes et clôtures. |
| Santé | Suivi connu, ordonnance éventuelle, coordonnées vétérinaires et consignes d’urgence. |

Le [guide pour préparer sa maison avant une garde](/actualites/preparer-maison-avant-garde) aide à organiser ces accès. Un jardin ne remplace pas les sorties convenues et ne doit pas être considéré comme fermé sans vérification.

## <a id="repas"></a>Ration, poubelles et objets : éviter l’improvisation

Montrez comment mesurer la ration et indiquez ce qui est déjà prévu pour les récompenses. Si un régime ou un suivi de poids est en cours, transmettez les consignes établies, sans demander au gardien de commencer un régime ou de modifier l’alimentation. Plusieurs personnes présentes doivent savoir qui a donné le repas, pour éviter les doubles distributions.

Signalez ce que votre chien cherche ou avale réellement : nourriture sur une table, déchets, emballages, chaussettes ou jouets abîmés. Rangez les produits, aliments et objets accessibles et convenez des jouets utilisables. Adaptez les précautions au chien et au logement.

**Si une ingestion dangereuse est possible, appelez rapidement un vétérinaire sans attendre l’apparition de symptômes.** Gardez les informations sur le produit ou l’objet, la quantité possible et le moment de l’ingestion ; une photo ou un emballage peut aider. N’essayez pas de faire vomir le chien sans instruction vétérinaire, comme le rappelle la [fiche vétérinaire PDSA sur les intoxications](https://www.pdsa.org.uk/pet-help-and-advice/pet-health-hub/other-veterinary-advice/first-aid-for-poisons-and-toxins).

Un objet avalé peut aussi provoquer une obstruction. Le [Manuel vétérinaire Merck décrit ce risque digestif](https://www.merckvetmanual.com/dog-owners/digestive-disorders-of-dogs/disorders-of-the-stomach-and-intestines-in-dogs), dont les manifestations nécessitent une évaluation vétérinaire. Ne supposez pas qu’un chien qui semble encore en forme éliminera forcément l’objet seul.

## <a id="sorties"></a>Promenades, solitude et baignade : quelles limites convenir ?

Expliquez les sorties habituelles et ce qui les rend possibles : force en laisse, croisements, escaliers, transport ou pauses nécessaires. Il n’existe pas une durée de marche ou d’absence qui convienne à tous les Labradors. Un chiot, un chien suivi pour une douleur ou un adulte habitué à certains parcours demandent des préparations différentes.

Choisissez des activités connues et du repos, sans chercher à épuiser le chien. Un jeu de recherche ne remplace pas un nombre calculé de minutes de promenade. Si les absences provoquent des difficultés, préparez la situation avec le professionnel compétent et décrivez-la honnêtement ; une présence « régulière » n’est pas un traitement garanti.

Pour la chaleur, adaptez les sorties aux conditions, au chien et aux consignes vétérinaires. Le [ministère de l’Agriculture recommande notamment les heures les moins chaudes, de l’eau disponible et l’absence de chien laissé seul en voiture](https://agriculture.gouv.fr/professionnels-particuliers-les-precautions-prendre-en-cas-de-vague-de-chaleur). Une plage horaire fixe ne suffit pas à rendre une sortie sûre.

Si vous envisagez des baignades, confirmez qu’elles sont adaptées, autorisées sur le site et surveillées. N’en faites pas une activité automatique pendant la garde ; une piscine accessible ou une eau apparemment propre ne constitue pas une garantie. Les [précautions de baignade du guide du Golden](/actualites/golden-retriever-guide-race-complet#eau) peuvent aider à préparer ces questions pour un chien qui va dans l’eau.

## <a id="sante"></a>Que transmettre pour le suivi vétérinaire ?

Indiquez les problèmes déjà connus, ce qui a été prescrit et les gestes que la personne accepte réellement d’assurer. Transmettez l’ordonnance, les conditions de conservation et les instructions du vétérinaire en cas d’oubli ou de difficulté. N’improvisez ni produit pour les oreilles, ni antidouleur, ni double dose.

Une boiterie, une gêne d’oreille ou un changement d’appétit ne doivent pas être attribués automatiquement à l’âge ou au stress du départ. Contactez le vétérinaire pour connaître la conduite à tenir. Une difficulté respiratoire, un malaise ou des tentatives répétées de vomir sans résultat avec un ventre gonflé justifient un appel immédiat, sans attendre de joindre d’abord le propriétaire.

Préparez les coordonnées du vétérinaire habituel, une solution d’urgence accessible et la façon de vous prévenir. Le guide est une aide à la transmission, pas un diagnostic ni une ordonnance pour la race.

## <a id="gardien"></a>Comment choisir quelqu’un pour garder votre Labrador ?

Décrivez dans l’annonce les dates, la présence nécessaire, les réactions observées et les tâches liées à la maison. Demandez à la personne ce qu’elle sait et souhaite assurer. Un contrôle de document d’identité, lorsqu’il est affiché sur un profil, ne certifie pas une compétence ou une fiabilité ; les avis, lorsqu’il y en a, complètent l’échange.

Une rencontre préalable est possible **si vous le souhaitez tous les deux**. Confirmez les conditions avant le départ et prévoyez un relais en cas d’imprévu. L’[accord de garde décrit dans le cadre du house-sitting](/actualites/house-sitting-cadre-juridique-france) intervient après confirmation et sa signature est facultative ; vérifiez aussi les assurances applicables avec votre assureur.

Sur Guardiens, le gardien est hébergé pendant la garde sans rémunération. La plateforme est **actuellement 100 % gratuite** pour les deux rôles, selon les [conditions tarifaires](/tarifs). Alimentation, déplacements et frais éventuels restent distincts. Aucun candidat ni remplacement n’est garanti : votre annonce doit permettre un échange réaliste avant de confirmer.

## <a id="faq"></a>Questions fréquentes

:::faq
### Un Labrador est-il forcément facile à faire garder ?
Non. Décrivez son comportement avec les inconnus, les autres animaux, la nourriture et pendant les absences. La réputation de la race ne remplace pas l’échange sur le chien concerné.

### Combien de temps peut-il rester seul pendant la garde ?
Il n’existe pas une durée valable pour tous les Labradors. Partez des absences déjà bien vécues, des difficultés observées et de la présence réellement convenue avec le gardien.

### Que faire s’il avale un aliment ou un objet dangereux ?
Appelez rapidement un vétérinaire avec les informations disponibles, sans attendre les symptômes. Ne le faites pas vomir sans instruction vétérinaire et conservez si possible l’emballage ou une photo.

### Faut-il modifier sa ration s’il réclame à manger ?
Ne modifiez pas le programme transmis pour répondre aux sollicitations. Mesurez les repas et les récompenses convenus ; toute modification de régime ou difficulté inhabituelle doit être discutée avec le propriétaire et le vétérinaire selon la situation.

### Peut-on prévoir des baignades pendant la garde ?
Seulement si cela a été convenu, dans des conditions adaptées au chien, autorisées et surveillées. L’accès à une piscine ou la réputation de nageur de la race ne suffit pas.

### La garde sur Guardiens est-elle gratuite ?
La plateforme est actuellement gratuite pour propriétaires et gardiens. Le gardien est hébergé sans rémunération ; alimentation, déplacements et dépenses éventuelles restent distincts et doivent être prévus.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='e27e5a15-8e68-4d0d-85dc-9bc73543d393'::uuid AND slug='labrador-retriever-guide-race';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/labrador-retriever-guide-race' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder son Labrador : repas, sorties et précautions à transmettre'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un Labrador réputé sociable a lui aussi ses habitudes et ses limites. Préparez les repas, les sorties, les accès et les contacts utiles avec la personne qui le garde.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Faire garder son Labrador : repas, sorties et consignes'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez la garde de votre Labrador : ration, aliments et objets accessibles, promenades, absences, baignade et contacts vétérinaires à transmettre au gardien.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un Labrador chocolat est couché sur un tapis dans une cuisine.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide pour préparer sa maison avant une garde","url":"/actualites/preparer-maison-avant-garde"},{"text":"précautions de baignade du guide du Golden","url":"/actualites/golden-retriever-guide-race-complet#eau"},{"text":"accord de garde décrit dans le cadre du house-sitting","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-14 13:59:17.121368+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot34_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot34_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot34_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder son Labrador : repas, sorties et précautions à transmettre',
    excerpt='Un Labrador réputé sociable a lui aussi ses habitudes et ses limites. Préparez les repas, les sorties, les accès et les contacts utiles avec la personne qui le garde.',
    meta_title='Faire garder son Labrador : repas, sorties et consignes',
    meta_description='Préparez la garde de votre Labrador : ration, aliments et objets accessibles, promenades, absences, baignade et contacts vétérinaires à transmettre au gardien.',
    hero_image_alt='Un Labrador chocolat est couché sur un tapis dans une cuisine.',
    internal_links='[{"text":"guide pour préparer sa maison avant une garde","url":"/actualites/preparer-maison-avant-garde"},{"text":"précautions de baignade du guide du Golden","url":"/actualites/golden-retriever-guide-race-complet#eau"},{"text":"accord de garde décrit dans le cadre du house-sitting","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='labrador-retriever-guide-race' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
