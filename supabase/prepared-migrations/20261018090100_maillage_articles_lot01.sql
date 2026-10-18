-- Maillage éditorial, lot 01 : deux articles existants. Reprise autorisée le 18/10/2026.
-- Seuls content, internal_links et updated_at changent ; URL, indexabilité et métadonnées conservées.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_maillage_lot01_20261018 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_maillage_lot01_20261018 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_maillage_lot01_20261018 TO service_role;
ALTER TABLE public._backup_articles_maillage_lot01_20261018 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('d7a85b8a-a14f-4822-b006-a4b55591187a'::uuid,'f36aa609-312a-4f5f-b001-a750b8f46449'::uuid) ORDER BY id FOR UPDATE;

DO $article_0$
DECLARE
  before_row public.articles%ROWTYPE;
  new_content text := $maillage_lot01_0$# Garde de chien : quelle solution choisir pendant votre absence ?

**Pour faire garder votre chien, vous pouvez choisir un gardien chez vous, un proche, des visites avec promenades, un accueil chez un particulier, une pension ou une garde de jour.** Le bon choix dépend surtout de ses habitudes, du temps qu’il peut réellement passer seul et des soins nécessaires. Une sortie dans la journée et une garde pendant deux semaines ne répondent pas au même besoin.

Sur Guardiens, la formule est celle du house-sitting : une personne séjourne chez vous et s’occupe de votre chien selon ce que vous avez convenu, en échange de l’hébergement et sans rémunération. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Vous publiez votre besoin puis échangez avec les personnes intéressées, sans garantie de candidature.

Avec ma femme Elisa, qui est argentine, nous avons gardé des maisons et des animaux pendant cinq ans avant de créer Guardiens. Nous souhaitons construire un réseau de confiance où chacun peut décrire simplement ses besoins et ses possibilités.

**Dans ce guide :** [les six solutions](#solutions) · [la durée](#duree) · [le profil du chien](#profil) · [la garde à domicile](#domicile) · [le budget](#prix) · [trouver un gardien](#guardiens) · [les consignes](#consignes) · [près de chez vous](#villes) · [les questions fréquentes](#faq).

## <a id="solutions"></a>Six solutions pour faire garder son chien

| Solution | Ce qu’elle permet | Ce qu’il faut vérifier |
| --- | --- | --- |
| Gardien qui séjourne chez vous | Le chien reste dans son environnement avec une personne sur place. | Ses sorties, ses absences prévues et sa capacité à assurer les soins. |
| Proche, chez vous ou chez lui | Une garde organisée avec une personne que vous connaissez. | Sa disponibilité réelle, son logement et les autres animaux présents. |
| Visites et promenades | Des passages pour sortir le chien et assurer les tâches convenues. | Les intervalles sans présence et leur compatibilité avec votre chien. |
| Accueil chez un particulier | Le chien séjourne dans un autre foyer. | Les personnes, animaux, espaces et horaires de ce foyer. |
| Pension canine | Une garde dans un établissement, selon ses prestations. | L’hébergement, les sorties, les conditions d’accueil et le suivi proposé. |
| Garde de jour | Un accueil pendant certaines heures, avec retour chez vous ensuite. | Les horaires, les trajets et l’adaptation à un accueil éventuellement collectif. |

Le nom de la formule ne dit pas combien de temps quelqu’un sera avec votre chien. **Un gardien hébergé chez vous n’assure pas automatiquement une présence permanente**, et les prestations d’une pension ou d’un accueil varient. Posez la question des horaires avant de comparer les offres. Pour examiner ces différences plus en détail, consultez notre [comparatif des pensions et des alternatives](/actualites/pension-chien-alternatives-guide).

## <a id="duree"></a>Journée de travail, week-end ou vacances : partir du planning réel

Pour une absence en journée, regardez les heures de départ et de retour, les sorties habituelles et les moments où votre chien a besoin de compagnie. Une promenade intermédiaire peut faire partie de l’organisation ; elle ne rend pas forcément acceptable tout le reste du temps seul.

Pour un week-end ou des vacances, ajoutez les repas, les nuits, les imprévus et la transmission des clés. Si vous choisissez des visites, précisez tous les passages prévus et les périodes sans personne. Si vous accueillez un gardien, convenez aussi de ses possibilités de sortie et de son arrivée avant ou après votre départ.

Pour plusieurs semaines, vérifiez que la personne est disponible sur toute la période et préparez une solution si la garde s’interrompt. Notre guide sur la [garde d’un animal pendant une absence longue](/actualites/vacances-longues-garde-animal-2-semaines) détaille cette continuité. Commencez vos recherches dès que vos dates sont connues : aucun délai ne garantit de trouver quelqu’un.

## <a id="profil"></a>Les questions à poser selon votre chien

Partez de ce que vous observez au quotidien plutôt que de sa seule race ou de son gabarit. Votre chien sait-il rester seul ? Accepte-t-il une personne nouvelle ? Comment réagit-il aux congénères, aux enfants, aux vélos ou aux bruits ? Peut-il monter les escaliers et se déplacer facilement ?

Pour préparer les questions propres à votre chien, consultez aussi nos guides du [berger allemand](/actualites/berger-allemand-guide-race), du [berger australien](/actualites/berger-australien-guide-race), du [border collie](/actualites/border-collie-guide-race-complet) et du [malinois](/actualites/malinois-guide-race-complet), ou ceux du [labrador](/actualites/labrador-retriever-guide-race), du [cavalier King Charles](/actualites/cavalier-king-charles-guide-race) et du [bouledogue français](/actualites/bouledogue-francais-guide-race-complet). Ces repères complètent la description de votre animal ; ils ne permettent pas de déduire son comportement ni les compétences du gardien.

- **Chiot :** décrivez les sorties, les repas, l’apprentissage en cours et les courtes absences qu’il connaît déjà. Vérifiez que le rythme est réalisable pour la personne.
- **Chien âgé ou sous traitement :** préparez les besoins avec votre vétérinaire et vérifiez que le gardien sait assurer les gestes prescrits et les déplacements nécessaires.
- **Difficultés à rester seul :** convenez d’une présence adaptée et demandez conseil à votre vétérinaire. La [RSPCA explique que la détresse liée à la séparation peut apparaître très rapidement](https://www.rspca.org.uk/adviceandwelfare/pets/dogs/behaviour/separationrelatedbehaviour) ; changer de gardien ne constitue pas un traitement.
- **Réactivité ou antécédent de morsure :** dites précisément ce qui se passe, les situations à éviter et les consignes déjà établies. Une expérience générale des chiens ne suffit pas toujours ; notre [guide de garde d’un chien réactif](/actualites/chien-reactif-agressif-garde-solutions) aide à préparer cet échange.

Si votre chien est catégorisé, vérifiez en amont les obligations applicables à sa garde, aux documents et aux sorties avec votre mairie et votre assureur. Les [règles présentées par Service Public](https://www.service-public.gouv.fr/particuliers/vosdroits/F1839?lang=fr) doivent être distinguées du régime de la détention temporaire prévu par [l’article L. 211-14 V du Code rural](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006071367/LEGISCTA000006167705/2026-04-29/). Ne supposez ni que chaque gardien doit obtenir son propre permis, ni qu’une garde temporaire dispense de toutes les autres obligations.

## <a id="domicile"></a>Quand envisager une garde de chien à domicile ?

Accueillir quelqu’un chez vous peut convenir si vous souhaitez maintenir les repères de votre chien, ses trajets de promenade et son couchage. Cela permet aussi de confier les tâches courantes de la maison que le gardien a acceptées. Il faut pouvoir proposer un logement adapté et expliquer les espaces à sa disposition.

Le domicile ne suffit pas à lui seul : le chien doit pouvoir être confié à cette personne, et les horaires de chacun doivent convenir. Si vous avez aussi un chat, préparez ses besoins séparément avec notre guide de la [garde de chat à domicile](/actualites/garde-chat-domicile-house-sitting), notamment les repas, les accès et les interactions entre animaux.

**Exemple fictif à adapter :** « Notre chien sort habituellement à 7 h, 13 h et 19 h. Il dort dans le salon et connaît des absences de deux heures. Il réagit aux chiens en laisse : nous vous expliquerons les trajets et les consignes. Nous cherchons quelqu’un dont les horaires sont compatibles. » Une description concrète aide davantage qu’un simple « chien facile ».

## <a id="prix"></a>Combien coûte une garde de chien ?

Pour une prestation payante, demandez un devis correspondant à vos dates, au nombre d’animaux et aux services nécessaires. Vérifiez ce qui est inclus : promenades, nuits, trajets, soins acceptés et éventuels suppléments. Comparez aussi les conditions d’annulation.

Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement 100 % gratuite pour les deux rôles. La nourriture du chien, les fournitures, les soins vétérinaires et les dépenses convenues restent à prévoir séparément.

Notre priorité est de construire le réseau et d’améliorer le service avec vos retours. Une participation aux frais d’infrastructure pourra être envisagée **au plus tôt au second semestre 2027**, avec un préavis de 30 jours. Les conditions à jour sont sur la [page des tarifs](/tarifs).

## <a id="guardiens"></a>Comment trouver un gardien avec Guardiens ?

1. **Présentez votre logement et les dates**, avec les besoins réels de votre chien, ses habitudes et les difficultés à connaître. Notre guide pour [rédiger une annonce de garde](/actualites/rediger-bonne-annonce-house-sitting) vous aide à préparer le texte.
2. **Échangez avec les personnes intéressées** sur leurs expériences pertinentes, leur disponibilité et leur organisation. Consultez les avis lorsqu’il y en a. Un badge de vérification d’identité ne garantit ni les compétences ni la qualité d’une garde.
3. **Définissez ensemble la garde**, les absences possibles, les nouvelles, les accès et les dépenses. Une rencontre est possible si vous le souhaitez tous les deux ; elle n’est pas imposée par la plateforme.
4. **Préparez la transmission.** Après confirmation, le guide de la maison permet de regrouper les consignes et l’accord de garde est disponible ; sa signature est facultative. Vérifiez également vos garanties avec votre assureur et celles du gardien selon la situation.

Prenez le temps de [choisir un gardien selon des critères concrets](/actualites/choisir-gardien-bons-criteres). Si les contraintes ne correspondent pas, poursuivez vos recherches ou retenez une autre formule.

## <a id="consignes"></a>Les consignes à laisser avant le départ

Laissez une fiche accessible avec l’alimentation habituelle, les sorties, les équipements, les zones autorisées et les situations à éviter. Pour un traitement, transmettez les instructions du vétérinaire et vérifiez leur bonne compréhension, sans improviser de changement.

Ajoutez les coordonnées du vétérinaire habituel et d’un service de garde identifié pour vos dates, le carnet de santé, l’identification du chien, les moyens de transport et les personnes à contacter. Convenez des décisions et des dépenses en cas de problème, y compris si vous êtes injoignable. Toute modification préoccupante de son état justifie de demander rapidement un avis vétérinaire, sans attendre votre prochain message.

Prévoyez enfin un relais qui a accepté son rôle en cas d’annulation, de départ anticipé ou de retour retardé. La plateforme ne garantit pas un remplacement immédiat. La [liste de préparation de la maison](/actualites/preparer-maison-avant-garde) complète ces consignes.

## <a id="villes"></a>Chercher près de chez vous ou accueillir un gardien

Pour des passages réguliers, les trajets et la proximité comptent. Pour un séjour chez vous, une personne peut venir d’une autre ville : vérifiez les conditions d’accès, le transport et sa mobilité pour les promenades ou le vétérinaire. Les [pages de house-sitting par ville](/house-sitting) permettent de situer le fonctionnement local, sans assurer qu’un gardien sera disponible à vos dates.

## <a id="faq"></a>Questions fréquentes sur la garde de chien

:::faq
### Comment faire garder son chien pendant les vacances ?
Comparez une garde chez vous, chez un proche, chez un particulier ou en pension selon les besoins de votre chien. Définissez les soins, les sorties, les nuits et les temps sans présence avant de confirmer. Prévoyez également un relais en cas d’imprévu.

### Quelle est la meilleure solution pour faire garder son chien ?
Il n’existe pas de formule idéale pour tous les chiens. Vérifiez sa capacité à rester seul, son adaptation à un autre lieu, les soins nécessaires et la disponibilité réelle de la personne ou de l’établissement. La garde à domicile est une possibilité lorsque ces conditions sont réunies.

### Combien de temps mon chien peut-il rester seul pendant la garde ?
Ne fixez pas cette durée à partir du seul mode de garde. Elle dépend de votre chien, de son âge, de son état et de ce qu’il vit déjà sans détresse. Décrivez ses habitudes au gardien et demandez conseil à votre vétérinaire si la solitude pose problème.

### Peut-on faire garder son chien gratuitement avec Guardiens ?
La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens. Le gardien séjourne chez vous sans rémunération, en échange de l’hébergement. La nourriture, les soins et les autres dépenses convenues restent distincts. Les conditions en vigueur sont précisées sur la page des tarifs.

### Faut-il rencontrer le gardien avant la garde ?
Une rencontre peut être organisée si vous le souhaitez tous les deux. Elle n’est pas obligatoire sur Guardiens. Dans tous les cas, échangez sur les besoins du chien, les situations difficiles, les horaires et la transmission des consignes avant de confirmer.

### Quand commencer à chercher une garde de chien ?
Dès que vos dates et vos besoins sont connus, surtout si le séjour est long ou comporte des contraintes particulières. Aucun délai de recherche ne garantit une candidature ou une réservation. Gardez une autre solution possible tant que la garde n’est pas confirmée.

### Peut-on confier un chien catégorisé à un gardien ?
La garde doit respecter les règles applicables à la catégorie du chien et à la personne qui le détient. La détention temporaire a un régime particulier : vérifiez les documents, les assurances et les conditions de sortie avec votre mairie et votre assureur avant de confirmer. Ne déduisez pas l’éligibilité d’un gardien de son seul profil.
:::$maillage_lot01_0$;
  new_links jsonb := '[{"url":"/actualites/pension-chien-alternatives-guide","text":"comparatif des pensions et des alternatives"},{"url":"/actualites/vacances-longues-garde-animal-2-semaines","text":"garde d’un animal pendant une absence longue"},{"url":"/actualites/chien-reactif-agressif-garde-solutions","text":"guide de garde d’un chien réactif"},{"url":"/actualites/garde-chat-domicile-house-sitting","text":"garde de chat à domicile"},{"url":"/tarifs","text":"page des tarifs"},{"url":"/actualites/rediger-bonne-annonce-house-sitting","text":"rédiger une annonce de garde"},{"url":"/actualites/choisir-gardien-bons-criteres","text":"choisir un gardien selon des critères concrets"},{"url":"/actualites/preparer-maison-avant-garde","text":"liste de préparation de la maison"},{"url":"/house-sitting","text":"pages de house-sitting par ville"},{"text":"berger allemand","url":"/actualites/berger-allemand-guide-race"},{"text":"berger australien","url":"/actualites/berger-australien-guide-race"},{"text":"border collie","url":"/actualites/border-collie-guide-race-complet"},{"text":"malinois","url":"/actualites/malinois-guide-race-complet"},{"text":"labrador","url":"/actualites/labrador-retriever-guide-race"},{"text":"cavalier King Charles","url":"/actualites/cavalier-king-charles-guide-race"},{"text":"bouledogue français","url":"/actualites/bouledogue-francais-guide-race-complet"}]'::jsonb;
  affected integer;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='d7a85b8a-a14f-4822-b006-a4b55591187a'::uuid AND slug='garde-chien-faire-garder-son-chien';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM false
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/garde-chien-faire-garder-son-chien' THEN
    RAISE EXCEPTION 'Lot 01 article 0: état éditorial inattendu';
  END IF;
  IF before_row.content = new_content AND before_row.internal_links IS NOT DISTINCT FROM new_links THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-17T15:47:58.092355+00:00'::timestamptz
    OR md5(before_row.content) IS DISTINCT FROM 'f27437244b0997ecab254a1d0216e6e3' THEN
    RAISE EXCEPTION 'Lot 01 article 0: version concurrente';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_maillage_lot01_20261018 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Lot 01 article 0: sauvegarde différente';
  END IF;
  INSERT INTO public._backup_articles_maillage_lot01_20261018 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_maillage_lot01_20261018 z WHERE z.id=x.id);
  UPDATE public.articles SET content=new_content, internal_links=new_links, updated_at=now()
    WHERE id=before_row.id AND slug=before_row.slug AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Lot 01 article 0: écriture incomplète'; END IF;
END;
$article_0$;

DO $article_1$
DECLARE
  before_row public.articles%ROWTYPE;
  new_content text := $maillage_lot01_1$# Garde de chat à domicile : visites ou gardien sur place ?

**La garde de chat à domicile permet à votre chat de rester chez lui pendant votre absence, avec une personne qui vient le voir ou qui séjourne sur place.** Le choix dépend de ses besoins : repas, eau, litière, interactions, soins éventuels et temps sans présence. Rester dans son environnement peut préserver ses repères ; cela ne remplace pas une organisation adaptée.

Sur Guardiens, vous pouvez accueillir un gardien chez vous pour s’occuper de votre chat selon les tâches convenues, en échange de l’hébergement et sans rémunération. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Vous publiez votre besoin et échangez avec les personnes intéressées pour choisir la garde qui vous convient.

Je suis Elisa, argentine et cofondatrice de Guardiens avec mon mari Jérémie. Nous avons gardé des maisons et des animaux pendant cinq ans avant de créer la plateforme. Notre envie est de développer un réseau de confiance, avec des échanges clairs sur les habitudes de chaque animal.

**Dans ce guide :** [visites ou séjour](#solutions) · [fréquence et présence](#presence) · [choisir la personne](#choisir) · [préparer la garde](#preparer) · [imprévus](#imprevus) · [gratuité et fonctionnement](#guardiens) · [questions fréquentes](#faq).

## <a id="solutions"></a>Visites, gardien à domicile ou pension : que choisir ?

| Formule | Ce qu’elle permet | Point à vérifier |
| --- | --- | --- |
| Visites à domicile | Une personne vient assurer les soins et les interactions convenus. | La fréquence, la durée des passages et les intervalles sans personne. |
| Gardien qui séjourne chez vous | Le chat garde son environnement avec une personne qui y habite temporairement. | Ses horaires, ses absences et la capacité à suivre les habitudes du chat. |
| Accueil hors du domicile ou pension | Le chat est pris en charge dans un autre lieu. | Son adaptation, les conditions d’hébergement et les soins proposés. |

Un chat habitué à son environnement peut bénéficier d’une garde chez lui, notamment s’il supporte mal les changements. D’autres chats peuvent être accueillis ailleurs dans de bonnes conditions. Comparez les possibilités à partir de votre chat et de la prise en charge réelle, sans écarter une pension par principe.

Si vous avez aussi un chien, ses sorties et sa tolérance à la solitude demandent une organisation distincte. Notre [guide des solutions de garde de chien](/actualites/garde-chien-faire-garder-son-chien) vous aide à coordonner les deux besoins.

## <a id="presence"></a>Combien de visites et quel temps de présence prévoir ?

Pour des vacances avec visites à domicile, [Cats Protection recommande au moins deux passages par jour](https://www.cats.org.uk/help-and-advice/caring-for-your-cat/home-and-environment/going-on-holiday). L’association précise que les très jeunes chats, les chats âgés ou ceux ayant certains problèmes de santé peuvent avoir besoin de visites plus fréquentes. Ce repère ne remplace pas un avis vétérinaire lorsque votre chat a des besoins particuliers.

Un passage doit permettre de vérifier comment va le chat, renouveler l’eau, donner son alimentation, s’occuper de la litière et proposer les interactions qu’il accepte. Convenez du temps nécessaire et des nouvelles à donner. Remplir une gamelle à la porte ne permet pas toujours d’observer son état.

**Un distributeur, une fontaine ou une caméra ne remplace pas une personne responsable de ses soins pendant vos vacances.** Préparez aussi une solution si un équipement tombe en panne ou si le chat ne se présente pas comme d’habitude.

Si un gardien séjourne chez vous, parlez de ses sorties et de ses horaires. Dormir dans le logement ne signifie pas y rester toute la journée. Pour un chat très demandeur de compagnie ou dont les soins sont contraignants, vérifiez explicitement que l’organisation est compatible.

## <a id="choisir"></a>Comment choisir quelqu’un pour votre chat ?

Expliquez son comportement avec une personne nouvelle, ses cachettes, ses jeux et sa manière de demander ou de refuser le contact. Un chat discret peut avoir besoin de temps ; le gardien n’a pas à le forcer à sortir ou à se laisser porter.

Les guides du [bengal](/actualites/bengal-guide-race), du [maine coon](/actualites/maine-coon-guide-race), du [persan](/actualites/persan-guide-race) et du [siamois](/actualites/siamois-guide-race) proposent des points à décrire pour préparer la garde. Ils complètent vos observations : la race seule ne détermine ni le besoin de présence ni les soins de votre chat.

Demandez à la personne comment elle organise une journée de garde, ce qu’elle observe chez un chat et quelles expériences correspondent à votre besoin. Pour des soins prescrits, vérifiez qu’elle sait les réaliser et qu’elle peut respecter les horaires. Si ce n’est pas le cas, cherchez une prise en charge adaptée avec votre vétérinaire.

Consultez le profil et les avis lorsqu’ils existent, puis échangez sur les points concrets. Un badge de vérification d’identité ne garantit pas les compétences ou la qualité de la garde. Une rencontre est possible **si vous le souhaitez tous les deux**, sans être obligatoire sur Guardiens. Le guide pour [choisir un gardien](/actualites/choisir-gardien-bons-criteres) complète ces critères.

## <a id="preparer"></a>Les consignes à laisser pour une garde de chat à domicile

Préparez une fiche courte et accessible, en distinguant les habitudes du chat des tâches de la maison. Vous pouvez utiliser le guide de la maison et vous appuyer sur notre [liste de préparation avant une garde](/actualites/preparer-maison-avant-garde).

- **Alimentation et eau :** quantités habituelles, horaires, emplacement des réserves, régime particulier et fonctionnement des équipements. Avec plusieurs chats, précisez qui mange quoi et comment séparer les repas si nécessaire.
- **Litière :** emplacement, entretien, réserves et évacuation des déchets. Signalez les habitudes qui permettent de remarquer un changement.
- **Accès :** pièces autorisées, portes, fenêtres, balcon et chatière. Convenez des sorties éventuelles et de la manière de les gérer ; n’improvisez pas une nouvelle liberté d’accès pendant votre absence.
- **Contacts et jeux :** cachettes connues, jeux utilisables, contacts acceptés et interactions avec les autres animaux. Rangez les objets et jouets qui ne doivent pas rester accessibles sans surveillance.
- **Santé :** coordonnées du vétérinaire et du service de garde identifié, documents utiles, caisse de transport accessible et consignes prescrites s’il y a un traitement.

Vérifiez les accès avec la personne : clés, serrure, fermeture des fenêtres et portes, puis solution convenue si elle ne peut pas entrer. Les coordonnées et codes d’accès se transmettent en privé, sans les publier dans l’annonce.

**Exemple fictif à adapter :** « Notre chatte se cache souvent à l’arrivée d’une personne nouvelle. Elle mange dans la cuisine et dispose d’une litière dans la buanderie. Nous souhaitons des nouvelles selon la fréquence convenue et que l’on nous signale tout changement. Les fenêtres donnant sur le balcon doivent rester fermées. » Ajoutez vos horaires et vos consignes réelles avant de partager ce texte.

## <a id="imprevus"></a>Que prévoir si quelque chose change pendant votre absence ?

Dites ce qui est habituel pour votre chat et ce qui doit alerter le gardien. S’il ne mange plus, semble abattu ou présente un changement préoccupant, la personne doit demander rapidement conseil à un vétérinaire. Ne demandez pas d’attendre un délai fixe ni votre prochaine réponse pour solliciter cet avis.

Convenez à l’avance des contacts, du transport et de l’organisation des frais vétérinaires si vous êtes injoignable. Pour un traitement ou une affection connue, préparez les consignes avec votre vétérinaire ; la garde ne remplace pas une prise en charge médicale.

Prévoyez un relais qui a accepté d’intervenir si un passage devient impossible, si le gardien doit partir plus tôt ou si votre retour est retardé. Le fait de publier sur une plateforme ne garantit pas un remplacement immédiat. Pour plusieurs semaines, consultez aussi le guide de la [garde pendant une absence longue](/actualites/vacances-longues-garde-animal-2-semaines).

## <a id="guardiens"></a>Organiser une garde avec Guardiens et comprendre la gratuité

Guardiens propose un séjour de garde dans votre logement : présentez vos dates, le cadre de vie, les besoins de votre chat et les tâches courantes à assurer. Notre guide pour [rédiger une annonce](/actualites/rediger-bonne-annonce-house-sitting) vous aide à préciser ces éléments. Les personnes intéressées peuvent échanger avec vous ; aucune candidature ni disponibilité n’est garantie.

Avant de confirmer, convenez des horaires, des accès, des nouvelles et des dépenses. Vérifiez les garanties avec votre assureur et celles du gardien selon la situation. Après confirmation, un accord de garde est disponible sur la plateforme ; sa signature est facultative.

**La plateforme est actuellement 100 % gratuite pour les deux rôles et le gardien est hébergé sans rémunération.** L’alimentation, la litière, les soins et les dépenses convenues restent à prévoir séparément. Si vous recherchez uniquement des visites sans hébergement, cherchez une organisation correspondant à ce besoin : ce guide distingue les formules sans présenter Guardiens comme une réservation de visites professionnelles.

Notre priorité est de développer le réseau et d’améliorer le service grâce à vos retours. Une participation aux frais d’infrastructure pourra être envisagée **au plus tôt au second semestre 2027**, avec un préavis de 30 jours. Vous trouverez les conditions à jour sur la [page des tarifs](/tarifs).

## <a id="faq"></a>Questions fréquentes sur la garde de chat à domicile

:::faq
### Vaut-il mieux faire garder son chat chez lui ou en pension ?
Cela dépend du chat et des conditions de prise en charge. Rester chez lui peut préserver ses repères, notamment s’il est sensible aux changements. Une pension adaptée reste une possibilité. Comparez la présence, les soins, l’environnement et la capacité à répondre à ses besoins.

### Combien de visites par jour prévoir pendant les vacances ?
Cats Protection recommande au moins deux passages par jour, avec des visites potentiellement plus fréquentes pour les très jeunes chats, les chats âgés ou certains problèmes de santé. Convenez aussi de la durée et du contenu des passages. Pour des besoins particuliers, préparez l’organisation avec votre vétérinaire.

### Peut-on laisser son chat seul avec un distributeur pendant un week-end ?
Un distributeur ne permet pas de vérifier l’état du chat ni de réagir à un problème. Organisez la présence d’une personne responsable de ses soins pendant votre absence, avec des passages adaptés. La nourriture disponible ne remplace pas l’observation, l’eau renouvelée, la litière et les interactions nécessaires.

### Un gardien qui séjourne chez moi sera-t-il présent en permanence ?
Non, l’hébergement ne signifie pas une présence permanente. Définissez ensemble les horaires, les absences possibles et les besoins de votre chat avant de confirmer. Si ses soins nécessitent une présence particulière, vérifiez que la personne peut réellement l’assurer.

### Comment faire garder un chat qui se cache devant les inconnus ?
Décrivez ses habitudes, ses cachettes et les contacts qu’il accepte. La personne doit respecter son rythme et pouvoir vérifier qu’il va bien sans le forcer à interagir. Si sa discrétion empêche les soins nécessaires ou si son comportement change de façon préoccupante, demandez conseil à votre vétérinaire.

### La garde de chat avec Guardiens est-elle gratuite ?
La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens. La formule consiste à héberger un gardien chez vous sans rémunération, avec les soins convenus pour votre chat. Nourriture, litière, soins vétérinaires et autres dépenses restent distincts. Les conditions à jour figurent sur la page des tarifs.
:::$maillage_lot01_1$;
  new_links jsonb := '[{"url":"/actualites/garde-chien-faire-garder-son-chien","text":"guide des solutions de garde de chien"},{"url":"/actualites/choisir-gardien-bons-criteres","text":"choisir un gardien"},{"url":"/actualites/preparer-maison-avant-garde","text":"liste de préparation avant une garde"},{"url":"/actualites/vacances-longues-garde-animal-2-semaines","text":"garde pendant une absence longue"},{"url":"/actualites/rediger-bonne-annonce-house-sitting","text":"rédiger une annonce"},{"url":"/tarifs","text":"page des tarifs"},{"text":"bengal","url":"/actualites/bengal-guide-race"},{"text":"maine coon","url":"/actualites/maine-coon-guide-race"},{"text":"persan","url":"/actualites/persan-guide-race"},{"text":"siamois","url":"/actualites/siamois-guide-race"}]'::jsonb;
  affected integer;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='f36aa609-312a-4f5f-b001-a750b8f46449'::uuid AND slug='garde-chat-domicile-house-sitting';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM false
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/garde-chat-domicile-house-sitting' THEN
    RAISE EXCEPTION 'Lot 01 article 1: état éditorial inattendu';
  END IF;
  IF before_row.content = new_content AND before_row.internal_links IS NOT DISTINCT FROM new_links THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-17T15:47:58.092355+00:00'::timestamptz
    OR md5(before_row.content) IS DISTINCT FROM '297789808ce1eb8a9c609fd578675579' THEN
    RAISE EXCEPTION 'Lot 01 article 1: version concurrente';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_maillage_lot01_20261018 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Lot 01 article 1: sauvegarde différente';
  END IF;
  INSERT INTO public._backup_articles_maillage_lot01_20261018 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_maillage_lot01_20261018 z WHERE z.id=x.id);
  UPDATE public.articles SET content=new_content, internal_links=new_links, updated_at=now()
    WHERE id=before_row.id AND slug=before_row.slug AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Lot 01 article 1: écriture incomplète'; END IF;
END;
$article_1$;

COMMIT;
