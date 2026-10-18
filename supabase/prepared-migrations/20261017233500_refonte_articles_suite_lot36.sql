-- Refonte des guides demander-persan, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot36_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot36_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot36_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot36_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('da5e8d08-c966-4e00-a462-ba90f6bb6111'::uuid,'536a9b03-ce7a-47b8-a154-081c571d1e56'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Comment demander un coup de main près de chez soi, simplement

**Pour demander un coup de main, dites ce dont vous avez besoin, quand et dans quelles conditions, en laissant la personne libre de répondre.** Vous n’avez pas à raconter toute votre situation ni à promettre immédiatement un service équivalent. Une tâche concrète permet à l’autre de décider si elle peut aider.

Sur Guardiens, vous pouvez présenter un besoin ponctuel à un réseau d’entraide entre particuliers. La plateforme est **actuellement 100 % gratuite** et le coup de main se fait sans rémunération. L’objectif est de faciliter un premier échange ; une réponse ou une relation durable ne peut pas être promise.

**Repères :** [choisir une petite demande](#besoin), [écrire le message](#message), [prévoir le retour](#retour), [convenir des conditions](#conditions), [faire sans réponse](#reponse), [questions fréquentes](#faq).

## <a id="besoin"></a>Par quoi commencer quand on hésite à demander ?

Choisissez une aide limitée que vous pouvez décrire : récupérer une commande déjà payée, préparer quelques plantations ou comprendre une étape sur un outil numérique. Vous pouvez avoir besoin de cette aide sans être capable de tout faire en retour au même moment.

Évitez une tâche trop large, comme « m’aider pour toute la maison ». Découpez le besoin et dites ce que vous pouvez déjà faire. Cela laisse une place claire à la personne qui envisage de vous aider, sans minimiser l’effort demandé.

Les [trente idées de coups de main](/actualites/idees-coups-de-main-entraide-pres-de-chez-soi) donnent des points de départ. Vérifiez que l’aide entre dans les [CGU](/cgu) : certaines activités, notamment les soins, l’aide corporelle, la garde d’enfants, les travaux en hauteur et les interventions techniques exclues, demandent une autre organisation.

## <a id="message"></a>Comment écrire un message clair et poli ?

Un message peut tenir en quelques lignes. Présentez le geste demandé, les contraintes et les informations encore à confirmer. Une formule simple suffit : vous n’avez pas à vous excuser dans chaque phrase.

| À préciser | Exemple d’information utile |
| --- | --- |
| La tâche | Récupérer une commande de courses déjà payée. |
| Le secteur | Ville ou quartier, sans adresse précise publiée. |
| Le moment | Un créneau possible et ce qui est flexible. |
| Les contraintes | Volume, étage, ascenseur ou matériel fourni. |
| L’organisation | Votre présence et la façon de convenir de la remise. |

**Exemple à adapter :** « Bonjour, je cherche un coup de main pour récupérer une commande de courses déjà payée et me l’apporter dans le quartier. Il y a deux sacs ; l’accès et le créneau sont à confirmer ensemble. Si cela peut vous convenir, je vous donne les détails en message privé. Merci ! »

Cet exemple n’est pas une demande réelle et ne garantit pas une réponse. Adaptez-le à vos conditions, en indiquant aussi les difficultés utiles. Pour une demande sur Guardiens, le [guide des petites missions](/actualites/petites-missions-entraide-guardiens) explique le parcours. Pour proposer vos compétences, utilisez plutôt les [savoir-faire du profil](/profile?section=savoir-faire).

## <a id="retour"></a>Que faut-il proposer en échange ?

Le formulaire rappelle un merci, un café ou un coup de main à convenir ensemble. Il ne vous demande pas d’inventer une prestation de même valeur ou de compter des heures à rendre. Un moment convivial peut être proposé librement, sans devenir une obligation qui met l’un de vous en difficulté.

L’entraide se fait **sans rémunération**. Les achats sont distincts : si une personne avance pour vous une dépense convenue, le remboursement peut se faire au montant exact sur justificatif. Prévoyez ce point avant l’échange ; un remboursement ne doit pas servir à payer le travail.

Si vous demandez pour un proche, faites-le avec son accord et restez l’interlocuteur de l’organisation. Le [guide d’aide aux courses et aux proches](/actualites/courses-aide-domicile-entraide-senior-lyon) détaille notamment le consentement, les informations à préserver et les limites liées aux moyens de paiement.

## <a id="conditions"></a>Comment garder la maîtrise de l’échange ?

Posez les questions utiles dans la messagerie : qui vient, pour quelle tâche, à quel moment, avec quel matériel et quelles limites ? Chacun peut dire qu’une condition ne lui convient pas. Ne vous sentez pas obligé d’accepter parce qu’une personne a répondu.

Gardez l’adresse précise, les codes d’accès et les informations personnelles hors de la publication publique. Partagez seulement les éléments nécessaires à l’organisation convenue. Un contrôle de document d’identité, lorsqu’un profil l’affiche, ne certifie ni la fiabilité ni les compétences ; les avis, lorsqu’ils existent, ne remplacent pas cet échange.

Une rencontre préalable est possible **si vous le souhaitez tous les deux**. Elle peut aider à se présenter ou à montrer la tâche, mais elle n’est pas une étape à imposer à toute demande. Pour une intervention au domicile, convenez des espaces accessibles et des conditions de votre présence. Vérifiez avec votre assureur la couverture de l’aide envisagée ; Guardiens ne fournit pas une assurance générale de l’échange.

## <a id="reponse"></a>Et si personne ne répond, ou si vous changez d’avis ?

Relisez la demande avec les questions d’une personne qui découvre la situation : comprend-elle la tâche ? Les accès, les charges et le créneau sont-ils précisés ? Pouvez-vous proposer un autre moment sans compromettre le besoin ? Ajoutez ce qui manque plutôt que de cacher une difficulté.

L’absence de réponse ne permet pas de conclure que votre demande dérange. Elle peut ne correspondre aux disponibilités ou aux capacités de personne parmi les lecteurs. Pour une tâche essentielle ou urgente, prévoyez un relais ou un service adapté avant de compter sur une réponse éventuelle.

Si vous trouvez une solution ailleurs ou si vous ne souhaitez plus poursuivre, prévenez les personnes avec qui vous aviez commencé à convenir d’une aide et mettez votre demande à jour. Après un échange réalisé, un retour factuel peut aider les suivants : ce qui a été fait, ce qui était clair et les conditions utiles. Il ne doit pas être promis comme contrepartie avant que l’aide ait eu lieu.

La [page des tarifs](/tarifs) précise la gratuité actuelle de Guardiens. Vous pouvez commencer par un besoin limité, puis décider librement si vous souhaitez renouveler l’échange.

## <a id="faq"></a>Questions fréquentes

:::faq
### Comment demander un coup de main poliment ?
Décrivez la tâche, le secteur, le créneau et les contraintes utiles, puis laissez la personne libre de ses disponibilités. Remerciez-la sans avoir à multiplier les excuses ou à raconter toute votre situation.

### Faut-il pouvoir rendre le même service immédiatement ?
Non. Vous n’avez pas à promettre une prestation ou un nombre d’heures équivalents. Le formulaire rappelle un merci, un café ou un coup de main à convenir ensemble, dans le cadre d’une entraide sans rémunération.

### Quelles informations éviter dans l’annonce publique ?
Gardez l’adresse précise, les codes d’accès, les documents et les informations personnelles hors de la publication. Partagez seulement les détails nécessaires en privé lorsque l’organisation est convenue.

### Peut-on refuser une personne qui a proposé son aide ?
Oui. Une réponse ne vous oblige pas à accepter si les conditions ne vous conviennent pas. Expliquez simplement que vous ne poursuivez pas l’échange.

### Que faire si la demande n’a pas de réponse ?
Vérifiez qu’elle est précise et que les contraintes sont compréhensibles, puis ajustez ce qui est réellement flexible. Pour un besoin essentiel, prévoyez un relais ou un service adapté sans attendre une réponse garantie.

### Faut-il payer pour demander un coup de main sur Guardiens ?
La plateforme est actuellement gratuite et l’entraide se fait sans rémunération. Les achats restent distincts ; une avance convenue peut être remboursée au montant exact sur justificatif.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='da5e8d08-c966-4e00-a462-ba90f6bb6111'::uuid AND slug='oser-demander-coup-de-main-pres-de-chez-soi';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Comment demander un coup de main près de chez soi, simplement'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Vous avez besoin d’aide mais ne savez pas comment le demander ? Commencez par une tâche précise et quelques informations utiles, sans vous imposer un échange équivalent.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Demander un coup de main : message et conseils concrets'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Un besoin précis, les bonnes informations et la liberté de refuser : préparez une demande de coup de main, avec un exemple de message et des conseils pratiques.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux adultes vus de dos marchent côte à côte vers l’entrée d’un bâtiment en se tenant par le bras.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"trente idées de coups de main","url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi"},{"text":"CGU","url":"/cgu"},{"text":"guide des petites missions","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"savoir-faire du profil","url":"/profile?section=savoir-faire"},{"text":"guide d’aide aux courses et aux proches","url":"/actualites/courses-aide-domicile-entraide-senior-lyon"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:10:15.473728+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot36_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot36_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot36_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Comment demander un coup de main près de chez soi, simplement',
    excerpt='Vous avez besoin d’aide mais ne savez pas comment le demander ? Commencez par une tâche précise et quelques informations utiles, sans vous imposer un échange équivalent.',
    meta_title='Demander un coup de main : message et conseils concrets',
    meta_description='Un besoin précis, les bonnes informations et la liberté de refuser : préparez une demande de coup de main, avec un exemple de message et des conseils pratiques.',
    hero_image_alt='Deux adultes vus de dos marchent côte à côte vers l’entrée d’un bâtiment en se tenant par le bras.',
    internal_links='[{"text":"trente idées de coups de main","url":"/actualites/idees-coups-de-main-entraide-pres-de-chez-soi"},{"text":"CGU","url":"/cgu"},{"text":"guide des petites missions","url":"/actualites/petites-missions-entraide-guardiens"},{"text":"savoir-faire du profil","url":"/profile?section=savoir-faire"},{"text":"guide d’aide aux courses et aux proches","url":"/actualites/courses-aide-domicile-entraide-senior-lyon"},{"text":"page des tarifs","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='oser-demander-coup-de-main-pres-de-chez-soi' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Faire garder son Persan : pelage, yeux et consignes à transmettre

**Pour faire garder un Persan, montrez le brossage qu’il accepte, les soins déjà établis et les habitudes à préserver.** Son pelage et sa morphologie peuvent demander une attention particulière ; sa réputation de chat calme ne permet pas de prévoir son comportement ou de minimiser un changement de santé.

Avant de confirmer, vérifiez que la personne peut assurer les gestes nécessaires et sait qui appeler si quelque chose devient difficile. La garde à domicile conserve des repères familiers, sans garantir une adaptation parfaite ni l’absence de stress.

**Repères :** [préparer les gestes](#pelage), [transmettre les soins des yeux](#yeux), [organiser le quotidien](#quotidien), [prévoir le suivi](#sante), [choisir le gardien](#gardien), [questions fréquentes](#faq).

## <a id="pelage"></a>Comment préparer le brossage pendant la garde ?

Un pelage long nécessite un entretien suivi. Prévoyez dans l’organisation le temps et les gestes adaptés à votre chat, avec son matériel habituel. Les [conseils de Cats Protection pour le poil long](https://www.cats.org.uk/cats-blog/tips-for-grooming-long-haired-cats) expliquent la prévention des nœuds et l’importance d’un entretien régulier.

Montrez la brosse ou le peigne, les zones acceptées et les réactions qui doivent faire arrêter. Le gardien ne doit pas forcer une manipulation douloureuse ou prolonger une séance que le chat ne tolère pas. Signalez une sensibilité connue et faites traiter les problèmes déjà présents avant votre départ.

Un nœud ou un feutrage proche de la peau demande un avis vétérinaire. N’improvisez pas une coupe aux ciseaux ou un démêlage en tirant. Si votre chat ne laisse pas une autre personne assurer l’entretien nécessaire, préparez une autre solution plutôt que de compter sur une tolérance supposée pendant l’absence.

## <a id="yeux"></a>Larmoiement : que montrer et quand demander un avis ?

Certains Persans présentent un larmoiement lié à leur morphologie, mais cela ne rend pas tout écoulement normal. Transmettez les soins établis pour votre chat, le matériel et les produits prescrits ou recommandés par son vétérinaire. Ne transformez pas une routine individuelle en nettoyage obligatoire matin et soir pour tous les Persans.

La [fiche PDSA sur les yeux larmoyants](https://www.pdsa.org.uk/pet-help-and-advice/pet-health-hub/symptoms/weepy-eyes-in-cats) rappelle qu’un changement ou un problème mérite un avis vétérinaire. Décrivez au gardien ce qui est habituel et ce qui doit être signalé, sans lui demander de poser un diagnostic.

**Un œil douloureux, tenu fermé, devenu rouge ou trouble doit conduire à appeler le vétérinaire rapidement ; en cas de douleur, immédiatement.** Les [conseils vétérinaires PDSA sur les problèmes oculaires](https://www.pdsa.org.uk/pet-help-and-advice/pet-health-hub/symptoms/eye-problems-in-cats) soulignent l’importance d’une prise en charge précoce. N’ajoutez pas un ancien collyre, un produit humain ou un traitement choisi sans avis.

## <a id="quotidien"></a>Quels repas, ressources et accès préparer ?

| Point à transmettre | Informations concrètes |
| --- | --- |
| Alimentation | Aliment habituel, quantité, horaires et gamelle déjà utilisée. |
| Eau et litière | Emplacements, nettoyage, consommables et observations utiles. |
| Repos et interactions | Cachettes, couchages, jeux et contacts acceptés. |
| Logement | Fenêtres, balcon, portes et conditions d’accès à l’extérieur. |
| Entretien | Matériel, gestes acceptés et suivi éventuel. |

Montrez comment votre chat mange et boit. Si une difficulté de prise alimentaire existe, transmettez le programme établi avec le vétérinaire. Une gamelle spéciale ou un changement d’aliment ne doit pas être improvisé pendant la garde.

Ne déduisez pas de la race qu’il ne grimpera pas ou ne cherchera jamais à sortir. Vérifiez les accès et les protections installées, notamment aux fenêtres et au balcon. Prévoyez aussi du jeu adapté et la possibilité de se retirer au calme, sans forcer une interaction.

En période chaude, laissez de l’eau propre et un lieu de repos ventilé et à l’ombre. Le [ministère de l’Agriculture présente les précautions de chaleur pour les animaux de compagnie](https://agriculture.gouv.fr/professionnels-particuliers-les-precautions-prendre-en-cas-de-vague-de-chaleur). Une respiration difficile ou bouche ouverte demande un contact vétérinaire immédiat ; ne l’écartez pas comme une particularité normale de la race.

## <a id="sante"></a>Quel suivi laisser avant le départ ?

Transmettez les problèmes connus, l’ordonnance éventuelle, les doses prescrites, la conservation et les instructions en cas d’oubli ou de difficulté. Demandez à la personne si elle peut réellement assurer les gestes. Elle ne doit ni modifier un traitement ni doubler une dose de sa propre initiative.

Laissez les coordonnées du vétérinaire habituel, une solution d’urgence accessible et une caisse de transport adaptée. Prévoyez un relais pour l’organisation. Une urgence ne doit pas attendre de joindre d’abord le propriétaire.

Un changement d’appétit, de toilette ou de comportement mérite un avis adapté au contexte. Notez ce que le gardien observe et demandez conseil plutôt que de fixer une durée d’attente valable pour tous les chats. Le [guide de garde du chat à domicile](/actualites/garde-chat-domicile-house-sitting) aide à préparer ces observations et la transmission.

## <a id="gardien"></a>Comment choisir quelqu’un pour garder votre Persan ?

Précisez les dates, la présence nécessaire, les soins et les tâches liées à la maison. Échangez sur l’expérience de la personne et ce qu’elle sait ou souhaite assurer. Un contrôle de document d’identité, lorsqu’un profil l’affiche, ne certifie ni une compétence ni une fiabilité ; les avis, lorsqu’il y en a, complètent la discussion.

Une rencontre préalable est possible **si vous le souhaitez tous les deux**. Montrez les gestes utiles dans les conditions que le chat tolère, sans imposer une manipulation pour tester la personne. Les [conseils de préparation de la maison](/actualites/preparer-maison-avant-garde) aident à organiser matériel et accès.

Sur Guardiens, le gardien est hébergé pendant la garde sans rémunération. La plateforme est **actuellement 100 % gratuite** pour les deux rôles, selon les [conditions tarifaires](/tarifs). Nourriture, consommables, déplacements et frais éventuels restent distincts. Après confirmation, un accord peut être préparé ; sa signature est facultative. Vérifiez les assurances avec votre assureur et prévoyez un relais, sans candidat ou remplacement garanti.

## <a id="faq"></a>Questions fréquentes

:::faq
### Un Persan est-il forcément calme et facile à garder ?
Non. Décrivez les réactions et les habitudes du chat concerné, ainsi que les soins nécessaires. Son caractère et sa tolérance aux manipulations ne se déduisent pas de la race.

### Comment préparer le brossage avec le gardien ?
Montrez le matériel, les gestes acceptés et le rythme nécessaire pour votre chat. Prévoyez l’entretien dans l’organisation, sans forcer les manipulations ; un feutrage ou des nœuds proches de la peau demandent un avis vétérinaire.

### Faut-il nettoyer les yeux de tous les Persans deux fois par jour ?
Transmettez les soins établis pour votre chat avec son vétérinaire, sans imposer un protocole universel. Un écoulement nouveau ou un changement doit être signalé et évalué.

### Que faire si le chat garde un œil fermé ou douloureux ?
Appelez le vétérinaire rapidement, immédiatement en cas de douleur, en décrivant les changements observés. N’appliquez pas un ancien collyre ou un produit choisi sans avis.

### Peut-on laisser une fenêtre entrouverte parce qu’il sort peu ?
Ne déduisez pas de ses habitudes ou de sa race qu’un accès est sans risque. Vérifiez les protections et convenez des fenêtres, portes et balcons utilisables pendant la garde.

### La garde est-elle rémunérée sur Guardiens ?
Non. Le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite pour les deux rôles. Nourriture, déplacements, consommables et dépenses éventuelles restent à prévoir séparément.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='536a9b03-ce7a-47b8-a154-081c571d1e56'::uuid AND slug='persan-guide-race';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/persan-guide-race' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder son Persan : pelage, yeux et consignes à transmettre'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Montrez les gestes que votre Persan accepte et les soins déjà établis. Le gardien doit connaître ses habitudes, ses accès et les contacts vétérinaires utiles.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde du Persan : pelage, yeux et consignes utiles'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez la garde de votre Persan : brossage accepté, soins établis, yeux, repas et accès. Distinguez les habitudes à transmettre des signes à faire évaluer.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une adulte brosse un chat gris à poil long couché sur une couverture, près de matériel d’entretien.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide de garde du chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"conseils de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:40:17.222818+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot36_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot36_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot36_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder son Persan : pelage, yeux et consignes à transmettre',
    excerpt='Montrez les gestes que votre Persan accepte et les soins déjà établis. Le gardien doit connaître ses habitudes, ses accès et les contacts vétérinaires utiles.',
    meta_title='Garde du Persan : pelage, yeux et consignes utiles',
    meta_description='Préparez la garde de votre Persan : brossage accepté, soins établis, yeux, repas et accès. Distinguez les habitudes à transmettre des signes à faire évaluer.',
    hero_image_alt='Une adulte brosse un chat gris à poil long couché sur une couverture, près de matériel d’entretien.',
    internal_links='[{"text":"guide de garde du chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"conseils de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='persan-guide-race' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
