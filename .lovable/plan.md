# Entraide, lot 2 : hub à deux vues et carte vivante

## Résultat attendu

Refondre uniquement `/petites-missions` autour de deux usages simples : consulter les besoins ouverts et découvrir les personnes disponibles autour de soi. Conserver la FAQ indexable, les routes de questions et le moteur du lot 1 sans modifier leur comportement.

## Découpage

### 1. Données publiques et confidentialité

- Créer la vue SQL `public_helpers`, en lecture seule, limitée à : identifiant, prénom, avatar, ville, latitude et longitude déjà arrondies, phrase `helps_with`.
- N'y inclure que les comptes actifs avec `available_for_help = true` et `helps_with` renseigné.
- Accorder uniquement `SELECT` à `anon` et `authenticated`, `ALL` à `service_role`, retirer toute capacité d'écriture directe et conserver la sécurité de l'appelant.
- Exposer pour les besoins ouverts le nombre de réponses par une vue ou une fonction publique agrégée, sans identité de répondant.
- Appliquer la migration avec Drizzle, puis régénérer les types automatiquement.

### 2. Nouveau hub

- Réorganiser `EntraideHub.tsx` avec le H1, le sous-titre et les deux actions demandées.
- Pour un membre, la seconde action active `available_for_help` puis confirme l'inscription aux alertes. Pour un visiteur, elle ouvre l'inscription avec l'intention entraide conservée jusqu'au retour.
- Remplacer le fil Questions, Demandes, Offres par l'interrupteur `Besoins | Autour de vous`.
- Vue Besoins : afficher exclusivement les besoins ouverts dont la date est à venir ou absente, triés par distance quand une position membre existe, sinon par date. Afficher titre, ville, distance réservée aux membres, date et nombre de réponses.
- Vue Autour de vous : charger `public_helpers`, trier par distance quand elle est connue, filtrer en direct sur `helps_with`, afficher prénom, avatar, ville, distance réservée aux membres, phrase, écussons et action de conversation existante.
- Retirer du hub les onglets Questions, Demandes, Offres, les filtres de catégorie et le statut. `/questions` reste inchangée.
- Extraire des cartes et contrôles ciblés afin d'éviter les deux rendus mobile et ordinateur actuellement dupliqués.

### 3. Carte des besoins et des personnes

- Ajouter un composant Leaflet dédié au hub, réutilisant les tuiles et la protection de démontage existantes.
- Montrer les personnes et les besoins ouverts avec deux styles de cercles flous, jamais avec une épingle précise.
- Ajouter un décalage stable de 200 à 500 m, dérivé de l'identifiant, sur les coordonnées déjà arrondies. La même entrée garde toujours le même décalage.
- Regrouper les repères au dézoom avec une solution légère intégrée au composant, sans introduire une dépendance lourde. Le libellé de groupe suit la forme demandée, par exemple `14 personnes autour de Lyon`.
- Ouvrir au clic une fiche compacte avec l'action adaptée.
- Ordre par défaut de la vue Autour de vous : carte sur ordinateur, liste sur mobile, avec interrupteur `Liste | Carte`.
- Centre : position du membre, puis ville saisie ou ville du profil, puis France. Pour un visiteur, ajouter le champ `Votre ville` et géocoder cette ville avec le mécanisme existant. La recherche de savoir-faire filtre aussi les repères.

### 4. Inscription et tableau de bord

- Propager explicitement l'intention entraide depuis les deux actions visiteurs.
- Ajouter à ce parcours une étape facultative avec la question et l'aide fournies, limitée à 200 caractères.
- Enregistrer `available_for_help = true` et `helps_with` après création ou confirmation du compte, avec reprise fiable si la session arrive après validation par courriel.
- Ajouter sur le tableau de bord un rappel éditable uniquement pour les membres disponibles dont `helps_with` est vide.
- Réutiliser le garde-fou client et serveur contre les mentions d'argent déjà présent sur `helps_with`.

### 5. Textes, SEO et données structurées

- Réécrire `Concrètement` et `Comment ça marche` avec le vocabulaire demandé et sans construction négative nouvelle.
- Conserver les quatre questions de FAQ et le JSON-LD `FAQPage`.
- Ajouter un JSON-LD `Person` minimal par personne visible, avec prénom et ville uniquement. Exclure toute coordonnée, tout prix et tout objet `Offer`.
- Ajouter le chiffre CRÉDOC et son lien vers l'article existant.
- Scanner tous les textes visibles du nouvel espace afin d'écarter `publication`, `mission`, `annonce` et `offre`, ainsi que les tirets interdits.

## Fichiers prévus

### Principaux fichiers modifiés

- `src/pages/EntraideHub.tsx`
- `src/components/community/MobileEntraideFeed.tsx`, supprimé du parcours ou réduit aux briques encore utiles
- `src/components/missions/ExchangeHowItWorks.tsx`
- `src/components/onboarding/OnboardingModal.tsx`
- `src/pages/Register.tsx`
- `src/contexts/AuthContext.tsx`, uniquement si nécessaire pour transporter l'intention après confirmation
- `src/pages/Dashboard.tsx` ou les deux tableaux de bord à l'emplacement commun adapté
- `src/lib/signupIntent.ts`
- `src/integrations/supabase/types.ts`, régénéré par l'outil de migration
- `scripts/audit/test-client-surface.mjs`

### Nouveaux fichiers ciblés

- composants du hub pour les cartes, la recherche et la carte Leaflet
- utilitaire pur de décalage déterministe et ses tests
- rappel de profil `helps_with`
- migration Drizzle pour `public_helpers` et l'agrégat public des réponses
- tests du hub et de la surface publique

Les noms définitifs suivront les conventions du dossier concerné, sans déplacer les composants partagés hors périmètre.

## Tests et vérifications

- Hub visiteur : textes, deux actions, deux vues, ville sans distance, inscription avec intention entraide.
- Hub membre : activation de disponibilité, distance, tri, conversation et confirmation.
- Recherche `helps_with` en direct sur liste et carte.
- Coordonnées : même identifiant, même décalage ; distance comprise entre 200 et 500 m ; aucune coordonnée exacte dans le rendu ou le JSON-LD.
- Base PGlite : `public_helpers` ne contient que les colonnes autorisées, lecture anonyme et authentifiée, écriture refusée.
- Besoins : statut ouvert, type besoin, date admissible, compteur de réponses agrégé.
- Vérification mobile et ordinateur par captures, carte non vide, regroupement, fiches et absence de chevauchement.
- Suite Vitest complète, `test:sql`, vérification TypeScript et journal de compilation.

## Risques maîtrisés

- La vue `public_helpers` rendra huit personnes visibles immédiatement avec les données actuelles. Le hub doit rester juste avec un petit volume comme avec plusieurs centaines.
- Les coordonnées sources sont déjà arrondies. Le décalage supplémentaire améliore la discrétion visuelle, sans constituer une garantie d'anonymat absolue. Aucun point source exact ne sera renvoyé par la vue.
- Aucune bibliothèque de regroupement n'est installée. Un regroupement léger interne évite d'alourdir tout le site et reste testable.
- L'intention d'inscription doit survivre à la confirmation par courriel et à Google. Ce passage sera testé séparément pour éviter d'activer un profil hors parcours entraide.
- La création de conversation réutilise la fonction existante `helper_inquiry`. Aucun comportement partagé de messagerie ne sera modifié.

## Ce que je ferais différemment

- Je ne modifierais pas `ApproximateLocationMap`, utilisé sur d'autres pages. Je créerais une carte dédiée au hub en réutilisant seulement ses tuiles, son géocodage et sa protection Leaflet.
- Je ne conserverais pas deux implémentations distinctes des cartes mobile et ordinateur. Une carte de besoin et une carte de personne partagées réduisent les écarts futurs.
- Je n'ajouterais pas `markercluster` pour ce lot. Un regroupement par grille selon le niveau de zoom couvre le besoin avec moins de poids et sans dépendance nouvelle.
- Je ne placerais pas les écussons dans `public_helpers`. Le composant existant les charge depuis sa vue publique dédiée, ce qui respecte la surface SQL demandée.
- Je n'appliquerais pas le filtre de recherche en base. Avec le volume actuel et la recherche instantanée demandée, le filtrage client est plus réactif et filtre exactement les mêmes éléments dans la liste et sur la carte.

## Hors périmètre confirmé

- Aucun courriel aux 716 membres disponibles.
- Aucune page ville.
- Aucun texte de fin d'échange.
- Aucun changement du moteur de vagues du lot 1.
- Aucun déploiement ni publication sans nouveau GO explicite.
