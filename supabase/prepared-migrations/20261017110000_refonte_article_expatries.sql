-- Refonte ciblée du guide expatriés, validée par Jérémie le 17 octobre 2026.
-- Appliquer après validation du rendu et du build. Aucun autre article n'est modifié.
-- Sauvegarde privée de la ligne complète avant toute modification.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_article_expat_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_article_expat_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_article_expat_20261017 TO service_role;
ALTER TABLE public._backup_article_expat_20261017 ENABLE ROW LEVEL SECURITY;

DO $refonte$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $expat_content_20261017$# Expatriés : faire garder sa maison à l’étranger pendant ses absences

Les billets pour rentrer en France sont presque réservés. Il reste une question : qui va s’occuper du chat, arroser les plantes et veiller sur la maison pendant votre absence ? Quand on vit à l’étranger, la famille est souvent loin et on n’a pas toujours envie de solliciter les mêmes voisins à chaque départ.

Le [house-sitting](/actualites/c-est-quoi-le-house-sitting) permet d’accueillir un gardien chez vous : il est hébergé sur place et prend soin du logement et des animaux, selon ce que vous avez convenu ensemble. **Vous proposez un lieu à vivre ; le gardien vous rend ce service pendant votre absence.**

Sur Guardiens, vous publiez votre annonce, échangez avec les personnes intéressées et choisissez à qui confier vos clés. **La plateforme est actuellement 100 % gratuite, pour les propriétaires comme pour les gardiens.**

**[Publier mon annonce de garde](/inscription?role=owner&redirect=%2Fsits%2Fcreate)**

Avec ma femme Elisa, qui est argentine, nous avons gardé des maisons et des animaux pendant cinq ans avant de créer Guardiens. En repensant à mes années à l’étranger, je me suis dit que j’aurais aimé trouver ce réseau francophone : des personnes avec qui faire connaissance et sur qui pouvoir compter pendant mes absences.

**Vos questions**

- [Qui peut venir garder ma maison ?](#profils)
- [Comment choisir quelqu’un de confiance ?](#gardien)
- [Que mettre dans mon annonce ?](#annonce)
- [Comment organiser les clés si je n’ai personne sur place ?](#organisation)
- [Et si la garde est annulée ou mon retour retardé ?](#imprevus)
- [Est-ce gratuit et qui paie les dépenses ?](#budget)
- [Quelles vérifications faire dans mon pays ?](#regles)
- [Quelques semaines, plusieurs mois, avec ou sans animaux ?](#longue-duree)

## <a id="profils"></a>Qui peut venir garder ma maison à l’étranger ?

Un autre francophone installé dans le pays, un voyageur qui souhaite se poser, une personne retraitée ou un télétravailleur : plusieurs situations peuvent correspondre à votre absence. Le point commun est de vouloir séjourner chez vous tout en prenant au sérieux ce qu’il faut faire sur place.

Un gardien peut vivre à proximité ou être prêt à se déplacer. Dans les deux cas, vérifiez sa disponibilité réelle, son trajet et sa capacité à s’occuper de votre logement. S’il télétravaille, ses horaires doivent être compatibles avec les besoins de vos animaux.

### <a id="regions"></a>Y a-t-il des gardiens pour mon pays ?

Le réseau Guardiens se construit progressivement. Le nombre de personnes disponibles varie selon le pays, la ville, les dates et les tâches demandées. **Publier une annonce ne garantit pas de recevoir une candidature.** Présenter votre besoin en avance laisse davantage de temps pour échanger et préparer le séjour.

Décrivez la vie sur place : accès au logement, transports, commerces, connexion internet et rythme des animaux. Un candidat doit pouvoir comprendre ce que représente réellement la garde, au Mexique comme en Suisse, en Colombie ou au Brésil.

## <a id="gardien"></a>Comment choisir quelqu’un de confiance sans être déjà proches ?

Parler français facilite les consignes et les échanges pendant votre voyage. Cela ne remplace pas l’expérience, le sérieux ni la compatibilité entre vos attentes et celles du gardien.

Prenez le temps de lire son profil et ses avis lorsqu’il en a, puis de discuter de votre situation. Quelques questions permettent d’aller au-delà d’une présentation sympathique :

- A-t-il déjà vécu avec des animaux ayant les mêmes besoins que les vôtres ?
- Combien de temps compte-t-il passer à la maison et comment organise-t-il ses journées ?
- Comment réagirait-il si votre chat refusait de manger ou si un équipement tombait en panne ?
- Son arrivée et son départ sont-ils compatibles avec vos dates et les conditions de séjour dans le pays ?

Un appel vidéo permet de montrer le logement et de parler des habitudes. Une rencontre sur place peut aussi être organisée si vous le souhaitez tous les deux. Le badge d’identité vérifiée, lorsqu’il est présent, apporte une information sur l’identité ; il ne garantit pas la qualité d’une garde.

**Vous restez libre de votre choix.** Si une question importante reste sans réponse, poursuivez les échanges avant de confirmer.

## <a id="annonce"></a>Que mettre dans mon annonce pour recevoir des réponses adaptées ?

Votre annonce doit permettre à quelqu’un de se projeter dans votre quotidien. Quatre éléments sont particulièrement utiles :

1. **Le lieu et les dates.** Indiquez le pays, la commune, votre période d’absence et une éventuelle souplesse sur l’arrivée ou le départ.
2. **Le logement proposé.** Montrez les pièces accessibles au gardien et précisez les conditions pratiques : chambre, internet, transports ou véhicule nécessaire.
3. **Les animaux et les gestes attendus.** Décrivez les repas, promenades, soins, plantes ou petites tâches, ainsi que le temps de présence nécessaire.
4. **La vie autour de la maison.** Quelques photos et détails concrets aident à comprendre le séjour : quartier calme, commerces accessibles à pied, jardin ou environnement rural.

**Exemple fictif :** vous vivez en Colombie et rentrez trois semaines en France. Votre appartement accueille un chat, les commerces sont accessibles à pied et quelques plantes demandent un arrosage. Ce sont ces informations, avec les dates et les habitudes du chat, qui permettent à un gardien de savoir si la garde lui convient.

Notre [checklist pour préparer la maison](/actualites/preparer-maison-avant-garde) aide ensuite à rassembler les consignes utiles.

## <a id="organisation"></a>Je n’ai personne sur place : comment organiser la remise des clés ?

Le plus simple, lorsque vos agendas le permettent, est de prévoir l’arrivée du gardien avant votre départ. Vous pouvez lui transmettre les clés, montrer le logement et présenter les animaux. L’organisation doit être acceptée des deux côtés.

Si vous êtes déjà parti, cherchez une solution concrète : une personne que vous connaissez, un gestionnaire ou une conciergerie qui accepte cette mission. Un éventuel service payant se prévoit dans votre budget. Définissez qui remet les clés, à quel moment et comment joindre cette personne.

Préparez aussi les informations accessibles pendant la garde : consignes de la maison, vétérinaire, numéros utiles et façon de vous contacter malgré le décalage horaire. Choisissez un rythme de nouvelles qui vous convienne à tous les deux.

**Si aucun relais n’est disponible, dites-le avant de confirmer.** Le gardien doit savoir ce qu’il devra gérer seul. Une arrivée décalée ou un autre mode de transmission peut se discuter ; si les accès ou une intervention indispensable restent impossibles à organiser, mieux vaut chercher une autre solution de garde.

## <a id="imprevus"></a>Et si le gardien annule ou si mon retour est retardé ?

Vos billets sont pris, vos proches vous attendent : une annulation de dernière minute peut être difficile à absorber. Avant le départ, discutez de ce que vous feriez si l’un de vous ne pouvait plus tenir les dates convenues.

Une personne de confiance ou un professionnel local peut constituer un relais, à condition d’avoir accepté et d’être effectivement disponible. Prévoyez aussi les moyens de financer un dépannage si nécessaire. **Guardiens ne garantit pas de trouver un remplaçant.**

Si votre retour est retardé, contactez le gardien dès que possible. Il ne pourra pas forcément prolonger son séjour : ses propres engagements et ses conditions de séjour peuvent l’en empêcher. Il faut alors organiser ensemble une transmission, sans supposer que la garde se poursuivra automatiquement.

Gardez une trace écrite des dates, des tâches, des frais convenus et des décisions prises en cas d’imprévu.

## <a id="budget"></a>Est-ce vraiment gratuit ? Et qui paie quoi ?

**La plateforme est actuellement 100 % gratuite, pour les propriétaires comme pour les gardiens.** Notre priorité est de faire grandir ce réseau de confiance et d’améliorer le service avec vos retours. Nous voulons être pleinement satisfaits de ce que nous proposons avant de demander une participation.

Une contribution aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027**, pour permettre à la plateforme de continuer à vivre et à grandir. Vous serez prévenus au moins 30 jours à l’avance. Les engagements à jour sont présentés sur la page [tarifs](/tarifs).

La garde repose sur un échange : le gardien est hébergé et n’est pas rémunéré pour les tâches convenues. Les dépenses pratiques restent à clarifier entre vous : trajet, alimentation des animaux, produits nécessaires, courses exceptionnelles ou frais vétérinaires. Pour chaque dépense à prévoir, mettez-vous d’accord sur qui la paie et comment elle sera réglée.

Préparez notamment la marche à suivre pour une urgence vétérinaire : contact à appeler, personne qui autorise les soins et moyen de paiement disponible.

## <a id="regles"></a>Que dois-je vérifier dans mon pays de résidence ?

Avant de confirmer une garde, vérifiez trois points adaptés à votre situation :

- **Le logement.** Si vous êtes locataire ou si votre résidence impose des règles d’accueil, vérifiez que le séjour du gardien est autorisé et quelles démarches sont nécessaires.
- **Les assurances.** Décrivez la garde à votre assureur et demandez confirmation des garanties applicables. Le gardien doit également vérifier sa couverture pour le pays, le logement et les activités prévus.
- **Le séjour du gardien.** Celui-ci doit vérifier auprès des autorités compétentes que les conditions d’entrée, de séjour et d’activité permettent l’échange envisagé. La seule absence de rémunération ne suffit pas à conclure qu’aucune formalité n’est nécessaire.

Les [Conseils aux voyageurs de France Diplomatie](https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs) constituent un point de départ pour préparer le déplacement. Les règles applicables à l’accueil dans votre logement restent à vérifier localement.

La [fiche Service Public sur l’assurance du home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509) donne des repères dans le cadre français ; elle ne remplace pas la vérification des règles et garanties pour une maison située à l’étranger.

## <a id="longue-duree"></a>Puis-je faire garder ma maison quelques semaines ou plusieurs mois ?

Un retour en France pour les fêtes, des vacances de deux semaines ou une absence plus longue peuvent se préparer sur le même principe. **La durée à organiser est celle de votre absence, pas celle de votre expatriation.**

Pour plusieurs mois, précisez dès le départ la disponibilité du gardien, les conditions de séjour, les tâches d’entretien, les dépenses et la possibilité de rester en contact. Si plusieurs personnes se succèdent, chaque transmission doit être organisée et acceptée ; ce relais n’est pas automatique.

### Et si je n’ai pas d’animaux ?

Vous pouvez aussi proposer une [garde de maison sans animaux](/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal). Expliquez ce qui demande de l’attention : plantes, jardin, courrier ou présence dans le logement. Une annonce précise permet au gardien de comprendre l’échange proposé.

## <a id="maison-france"></a>Et si c’est mon logement en France que je veux faire garder ?

Le besoin est différent : vous habitez à l’étranger et cherchez quelqu’un pour un bien resté en France. Nous lui consacrons un guide spécifique : [faire garder sa maison en France depuis l’étranger](/actualites/francais-etranger-garde-maison-france).

## <a id="se-lancer"></a>Vous préparez une absence ? Présentez votre maison

Commencez par votre lieu, vos dates, quelques photos et ce dont votre maison ou vos animaux ont besoin. Vous pourrez ensuite faire connaissance avec les personnes intéressées.

**[Publier mon annonce de garde](/inscription?role=owner&redirect=%2Fsits%2Fcreate)**

Guardiens est encore un jeune projet. Si vous l’essayez, le meilleur coup de main que vous puissiez nous donner est de nous dire ce qui vous a été utile et ce qui mérite d’être amélioré. Vous pouvez [nous écrire](/contact) : vos retours nous aident à construire un réseau qui réponde vraiment à vos besoins.
$expat_content_20261017$;
BEGIN
  SELECT * INTO before_row FROM public.articles
  WHERE id = 'f641ed2f-a744-4113-a2d8-9c3b95f2bcc1'::uuid AND slug = 'expat-proprietaire-faire-garder-maison-etranger'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Article expatriés introuvable'; END IF;

  -- Un nouvel appel après succès laisse la version publiée et sa sauvegarde intactes.
  IF before_row.title IS NOT DISTINCT FROM 'Expatriés : faire garder sa maison à l’étranger pendant ses absences'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Vous rentrez en France voir vos proches ou partez en voyage ? Un gardien peut séjourner chez vous et veiller sur votre maison et vos animaux en échange de l’hébergement. Voici comment préparer cette garde, même loin de votre réseau habituel.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Faire garder sa maison à l’étranger | Guide expatriés'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Vous vivez à l’étranger ? Trouvez un gardien francophone pour votre maison et vos animaux pendant vos absences. Confiance, clés, frais : le guide.'
    AND before_row.cover_image_url IS NOT DISTINCT FROM 'https://images.unsplash.com/photo-1628642004970-1da51c8c7dec?w=1200&h=630&fit=crop'
    AND before_row.content = new_content
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"checklist pour préparer la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"faire garder sa maison en France depuis l’étranger","url":"/actualites/francais-etranger-garde-maison-france"}]'::jsonb THEN RETURN; END IF;

  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:40:17.694355+00'::timestamptz THEN
    RAISE EXCEPTION 'Article modifié depuis la préparation : relire avant application';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_article_expat_20261017 WHERE id = before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Une sauvegarde différente existe déjà';
  END IF;
  INSERT INTO public._backup_article_expat_20261017
  SELECT a.* FROM public.articles a WHERE a.id = before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_article_expat_20261017 b WHERE b.id = a.id);

  UPDATE public.articles SET
    title = 'Expatriés : faire garder sa maison à l’étranger pendant ses absences',
    excerpt = 'Vous rentrez en France voir vos proches ou partez en voyage ? Un gardien peut séjourner chez vous et veiller sur votre maison et vos animaux en échange de l’hébergement. Voici comment préparer cette garde, même loin de votre réseau habituel.',
    meta_title = 'Faire garder sa maison à l’étranger | Guide expatriés',
    meta_description = 'Vous vivez à l’étranger ? Trouvez un gardien francophone pour votre maison et vos animaux pendant vos absences. Confiance, clés, frais : le guide.',
    content = new_content,
    internal_links = '[{"text":"house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"checklist pour préparer la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"faire garder sa maison en France depuis l’étranger","url":"/actualites/francais-etranger-garde-maison-france"}]'::jsonb,
    cover_image_url = 'https://images.unsplash.com/photo-1628642004970-1da51c8c7dec?w=1200&h=630&fit=crop',
    updated_at = now()
  WHERE id = before_row.id AND slug = 'expat-proprietaire-faire-garder-maison-etranger'
    AND updated_at = before_row.updated_at;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Refonte : % ligne modifiée au lieu de 1', affected; END IF;
END;
$refonte$;
COMMIT;

