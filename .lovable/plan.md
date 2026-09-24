# Lot H2, accueil resserré et vérité sur la rencontre

## Résultat visé

Ramener l'accueil à 9 ensembles éditoriaux, avec un parcours plus court et une formulation cohérente : la rencontre est conseillée et reste un choix. Le hero, le bandeau de chiffres et les six annonces restent inchangés.

Ordre final :

1. Hero
2. Bandeau de chiffres
3. En ce moment
4. Comment ça marche, avec les six exemples de coup de main intégrés
5. Un service après l'autre
6. Trois conditions pour se faire confiance
7. Ils l'ont vécu
8. Qu'est-ce que Guardiens ?, avec le comparatif replié
9. Questions fréquentes, puis l'appel final

Les sections courantes, hors hero, alterneront uniquement `bg-background` et `bg-muted/30`. Le bloc « Un service après l'autre » restera le seul fond vert pin. L'appel final passera sur fond crème foncé. Chaque section éditoriale portera un surtitre et les H2 partageront la même hiérarchie typographique.

## Textes proposés mot pour mot

### Rencontre

Les textes fournis seront repris à l'identique :

- Condition 2 : « Nous vous conseillons de vous voir avant une garde, autour d'un café ou d'une visite. Après un coup de main, nous vous demandons si la rencontre a eu lieu. »
- Garde, étape 2 : « Des gardiens postulent. Vous échangez, et vous pouvez les rencontrer avant de choisir. »
- Titre de l'étape : « Choisissez en confiance »
- Texte long de l'étape : « Des gardiens dont le profil correspond à votre besoin postulent. Vous lisez les profils, les avis, vous échangez. Et si vous le souhaitez, vous vous voyez, un café, une visite, avant de décider. »
- Description de l'accueil : « House-sitting en France : un gardien veille sur votre maison et vos animaux pendant votre absence. Vous échangez, vous pouvez vous rencontrer, puis vous choisissez. »
- FAQ 3 : « Inscrivez-vous sur Guardiens, publiez votre annonce de garde avec les dates et vos animaux, et recevez des candidatures de gardiens qui habitent près de chez vous. Vous échangez, vous pouvez vous rencontrer, puis vous choisissez. »
- FAQ 5 : « Vous publiez votre annonce, des gardiens dont le profil correspond postulent, vous échangez, vous pouvez vous rencontrer, puis vous choisissez. Votre gardien s'installe ensuite. Un accord de garde optionnel encadre les engagements de chacun pendant la garde. »
- Saisonnier printemps : « Anticipez : publiez votre annonce maintenant pour trouver le bon gardien avant le pic de l'été. Prévoyez le temps d'une rencontre avant le départ. »
- Usage propriétaire : « Un gardien qui vous correspond veille sur votre maison et vos animaux. Vous pouvez le rencontrer avant de partir, puis vous choisissez. »
- Introduction confiance : « Votre rythme, vos habitudes, les besoins de vos animaux, face à son expérience. On vous montre où ça correspond. Vous échangez, vous pouvez vous rencontrer, et vous décidez. »
- Étape HowTo structurée : « Des gardiens proches de chez vous postulent. Consultez leurs profils, lisez les avis, échangez par messagerie et, si vous le souhaitez, rencontrez celui ou celle qui vous correspond. »

### Histoire condensée

Sous « Elisa et Jérémie » :

1. « Promenades de chiens à Lyon, puis gardes à la maison. »
2. « Aujourd'hui, chaque semaine, on reçoit des animaux chez nous. »
3. « Un réseau local de confiance, ouvert à toute la France. »

Ces mots proviennent de la page À propos existante. Le lien sera « Lire notre histoire » vers `/a-propos`. Cette page porte bien l'histoire, du retour d'Argentine au lancement de Guardiens. Elle comporte aussi l'explication publique du score à `/a-propos#affinite`.

### Affinité condensée

- « Vous décrivez le gardien recherché : rythme de vie, présence, expérience avec vos animaux et mobilité. »
- « Le score d'affinité classe chaque candidature critère par critère. »
- « Vous voyez le détail du calcul et vous choisissez. »
- Lien : « Comprendre le score d'affinité » vers `/a-propos#affinite`.

La carte de démonstration et ses dix lignes quittent l'accueil. Le moteur, le calcul, le tri et la page explicative restent inchangés.

### Qu'est-ce que Guardiens ?

Paragraphe 1 conservé :

« Guardiens est un réseau d'entraide entre particuliers, organisé par affinité autant que par proximité. On y garde des maisons, on s'y rend des services, on y rencontre des gens. À un kilomètre comme à mille. »

Paragraphe 2 proposé, uniquement par coupe et assemblage des paragraphes actuels 3 et 4 :

« À côté des gardes, les membres se rendent des coups de main : arrosage, courses, compagnie, un colis à réceptionner. L'échange se décide entre vous. La mise en relation s'appuie sur un score d'affinité calculé sur plusieurs critères pondérés, propres à chaque couple. Les membres font vérifier leur identité et publient des avis croisés après leurs expériences. »

### FAQ visible

Les six questions proposées sont :

1. Qu'est-ce que le house-sitting ?
2. Comment fonctionne l'accès à Guardiens ?
3. Comment trouver un pet sitter près de chez moi ?
4. Comment se déroule une garde sur Guardiens ?
5. Le house-sitting est-il sécurisé ?
6. Est-ce que ça marche depuis l'étranger ?

Les questions 4, 6 et 7 actuelles resteront dans le JSON-LD selon la demande. Risque documenté : Google demande en principe que tout contenu FAQ structuré soit accessible sur la page. Les conserver uniquement dans le JSON-LD peut donc réduire l'éligibilité aux résultats enrichis, même si Google limite déjà fortement leur affichage.

## Formulations supplémentaires trouvées par le scan

Les occurrences produit suivantes présentent encore la rencontre comme systématique ou préalable imposé. Elles seront alignées sur la règle « conseillée, jamais obligatoire » dans ce lot :

- `src/data/cityContent.ts` : « rencontre avant chaque garde », « rencontre physique systématique avant chaque garde », « pas de garde sans rencontre préalable », « organisez une rencontre physique avant chaque garde », « Cette étape est systématique et fortement recommandée. »
- `src/components/search/SearchHowItWorksAnon.tsx` : étape « Rencontrez, puis confirmez » et texte séquentiel associé.
- `src/pages/DevenirHomeSitter.tsx` : le HowTo « organisez une rencontre préalable » sera reformulé comme une possibilité. Les conseils « proposez une rencontre préalable » et « La rencontre préalable rassure presque toujours » restent des recommandations et peuvent être conservés.
- `src/data/siteRoutes.ts` : la description longue globale et la description de l'accueil utilisent « vous choisissez après une rencontre ».
- `index.html` : la description statique, `og:description` et `twitter:description` reprennent la même formulation et seront synchronisées pour les robots qui ne rendent pas l'application.

Documents juridiques cités et exclus de ce lot :

- `src/pages/MentionsLegales.tsx` : « Les utilisateurs reconnaissent que la confiance mutuelle repose sur la rencontre physique préalable à toute garde, les avis croisés publiés après chaque expérience, et l'historique visible sur chaque profil. »
- `src/pages/Terms.tsx` porte une phrase équivalente. Elle restera elle aussi inchangée afin que toute révision juridique soit traitée ensemble.

Les récits d'expériences, les remises de clés « lors de la rencontre préalable ou le jour du départ », les recommandations déjà explicites et le libellé optionnel d'accord de garde restent inchangés. Le motto, `landing.final.lede` et « Tout le reste se passe en vrai. » restent inchangés.

## Modifications prévues

### Composition et présentation

- `src/pages/Landing.tsx` : appliquer le nouvel ordre, retirer de cette page `QuickHelpSection`, `MidJourneyCta`, `LazyAroundYouSection`, `NotreHistoireSection` et `InternationalStrip`, puis supprimer leurs imports, états et chargements devenus inutiles.
- `src/components/landing/HowItWorksSection.tsx` : intégrer les six pastilles cliquables dans la colonne « Coup de main », avec les mêmes destinations, le même préremplissage et la même distinction visiteur ou membre.
- `src/components/landing/ServiceAfterServiceSection.tsx` : ajouter les trois lignes d'histoire et le lien `/a-propos` sous la signature.
- `src/components/landing/ConfianceSection.tsx` : corriger la condition 2, réduire l'affinité à trois lignes et son lien, retirer `AffinityDemoCard` de la composition de l'accueil.
- `src/components/landing/UsagesSection.tsx` : limiter la définition aux deux paragraphes validés et accueillir le comparatif juste dessous.
- `src/components/landing/ComparatifSection.tsx` : convertir le tableau en accordéon fermé par défaut avec montage forcé, afin que tout son contenu reste présent dans le DOM.
- `src/components/landing/FaqSection.tsx` : limiter l'affichage à six questions.
- `src/components/landing/FinalCtaSection.tsx` : remplacer le fond vert par le fond crème foncé, conserver les deux portes et leurs destinations.
- `src/components/landing/LandingTocBar.tsx` : ordre et ancres alignés sur les sections conservées.
- `src/components/landing/LivedItSection.tsx`, `LiveListingsStrip.tsx` et les autres sections conservées : harmoniser uniquement surtitre, H2 et alternance des deux tons, sans modifier leurs données ni leurs comportements.

### Contenu et référencement

- `src/i18n/locales/fr/common.json` : appliquer les textes fournis, la définition courte et les libellés concernés.
- `src/data/siteRoutes.ts` : synchroniser la description de `/` et la description longue globale.
- `index.html` : synchroniser description statique, Open Graph et Twitter.
- `src/components/landing/HomeJsonLd.tsx` : corriger l'étape HowTo, conserver les questions 1 à 9 dans FAQPage, et mettre à jour la date de contenu.
- `src/data/cityContent.ts`, `src/components/search/SearchHowItWorksAnon.tsx` et `src/pages/DevenirHomeSitter.tsx` : corriger les formulations non juridiques relevées par le scan.

Les composants retirés de l'accueil restent disponibles pour leurs autres usages et leurs tests isolés. Aucun comportement partagé, moteur d'affinité, donnée ou page métier ne sera modifié.

## État mesuré et estimation

Mesure locale, Chromium, hauteur de fenêtre 1 800 px :

- Mobile 360 px : document 21 772 px, 16 balises `section`, LCP `hero-landing-640.avif` à 1 256 ms.
- Ordinateur 1 440 px : document 14 749 px, 15 balises `section` réellement montées, LCP `hero-landing-1920.avif` à 1 064 ms.
- `InternationalStrip` ne s'affiche pas aujourd'hui : le compteur courant reste sous son seuil de 5. Sa question de repli apparaît dans la FAQ.

Le hero mesure 1 800 px dans ce protocole, puisqu'il occupe `100svh`. Avec le hero et les six annonces inchangés, une hauteur totale de 6 500 px ne peut pas être garantie à cette hauteur de fenêtre. Estimation prudente après H2 :

- Mobile 360 px : environ 13 000 à 15 000 px.
- Ordinateur 1 440 px : environ 8 500 à 10 000 px.

La mesure finale sera faite dans les mêmes conditions. Atteindre environ 6 500 px demanderait aussi de compacter le hero ou « En ce moment », explicitement laissés inchangés.

## Risques SEO et protections

- Retrait de l'accueil des paragraphes `body_2`, `body_5`, `body_6`, `body_7` : perte de texte indexable sur la garde, les guides, les chantiers et la couverture. Les pages dédiées restent accessibles, mais cette profondeur supplémentaire peut réduire leur poids depuis l'accueil.
- Retrait de `NotreHistoireSection` : perte de son texte et de son image sur l'accueil, compensée par trois lignes et un lien direct vers `/a-propos`.
- Retrait d'`AroundYouSection` : perte de ses deux liens vers l'entraide, compensée par le bandeau, les pastilles de coup de main et les autres portes conservées.
- Retrait d'`InternationalStrip` : perte de deux liens directs. La question internationale reste visible dans la FAQ et le contenu international reste accessible par ses pages dédiées.
- Retrait de `AffinityDemoCard` : perte de la démonstration détaillée sur l'accueil, compensée par le lien vers `/a-propos#affinite`.
- Accordéon comparatif : `forceMount` préservera les lignes dans le DOM. Un contrôle du HTML rendu confirmera leur présence quand le panneau est fermé.
- FAQ structurée plus large que la FAQ visible : risque d'inéligibilité aux résultats enrichis, signalé ci-dessus.
- Les anciennes ancres `#autour-de-vous` et `#notre-histoire` disparaissent de l'accueil. Le sommaire et les références internes du projet seront scannés pour éviter les liens morts connus.

## Vérifications et livraison

- Tests ciblés de l'ordre, des six pastilles, des six FAQ visibles, du comparatif fermé mais monté, des textes de rencontre et des composants absents de l'accueil.
- Scan de tout `src` pour les formulations obligatoires, le mot proscrit et les deux tirets longs.
- Contrôle visuel et absence de débordement à 360 px et 1 440 px.
- Nouvelle mesure de hauteur et du LCP dans les mêmes conditions.
- Suite Vitest complète, tests SQL existants, vérification TypeScript, build et contrôle du diff.
- Rapport final avec fichiers exacts, diff, tests, commit et portée réelle.

Aucune migration, aucune fonction distante et aucune publication.
