# Plan de chantier profils, cartes et recherche (10/10/2026, relu)

Document de planification uniquement. Aucun lot n'est lancé ni autorisé à l'implémentation par ce document. Aucune recette future n'est présentée comme passée.

## 1. État livré vs non publié

Migrations appliquées en base (effet immédiat côté serveur) :
- 0060 search_sitter_pool / search_sitter_country_counts (pays filtré avant pagination, pool complet)
- 0061 travel_zones + search_sitter_pool_mobile (mobilité combinable)
- 0062 vue public_sitter_profiles sans seuil (compte actif + prénom) et trigger trg_guard_application_min_completion
- 0063 application_completion_allowed (>= 40 inclus)
- 0064 public_profiles expose country (code ISO)

Frontend fait dans Lovable, NON publié en production :
- recherche gardiens internationale (pays, ville du pays, rayon, carte mondiale, suggestions par pays, effacement des anciens résultats Lyon)
- mobilité local / région / pays / continent / monde, aucun préchoix
- avis admin : annonce source (titre, ville, dates, lien) en liste et détail, gardes et missions
- fiche publique « Montréal, Canada »
- fiche propriétaire : garde completed prise en compte
- imports morts SearchSitter retirés, commit b99081e30be4ca74eba9d534dadc55388886e687 (types, build, 70 tests, diff relu par Codex)

Limites : connexion GitHub perdue côté Lovable (modifications conservées dans Lovable). Travail parallèle possible : revalider l'état du code avant toute nouvelle implémentation. Aucune publication frontend sans GO explicite.

## 2. Invariants

- Gouache personnalisable conservée, y compris les petites gouaches de compétences.
- Entraide affichée selon la volonté déclarée, une compétence n'est pas une volonté.
- Deux scores conservés et distincts : complétion (barème 100) et confiance (5/5). L'affinité est un troisième concept, sans rapport avec la confiance.
- Profils sous 40 % visibles ; candidature possible à partir de 40 % inclus. Aucun barème modifié dans ce chantier sans décision explicite.
- Simplicité B2C.
- Aucune donnée privée, aucune coordonnée exacte, photos selon les droits (galerie gardien réservée aux membres).
- Aucune recopie des animaux d'une annonce privée vers un profil.
- Aucun message, notification ou contact envoyé à un membre.
- Aucune refonte des autres pages. Pool d'affinité trié, jamais filtré.

## 3. Registre des constats

Preuve : C = code, N = navigateur Codex, L = local Lovable. Statut : fait / bug confirmé / recommandation / à vérifier.

| ID | Constat | Preuve | Statut | Lot |
|---|---|---|---|---|
| F1 | Recherche gardiens : pays avant pagination, pool complet, carte internationale, suggestions par pays | C, L, N | fait (non publié) | - |
| F2 | Canada = 2 gardiens dont un à 35 % | N, L | fait | - |
| F3 | Visibilité de tous les profils actifs avec prénom | C, base | fait | - |
| F4 | Candidature refusée sous 40 % côté serveur | base (transaction annulée) | fait | - |
| F5 | Mobilité combinable | C, N (visuel, sans sauvegarde) | fait | - |
| F6 | Avis admin avec annonce source | N | fait | - |
| F7 | Montréal, Canada sur fiche publique | N | fait | - |
| F8 | Propriétaire : garde completed affichée | C, L | fait | - |
| F9 | Imports morts SearchSitter retirés | C | fait | - |
| A1 | Zone d'annonce calculée sur owner.city, pas sur le lieu de garde ; cible : coordonnées approximatives du lieu de garde issues du champ adapté (structure sits / properties à vérifier, code postal de l'annonce non confirmé) | C (SearchSitter) | bug confirmé | L1 |
| A2 | Mode France n'impose pas FR (Québec dans la grille) | C, L | bug confirmé | L1 |
| A3 | Drawer « Voir N résultats » = results.length (32) vs 15 disponibles + 17 fermées | C, L | bug confirmé | L1 |
| A4 | Compteur France inclut expirées, hors France et fermées | C | bug confirmé | L1 |
| A5 | « près de vous » dès qu'une ville est saisie, même en France entière | C | bug confirmé | L1 |
| A6 | Compteurs hors France incohérents (dates, accepting_applications) entre PublicListings, SearchSitter, InternationalShowcase, InternationalListings | C | bug confirmé | L1 |
| A7 | Plafond 500 ouvertes + 500 fermées, pays filtré après limite | C | risque de résultats incomplets à volume élevé, pas de bug actuel prouvé (15 annonces) | L1 |
| A8 | Dates de fin inclusives et fuseaux | C | à vérifier | L1 |
| A9 | Erreur de géocodage silencieuse pouvant fausser la distance | C | à vérifier | L1 |
| A10 | Bandeau 2 + grille 15 avec Québec (Codex preview) | N, non reproduit en L | à vérifier, cause non tranchée | L1 |
| A11 | « PARIS, RHÔNE < 1 km » près de Lyon dans les annonces passées | L | à vérifier | L1 |
| B1 | SearchSitter : autocomplétion geo.api.gouv.fr France seulement | C | bug confirmé | L2 |
| B2 | InternationalShowcase masqué sous 3 annonces | C | recommandation | L2 |
| B3 | Libellés CA / PF en codes, PF à ne pas présenter comme pays souverain | C | recommandation | L2 |
| B4 | Carte internationale (root) : 2 repères PF, aucun CA observé | N | à vérifier, cause non tranchée | L2 |
| B5 | Tri « plus proches » sans ville ni coordonnées | C | recommandation | L2 |
| B6 | Titres « en France », « quelqu'un du coin » hors contexte voyage | C | recommandation | L2 |
| B7 | URL pays/ville/filtres, reset et retour arrière | C | à vérifier | L2 |
| B8 | InternationalListings géocode jusqu'à 60 annonces au chargement | C | recommandation | L2 |
| E1 | hasEntraide basé sur missionCount > 0, masque les offres déclarées | C | règle restrictive constatée, recommandation fonctionnelle à aligner sur les intentions | L3 |
| E2 | Bande helpsWith : liste blanche HELP_SKILLS 5 catégories, exclut jardin et bricolage | C | règle restrictive constatée, recommandation fonctionnelle à aligner sur les intentions | L3 |
| E3 | Confiance 5 étapes : source de hasFirstActivity à vérifier | C | à vérifier | L3 |
| E4 | Phrase vérification d'identité « par l'équipe » vs automatique | C | à vérifier contre le vrai flux | L3 |
| E5 | Réactivité : deux systèmes (30 j et 90 j, seuil 5 contacts, >= 70 %, médiane < 72 h) | C | recommandation (contrat unique, proposition 90 j min 5, à valider) | L3 |
| E6 | Chronologie : doublons premier avis / premier 5 étoiles, graphique 12 mois quasi vide | N | recommandation | L3 |
| E7 | Seuil 40 % sur comptes double rôle et source serveur de la complétion | C | à vérifier avant toute décision sur le barème | L3 |
| C1 | Cartes gardiens 4 colonnes étroites, auto-rows-fr crée de grands vides | N | recommandation UX confirmée | L4 |
| C2 | Note de carte : nombre de gardes affiché à la place du nombre d'avis | C | bug confirmé | L4 |
| C3 | replyPhrase : médiane arrondie en « moins de », promesse trompeuse | C | bug confirmé | L4 |
| C4 | Citation : première phrase > 120 caractères renvoie null | C | à vérifier | L4 |
| C5 | Filtre « avec photos » ignore couverture et galerie | C | à vérifier | L4 |
| C6 | Compteurs de cartes potentiellement périmés après changement | C | à vérifier | L4 |
| D1 | FreshStartStory « Venaya a rempli son profil » à 35 % | N | bug confirmé | L5 |
| D2 | MarginLettering dans les marges verticales | C | recommandation (suppression) | L5 |
| D3 | Héros gardien et propriétaire non harmonisés (photo 180x196, h1 68 vs photo ronde 176, h1 plus petit) | N | recommandation | L5 |
| D4 | Sections vides (Ses annonces, animaux non renseignés, phrases au futur) | N | recommandation | L5 |
| D5 | « Prépare sa garde » affiché sans intention connue | C | à vérifier | L5 |
| D6 | Contact absent entre 768 et 1023 px (rail lg, sticky md mobile) | C | à vérifier | L5 |
| D7 | Widget Alma pouvant recouvrir le contenu | N | à vérifier | L5 |
| D8 | Bloc PracticalGrid jamais affiché | C | à arbitrer | L5 |
| G1 | Environnement en double : menu Campagne vs puces Ville (Mon profil Jérémie) | N | bug confirmé | L6 |
| G2 | Titre « Identité et vérification » couvre bio, langues, intérêts | N | recommandation | L6 |
| G3 | « Découvrir Lyon » long, à plier par défaut, origine générée à vérifier | N | à vérifier | L6 |
| G4 | État de sauvegarde (modifié / enregistré) peu clair, aucune sauvegarde auto à promettre | C | à vérifier | L6 |
| G5 | Liens publics dupliqués | N | recommandation | L6 |
| G6 | Libellé de région « Rhône, Alpes et Massif central » | C | à arbitrer | L6 |
| H1 | Propriétaire Cécile : aucun animal sur fiche, 4 sur l'annonce Rouans | N | donnée de saisie, ne pas recopier | - |
| H2 | Mémoire affinité mentionne 60 %, site applique 40 % | C | à corriger (doc) | L7 |

## 4. Séquence et règles de livraison

Ordre strict : L1, puis L2, puis L3, puis L4, puis L5, puis L6, puis L7.
- L3 peut faire une préanalyse des sources de données de l'édition (lecture seule) ; l'aller-retour réel d'enregistrement est validé en L6.
- Un lot ne commence que lorsque le précédent est validé : types, tests, build, puis recette visuelle et fonctionnelle sur le build. Tout point bloquant arrête la séquence, le lot reste « partiellement validé ».

Pour chaque lot : diff exact limité au périmètre ; typecheck ; tests métier utiles (pas de tests miroirs de CSS) ; build final ; recette après build aux dimensions concernées avec captures ; contrôle de régression des lots précédents ; checkpoint (SHA, tests, preuves, statut, mise à jour TODO). Rollback par commit, migrations compatibles si nécessaires. Seule la production exige un GO ; ici, plan seulement, aucun lot autorisé.

## 5. Lots

### L1 Fiabilité du moteur d'annonces
Périmètre : A1 à A11. Lieu de garde (coordonnées approximatives issues du champ adapté, structure à vérifier) au lieu de owner.city ; sémantique ouvertes / pourvues / passées ; France = FR strict, « autre pays » et « tous » distincts ; drawer, densités, grille et carte sur la même population disponible ; cohérence internationale (dates, accepting_applications) ; élargissement explicite ; aucun retour à l'ensemble faute de coordonnées ; pagination serveur ou pool complet pour lever le risque A7 ; dates de fin inclusives, fuseau Europe/Paris ; erreurs de géocodage visibles sans fausser la distance. A10 : reproduire et établir la cause avant correctif.

Recette après build :
- Lyon 15 km, département, région, France : mêmes chiffres dans drawer, titre, grille, carte, bandeaux.
- France entière : aucune annonce hors FR.
- Annonce Marlhes d'un propriétaire Saint-Étienne placée à Marlhes.
- Annonce dont la date de fin est aujourd'hui : encore ouverte.
- Géocodage en échec simulé : message visible, aucune distance inventée.

### L2 Recherche internationale (annonces et gardiens)
Périmètre : B1 à B8. Pays visible, puis ville du pays, puis rayon ; « Tous les pays » ; filtres dates et animaux communs ; autocomplétion par pays dans SearchSitter ; moteur L1 réutilisé par InternationalListings sans casser route ni canonical ; liste par défaut, carte en option ; showcase dès 1 annonce ; noms complets CA / PF (PF comme destination géographique) ; tri « plus proches » désactivé ou expliqué sans ville ; textes adaptés au voyage ; URL pays/ville/filtres. Drapeaux facultatifs.

Recette après build :
- CA (Montréal, Saint-Ludger), FR (Lyon), MX, BR, PF, Tous les pays : compteurs, liste, carte cohérents.
- Carte : repères CA présents si annonces CA (B4 expliqué), PF correctement placée.
- URL : copier, recharger, retour arrière, reset ; état restauré.
- Pays sans résultat : message adapté, pas de texte « France ».

### L3 Entraide, confiance, activité (données et affichage minimum)
Périmètre : E1 à E7. Valider d'abord les données et le contrat de réactivité ; règles actuelles conservées par défaut. Toute décision sur un taux brut affiché est prise avant implémentation, pas pendant. Offres déclarées et missions réalisées distinctes ; illustrations de compétences alignées sur les gouaches existantes, sans nouvel asset inventé ; onglets aide / garde / public clairs ; confiance 5 étapes (email, identité, photo, >= 40 %, première activité : annonce pour propriétaire, garde pour gardien) distincte de la complétion 100 (l'identité y compte pour 5 %, chevauchement assumé, pas de fusion) ; affinité séparée ; explication de 5/5 sans promesse de fiabilité ; dernière activité relative, son absence ne signifie pas « peu fiable » ; Alma et CommunityPulse secondaires. E7 : contrôler le seuil 40 % sur comptes double rôle et la source serveur de la complétion avant toute décision ; aucun barème modifié.

Recette après build :
- Membre avec offre d'entraide déclarée et 0 mission : offre visible.
- Membre avec mission réalisée : distincte de l'offre.
- Profil complétion 100 et confiance 5/5 ; profil complétion 100 et confiance partielle : deux chiffres distincts et expliqués.
- Réactivité sous le seuil de contacts : aucun taux affiché, formulation neutre.
- Compte double rôle à 39 et 40 % : refus et accord identiques côté gardien (fixture isolée).

### L4 Cartes de synthèse gardiens et annonces
Périmètre : C1 à C6. Grille adaptée à la largeur utile, hauteur auto ; identité, photo, icône vérifiée, ville et pays, mobilité, raison d'affinité, animaux, 1 ou 2 compétences en gouache, dernière activité approximative, réactivité et avis réels (contrat L3), bio courte sans invention. Profils incomplets visibles, initiale en repli, cartes comparables. Attribut sans donnée omis. CTA « Voir le profil » cohérent avec favoris et clavier du carrousel. Cartes annonces : lieu complet, dates, animaux, couverture correcte, photos privées jamais forcées.

Recette après build :
- Profil clairsemé à 35 % avec photo et sans photo : carte comparable, initiale en repli, aucun vide.
- Note : nombre d'avis étiqueté, distinct du nombre de gardes.
- Géographie : ville et pays hors France, mobilité si déclarée.
- Filtre « avec photos » : couverture et galerie prises en compte.
- 1280, 1440, 1920 : pas de colonne étroite ni de grand vide.

### L5 Héros et fiches publiques
Périmètre : D1 à D8. Gouache choisie préservée, sujets lisibles ; héros compact environ 280 à 320 px sur ordinateur (objectif, pas règle mobile) ; photo, prénom, ville, pays, mobilité, dernière activité, icône vérifiée et CTA au premier écran ; icône vérifiée cliquable 44 px, explication au survol, focus et toucher ; suppression de MarginLettering ; harmonie gardien / propriétaire ; moins de cadres sombres et de doubles surtitres ; galerie en mini aperçu + « Voir les photos » (accès membres préservé) ; sections vides masquées ; D1 neutralisé ; en-tête collant et ancres non masquées ; D8 arbitré ; aucune bio inventée.

Recette après build :
- 3 profils (gardien complet, gardien à 35 %, propriétaire), ordinateur et mobile.
- Icônes 44 px : survol, focus clavier, toucher.
- Gouache choisie affichée, sujet lisible.
- Contact accessible de 360 à 1920, y compris 768 à 1023.
- Widget Alma sans recouvrement.

### L6 Édition du profil
Périmètre : G1 à G6. Une source cohérente pour l'environnement, données existantes conservées, aucun écrasement automatique ; complétion et confiance distinctes, navigation allégée ; aides progressives courtes ; état modifié / enregistré clair, sans promettre de sauvegarde auto ; erreurs par champ sans perte ; pays, ville, mobilité combinable sans préchoix, opt-in entraide.

Recette après build (préproduction, compte de test, jamais un profil réel) :
- Enregistrer, recharger, fiche publique, recherche : valeur identique partout.
- Erreur simulée : message par champ, saisie conservée.
- Environnement, pays, mobilité : diff avant / après limité aux champs changés.

### L7 Recette globale et livraison
Rôles : anonyme, membre non admin, propriétaire, gardien, double rôle, admin (la session admin ne prouve rien pour un non admin). Largeurs : 360, 390, 768, 1024, 1280, 1440, 1920. Rendu réel, pas inspection de code. Cas : France, Lyon, Canada, Montréal, Saint-Ludger, BR, MX, PF, tous pays, zéro résultat, profil incomplet, 39 / 40 %. Aucune candidature ni notification réelle : fixtures isolées ou transaction annulée. Liste, carte, URL, rechargement, retour, tri, compteurs, confidentialité, photos, contact, droits, avis admin, favoris (aucun clic irréversible en production). H2. Resynchronisation GitHub préparée sans élargir de permissions. GO explicite, puis recette production limitée, sans message ni notification.

## 6. Points non vérifiés

- Mobile, tablette, grand écran : un contrôle à 360 px de la fiche gardien a été rapporté plus tôt par le service seulement ; aucune recette multi-formats validée par Codex.
- Anonyme : seulement le service d'annonces en local ; session root connectée en préproduction.
- Membre non admin : jamais vérifié.
- Sauvegarde réelle de la mobilité : non faite (visuel seulement, tests unitaires).
- Testés : 3 fiches publiques sur ordinateur, édition visuelle du profil en root admin, Canada 2 cartes correct, avis admin vérifiés précédemment.
- Carte internationale root : 2 repères PF, aucun CA, cause non tranchée.
- A10 non reproduit en local.
- Recette production de la règle 40 % : en attente de GO.

Sujets hors périmètre conservés dans TODO-lovable.md (analytics, SEO/GSC, favoris, push, articles) : inchangés, aucune automatisation ajoutée.

## 6. Suivi d'exécution (ajout du 10/10/2026, l'historique ci-dessus est inchangé)

Autorisation (transcription initiale, erronée) : « L1 seul, L2 à L7 non autorisés ». Rectificatif du 10/10/2026 : Jérémie autorise TOUT le chantier L1 à L7, en séquence conditionnelle (un lot ne commence que si le précédent est validé après build et recette). Aucun nouveau GO par lot ; seule la publication en production exige un GO explicite. Aucune publication.

### L1, statut : partiellement validé
Fait (types 0 erreur, build complète réussie, recette sur build local en visiteur) :
- A1 lieu de garde : commune et pays de l'annonce (sits.city, sits.country), département de l'annonce (sits.departement_code, repli code postal propriétaire en France seulement). Sits n'a aucune coordonnée : centre approximatif de la commune géocodée, aucune adresse. Constaté : « Marlhes, Loire », plus Saint-Étienne.
- A2 France = FR strict dans tous les modes (Québec, Polynésie, Marrakech hors de la grille, visibles seulement dans le bloc « hors France »).
- A3 drawer : nombre d'annonces disponibles, plus la longueur de la liste.
- A4, A6 : règle unique src/lib/sitSearchRules.ts (publiée, candidatures ouvertes, fin >= aujourd'hui Europe/Paris incluse) dans SearchSitter, PublicListings, InternationalListings, InternationalShowcase, useInternationalSitsCount. Recette Lyon : bandeau 13, titre région 7, liste 7, bandeau 1/1/5/6, hors France 3.
- A5 libellé suit la zone réellement appliquée (rayon, département, région, France).
- A7 plafonds 500 retirés : lecture paginée stable par pages de 1 000.
- A8 date de Paris et fin incluse (tests).
- A9 ville non située : message visible, aucune distance depuis l'ancienne position ; annonces sans commune : incluses par département, sans distance, avec mention.
- Sélecteur de zone : département lu sur la ville choisie (il ne lisait que le profil).
- Migration 0065 (additive) : public_closed_sits expose country et departement_code.
- A11 reproduit et expliqué : annonce archivée « Paris » avec departement_code 69 et propriétaire à Lyon. La distance venait de la ville du propriétaire (corrigé). L'incohérence ville/département est une donnée, non modifiée ; elle apparaît encore en mode département 69.
- A10 non reproduit : la grille ne contient plus aucune annonce hors France ; cause de l'observation Codex non tranchée.

Non vérifié : session connectée, carte (vue carte) en détail, formats tablette, régression Canada 2 gardiens et avis admin en navigateur (tests automatiques verts seulement), rayon 15 km via l'interface (compteur du sélecteur : 1, l'annonce 69380 sans commune ; Pusignan à 18 km exclue).
Test en échec hors lot : get-public-sit-dates (aucune garde confirmed ou in_progress en base, test dépendant des données).

### L1, revue du diff e92029d (10/10/2026) : 5 bloquants traités, statut toujours partiellement validé

Le relevé « Fait » ci-dessus est conservé tel quel, mais A1, A4/A6, A9 n'y étaient pas corrects. Corrections :
1. Rayon strict : seules les annonces aux coordonnées vérifiées (commune géocodée et lieu cohérent) à distance <= rayon sont incluses ou comptées (isWithinRadius). Une annonce sans commune situable n'est plus jamais dans un rayon ; elle reste en département et France, avec message « n'est pas comptée dans le rayon » et bouton « Voir le département ». Ville demandée mais non située (rayon, département ou région) : aucun résultat local, message, bouton « Voir toute la France », plus aucun repli silencieux vers le département ou la France. Sans aucune ville (ni saisie ni profil) : France entière affichée avec l'invitation existante à renseigner une ville, bandeau hors zone masqué. Élargissement automatique de zone supprimé (effet et bandeau associé) ; missions inchangées.
2. Ouverture : applyOpenSitFilter utilise accepting_applications IS NOT FALSE (true ou NULL), strictement équivalent à isOpenSit (!== false). Test de parité sur 96 combinaisons statut x true/false/NULL x dates. L'état grisé (isPastSit) suit la même règle.
3. Département du lieu de garde : département de la commune géocodée (geo.api.gouv.fr, centre approximatif), puis celui de l'annonce ; plus aucun repli sur le code postal du propriétaire. Commune et département en désaccord (A11 « Paris »/69) : lieu incohérent, ni département, ni distance, ni position carte, libellé « Paris · lieu à confirmer » ; donnée non modifiée. Carte d'annonce : département du lieu de garde, code postal du profil affiché seulement s'il correspond à ce département.
4. Lectures .in() d'hydratation (profils, galerie, animaux, avis, écussons, profils propriétaires) découpées par 150 identifiants et paginées par 1 000 (fetchInChunks), triées sur une colonne unique ; test au-delà de 1 000 lignes.
5. Bandeau hors zone : comparé à la zone choisie (rayon, département, région), plus au seul rayon ; bouton « Mon département » ajouté en mode rayon.

Migration 0065 (additive, public_closed_sits : country, departement_code) déjà appliquée sur la base partagée : L1 n'est donc pas un lot frontend seul.

Vérifications : tsgo 0 erreur ; vitest 124 tests (sitSearchRules, search, l1, seo4) et startup-build 8 tests réussis ; vite build réussie.
Recette sur build local (vite preview), visiteur, ordinateur 1280 et mobile 390 :
- Lyon 15 km : « Aucune annonce ouverte près de Lyon », 0 ouverte (Pusignan 18 km exclue, 69380 sans commune exclue et signalée), 2 annonces lyonnaises archivées grisées.
- Département : 2 (Pusignan, 69380) ; région : 7 ; France : 13 ; bandeau 2 / 5 / 6 cohérent.
- Liens directs ?ville=Lyon&zone=dept : 2, &zone=region : 7 (département déduit de la position de Lyon).
- Ville introuvable (rayon et département) : 0 résultat, message et bouton France.
- Sans ville : 13 en France, plus de bandeau « hors de votre zone ».
- Carte France entière : marqueurs sur les communes situées seulement ; liste et carte peuvent différer pour les annonces non localisées ou incohérentes (voulu).
- Aucune erreur console.

Non vérifié : panneau Filtres (désactivé en visiteur, à vérifier connecté par Codex), session connectée et non administrateur, tablette, régressions Canada 2 gardiens et avis admin en navigateur. Le paramètre rayon=15 (valeur par défaut) n'est pas réécrit dans l'adresse, comportement antérieur. Bandeau « Renseignez votre ville » visible en visiteur malgré une ville saisie, antérieur, noté pour L2. Le libellé détail d'annonce (src/lib/sitLocationLoad.ts) garde le repli code postal propriétaire pour l'affichage, hors moteur de recherche, à arbitrer en L5. « Auvergne-Rhône-Alpes » visible dans l'état vide, sujet L6.

### L1, requalification A1 par décision produit (10/10/2026, Jérémie 13:47)

Décision : « La ville du proprio c'est la base. Il ne va pas poster une annonce où il ne vit pas. » L'interprétation précédente de A1 (lieu = commune de l'annonce, propriétaire jamais utilisé) est remplacée ; trace conservée ci-dessus. A1 n'était pas un bug mais un choix produit, désormais confirmé.

Règle (resolveSitPlace, src/lib/sitSearchRules.ts) : source principale = profil public du propriétaire (ville, pays, département ou code postal du même profil). Repli entier sur l'annonce seulement si ville ou pays du propriétaire manque. Jamais de mélange (pas de département d'annonce accolé à la ville du propriétaire), jamais de pays FR déduit. La notion « lieu incohérent » et le contrôle commune/département par geo.api.gouv.fr sont retirés pour les annonces (conservé pour situer la ville cherchée). Même source pour zones, pays, distance, carte (pins et bulle) et cartes d'annonce.

Inchangé : ouvertes (accepting_applications IS NOT FALSE), fin incluse Europe/Paris, France FR strict, rayon strict (coordonnées vérifiées <= rayon), élargissement explicite, pagination et hydratation par lots, compteurs hors archives, indicateur « X annonces situées sur Y ».

Reste sur sits.country (non modifié, sans migration) : compteurs serveur hors France (PublicListings, InternationalListings, InternationalShowcase, useInternationalSitsCount). Mesure lecture seule du 10/10 : 0 divergence pays annonce/propriétaire sur 48 annonces ; à aligner sur la source propriétaire en L2 si une divergence apparaît.

Vérifications : tsgo 0 erreur ; vitest sitSearchRules + search 30 tests réussis (propriétaire principal, repli, pays, département non mélangé) ; vite build réussie.
Recette build local (vite preview :4173), visiteur, 1280 / 1024 / 768 / 390, captures /tmp/browser/l1b/shots :
- Lyon 15 km : 0 ouverte (Pusignan 18 km exclue) aux 4 largeurs ; annonce « Paris » du propriétaire lyonnais affichée « Lyon, Rhône » dans les passées.
- Département 2, région 7, France 13 ; Québec absent de la grille France.
- Saint-Étienne 15 km : 1 annonce, « Garde 16 animaux à Marlhes » affichée « Saint-Étienne, Loire ».
- Ville introuvable : 0 résultat, message, aucun élargissement automatique.
- Carte France : 7 pins, « 7 annonces situées sur 13 · 6 lieux à préciser ». Cause des 6 : service de géocodage répondant GEOCODING_UNAVAILABLE (Longvic, Quetteville, Zellwiller, Villentrois, Collonges-sous-Salève, Saint Ludger), aucune distance inventée. Montreuil géocodé dans le Pas-de-Calais (ambiguïté de nom), à vérifier.
- Aucune erreur console.

Non vérifié : panneau Filtres (désactivé en visiteur ; preuve admin antérieure de Jérémie seulement), session connectée sur cette version, non administrateur. Blocage technique RLS : le rôle base du bac à sable ne peut pas exécuter SET ROLE authenticated/anon (« permission denied to set role »), la lecture non administrateur n'est donc pas vérifiable ici sans compte réel. Preuves admin antérieures (Lyon 0 / drawer 0, département 2 / drawer 2, France 13, carte ; Canada 2 Venaya et Godelive ; avis admin Rouans) portent sur une version précédente, non confondues avec une vérification non administrateur.
Statut : partiellement validé. L2 non lancé.

### L1, microcorrectif du 10/10/2026 (après revue c533)
- Point géocodé vérifié : en France, le point n'est retenu que si son département (communeDeptFromCoords) égale celui du lieu résolu ; discordance ou vérification impossible = aucun point, aucune distance, hors rayon, « lieu à préciser » (checkGeocodedPoint, pointUsable). Pas une incohérence propriétaire/annonce.
- resolveSitPlace : ville du propriétaire gardée même si son pays est NULL ; pays du propriétaire, sinon de l'annonce, jamais FR déduit ; département lu sur le seul profil propriétaire. Repli entier sur l'annonce seulement sans ville propriétaire.
- Preuves : 19 tests sitSearchRules (Montreuil 93/62 exclu, 93/93 inclus, vérif NULL non vérifiée, Lyon 69/annonce Paris 75 = Lyon, Saint-Étienne pays NULL/Marlhes = Saint-Étienne), types, build. Recette anonyme 1280 sur build : Montreuil 0 annonce sans élargissement auto ; Lyon 0 ouverte, 1 annonce du département non située ; Saint-Étienne 1 annonce (Marlhes) ; France entière : carte Montreuil, Seine-Saint-Denis sans distance. Non vérifié : position exacte du repère Montreuil sur la carte, recherche Montreuil avec code postal 93, tablette/mobile sur cette version, non-admin (SET ROLE refusé). Géocodage externe des 6 villes non situées toujours en échec, aucune position inventée. L1 reste partiellement validé, L2 non lancé.

### L1, preuve de recette root sur le build 064a30a472477a47c79a742588a762a39c8bf422 (10/10/2026)
- Preview distante, session administrateur réelle : Lyon rayon 15 km = 0 annonce, bouton du drawer « Voir 0 résultat » ; élargissement explicite département = 2 annonces, drawer « Voir 2 résultats ».
- Saint-Étienne rayon 15 km = 1 annonce ; la carte « Garde 16 animaux à Marlhes » affiche « SAINT-ÉTIENNE, LOIRE · < 1 KM », conforme à la règle ville du propriétaire prioritaire.
- Versions de recette distinguées : anonyme 4 largeurs (1280/1024/768/390) sur c5331c ; anonyme 1280 sur 064 ; preuve root admin sur 064.
- Limite maintenue : recette membre non administrateur non passée (bac à sable : « permission denied to set role authenticated/anon », aucun compte membre de test disponible). L1 reste partiellement validé ; L2 non démarré (gate séquentielle).

### L1, gate de clôture du 10/10/2026 (reprise « Ok go », code 064a30a472477a47c79a742588a762a39c8bf422, docs b8f4240e4)

Recette membre non administrateur réelle : impossible, sans contournement.
- Statut d'authentification du bac à sable : signed_out. L'outil de session sait ouvrir une session sur un compte existant, mais aucun compte de test déclaré n'existe (aucune colonne ni rôle « test » ; 3 adresses sur 1 587 contiennent test/qa, rien ne prouve qu'il s'agit de comptes de test, non utilisées). Ouvrir une session sur un autre membre serait une usurpation, refusé. SET ROLE authenticated/anon toujours refusé. Aucun compte créé, aucune donnée modifiée.
- Vérification alternative (preuve statique, lecture seule du catalogue, PAS une recette RLS) : sits SELECT authenticated = propriétaire OU status published OU candidature acceptée OU admin ; anon = published. public_profiles, public_owner_profiles, public_closed_sits : SELECT accordé à anon et authenticated. La recherche ne lit que sits, public_closed_sits, public_profiles, public_owner_profiles : un membre lit donc la même population ouverte que le visiteur (recetté) et que l'admin.
- Écart admin/membre identifié par le code : en session connectée la requête inclut draft + unpublished_at (annonces en pause). L'admin en voit 7 d'autrui (mesure lecture seule), un membre seulement les siennes. Effet limité à la section grisée « passées ou attribuées » ; compteurs d'ouvertes non touchés (isOpenSit exige published). Les chiffres d'archives de la recette admin peuvent donc dépasser ceux d'un membre de 7 au plus. Non corrigé (comportement de droits, hors portée).

Recette visiteur 1280 sur le code 064 (serveur local, captures /tmp/browser/l1c/shots) :
- Lyon : 0 ouverte près de Lyon, mention « 1 annonce de votre département n'a pas de commune situable », pas d'élargissement automatique, 13 en France, 3 hors France.
- France entière : 13 disponibles, « Lieu à préciser, Rhône » visible, archives 16.
- Panne du service de localisation (fonction geocode coupée) : message « Nous n'avons pas pu situer « Lyon ». Aucune annonce ne peut être confirmée dans ce rayon, aucune distance n'est calculée. », aucun élargissement automatique. A9 vérifié.
- Panne de la vérification de département (geo.api.gouv coupé) : positions écartées, aucune distance inventée, mais aucun message propre à cette panne (la mention département disparaît). Non bloquant, noté.
- Ville homonyme (Saint-Denis) : une seule commune retenue sans choix proposé ni mention de l'homonymie. Pas de distance inventée, pas d'élargissement. Traitement par autocomplétion en L2 (B1).
- Aucune erreur console applicative (avertissements React de refs préexistants).
Non refait sur ce passage : 390/768/1024 (dernière preuve 4 largeurs sur c5331c), drawer et bascule carte actif/toutes (preuve root admin sur 064).

Conclusion de gate : L1 fonctionnellement clos pour visiteur et admin sur 064 ; recette membre non administrateur réelle non passée, remplacée par une preuve statique de niveau inférieur. Décision de Jérémie requise : accepter cette preuve pour ouvrir L2, ou fournir un compte membre de test dédié. L2 non démarré.

### L2, critères de recette précisés (conception seulement, aucune implémentation)
1. Canada : recherche gardiens pays CA = exactement les gardiens actifs avec prénom résidant au Canada (2 au 10/10 : Venaya 35 %, Godelive 85 %), compteur, liste et carte égaux ; profils sous 40 % visibles, candidature seule bloquée.
2. Résidence et mobilité distinctes : « Habitent à proximité » ne lit que la résidence ; « Peuvent venir ici » ne lit que travel_zones déclarées (NULL jamais inclus) ; un même gardien peut figurer dans les deux, jamais par déduction ; aucun jeu d'une clé pays/mode/région différente affiché.
3. Annonces : lieu = profil public du propriétaire, repli entier sur l'annonce (resolveSitPlace) ; compteurs internationaux serveur (PublicListings, InternationalListings, InternationalShowcase, useInternationalSitsCount) alignés sur cette même source, pas sur sits.country seul.
4. Pays, ville, rayon universels : pays visible d'abord, puis ville suggérée dans ce pays, puis rayon ; mêmes règles pour CA, FR, MX, BR, PF ; homonymes proposés au choix ; « Tous les pays » sans restriction ; tri « plus proches » désactivé ou expliqué sans ville ; état dans l'URL, retour arrière et réinitialisation fidèles.
5. Carte recentrée : changement de pays ou de ville recadre sur la nouvelle zone, aucun repère ni cadrage Lyon résiduel, aucun ancien résultat affiché pendant le chargement ; coordonnées toujours approximatives.
Hors portée L2 : barèmes, gouaches, entraide, seuil 40 % (candidature seulement).

### L1, clôture par dérogation (10/10/2026, Jérémie 14:28)
Décision : « Laisse tomber le contrôle sans compte administrateur, enchaîne sur le reste. » La recette membre non administrateur est retirée de la gate L1 par décision utilisateur. Elle n'est PAS passée : aucune preuve RLS réelle, seule la preuve statique du catalogue (section gate ci-dessus) existe. Les autres vérifications de L1 étaient vertes sur 064a30a (types, tests, build, recette visiteur et admin). L1 clos par dérogation. L2 lancé, L3 attend la validation de L2.

### L2, livraison (10/10/2026, non publiée)
Fichiers : src/lib/intlSitSearch.ts (nouveau), src/pages/InternationalListings.tsx (réécrit), src/components/listings/InternationalShowcase.tsx, src/pages/PublicListings.tsx, src/components/search/SearchSitter.tsx (compteur hors France), src/hooks/useInternationalSitsCount.ts (commentaire), src/__tests__/l2/intl-sit-search.test.ts, src/components/search/AGENTS.md. Aucune migration.
- B2 : carrousel visible dès 1 annonce. B3 : noms complets (Canada, Polynésie française, présentée comme destination dans « Gardes à l'étranger »), plus de code brut. B5 : « Plus proches » désactivé sans ville située. B6 : titre contextuel (tous pays, pays, ville). B7 : recherche dans l'adresse, retour arrière, rechargement, réinitialisation. B8 : plus de 60 géocodages au chargement, géocodage seulement en carte ou avec ville, une fois par lieu distinct. B1 côté annonces : autocomplétion Photon limitée au pays choisi, coordonnées de commune arrondies à 3 décimales. Liste par défaut, carte en option, recadrée à chaque recherche (carte recréée, aucun ancien repère). Changement de pays retire la ville.
- Compteurs hors France de /annonces (bandeau et radar) alignés sur le lieu propriétaire. Accueil : comptage sits.country conservé (budget P3 ; écart mesuré nul).
- Preuves : 10 tests L2 et 92 tests voisins verts, types OK, build complète OK (test:guard inclus après retrait d'une lecture ajoutée par erreur sur l'accueil). Recette visiteur sur build : tous pays 3 (Saint Ludger, Canada ; Punaauia et Taravao, Polynésie française) ; CA 1 ; PF 2 en carte, 2 situées sur 2 ; MX 0 et BR 0 avec état vide et « Voir tous les pays » ; Saint-Ludger 50 km = 1, repère placé (1280/1024/768/390) ; Montréal 25 et 200 km = 0 (Saint-Ludger à plus de 200 km, cohérent) ; bascule CA vers PF retire la ville, retour arrière restaure, rechargement conserve, réinitialisation vide les filtres ; carrousel /annonces visible, « 3 annonces hors France ». Recherche gardiens CA : 2 cartes Venaya et Godelive, Montréal (texte « Lyon » présent seulement dans le pied de page). Aucune erreur de page.
- Non vérifié : sélection d'une suggestion de ville au clavier ou à la souris (seuls des liens d'adresse ont été testés), filtres dates et animaux en navigateur (couverts par tests), Lyon FR sur ce build (moteur L1 non modifié), carte gardiens CA recentrée, session connectée. Annonces /annonces (France) : pas de sélecteur de pays dans la page, la destination étrangère passe par le lien « Voir les N annonces hors France ».
Statut : L2 livré, en attente de validation. L3 non lancé.

### L2, compléments après revue root de 44aa7a1 (10/10/2026, non publiés)
- Choix « Pays de destination » au premier niveau de /annonces (ordinateur : à gauche du champ ville ; mobile : ligne dédiée au-dessus des filtres), composant partagé src/components/search/DestinationCountrySelect.tsx, aussi utilisé par /annonces/international. Options : France, pays avec annonces (nombre), « Tous les pays, France incluse » (pays=monde), « Tous les pays hors France » (défaut de la route internationale), autres pays. France garde le moteur L1 ; un autre choix ouvre la recherche internationale ; dates et animaux compatibles conservés (carryOverParams), ville, coordonnées, zone et rayon effacés. Routes et canonical inchangés.
- Moteur intlSitSearch : lecture tronquée (annonces, propriétaires, animaux) = erreur explicite, aucune liste ni compteur présentés comme complets ; repli Photon borné à 2 requêtes simultanées, cache de session échecs compris ; homonymes sans région = aucun point, région du nom (« Saint Ludger, Québec, Canada ») utilisée ; coordonnées d'adresse validées (finies, ±90/±180) ; France incluse : point vérifié par département comme L1.
- Autocomplétion : minuteur nettoyé, requête annulée, jeton de réponse (aucune suggestion périmée), suggestions retirées au changement de pays, clavier flèches/Entrée/Échap, sélection de la commune exacte (région affichée).
- Ville en cours de localisation : « Localisation en cours » et squelettes, jamais un 0 provisoire. Repères de la carte internationale : bulle titre, lieu, « Voir l'annonce ».
- Correctif trouvé en recette : les animaux étaient lus dans la table pets, illisible pour un visiteur (aucune politique anon), donc tout filtre animaux renvoyait 0 en visiteur, sur /annonces comme à l'international. Les deux moteurs lisent maintenant la vue public_pets (mêmes colonnes). Aucun droit modifié.
- Plan du site : la build régénérait public/sitemap.xml et .sitemap-cache.json (nouvelle annonce Longvic) ; ces deux fichiers sont remis à leur version d'avant L2, sans lien avec le lot.
- Accueil : comptage hors France sur sits.country maintenu (budget P3), écart mesuré nul, aucune migration.
- Preuves : 16 tests L2 et tests voisins verts, types OK, build complète OK. Recette visiteur sur build, interactions réelles à 1280 : /annonces avec dates et Chats, choix Canada, adresse conservant dates et animaux, 1 annonce ; suggestion « Montréal, Québec, Canada » cliquée à la souris, 0 à 50 km ; « Saint-Ludger » choisi au clavier (flèches puis Entrée), 1 annonce à 50 km ; Échap ferme la liste ; carte : 1 repère, bulle « Saint Ludger, Canada, Voir l'annonce » ; Canada vers Polynésie française : champ ville vidé, 1 repère PF, aucun repère canadien ; bouton Chiens et date de début réellement sélectionnés, adresse à jour ; retour arrière restaure ; Polynésie vers France : /annonces avec dates et animaux gardés ; France vers « Tous les pays, France incluse » : 10 annonces avec ces filtres ; Réinitialiser : 3 hors France ; coordonnées invalides dans l'adresse : ville non située, message, aucune distance ; Lyon : 0 ouverte, 1 non située du département (régression L1 absente) ; gardiens Canada : 2 (Venaya, Godelive), « Peuvent venir ici » : les mêmes 2, conforme à la règle canComeTo du lot 2 (résidentes du pays sans ville de référence), aucune mobilité déclarée. Choix du pays visible à 1024, 768 et 390, Canada 1 annonce située sur 1 à chaque largeur. Aucune erreur de page.
- Non vérifié : session connectée, lecture tronquée en conditions réelles (couverte par le code, pas de test intégré), Punaauia sans animal déclaré malgré un titre « 2 chats » (trou de saisie, non modifié).
Statut : L2 complété, en attente de validation root. L3 non lancé.

### L2, complément recette root connectée sur 44aa7a1 (recherche de gardiens)
- Constat root : /recherche-gardiens?pays=CA connecté reprenait la ville du profil (Lyon, 15 km), 0 gardien ; après clic Canada, Lyon restait, tri « Plus proches », distances 5 834 km, carte France+Canada.
- Correctif SearchOwner.tsx : pays explicite dans l'adresse différent du pays du profil (ou TOUS) = aucune ville du profil reprise, pays entier ; garde-fou unique qui retire toute ville d'un autre pays que le pays choisi (pastille, adresse, retour, rechargement) ; sans ville, pas de « Plus proches » (tri par expérience), donc ni distance ni ancre ; titres selon le contexte (Canada, tous les pays, « Peuvent venir ici ») ; pays et ville explicites dans l'adresse conservés.
- Preuves : types OK, 51 tests ciblés verts, build OK. Recette visiteur sur build, 1280 et 390 : ?pays=CA 2 gardiens (Venaya, Godelive), champ ville vide « Ville · Canada », pas de distance, titre « Des gardiens de confiance : Canada » ; ?pays=CA&ville=Montréal 2 ; ?pays=FR&ville=Lyon 90, titre d'origine.
- Non vérifié : session connectée (aucun compte de l'aperçu ne correspond à votre adresse, connexion sous un autre compte non faite) ; le chemin connecté est couvert par le code, à recetter par root.
Statut : L2 en attente de revue root ; L3 autorisé, ouvert après cette revue.

### L2, correctif critère n°2 (« Peuvent venir ici », revue 0c0fff3)
- Rectification : la recette précédente affichait « Peuvent venir ici » Canada = 2 (Venaya, Godelive, travel_zones NULL) et la présentait comme conforme. C'était faux : contraire au critère L2 n°2 (seules les zones déclarées comptent, NULL jamais inclus).
- canComeTo (src/lib/travelZones.ts) : NULL ou [] = jamais retenu ; world, continent, pays, région déclarés = couverture ; « local » seul = même pays, ville de destination donnée et position approximative dans le rayon (effective_search_radius), jamais un pays entier sans ville. Pool SQL mobile inchangé (sur-ensemble filtré côté client). Aucun barème ni seuil modifié.
- Preuves : 57 tests verts (NULL et [] résidents, local dans et hors rayon, local sans ville, pays CA, world, continent NA vers BR, pays CA vers BR), build OK. Recette visiteur sur build 1280 : Canada « Habitent à proximité » 2, « Peuvent venir ici » 0 (titre « Des gardiens prêts à venir : Canada »), retour « Habitent à proximité » 2. Annonces Saint-Ludger 50 km : 1 ; Chiens 0 ; Chats 1 ; début 13/01/2027 0 ; début 12/01/2027 1 (concorde avec la preuve root sur 44aa7a1). Clic de suggestion Saint-Ludger vérifié au tour précédent seulement.
- Non vérifié : session connectée (aucun compte de l'aperçu à votre adresse).

### L2, compléments revue technique 0c0fff3
- Homonymes FR : placeKey/uniquePlaceKeys = ville + pays + département (France), chaque lieu résolu garde son département et sa propre validation de point ; géocodage toujours dédupliqué par ville + pays (cache). Tests : Montreuil 93 et 62 = deux clés, point du 62 refusé pour le 93, gardé pour le 62.
- Suggestions : tout changement d'adresse (retour, réinitialisation, pays, monde) annule minuteur et requête et ferme la liste.
- Échec ou troncature : page internationale affiche « Comptage indisponible » et l'alerte, sans état vide ; /annonces et le lien de SearchSitter affichent « Voir les annonces hors France » sans chiffre ; le bloc vitrine reste masqué, sans compteur.
- Preuves : types OK, 66 tests ciblés (dont P3) verts, build complète OK. Recette visiteur 1280 sur build : suggestion cliquée (Saint-Ludger-de-Milot, première proposée) 0 annonce à 50 km, cohérent ; retour arrière ferme les suggestions ; gardiens Canada 2 ; Lyon inchangé (3 hors France) ; panne simulée de lecture des annonces : international « Comptage indisponible » + alerte, /annonces lien sans chiffre.
- Constat hors L2, non corrigé : même panne, la liste France de /annonces affiche « Aucune annonce ouverte sur ce périmètre » (moteur L1), à traiter si root le demande.
- Non vérifié : session connectée.

## L2, complément état vide mobilité (10/10/2026, 13:28 UTC)

Preuve root sur le build 443e09e, session connectée, `/recherche-gardiens?pays=CA` : résidence = 2, mobilité = 0 (correct). L'état vide du mode mobilité disait « Aucun gardien consultable dans ce pays (Canada) » et proposait « Tous les pays 1411 gardiens disponibles », un compteur de résidents présenté comme de la mobilité. Correction : en mode « Peuvent venir ici », l'état vide affiche « Aucun gardien n'a encore déclaré cette destination (Canada) » et aucune suggestion d'élargissement chiffrée (les compteurs portent sur les résidents). Contrôle visiteur sur la build corrigée : libellé exact confirmé, aucun compteur trompeur. Types et build complets au vert.

## Clôture L2 (10/10/2026, validation root)

Preuves root exactes : diff 7ffd9a et correctif d'état vide relus ; recette connectée Canada résidence 2, mobilité 0 ; annonces Saint-Ludger 1, dates, animaux, carte et suggestions, transition France vers Canada ; service visiteur aux 4 largeurs, types, tests, build. Complément 7ffd9a : réinitialisation 3 hors France, monde 16 France incluse, retour 3 hors France, carte Canada 1 située et 1 bulle correcte ; largeur root réelle 1349. Dernière preuve root après build 24c341d (version rechargée 13:31:29 UTC) : Canada résidence 2, mobilité 0, libellé exact « Aucun gardien n'a encore déclaré cette destination (Canada) », aucune suggestion chiffrée. Recette membre non administrateur retirée par décision explicite de Jérémie (non passée). Statut : L2 validé.

## L3 livré (10/10/2026), en attente de relecture root

Contrat unique, défini avant le code, dans src/lib/profileSignals.ts :
- Entraide : offre = profiles.available_for_help === true (vue public_profiles, déjà publique), catégories skill_categories lues seulement dans ce contexte opt-in, gouaches existantes (animaux spot-chien, jardin spot-jardin, coups de main spot-bricolage, savoirs spot-bienetre). Une compétence seule n'est jamais une offre (liste HELP_SKILLS supprimée de sitterProfileFacts, code mort prouvé). Onglet entraide = offre OU missions > 0, aux trois endroits de la fiche ; offre à zéro mission visible ; offre désactivée : historique conservé, bandeau masqué. Ligne helps_with remise à zéro à chaque changement de profil.
- Confiance 5 étapes inchangées : première activité propriétaire = annonce au statut published, confirmed, in_progress ou completed (plus « tout sauf brouillon ») ; gardien = profiles.completed_sits_count > 0 (plus candidature acceptée). Texte : ne garantit pas la fiabilité, distinct de la complétion 100 et de l'affinité. Vérification d'identité : flux réel = analyse automatique puis revue humaine si échec ; les textes de fiche ne promettent pas de contrôle par l'équipe.
- Dernière visite : last_seen_at public, formulation approximative (cette semaine, ce mois-ci, mois année) dans la ligne d'identité ; null, invalide ou futur (au-delà de 5 min) neutre.
- Réactivité : contrat unique public_responsiveness, 90 jours, 5 contacts minimum, palier de délai médian seul. La vue ne publie ni taux, ni numérateur, ni dénominateur : AUCUN pourcentage affiché ni déduit. L'ancien badge 30 jours sans minimum (ReplyTimeBadge, reply_median_minutes) est retiré des deux en-têtes de fiche ; il reste sur les cartes de recherche jusqu'à L4. Badges ≥ 70 % et médiane < 72 h inchangés.
- Chronologie : premier avis et premier 5 étoiles fusionnés s'ils sont le même avis ; graphique 12 mois rendu seulement avec au moins 3 mois actifs ; FreshStartStory ne dit plus « a rempli son profil ».
- E7 : SQL guard_application_min_completion lit profiles.profile_completion via application_completion_allowed (>= 40) ; l'interface lit la même colonne (MIN_COMPLETION_TO_APPLY 40) : cohérence UI/SQL prouvée par lecture des définitions. Constat : pour role = both, calculate_profile_completion stocke GREATEST(score propriétaire, score gardien) ; un double rôle peut donc candidater avec un score gardien < 40. Mesure nominative impossible (permission refusée sur _calculate_sitter_score, lecture seule) ; aucune modification de barème ni de seuil, décision à prendre par root. Preuve transactionnelle 39/40 antérieure (0063) non refaite pour éviter tout effet hors transaction.

Vérifications : types OK ; 106 tests ciblés (dont src/__tests__/l3/profile-signals.test.ts) ; build complète OK (garde de suite au vert). Recette visiteur sur build locale 1280/768/390 : Frederic (offre déclarée, 0 mission) onglet entraide, 4 gouaches dont jardin et bricolage, « Pas encore de mission réalisée » ; fiche gardien : dernière visite, ancien badge 30 jours absent ; Venaya 35 % : aucun « a rempli son profil », pas d'onglet entraide sans offre. Aucune erreur page. Non vérifié : session connectée, page d'édition (L6), carte de confiance chez soi, profil avec palier de réactivité réel. Pas de fixture publique créée. L4 non lancé.

## Ajout L7

Moteur France SearchSitter : après échec de requête, un faux état vide s'affiche (constaté en recette L2). À corriger avant livraison L7.
