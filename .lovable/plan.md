# Entraide, lot 4 : pages villes

## État vérifié

- La page actuelle est codée uniquement pour Lyon dans `MissionsCityPage.tsx`, avec une route explicite avant la fiche dynamique `/petites-missions/:id`.
- Le hub fournit déjà la carte, les cartes de besoins, les cartes de personnes et les preuves. La page ville actuelle n'en réutilise que les preuves.
- `public_helpers`, source actuelle des personnes du hub, ne conserve que les membres disponibles ayant aussi renseigné `helps_with`. `public_profiles`, source du compteur demandé, expose 722 membres disponibles, dont 718 géolocalisés. Le compteur et les cartes peuvent donc afficher des volumes différents, car ils ne mesurent pas exactement la même chose.
- Le sitemap de compilation prend ses routes statiques dans `siteRoutes.ts`. La fonction sitemap conserve aussi sa propre liste statique, actuellement limitée à Lyon pour l'Entraide.
- Le pied de page liste des villes de house-sitting, mais aucune ville Entraide. Le hub ne porte aucun lien vers les pages villes.
- Une photo interne existe pour Lyon. Les images connues pour Marseille et Strasbourg sont des URLs externes en base, pas des fichiers du stockage du projet. Elles ne seront pas reprises.

## Structure des données

Un registre unique `MISSIONS_CITIES`, indexé par slug, portera pour chaque ville :

- nom, slug, coordonnées centrales et rayon fixe de 30 km ;
- titre, description, H1 et sous-titre ;
- quatre sections éditoriales ;
- quatre questions locales ;
- image locale facultative et texte alternatif ;
- villes et communes citées, sans donnée chiffrée locale.

Le gabarit chargera en parallèle :

- le compteur direct depuis `public_profiles`, `available_for_help = true`, géolocalisé puis calculé à 30 km ;
- les besoins ouverts, futurs ou sans date, depuis `public_small_missions`, filtrés à 30 km ;
- les personnes montrables depuis `public_helpers`, filtrées à 30 km ;
- les réponses par besoin depuis `public_mission_response_counts` ;
- les preuves via `EntraideProofs`, qui reste invisible quand aucune preuve ne remonte.

Cette séparation respecte la définition du vivier fournie sans élargir silencieusement la vue partagée `public_helpers`. Aucun changement de schéma ni migration.

## Découpage et fichiers

### Gabarit et contenu

- `src/data/missionsCityContent.ts` : remplacer le pilote Lyon par le registre typé Lyon, Marseille, Strasbourg.
- `src/pages/MissionsCityPage.tsx` : transformer la page en gabarit unique piloté par le slug, avec H1, deux actions, compteur direct, carte centrée, besoins, personnes, preuves, texte et FAQ.
- `src/components/entraide/EntraideMap.tsx`, `EntraideCards.tsx` et `EntraideProofs.tsx` : réutilisation sans changer leur comportement partagé. Une extraction de logique pure sera faite seulement si elle évite une duplication entre hub et villes.
- `src/App.tsx` : trois routes explicites vers le même composant, placées avant `/petites-missions/:id`.

### Liens et référencement

- `src/pages/EntraideHub.tsx` : ligne visible « Dans votre ville : Lyon, Marseille, Strasbourg ».
- `src/components/layout/PublicFooter.tsx` : liens Entraide vers les trois villes dans la colonne existante, sans réordonner les autres colonnes.
- `src/data/siteRoutes.ts` : trois routes, priorité `0.7`, fréquence `weekly`, titres et descriptions exacts.
- `supabase/functions/sitemap/index.ts` : même liste statique pour garder les deux sorties cohérentes, sans déploiement.
- `public/sitemap.xml` : régénéré par le mécanisme existant. Les `<lastmod>` statiques dérivés du jour de compilation seront retirés pour ces routes, conformément à la règle de date fiable.
- `PageMeta` produira une canonique propre à chaque slug. Le FAQPage et le BreadcrumbList seront générés depuis le même registre que le texte visible.

### Présentation

- Un seul bouton principal : « J'ai besoin d'un coup de main ».
- « Je veux bien aider » reste en variante secondaire.
- Aucun pictogramme décoratif ni étoile ajoutée.
- Espacement stable de 52 px entre les grandes sections.
- Lyon utilise la photo locale déjà présente. Marseille et Strasbourg gardent un en-tête typographique, sans image générique.
- La carte montre les deux types de cercles du hub et reste centrée sur la ville.
- Le compteur affiche « N personnes disponibles autour de Ville » à partir de 5. Sous ce seuil, il reprend la phrase honnête du hub.

## Tests

- Nouveau test de rendu paramétré pour les trois slugs.
- Données factices couvrant compteur supérieur ou égal à 5, compteur inférieur à 5, besoins et personnes à l'intérieur ou hors rayon, preuves présentes et absentes.
- Vérification des deux actions, du bouton principal unique, de la carte et de l'ordre des sections.
- Vérification du FAQ visible et du FAQPage identique, des trois canoniques, titres et descriptions.
- Extension du test sitemap aux trois URLs, priorité `0.7`, fréquence `weekly`.
- Test éditorial ciblé : aucun chiffre arabe dans les quatre sections de chaque ville. Le compteur direct et le bloc CRÉDOC restent hors de ce corpus.
- Vérification des mots proscrits et de l'absence de tirets cadratins et demi-cadratins.
- Vitest complet, `test:sql`, vérification TypeScript, build et journal de compilation.

## Ce que je ferais différemment

- Je conserverais deux sources explicites : `public_profiles` pour le volume réel des membres disponibles, `public_helpers` pour les cartes dont le texte `helps_with` est publiable. Les fusionner maintenant modifierait le hub et dépasserait ce lot.
- Je n'ajouterais aucune nouvelle vue SQL. Le calcul client sur 718 coordonnées approximatives reste borné et évite une migration pour trois pages.
- Je n'utiliserais pas les photos externes déjà référencées en base pour Marseille et Strasbourg. Une image locale pourra être ajoutée plus tard avec une provenance validée.
- Je garderais les trois routes explicites. Une route générique de ville entrerait en conflit avec les slugs des besoins.

# Textes proposés

## Lyon

**Meta title**

Recréer du lien à Lyon : coups de main entre gens du coin | Guardiens

**Meta description**

À Lyon, découvrez les besoins ouverts et les personnes disponibles pour un coup de main. Une façon concrète de rencontrer les gens du coin.

**H1**

Recréer du lien à Lyon, un coup de main à la fois

**Sous-titre**

Nourrir un chat à la Croix-Rousse, réceptionner un colis à Vaise ou arroser un balcon à Villeurbanne peut devenir le début d'une vraie rencontre.

### Pourquoi cela compte à Lyon

À Lyon, un besoin très simple peut ouvrir une vraie conversation. Nourrir un chat à la Croix-Rousse, réceptionner un colis à Vaise ou arroser un balcon à Villeurbanne donne une raison concrète de se rencontrer. Le geste compte, bien sûr, mais il crée surtout un premier contact entre des personnes qui vivent à proximité. Guardiens rend ce contact visible et facile à proposer. Chacun peut exprimer ce qui lui serait utile, puis découvrir les gens du coin prêts à répondre. La confiance se construit à partir d'un échange clair, choisi et ancré dans le quotidien. Une porte s'ouvre, quelques mots s'échangent, un visage devient familier. La technologie reste à sa place : elle rapproche un besoin et une disponibilité. La rencontre, elle, appartient aux personnes. À Lyon et autour, chaque coup de main peut ainsi devenir le début d'une relation locale qui se prolonge naturellement.

### Ce qui s'échange à Lyon et autour

Les coups de main prennent la forme de la vie ordinaire. À la Croix-Rousse, une personne peut chercher quelqu'un pour nourrir son chat. À Vaise, une autre souhaite faire réceptionner un colis. À Villeurbanne, quelques plantes attendent un arrosage pendant une absence. On peut aussi proposer de porter un objet, partager un trajet, accompagner une course, expliquer un outil numérique ou transmettre un savoir-faire. Ces gestes ont un point commun : ils sont assez précis pour permettre une réponse simple. La personne qui aide sait ce qui est attendu, celle qui formule son besoin choisit le moment et les conditions qui lui conviennent. Autour de Lyon, de Caluire-et-Cuire à Tassin-la-Demi-Lune, cette clarté facilite les premières rencontres. Un service rendu devient alors une occasion de discuter, de découvrir une personne du coin et, parfois, d'imaginer un prochain échange.

### Comment le coup de main commence

Vous décrivez votre besoin avec vos mots, votre ville et le moment souhaité. Dix personnes du coin reçoivent alors votre demande. L'une d'elles dit « Je peux ». Vous échangez directement pour préciser le rendez-vous, le geste attendu et ce que vous souhaitez proposer en retour. Cette progression garde chaque décision entre vos mains. La carte permet aussi de voir les besoins ouverts et les personnes disponibles autour de Lyon. Vous pouvez parcourir les profils, lire les savoir-faire proposés et écrire à la personne qui vous semble correspondre. Après le coup de main, chacun peut confirmer la rencontre et laisser un mot sur l'autre personne. Ce retour raconte une expérience humaine, avec un prénom, une ville et une attention partagée. Il aide les prochains membres à comprendre que derrière chaque besoin se trouve une rencontre réelle entre gens du coin.

### Une logique d'échange

L'Entraide repose sur une circulation simple : vous recevez aujourd'hui, vous donnez demain, selon vos possibilités. Le retour peut prendre la forme d'un autre service, d'un savoir-faire transmis, d'une attention ou d'un moment partagé. Chacun apporte ce qu'il sait faire et demande ce qui lui serait utile. Cette souplesse crée une relation équilibrée, fondée sur l'accord entre les personnes. À Lyon, le lien se construit ainsi à partir de gestes concrets et de rendez-vous choisis. Le coup de main sert de point de départ. La confiance grandit ensuite grâce à la parole tenue, au mot laissé après la rencontre et à la possibilité de se retrouver. Guardiens facilite la mise en relation, puis laisse toute la place à l'échange humain. De besoin en besoin, les gens du coin deviennent des visages connus et des personnes sur lesquelles chacun peut compter.

**FAQ**

1. **Quelles communes autour de Lyon apparaissent dans le rayon ?** La carte couvre Lyon et les communes proches selon leur distance réelle, notamment Villeurbanne, Caluire-et-Cuire et Tassin-la-Demi-Lune. Les besoins et les personnes sont classés par proximité.
2. **Que faire lorsque le fil est calme aujourd'hui à Lyon ?** Décrivez votre besoin. Il reste visible et les personnes disponibles autour de Lyon peuvent le découvrir puis dire « Je peux ».
3. **Qui peut utiliser l'Entraide à Lyon ?** L'Entraide est ouverte à tous les membres. Vous convenez ensemble d'un service ou d'une attention en retour.
4. **Quelle différence avec une garde de maison à Lyon ?** L'Entraide répond à un besoin ponctuel dans la journée. Une garde de maison couvre un séjour de plusieurs jours sur place.

## Marseille

**Meta title**

Recréer du lien à Marseille : coups de main entre gens du coin | Guardiens

**Meta description**

À Marseille, découvrez les besoins ouverts et les personnes disponibles pour un coup de main. Une façon concrète de rencontrer les gens du coin.

**H1**

Recréer du lien à Marseille, un coup de main à la fois

**Sous-titre**

Nourrir un chat au Panier, réceptionner un colis à la Plaine ou arroser des plantes vers Aubagne peut devenir le début d'une vraie rencontre.

### Pourquoi cela compte à Marseille

À Marseille, un besoin quotidien peut devenir une invitation à se rencontrer. Nourrir un chat au Panier, réceptionner un colis à la Plaine ou arroser des plantes du côté d'Aubagne crée un motif clair pour entrer en contact. Guardiens relie une personne qui exprime ce qui lui serait utile à des gens du coin disponibles pour donner un coup de main. Le service ouvre la conversation, puis chacun choisit la suite. Quelques messages permettent de préciser le rendez-vous, une porte s'ouvre et deux personnes qui vivaient à proximité se découvrent enfin. La technologie facilite ce premier pas tout en laissant la relation se construire librement. À Marseille et autour, l'Entraide transforme ainsi les gestes ordinaires en occasions de faire connaissance. Une aide ponctuelle peut devenir un prénom retenu, une discussion qui se prolonge et une confiance locale qui grandit au fil des échanges.

### Ce qui s'échange à Marseille et autour

Les coups de main partent de situations familières. Au Panier, une personne peut demander une visite pour son chat. À la Plaine, quelqu'un cherche une présence pour réceptionner un colis. Vers Aubagne, des plantes ont besoin d'eau pendant une absence. D'autres besoins concernent une course, un objet à déplacer, un appareil à comprendre, un trajet à partager ou un savoir-faire à transmettre. Chaque demande décrit un geste précis et un moment possible. Cette simplicité permet à une personne disponible de se reconnaître immédiatement dans le besoin et de répondre en confiance. Marseille, Allauch, Aubagne ou Plan-de-Cuques deviennent alors les points de départ d'échanges choisis entre gens du coin. Le service rendu reste concret, tandis que la rencontre ouvre un espace plus large : quelques mots, une attention, la découverte d'une personne et l'envie possible de se revoir pour un autre coup de main.

### Comment le coup de main commence

Vous écrivez ce dont vous avez besoin, indiquez votre ville et proposez le moment qui vous convient. Dix personnes du coin reçoivent votre demande. L'une d'elles dit « Je peux ». Vous poursuivez alors la conversation directement pour préciser le rendez-vous, le geste et l'attention prévue en retour. La carte rassemble les besoins ouverts et les personnes disponibles autour de Marseille. Elle permet de repérer ce qui se passe près de chez vous, puis de consulter les profils et les savoir-faire proposés. Vous restez libre de choisir la personne avec laquelle vous souhaitez échanger. Une fois le coup de main réalisé, chacun peut confirmer la rencontre et écrire quelques mots sur l'autre personne. Ces preuves racontent des échanges réels avec des prénoms et des villes. Elles donnent confiance et montrent que l'Entraide prend vie à travers des rencontres concrètes entre gens du coin.

### Une logique d'échange

L'Entraide avance grâce à une réciprocité souple. Vous pouvez demander un coup de main aujourd'hui et proposer votre disponibilité une autre fois. Le retour se décide ensemble : un service, un savoir-faire, une attention ou un moment partagé. Cette liberté respecte les possibilités de chacun et place les deux personnes sur un pied d'égalité. À Marseille, la relation commence avec un besoin formulé clairement. Elle grandit grâce au rendez-vous tenu, à la conversation et à la confiance créée sur place. Le coup de main devient le prétexte d'une rencontre qui pourra compter au-delà du geste initial. Guardiens organise la mise en relation et rend visibles les disponibilités du coin. Les personnes font le reste, avec leurs mots, leur temps et ce qu'elles souhaitent transmettre. Chaque échange contribue ainsi à rendre les liens locaux plus simples, plus directs et plus vivants.

**FAQ**

1. **Quelles communes autour de Marseille apparaissent dans le rayon ?** La carte couvre Marseille et les communes proches selon leur distance réelle, notamment Allauch, Aubagne et Plan-de-Cuques. Les besoins et les personnes sont classés par proximité.
2. **Que faire lorsque le fil est calme aujourd'hui à Marseille ?** Décrivez votre besoin. Il reste visible et les personnes disponibles autour de Marseille peuvent le découvrir puis dire « Je peux ».
3. **Qui peut utiliser l'Entraide à Marseille ?** L'Entraide est ouverte à tous les membres. Vous convenez ensemble d'un service ou d'une attention en retour.
4. **Quelle différence avec une garde de maison à Marseille ?** L'Entraide répond à un besoin ponctuel dans la journée. Une garde de maison couvre un séjour de plusieurs jours sur place.

## Strasbourg

**Meta title**

Recréer du lien à Strasbourg : coups de main entre gens du coin | Guardiens

**Meta description**

À Strasbourg, découvrez les besoins ouverts et les personnes disponibles pour un coup de main. Une façon concrète de rencontrer les gens du coin.

**H1**

Recréer du lien à Strasbourg, un coup de main à la fois

**Sous-titre**

Nourrir un chat à la Krutenau, réceptionner un colis à Neudorf ou arroser des plantes à Schiltigheim peut devenir le début d'une vraie rencontre.

### Pourquoi cela compte à Strasbourg

À Strasbourg, un besoin concret peut rapprocher des personnes qui vivent à quelques rues. Nourrir un chat à la Krutenau, réceptionner un colis à Neudorf ou arroser des plantes à Schiltigheim offre une raison simple de faire connaissance. Guardiens met en relation la personne qui exprime son besoin et les gens du coin prêts à donner un coup de main. La demande est claire, la réponse reste libre et la conversation commence autour d'un geste utile. La technologie facilite cette première étape, puis la rencontre prend toute sa place. Un rendez-vous choisi permet d'associer un prénom à un visage et de découvrir une personne disponible près de chez soi. À Strasbourg et autour, l'Entraide transforme ainsi le quotidien en occasions de créer des liens. Chaque coup de main peut ouvrir une relation locale fondée sur l'attention, la parole tenue et l'envie de participer à son tour.

### Ce qui s'échange à Strasbourg et autour

Les échanges commencent avec des besoins faciles à comprendre. À la Krutenau, une personne peut chercher quelqu'un pour passer voir son chat. À Neudorf, une autre souhaite faire réceptionner un colis. À Schiltigheim, quelques plantes attendent un arrosage. Un coup de main peut aussi concerner une course, un meuble à déplacer, un trajet, un outil numérique ou une compétence à partager. Le lieu et le moment donnent un cadre concret à la demande. La personne disponible peut alors répondre en sachant comment elle peut être utile. Strasbourg, Illkirch-Graffenstaden, Bischheim ou Ostwald deviennent les points de départ de rencontres entre gens du coin. Le geste apporte une réponse immédiate, tandis que l'échange crée une proximité nouvelle. Une discussion commence, un savoir-faire circule et une prochaine occasion de s'entraider peut apparaître naturellement.

### Comment le coup de main commence

Vous indiquez votre besoin, votre ville et le moment souhaité. Dix personnes du coin reçoivent votre demande. L'une d'elles dit « Je peux ». Vous échangez ensuite directement pour convenir du rendez-vous, préciser le geste et choisir ensemble l'attention proposée en retour. La carte présente les besoins ouverts et les personnes disponibles autour de Strasbourg. Vous pouvez découvrir les profils, lire les coups de main proposés et contacter la personne qui correspond à votre situation. Chaque étape reste lisible et chaque choix vous appartient. Après la rencontre, vous pouvez confirmer que le coup de main a eu lieu et laisser quelques mots sur l'autre personne. Ces retours associent un prénom, une ville et une expérience vécue. Ils rendent les échanges visibles et donnent aux prochains membres une image concrète de l'Entraide entre gens du coin.

### Une logique d'échange

L'Entraide forme une chaîne de gestes choisis. Vous pouvez recevoir un coup de main lorsque vous en avez besoin, puis offrir votre temps ou votre savoir-faire quand l'occasion se présente. Le retour se construit ensemble et peut prendre plusieurs formes : un service futur, une compétence transmise, une attention ou un moment partagé. Cette souplesse permet à chacun de contribuer selon ses possibilités. À Strasbourg, le besoin crée le premier contact. La rencontre donne ensuite sa valeur à l'échange. Un rendez-vous tenu, quelques mots et une expérience confirmée font grandir la confiance entre les personnes. Guardiens rend les besoins et les disponibilités visibles, tout en laissant les gens du coin décider de leur relation. De coup de main en coup de main, les échanges installent une proximité concrète et donnent envie de participer à son tour.

**FAQ**

1. **Quelles communes autour de Strasbourg apparaissent dans le rayon ?** La carte couvre Strasbourg et les communes proches selon leur distance réelle, notamment Schiltigheim, Illkirch-Graffenstaden et Bischheim. Les besoins et les personnes sont classés par proximité.
2. **Que faire lorsque le fil est calme aujourd'hui à Strasbourg ?** Décrivez votre besoin. Il reste visible et les personnes disponibles autour de Strasbourg peuvent le découvrir puis dire « Je peux ».
3. **Qui peut utiliser l'Entraide à Strasbourg ?** L'Entraide est ouverte à tous les membres. Vous convenez ensemble d'un service ou d'une attention en retour.
4. **Quelle différence avec une garde de maison à Strasbourg ?** L'Entraide répond à un besoin ponctuel dans la journée. Une garde de maison couvre un séjour de plusieurs jours sur place.

## Livraison

Aucune migration, aucun déploiement et aucune publication. Rapport final avec fichiers exacts, diff, tests, hash visible et portée réelle.
