-- Refonte des guides garde du Golden retriever et idées de coups de main, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot32_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot32_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot32_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot32_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('f2e05421-9bd3-4c10-8d10-7bb63b5767ae'::uuid,'d35378d8-1e1a-4802-9e2a-5c02fec2fab9'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Faire garder un Golden retriever : sorties, repas et accès à l’eau

**Pour faire garder un Golden retriever, présentez sa routine et les situations à anticiper : promenades, présence, alimentation et accès au jardin ou à l’eau.** Sa réputation de chien sociable ne permet pas de savoir comment le vôtre accueille une nouvelle personne, vit une absence ou se comporte avec d’autres animaux.

Le bon choix dépend des tâches que le gardien peut réellement assurer. Une personne qui aime les grandes promenades n’est pas forcément disponible aux moments nécessaires, ni à l’aise avec un chien qui tire, ramasse des objets ou suit un traitement.

**Repères :** [choisir la garde](#choix), [préparer les sorties](#sorties), [clarifier la baignade](#eau), [transmettre les repas et la santé](#sante), [organiser la passation](#passation), [questions fréquentes](#faq).

## <a id="choix"></a>Comment choisir une garde adaptée à votre Golden ?

Décrivez des faits : sa manière de saluer, ses réactions aux croisements, son comportement avec les animaux du foyer et les absences qu’il a déjà vécues. Ne supposez pas qu’il acceptera toute personne ou qu’il s’adaptera en vingt-quatre à quarante-huit heures parce qu’il appartient à cette race.

Comparez les conditions du house-sitting, des visites, de l’accueil chez une autre personne et de la pension. Rester chez lui conserve un cadre connu, mais n’assure pas automatiquement l’absence d’inquiétude ou une présence continue. Le [guide des solutions de garde de chien](/actualites/garde-chien-faire-garder-son-chien) aide à poser les questions communes à ces options.

Demandez au gardien les expériences utiles et ses limites. Précisez ce qui est important pour votre chien avant de confirmer : sorties, soins, accès, véhicule éventuel ou contraintes de cohabitation. La personne doit pouvoir dire qu’elle ne peut pas assurer une tâche.

## <a id="sorties"></a>Quelles consignes laisser pour l’activité et les absences ?

Présentez une journée ordinaire, avec le rythme des promenades et les moments calmes. L’âge, la santé et les habitudes peuvent changer l’organisation ; un minimum d’une heure trente d’effort ne convient pas à tous les Goldens.

| Point à discuter | Informations utiles au gardien |
| --- | --- |
| Promenades | Itinéraires connus, rythme, pauses, matériel et réactions aux croisements. |
| Jeux | Activités déjà pratiquées, objets utilisés et consignes de fin de jeu. |
| Présence | Absences habituelles et sorties personnelles envisagées par le gardien. |
| Mobilité | Difficultés connues et recommandations existantes pour les accès ou déplacements. |
| Conditions du jour | Solution de sortie plus simple selon la météo, les lieux et les consignes de santé. |

Le jardin ne remplace pas automatiquement les promenades. Montrez le portail et les fermetures et indiquez les passages prévus. Un appartement, une maison ou une destination de montagne ne suffit pas non plus à déterminer si la garde conviendra.

Les jeux et le repos font partie de la routine ; il n’est pas nécessaire d’improviser un entraînement, des sprints ou une nouvelle activité pour « dépenser la race ». Si la personne ne peut pas suivre les besoins réels, cherchez une autre organisation avant le départ.

## <a id="eau"></a>Peut-on prévoir des baignades pendant la garde ?

**La baignade n’est ni obligatoire ni une activité à laisser au chien seul.** Si elle fait déjà partie de ses habitudes, précisez si vous souhaitez qu’elle soit maintenue et dans quelles conditions. Le gardien doit être à l’aise avec l’organisation et savoir comment renoncer à une sortie qui ne convient pas.

La [SPA de Lyon rappelle de surveiller les baignades et de ne pas forcer le chien à entrer dans l’eau](https://www.spa-lyon.org/emmener-son-chien-a-la-plage/). La capacité d’un Golden à nager ne se déduit pas d’un portrait de race. Courant, profondeur, accès, fatigue et possibilité de sortir de l’eau sont à prendre en compte.

Pour une piscine, expliquez les accès et la façon d’empêcher une entrée non prévue. Pour un lac, une rivière ou la mer, vérifiez les règles du lieu et les informations locales du moment. Un plan d’eau connu ou fréquenté par des baigneurs ne doit pas être considéré sans risque par défaut.

L’[Anses présente le risque lié aux cyanobactéries pour les chiens dans sa FAQ sur les eaux de baignade](https://sitesv2.anses.fr/fr/system/files/FAQ%20Cyanobacte%CC%81ries_cyanotoxines_VF2.pdf). Consultez les avis locaux avant de laisser le chien accéder à l’eau ; un gardien ne peut pas évaluer sa qualité à partir d’une photo ou de la seule apparence du site. Si le chien présente un signe inquiétant après un contact avec l’eau, demandez rapidement un avis vétérinaire en précisant ce qui s’est passé.

## <a id="sante"></a>Repas, chaleur et traitements : que faut-il transmettre ?

Laissez l’alimentation habituelle, les quantités, les horaires et les friandises autorisées. Si le chien ramasse des objets ou de la nourriture, décrivez les situations et les précautions habituelles. Rangez ce qui pourrait être accessible dans les pièces qu’il utilise, sans demander au gardien de tester de nouveaux aliments ou objets de jeu.

Pour un traitement, fournissez l’ordonnance et les instructions du vétérinaire. Faites préciser la conduite à tenir si une prise est oubliée, refusée ou vomie ; la personne ne doit pas doubler une dose ou interpréter elle-même un changement comme l’effet d’un seul comprimé manqué.

En période chaude, adaptez les sorties et le lieu de repos, avec de l’eau disponible et une protection contre la chaleur. **Une difficulté respiratoire, un malaise ou une surchauffe suspectée exige un avis vétérinaire sans délai d’attente de dix minutes.** Arrêtez l’activité, mettez le chien à l’abri de la chaleur et contactez le vétérinaire pour être guidé sur les premiers gestes et le transport.

La [fiche vétérinaire PDSA sur le coup de chaleur](https://www.pdsa.org.uk/pet-help-and-advice/pet-health-hub/other-veterinary-advice/first-aid-for-heatstroke) le présente comme une urgence et recommande de commencer le refroidissement sans attendre, puis de joindre un vétérinaire au plus vite. Ne décidez pas d’attendre que les signes passent sur la seule base d’un guide de garde.

## <a id="passation"></a>Comment préparer l’annonce et les consignes de départ ?

Précisez dans l’annonce les dates, le logement, les animaux, la présence attendue et les contraintes importantes. Remplacez « Golden facile, aime tout le monde » par les habitudes observées et les tâches à assurer. Le [guide pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) aide à discuter des expériences et limites de chacun.

Une rencontre peut être organisée si vous la souhaitez tous les deux. Profitez des échanges pour montrer le matériel et les accès, puis laissez les consignes et contacts accessibles. Un contrôle de document d’identité sur un profil ne certifie pas une compétence avec les chiens. Les avis dépendent de ceux qui sont effectivement disponibles ; ne les supposez pas présents sur tous les profils.

Prévoyez les coordonnées du vétérinaire, le service de garde, le transport et un relais accepté si le séjour est interrompu. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) aide à préparer cette organisation.

Sur Guardiens, le gardien séjourne dans le logement et assure les tâches convenues **sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les propriétaires et les gardiens**, selon les [conditions tarifaires](/tarifs). Les dépenses restent distinctes et aucune candidature n’est garantie. L’accord proposé après confirmation reste à signature facultative.

## <a id="faq"></a>Questions fréquentes

:::faq
### Un Golden retriever accepte-t-il forcément un nouveau gardien ?
La réputation de la race ne le garantit pas. Décrivez l’accueil habituel, les réactions et les absences déjà vécues, puis vérifiez la compatibilité avec la personne et l’organisation proposées.

### Combien de temps faut-il le promener pendant la garde ?
Transmettez la routine réelle et les recommandations de santé éventuelles. Un quota d’effort identique pour tous les Goldens ne permet pas de préparer une garde adaptée.

### Peut-il se baigner seul s’il sait nager ?
Non. La baignade doit être convenue et surveillée, dans un lieu dont les conditions ont été vérifiées. Ne la prévoyez pas automatiquement parce que le chien est un Golden retriever.

### Faut-il vérifier l’eau d’un lac habituel ?
Consultez les règles et informations locales du moment. La qualité de l’eau et les risques ne se déterminent pas à partir du souvenir d’une sortie ou de l’apparence du lieu.

### Peut-on attendre dix minutes devant une surchauffe ?
Une surchauffe suspectée ou une difficulté respiratoire appelle une réaction et un avis vétérinaire sans ce délai arbitraire. Arrêtez l’activité, mettez le chien à l’abri et contactez le vétérinaire pour être guidé.

### La garde Guardiens est-elle payante ?
La plateforme est actuellement gratuite pour les deux rôles. Le gardien est hébergé sans rémunération pour les tâches convenues, avec des dépenses à clarifier séparément et sans candidature garantie.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='f2e05421-9bd3-4c10-8d10-7bb63b5767ae'::uuid AND slug='golden-retriever-guide-race-complet';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/golden-retriever-guide-race-complet' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder un Golden retriever : sorties, repas et accès à l’eau'
    AND before_row.excerpt IS NOT DISTINCT FROM 'La réputation de chien sociable ne remplace pas une passation : préparez les sorties, les absences, les repas et les conditions de baignade de votre Golden.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde du Golden retriever : sorties et préparation'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez la garde de votre Golden retriever : présence, repas, promenades et baignade éventuelle, avec des consignes adaptées à votre chien et au lieu.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un Golden retriever est assis dans l’herbe devant des arbres.'
    AND before_row.cover_image_url IS NOT DISTINCT FROM 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=1200&q=80&auto=format&fit=crop'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des solutions de garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:10:15.506515+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot32_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot32_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot32_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder un Golden retriever : sorties, repas et accès à l’eau',
    excerpt='La réputation de chien sociable ne remplace pas une passation : préparez les sorties, les absences, les repas et les conditions de baignade de votre Golden.',
    meta_title='Garde du Golden retriever : sorties et préparation',
    meta_description='Préparez la garde de votre Golden retriever : présence, repas, promenades et baignade éventuelle, avec des consignes adaptées à votre chien et au lieu.',
    hero_image_alt='Un Golden retriever est assis dans l’herbe devant des arbres.',
    cover_image_url='https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=1200&q=80&auto=format&fit=crop',
    internal_links='[{"text":"guide des solutions de garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='golden-retriever-guide-race-complet' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# 30 idées de coups de main à demander ou proposer près de chez soi

**Un bon premier coup de main part d’une tâche précise, que les deux personnes peuvent comprendre et accepter.** Arroser quelques plantes, récupérer une commande ou partager une recette : voici trente idées pour trouver votre point de départ, sans supposer qu’une aide est disponible dans votre quartier.

Sur Guardiens, **pour demander, vous publiez un besoin ; pour aider, vous indiquez vos savoir-faire et ce que vous acceptez de faire sur votre profil**. L’entraide se déroule sans rémunération. Choisissez parmi ces exemples ce qui correspond à vos possibilités et aux conditions du lieu.

**À parcourir :** [animaux](#animaux), [jardin](#jardin), [maison et objets](#maison), [courses et déplacements](#courses), [compagnie et savoir-faire](#partage), [préparer l’échange](#demarche), [questions fréquentes](#faq).

## <a id="animaux"></a>Quatre idées autour des animaux

1. Promener un chien sur un trajet et un créneau convenus, après échange sur son comportement et son matériel.
2. Passer nourrir un chat et vérifier son eau pendant une absence ponctuelle.
3. Vérifier les ressources d’un lapin selon les consignes de son propriétaire, si vous connaissez les gestes nécessaires.
4. Donner la nourriture et l’eau habituelles à quelques poules, avec une explication des accès et fermetures.

Ces exemples ne signifient pas que la bonne volonté suffit à prendre en charge tout animal. Présence, expérience, soins et réactions sont à discuter. Les visites et promenades ponctuelles ne sont pas le même format qu’une garde avec une personne qui séjourne dans le logement. Pour ce dernier besoin, consultez le [guide du house-sitting](/actualites/c-est-quoi-le-house-sitting).

## <a id="jardin"></a>Six idées pour le jardin et les plantes

5. Arroser des plantes d’intérieur avec des consignes propres à chaque pot.
6. Passer arroser un potager selon les besoins et les règles locales du moment.
7. Ramasser des feuilles sur une petite zone accessible.
8. Désherber à la main un espace défini, si la tâche est à votre portée.
9. Rempoter quelques plantes avec le matériel et les précautions convenus.
10. Récolter des légumes mûrs en suivant les indications de la personne qui cultive.

Décrivez la surface, l’accès, le matériel et les gestes, sans supposer la même fréquence d’arrosage pour toutes les plantes. Élagage, abattage et travaux en hauteur sont exclus de l’entraide Guardiens. Le [guide de préparation du jardin pendant une absence](/actualites/entretenir-jardin-pendant-absence) aide à distinguer les besoins simples des interventions spécialisées.

## <a id="maison"></a>Six idées pour la maison et les objets

11. Trier les pièces d’un meuble en kit et lire la notice ensemble.
12. Assembler un petit meuble lorsque les gestes et les conditions conviennent aux personnes présentes.
13. Ajuster une poignée ou une charnière simple, après avoir vérifié ce qui est nécessaire.
14. Ranger un espace avec l’accord de la personne qui l’utilise.
15. Préparer et étiqueter des cartons avant un déménagement.
16. Déplacer un objet dont la prise et le trajet sont à la portée des personnes qui aident.

Un objet lourd, une fixation inconnue ou un accès difficile ne devient pas sûr parce que deux personnes sont présentes. Le [guide de bricolage et montage de meubles](/actualites/bricolage-montage-meubles-entraide-grenoble-lyon) permet de préparer la tâche ; pour l’organisation d’un départ, le [guide d’aide au déménagement](/actualites/demenagement-entraide-locale-france) traite les accès et les limites à clarifier.

## <a id="courses"></a>Six idées pour les courses et les déplacements d’adultes

17. Récupérer un colis, après vérification des conditions de retrait du point relais.
18. Retirer une commande de courses déjà réglée et la remettre au moment convenu.
19. Déposer ou rapporter des livres à la bibliothèque selon ses modalités.
20. Réceptionner une livraison avec l’accord de la personne concernée et des conditions d’accès précises.
21. Accompagner un adulte sur un trajet en transports en commun qu’il souhaite découvrir.
22. Accompagner un adulte à un rendez-vous, lorsque le trajet et le niveau d’aide nécessaire conviennent.

Pour un trajet en voiture, conducteur, permis, véhicule, passagers et assurance sont à vérifier. Une aide entre particuliers ne remplace pas un transport sanitaire ou une aide corporelle. Pour un proche, demandez son accord et protégez ses informations ; le [guide de l’aide aux courses et des relais utiles](/actualites/courses-aide-domicile-entraide-senior-lyon) détaille ces points.

## <a id="partage"></a>Huit idées de compagnie et de partage de savoir-faire

23. Passer un moment à discuter avec une personne qui en a envie.
24. Faire une promenade ensemble, selon les possibilités de chacun.
25. Lire un texte ou un livre à voix haute.
26. Jouer aux cartes ou à un jeu de société sur un créneau convenu.
27. Montrer comment utiliser une application simple, sans conserver les identifiants de la personne.
28. Relire un CV ou une lettre, sans promettre un recrutement ou une validation professionnelle.
29. Partager une recette ou un geste de couture adapté au niveau et au matériel.
30. Aider à revoir une leçon avec un mineur, à la demande de son représentant légal et en présence de celui-ci ou d’un autre adulte de son foyer pendant toute la séance.

Pour l’aide aux devoirs, le représentant légal reste l’interlocuteur et conserve la surveillance de l’enfant. La demande indique la classe et la matière, sans publier son prénom, sa photo, son école ou son adresse. Une garde ou un transport de mineur sans son représentant légal relève des exclusions des CGU.

Pour une démarche administrative, un coup de main peut aider à se repérer ; il n’autorise pas à agir au nom d’une personne, gérer ses comptes ou conserver ses mots de passe. Les limites de chacun doivent être comprises avant la séance.

## <a id="demarche"></a>Comment passer d’une idée à un échange ?

| Vous cherchez de l’aide | Vous souhaitez aider |
| --- | --- |
| Décrivez une tâche, le lieu, le créneau et les contraintes importantes. | Présentez vos savoir-faire, votre expérience utile et ce que vous acceptez réellement. |
| Échangez avec les personnes intéressées et précisez l’organisation avant de confirmer. | Lisez le besoin et posez vos questions avant d’accepter une tâche. |
| Prévoyez un autre relais si la réponse ou la venue n’est pas confirmée. | Restez libre de refuser ce qui dépasse vos compétences ou possibilités. |

Vous pouvez [publier un besoin](/petites-missions/creer) ou [renseigner vos savoir-faire](/profile?section=savoir-faire), selon votre intention. Le [guide des petites missions d’entraide](/actualites/petites-missions-entraide-guardiens) présente le fonctionnement complet.

**Exemple de demande à adapter :** « Besoin d’un passage pour arroser quelques plantes pendant mon absence. Accès et consignes à expliquer, créneau à convenir ensemble. » **Exemple de présentation sur un profil :** « Je peux aider à relire une notice ou à préparer des cartons légers, selon mes disponibilités et les accès. » Ces exemples ne sont pas des témoignages de membres.

Le formulaire rappelle l’esprit du réseau : vous voyez ensemble pour un merci, un café ou un coup de main une autre fois. Vous n’avez pas à chiffrer une contrepartie équivalente ni à prouver que vous pourrez rendre le même service. La plateforme est **actuellement 100 % gratuite**, selon les [conditions tarifaires](/tarifs). Achats et dépenses éventuelles restent distincts : une avance doit être convenue et remboursée au montant exact sur justificatif, sans payer le service.

Les [CGU](/cgu) réservent ce cadre aux membres majeurs et excluent notamment les soins, l’aide corporelle, la garde d’enfants, certaines interventions techniques ou en hauteur et les activités professionnelles. Les assurances sont à vérifier pour la situation réelle ; la gratuité et un profil ne garantissent ni couverture ni compétence. Aucun délai de réponse ou échange réussi n’est promis.

## <a id="faq"></a>Questions fréquentes

:::faq
### Quel coup de main choisir pour commencer ?
Choisissez une tâche précise, limitée et compatible avec vos possibilités. Les idées servent de points de départ ; gestes, matériel, accès et accord de la personne concernée restent à discuter.

### Comment demander de l’aide sur Guardiens ?
Publiez un besoin avec une description concrète, le lieu et les conditions utiles. Échangez avec les personnes intéressées avant de confirmer et ne comptez pas sur une réponse tant qu’elle n’est pas obtenue.

### Comment proposer mon aide ?
Indiquez vos savoir-faire et les aides que vous acceptez sur votre profil, puis consultez les besoins. Dites ce que vous savez faire, dans quelles conditions et sur quels créneaux vous êtes disponible.

### Faut-il promettre un service équivalent en retour ?
Vous voyez ensemble ce qui convient : un merci, un moment partagé ou une aide une autre fois. L’entraide se fait sans rémunération et ne demande pas de calculer un échange d’heures équivalent.

### Peut-on demander de l’aide pour les devoirs d’un enfant ?
La demande doit venir du représentant légal, qui reste l’interlocuteur. Lui-même ou un autre adulte de son foyer doit être présent pendant toute la séance ; la surveillance de l’enfant ne peut pas être confiée au membre qui aide.

### La plateforme garantit-elle une personne de confiance près de chez moi ?
Non. Lisez les profils, discutez de l’expérience, des limites et des conditions. La gratuité actuelle, un éventuel contrôle de document ou des avis disponibles ne garantissent ni compétence, ni disponibilité, ni réussite de l’échange.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='d35378d8-1e1a-4802-9e2a-5c02fec2fab9'::uuid AND slug='idees-coups-de-main-entraide-pres-de-chez-soi';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM '30 idées de coups de main à demander ou proposer près de chez soi'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Choisissez un besoin concret ou un savoir-faire à partager. Ces 30 idées donnent des points de départ, à adapter aux personnes, au lieu et au cadre de l’entraide.'
    AND before_row.meta_title IS NOT DISTINCT FROM '30 idées de coups de main pour s’entraider près de chez soi'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Animaux, jardin, courses, compagnie ou savoir-faire : 30 idées d’entraide à adapter, avec les bons parcours pour demander de l’aide ou proposer la vôtre.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux adultes sont penchés vers le sol dans un salon où se trouvent des caisses de rangement.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"guide de préparation du jardin pendant une absence","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"guide de bricolage et montage de meubles","url":"/actualites/bricolage-montage-meubles-entraide-grenoble-lyon"},{"text":"guide d’aide au déménagement","url":"/actualites/demenagement-entraide-locale-france"},{"text":"guide de l’aide aux courses et des relais utiles","url":"/actualites/courses-aide-domicile-entraide-senior-lyon"},{"text":"publier un besoin","url":"/petites-missions/creer"},{"text":"renseigner vos savoir-faire","url":"/profile?section=savoir-faire"},{"text":"guide des petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"CGU","url":"/cgu"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:40:17.144044+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot32_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot32_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot32_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='30 idées de coups de main à demander ou proposer près de chez soi',
    excerpt='Choisissez un besoin concret ou un savoir-faire à partager. Ces 30 idées donnent des points de départ, à adapter aux personnes, au lieu et au cadre de l’entraide.',
    meta_title='30 idées de coups de main pour s’entraider près de chez soi',
    meta_description='Animaux, jardin, courses, compagnie ou savoir-faire : 30 idées d’entraide à adapter, avec les bons parcours pour demander de l’aide ou proposer la vôtre.',
    hero_image_alt='Deux adultes sont penchés vers le sol dans un salon où se trouvent des caisses de rangement.',
    internal_links='[{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"guide de préparation du jardin pendant une absence","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"guide de bricolage et montage de meubles","url":"/actualites/bricolage-montage-meubles-entraide-grenoble-lyon"},{"text":"guide d’aide au déménagement","url":"/actualites/demenagement-entraide-locale-france"},{"text":"guide de l’aide aux courses et des relais utiles","url":"/actualites/courses-aide-domicile-entraide-senior-lyon"},{"text":"publier un besoin","url":"/petites-missions/creer"},{"text":"renseigner vos savoir-faire","url":"/profile?section=savoir-faire"},{"text":"guide des petites missions d’entraide","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"CGU","url":"/cgu"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='idees-coups-de-main-entraide-pres-de-chez-soi' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
