-- Refonte des guides maine-coon-malinois, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot35_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot35_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot35_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot35_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('6e50012e-1eef-4f7a-8bb7-bd94ca532a3e'::uuid,'87433836-e77b-4ac9-8e57-52fe304a381e'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Faire garder son Maine Coon : pelage, habitudes et suivi à préparer

**Pour faire garder un Maine Coon, préparez les soins qu’il accepte, ses repas, sa litière, ses accès et la présence dont il a l’habitude.** Son gabarit et son pelage peuvent demander des aménagements, mais ne permettent pas de déduire son caractère, son autonomie ou son état de santé.

Le gardien doit connaître les gestes à assurer et pouvoir les accepter avant de confirmer. Une garde à domicile préserve des repères du logement ; elle ne garantit pas l’absence de stress et ne convient pas automatiquement à toutes les situations.

**Repères :** [décrire les habitudes](#habitudes), [préparer le pelage](#pelage), [organiser le logement](#logement), [transmettre le suivi](#sante), [confirmer la garde](#garde), [questions fréquentes](#faq).

## <a id="habitudes"></a>Que faut-il dire au gardien ?

Présentez votre chat tel qu’il est avec une personne qu’il connaît peu : s’approche-t-il, se cache-t-il, accepte-t-il le contact ou certaines manipulations ? Décrivez ses vocalises habituelles sans demander d’ignorer un changement de comportement au motif que la race serait bavarde.

| Point à préparer | Ce qu’il faut montrer ou écrire |
| --- | --- |
| Repas et eau | Aliment, quantité, horaires, points d’eau et entretien de la fontaine si elle existe. |
| Pelage | Outil utilisé, gestes acceptés, rythme établi et conduite à tenir en cas de nœud. |
| Litière | Emplacement, substrat habituel, nettoyage et observations utiles. |
| Présence et jeux | Habitudes d’interaction, cachettes et absences déjà bien vécues. |
| Santé et transport | Ordonnance éventuelle, contacts vétérinaires et caisse adaptée accessible. |

Ne calculez pas la ration uniquement à partir de la taille ou de la race. Transmettez le programme habituel et le suivi vétérinaire éventuel. Une fontaine déjà utilisée demande une explication de nettoyage et une solution si elle cesse de fonctionner ; son achat n’est pas une obligation de garde pour tous les Maine Coons.

## <a id="pelage"></a>Comment préparer le brossage sans imposer une manipulation ?

Montrez le matériel et la façon dont votre chat accepte d’être brossé. Prévoyez l’entretien nécessaire pendant la garde, plutôt qu’un nombre de séances supposé suffisant pour tous les pelages. Les [conseils de Cats Protection pour les chats à poil long](https://www.cats.org.uk/cats-blog/tips-for-grooming-long-haired-cats) soulignent l’importance d’un entretien régulier pour limiter les nœuds.

Signalez les zones sensibles et les réactions qui doivent faire arrêter. Le gardien ne doit pas forcer le chat à subir une séance qu’il ne tolère pas. Si l’entretien ne peut pas être assuré, cherchez une organisation adaptée avant le départ.

Pour un feutrage ou des nœuds proches de la peau, demandez conseil au vétérinaire. N’improvisez pas une coupe aux ciseaux ou un démêlage en tirant : cela peut blesser. Un problème déjà présent doit être pris en charge avant de confier le chat, sans supposer qu’un débutant pourra le régler pendant votre absence.

## <a id="logement"></a>Quels accès et équipements vérifier ?

Montrez les fenêtres, balcons, portes et éventuelle chatière, avec les conditions convenues d’ouverture. Une moustiquaire ou une fenêtre entrouverte n’est pas automatiquement une protection contre une chute ou une fuite. Vérifiez le matériel installé et les accès autorisés.

Indiquez les couchages, cachettes, jeux et surfaces de repos déjà utilisés. Le mobilier doit être stable et adapté au chat concerné. Ne cherchez pas à multiplier les nouveautés pendant la garde ; laissez aussi la possibilité de se retirer au calme.

Précisez le nettoyage des points d’eau et de la litière. Si plusieurs chats vivent ensemble, décrivez leurs ressources et relations pour que le gardien sache quoi observer. Le [guide de garde du chat à domicile](/actualites/garde-chat-domicile-house-sitting) aide à préparer cette organisation et les [conseils de préparation de la maison](/actualites/preparer-maison-avant-garde) complètent les accès.

## <a id="sante"></a>Quel suivi transmettre et quand appeler le vétérinaire ?

Un Maine Coon peut être concerné par une cardiomyopathie hypertrophique, mais la race ne pose pas un diagnostic. La [faculté vétérinaire de Cornell explique cette maladie et les limites des tests génétiques](https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/hypertrophic-cardiomyopathy). Si votre chat est suivi, transmettez les consignes établies et les rendez-vous ou traitements utiles, sans demander au gardien d’interpréter un résultat de dépistage.

Laissez l’ordonnance et les instructions en cas de difficulté de prise ou d’oubli ; aucune dose ne doit être modifiée ou doublée de sa propre initiative. Une respiration difficile ou bouche ouverte, un malaise, ou une douleur brutale avec difficulté à utiliser les pattes arrière justifient un contact vétérinaire immédiat.

**Des efforts pour uriner avec peu ou pas d’urine nécessitent aussi un appel immédiat.** La [fiche vétérinaire PDSA sur l’obstruction urinaire](https://www.pdsa.org.uk/pet-help-and-advice/pet-health-hub/conditions/blocked-bladder-in-cats) rappelle cette urgence. N’attendez pas une amélioration spontanée ou de joindre d’abord le propriétaire.

Un refus de nourriture, des vomissements ou un changement inhabituel demandent un avis adapté au contexte. Ne prévoyez pas d’attendre systématiquement vingt-quatre heures : appelez le vétérinaire avec les observations disponibles et prévenez le propriétaire.

## <a id="garde"></a>Comment choisir la personne et confirmer les conditions ?

Décrivez dans l’annonce les dates, la présence souhaitée et les tâches réelles, notamment le pelage ou un traitement éventuel. Demandez à la personne son expérience et ce qu’elle peut assurer. Ne comptez pas sur un filtre par taille de chat qui sélectionnerait à votre place une compétence.

Un contrôle de document d’identité, lorsqu’il est affiché sur un profil, ne certifie pas une compétence ou une fiabilité. Les avis, lorsqu’ils existent, complètent l’échange. Vous pouvez vous rencontrer **si vous le souhaitez tous les deux** ; cette rencontre ne remplace pas la transmission des consignes.

Sur Guardiens, le gardien est hébergé pendant la garde sans rémunération. La plateforme est **actuellement 100 % gratuite** pour les deux rôles, selon les [conditions tarifaires](/tarifs). Nourriture, consommables, déplacements et frais éventuels restent distincts. Après confirmation, un accord de garde peut être préparé ; sa signature est facultative. Vérifiez les assurances avec votre assureur et prévoyez un relais, sans disponibilité ou remplacement garanti.

## <a id="faq"></a>Questions fréquentes

:::faq
### Combien de présence faut-il pour garder un Maine Coon ?
Partez des habitudes du chat, de ses interactions, de ses éventuels soins et des absences déjà bien vécues. Il n’existe pas un minimum d’heures qui convienne automatiquement à tous les Maine Coons.

### Faut-il le brosser pendant la garde ?
Prévoyez l’entretien nécessaire selon son pelage, avec le matériel et les gestes qu’il accepte. Montrez-les avant la garde ; en cas de feutrage ou de nœuds proches de la peau, demandez conseil au vétérinaire.

### Peut-on couper un nœud de poils aux ciseaux ?
N’improvisez pas cette coupe : la peau peut être blessée. Contactez le propriétaire et demandez au vétérinaire comment prendre en charge le nœud ou le feutrage.

### Que faire s’il essaie d’uriner sans y parvenir ?
Appelez immédiatement un vétérinaire pour une prise en charge urgente. N’attendez pas une amélioration spontanée ou la réponse du propriétaire avant cet appel.

### Un test génétique suffit-il à connaître son état cardiaque ?
Non. Les résultats doivent être interprétés avec le vétérinaire et ne remplacent pas l’évaluation médicale. Pendant la garde, transmettez seulement le suivi connu et les consignes établies.

### Comment fonctionne la gratuité de la garde ?
La plateforme est actuellement gratuite pour propriétaires et gardiens. Le gardien est hébergé sans rémunération ; nourriture, consommables, déplacements et frais éventuels restent à prévoir séparément.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='6e50012e-1eef-4f7a-8bb7-bd94ca532a3e'::uuid AND slug='maine-coon-guide-race';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/maine-coon-guide-race' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder son Maine Coon : pelage, habitudes et suivi à préparer'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un pelage à entretenir, des accès à sécuriser et parfois un suivi à transmettre : préparez la garde de votre Maine Coon selon ses habitudes réelles.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde du Maine Coon : pelage, habitudes et consignes'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez la garde de votre Maine Coon : brossage accepté, repas, eau, litière, accès et suivi vétérinaire. Des consignes à transmettre avant le départ.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une adulte brosse un grand chat gris à poil long sur un canapé, près d’un arbre à chat.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide de garde du chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"conseils de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 16:10:12.533017+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot35_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot35_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot35_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder son Maine Coon : pelage, habitudes et suivi à préparer',
    excerpt='Un pelage à entretenir, des accès à sécuriser et parfois un suivi à transmettre : préparez la garde de votre Maine Coon selon ses habitudes réelles.',
    meta_title='Garde du Maine Coon : pelage, habitudes et consignes',
    meta_description='Préparez la garde de votre Maine Coon : brossage accepté, repas, eau, litière, accès et suivi vétérinaire. Des consignes à transmettre avant le départ.',
    hero_image_alt='Une adulte brosse un grand chat gris à poil long sur un canapé, près d’un arbre à chat.',
    internal_links='[{"text":"guide de garde du chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"conseils de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='maine-coon-guide-race' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Faire garder son Malinois : activité, repos et conditions à préparer

**Pour confier un Malinois, décrivez ses réactions, ses routines et les conditions que la personne devra réellement gérer.** Pouvoir le tenir en laisse, connaître ses réactions aux visiteurs et lui permettre de se reposer compte autant que proposer des activités. Une réputation de chien sportif ne suffit pas à organiser sa garde.

Le house-sitting permet une présence dans votre logement selon ce qui a été convenu. Il ne garantit ni un gardien formé au comportement, ni une présence permanente, ni la résolution d’une difficulté pendant votre absence.

**Repères :** [décrire le chien](#comportement), [préparer les activités](#activites), [organiser les accès](#acces), [choisir la personne](#gardien), [confirmer et transmettre](#confirmation), [questions fréquentes](#faq).

## <a id="comportement"></a>Quelles réactions faut-il expliquer avant la garde ?

Décrivez des situations vécues : croisement d’un vélo, visiteur à la porte, autre chien, bruit inhabituel ou manipulation. Indiquez ce que vous observez, ce que vous faites déjà et ce qui doit être évité. Ne résumez pas un chien à « il teste les limites » ou à un manque de dépense supposé.

La [fiche Malinois de Dogs Trust](https://www.dogstrust.org.uk/dog-advice/getting-dog/breeds/belgian-malinois) rappelle que le comportement dépend de l’individu et de son expérience. Un chien peut apprécier certains contacts et avoir besoin de distance dans d’autres situations.

Si votre chien a déjà mordu, pincé, poursuivi ou présenté une difficulté importante, expliquez-le avant toute confirmation. Préparez la garde avec le professionnel qui le suit et choisissez une organisation compatible avec cette situation. Le [guide des chiens réactifs et des solutions de garde](/actualites/chien-reactif-agressif-garde-solutions) aide à poser ces questions sans promettre qu’un particulier pourra tout assurer.

## <a id="activites"></a>Comment transmettre activité et repos sans surenchère ?

Présentez le programme habituel, adapté à l’âge, à la santé et aux réactions du chien. Choisissez des activités connues que la personne comprend et accepte. La garde n’est pas le moment de commencer le cani-VTT, les sauts, une activité de mordant ou un entraînement technique sans préparation adaptée.

| Situation | Ce qu’il faut convenir |
| --- | --- |
| Promenade | Parcours, équipement habituel, croisements et possibilité de changer d’itinéraire. |
| Jeu ou recherche | Activité déjà connue, matériel utilisable et façon de terminer calmement. |
| Repos | Lieu tranquille, moments habituels et accès à préserver. |
| Absence | Expérience réelle du chien, présence promise et relais possible. |
| Suivi de santé | Restrictions d’effort et consignes vétérinaires déjà établies. |

Le flair, le jeu et la marche répondent à des besoins différents ; n’utilisez pas une équivalence de minutes pour remplacer une sortie. Prévoyez du repos et n’augmentez pas les sollicitations pour tenter d’obtenir un chien « invisible » dans le logement.

Dogs Trust recommande des apprentissages fondés sur la récompense et souligne aussi les compétences du quotidien, comme la marche en laisse et le retour au calme. Transmettez les mots et les habitudes déjà employés ; le gardien ne doit pas improviser des méthodes coercitives ou une rééducation.

En période chaude, adaptez les activités aux conditions et au chien. Le [ministère de l’Agriculture rappelle les précautions pour les animaux de compagnie](https://agriculture.gouv.fr/professionnels-particuliers-les-precautions-prendre-en-cas-de-vague-de-chaleur) : horaires moins chauds, eau, ombre et aucun animal laissé seul dans une voiture. Un programme sportif habituel ne rend pas une sortie sûre par forte chaleur.

## <a id="acces"></a>Portes, visiteurs et sorties : que sécuriser ?

Montrez l’équipement utilisé et la façon de le mettre en place. Expliquez les portes, portails et clôtures, les arrivées de visiteurs et les personnes autorisées à entrer. Une personne doit pouvoir appliquer ces consignes sans avoir à tenir le chien tout en gérant plusieurs accès difficiles.

Convenez de promenades compatibles avec sa capacité physique et les réactions observées. Ne demandez pas de détacher le chien sur la seule base de votre propre rappel habituel. Le lieu, les règles d’accès, la relation avec le gardien et les conditions doivent être évalués avant toute décision ; une sortie en montagne n’est pas une exigence de race.

Précisez les interactions autorisées avec d’autres personnes ou animaux. Une promenade calme et à distance peut être préférable à un passage imposé au milieu d’une foule. Si une situation est trop difficile, la personne doit pouvoir s’en retirer et vous contacter.

## <a id="gardien"></a>Comment choisir une personne capable d’assurer cette garde ?

Échangez sur des situations concrètes : tenir la laisse lors d’un croisement, suivre un programme connu, administrer un traitement prescrit ou gérer l’arrivée d’un proche. Demandez ce que la personne a déjà pratiqué et ce qu’elle préfère refuser. Une déclaration générale « j’aime les chiens » ne décrit pas ces capacités.

Le contrôle d’un document d’identité, lorsqu’un profil l’affiche, ne certifie ni une compétence ni la fiabilité. Consultez les expériences et les avis lorsqu’il y en a, puis posez vos questions. Une rencontre préalable est possible **si vous le souhaitez tous les deux**. N’organisez pas une épreuve ou une mise en difficulté pour « tester » le chien ou le gardien.

Si les conditions nécessaires ne peuvent pas être assurées, cherchez une autre organisation adaptée. Une publication ne garantit pas une candidature, une compétence spécialisée ou un remplacement au dernier moment.

## <a id="confirmation"></a>Que confirmer avant de partir ?

Écrivez les repas, la présence attendue, les sorties, les activités acceptées, les accès et les tâches liées à la maison. Laissez les coordonnées du vétérinaire, l’ordonnance éventuelle, les consignes en cas d’imprévu et un relais joignable. Un changement inhabituel doit conduire à demander un avis approprié ; une urgence vétérinaire n’attend pas la réponse du propriétaire.

Les [conseils de préparation de la maison](/actualites/preparer-maison-avant-garde) et les [critères de choix du gardien](/actualites/choisir-gardien-bons-criteres) aident à préparer cette transmission. Après confirmation, un accord peut être établi ; sa signature est facultative. Vérifiez les assurances applicables avec votre assureur.

Sur Guardiens, le gardien est hébergé pendant la garde sans rémunération. La plateforme est **actuellement 100 % gratuite** pour les deux rôles, selon les [conditions tarifaires](/tarifs). Déplacements, alimentation et dépenses éventuelles restent distincts. Présentez ces conditions dès l’annonce pour permettre un échange réaliste.

## <a id="faq"></a>Questions fréquentes

:::faq
### Faut-il un gardien sportif pour un Malinois ?
Il faut une personne capable d’assurer les activités et les situations réellement prévues pour ce chien. Tenue en laisse, réactions, repos et consignes comptent aussi ; le goût du sport ne prouve pas une compétence de garde.

### Combien de sorties faut-il prévoir ?
Transmettez les sorties adaptées à votre chien, à sa santé et aux conditions. Un nombre ou une durée universelle par race ne permet pas de définir le bon programme.

### Un jeu de flair remplace-t-il une longue promenade ?
Il n’existe pas une équivalence de minutes à appliquer pour organiser la garde. Proposez les activités connues et les sorties convenues, avec du repos.

### Faut-il signaler des réactions difficiles ou une morsure passée ?
Oui, avant de confirmer. Décrivez les situations et préparez une organisation compatible avec le professionnel qui suit le chien si nécessaire. Une personne reste libre de refuser une garde qu’elle ne peut pas assurer.

### Une rencontre avant la garde est-elle obligatoire ?
Elle est possible si vous le souhaitez tous les deux. Elle ne remplace pas la transmission des comportements, des consignes et des conditions nécessaires à la garde.

### La garde est-elle rémunérée sur Guardiens ?
Non. Le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite pour les deux rôles. Déplacements, alimentation et dépenses éventuelles restent à prévoir séparément.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='87433836-e77b-4ac9-8e57-52fe304a381e'::uuid AND slug='malinois-guide-race-complet';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/malinois-guide-race-complet' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder son Malinois : activité, repos et conditions à préparer'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Une garde de Malinois se prépare avec des faits : réactions observées, routines, accès, repos et tâches que le gardien peut réellement assurer.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde du Malinois : activité, repos et choix du gardien'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez la garde de votre Malinois : réactions en laisse, routines, repos, visiteurs, absences et capacités du gardien. Des consignes adaptées à votre chien.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un Malinois est debout sur une allée pavée, devant des bâtiments et des arbres.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des chiens réactifs et des solutions de garde","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"conseils de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"critères de choix du gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:25:16.943173+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot35_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot35_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot35_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder son Malinois : activité, repos et conditions à préparer',
    excerpt='Une garde de Malinois se prépare avec des faits : réactions observées, routines, accès, repos et tâches que le gardien peut réellement assurer.',
    meta_title='Garde du Malinois : activité, repos et choix du gardien',
    meta_description='Préparez la garde de votre Malinois : réactions en laisse, routines, repos, visiteurs, absences et capacités du gardien. Des consignes adaptées à votre chien.',
    hero_image_alt='Un Malinois est debout sur une allée pavée, devant des bâtiments et des arbres.',
    internal_links='[{"text":"guide des chiens réactifs et des solutions de garde","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"conseils de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"critères de choix du gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='malinois-guide-race-complet' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
