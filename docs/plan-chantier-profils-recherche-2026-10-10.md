# Plan de chantier profils, cartes et recherche (10/10/2026)

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
- Complétion (barème 100) et confiance (5/5) restent deux notions distinctes ; l'affinité est un troisième concept, sans rapport avec la confiance.
- Profils sous 40 % visibles ; candidature possible à partir de 40 % inclus.
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
| A1 | Zone d'annonce calculée sur owner.city, pas sur la localisation du logement | C (SearchSitter) | bug confirmé | L1 |
| A2 | Mode France n'impose pas FR (Québec dans la grille) | C, L | bug confirmé | L1 |
| A3 | Drawer « Voir N résultats » = results.length (32) vs 15 disponibles + 17 fermées | C, L | bug confirmé | L1 |
| A4 | Compteur France inclut expirées, hors France et fermées | C | bug confirmé | L1 |
| A5 | « près de vous » dès qu'une ville est saisie, même en France entière | C | bug confirmé | L1 |
| A6 | Compteurs hors France incohérents (dates, accepting_applications) entre PublicListings, SearchSitter, InternationalShowcase, InternationalListings | C | bug confirmé | L1 |
| A7 | Cap 500 ouvertes + 500 fermées, pays filtré après limite | C | bug confirmé | L1 |
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
| C1 | Cartes gardiens 4 colonnes étroites, auto-rows-fr crée de grands vides | N | bug confirmé | L3 |
| C2 | Note de carte : nombre de gardes affiché à la place du nombre d'avis | C | bug confirmé | L3 |
| C3 | replyPhrase : médiane arrondie en « moins de », promesse trompeuse | C | bug confirmé | L3 |
| C4 | Citation : première phrase > 120 caractères renvoie null | C | à vérifier | L3 |
| C5 | Filtre « avec photos » ignore couverture et galerie | C | à vérifier | L3 |
| C6 | Compteurs de cartes potentiellement périmés après changement | C | à vérifier | L3 |
| D1 | FreshStartStory « Venaya a rempli son profil » à 35 % | N | bug confirmé | L4 |
| D2 | MarginLettering dans les marges verticales | C | recommandation (suppression) | L4 |
| D3 | Héros gardien et propriétaire non harmonisés (photo 180x196, h1 68 vs photo ronde 176, h1 plus petit) | N | recommandation | L4 |
| D4 | Sections vides (Ses annonces, animaux non renseignés, phrases au futur) | N | recommandation | L4 |
| D5 | « Prépare sa garde » affiché sans intention connue | C | à vérifier | L4 |
| D6 | Contact absent entre 768 et 1023 px (rail lg, sticky md mobile) | C | à vérifier | L4 |
| D7 | Widget Alma pouvant recouvrir le contenu | N | à vérifier | L4 |
| D8 | Bloc PracticalGrid jamais affiché | C | à arbitrer | L4 |
| E1 | hasEntraide basé sur missionCount > 0, masque les offres déclarées | C | bug confirmé | L5 |
| E2 | Bande helpsWith : liste blanche HELP_SKILLS 5 catégories, exclut jardin et bricolage | C | bug confirmé | L5 |
| E3 | Confiance 5 étapes : source de hasFirstActivity à vérifier | C | à vérifier | L5 |
| E4 | Phrase vérification d'identité « par l'équipe » vs automatique | C | à vérifier contre le vrai flux | L5 |
| E5 | Réactivité : deux systèmes (30 j et 90 j, seuil 5 contacts, >= 70 %, médiane < 72 h) | C | recommandation (contrat unique, proposition 90 j min 5, à valider) | L5 |
| E6 | Chronologie : doublons premier avis / premier 5 étoiles, graphique 12 mois quasi vide | N | recommandation | L5 |
| G1 | Environnement en double : menu Campagne vs puces Ville (Mon profil Jérémie) | N | bug confirmé | L6 |
| G2 | Titre « Identité et vérification » couvre bio, langues, intérêts | N | recommandation | L6 |
| G3 | « Découvrir Lyon » long, à plier par défaut, origine générée à vérifier | N | à vérifier | L6 |
| G4 | État de sauvegarde (modifié / enregistré) peu clair, aucune sauvegarde auto à promettre | C | à vérifier | L6 |
| G5 | Liens publics dupliqués | N | recommandation | L6 |
| G6 | Libellé de région « Rhône, Alpes et Massif central » | C | à arbitrer | L6 |
| H1 | Propriétaire Cécile : aucun animal sur fiche, 4 sur l'annonce Rouans | N | donnée de saisie, ne pas recopier | - |
| H2 | Mémoire affinité mentionne 60 %, site applique 40 % | C | à corriger (doc) | L7 |
| H3 | Fond de confiance équivalent à 100 | - | critique abandonnée | - |

## 4. Lots

Chaque lot : diff exact limité au périmètre, types, tests métier utiles (pas de tests miroirs de CSS), build final, puis recette visuelle et fonctionnelle sur le build aux dimensions concernées avec captures, et contrôle de régression des lots précédents. Checkpoint : SHA, tests, preuves, statut, mise à jour TODO. Rollback par commit, migrations compatibles si nécessaires. Pas d'enchaînement tant qu'un bug bloquant ou une recette manque : statut « partiellement validé ». Les lots déjà autorisés n'ont pas besoin d'un GO chacun ; seule la production l'exige. Ici : plan seulement, aucun lot autorisé.

### L1 Fiabilité du moteur d'annonces
Périmètre : A1 à A11. Localisation du logement (sits.city, code postal) au lieu de owner.city ; sémantique ouvertes / pourvues / passées ; France = FR strict, « autre pays » et « tous » distincts ; drawer, densités, grille et carte sur la même population disponible ; cohérence internationale (dates, accepting_applications) ; élargissement explicite ; aucun retour à l'ensemble faute de coordonnées ; pagination serveur ou pool complet (fin du cap 500/500 et du pays filtré après limite) ; dates de fin inclusives, fuseau Europe/Paris ; erreurs de géocodage visibles sans fausser la distance. A10 : reproduire et établir la cause avant correctif.
Recette : mêmes chiffres dans drawer, titre, carte, bandeaux ; Lyon, France, Canada, PF, tous pays ; annonce Marlhes placée à Marlhes.

### L2 Recherche internationale (annonces et gardiens)
Dépend de L1. Parcours pays visible, puis ville du pays, puis rayon ; « Tous les pays » ; filtres dates et animaux communs ; remplacer l'autocomplétion France seule de SearchSitter ; réutiliser le moteur L1 dans InternationalListings sans casser route ni canonical ; liste par défaut, carte en option ; B4 à investiguer sans cause supposée ; showcase à partir de 1 ou 2 annonces ; noms complets CA / PF (PF comme destination géographique) ; tri « plus proches » désactivé ou expliqué sans ville ; textes adaptés au voyage ; URL pays/ville/filtres, reset, retour arrière. Drapeaux facultatifs.

### L3 Cartes de synthèse gardiens et annonces
Dépend de L2 (destination) et des vérifications de données L5. Grille adaptée à la largeur utile, hauteur auto ; identité, photo, icône vérifiée, ville et pays, mobilité, raison d'affinité, animaux, 1 ou 2 compétences en gouache, dernière activité approximative, réactivité et avis réels, bio courte sans invention. Profils incomplets visibles, initiale en repli, cartes comparables. C2, C3, C4, C5, C6. Attribut sans donnée omis. CTA « Voir le profil » cohérent avec favoris et navigation clavier du carrousel. Cartes annonces : lieu complet, dates, animaux, couverture correcte, photos privées jamais forcées.

### L4 Héros et fiches publiques
Après L3. Gouache choisie préservée, sujets lisibles ; héros compact environ 280 à 320 px sur ordinateur (objectif, pas règle mobile) ; photo, prénom, ville, pays, mobilité, dernière activité, icône vérifiée et CTA au premier écran ; icône vérifiée cliquable 44 px avec explication au survol, focus et toucher ; suppression de MarginLettering ; harmonie gardien / propriétaire ; moins de cadres sombres et de doubles surtitres ; galerie en mini aperçu + « Voir les photos » (accès membres préservé) ; sections vides masquées ; D1 neutralisé ; D5 ; en-tête collant et ancres d'onglets non masquées ; D6 ; D7 ; D8 arbitré ; aucune bio inventée.

### L5 Entraide, confiance, activité
Vérification des données avant le design de L3 et L4, implémentation ensuite. E1, E2 ; offres déclarées et missions réalisées affichées séparément ; illustrations de compétences uniformisées avec les gouaches existantes, sans nouvel asset inventé ; onglets aide / garde / public clairs ; confiance 5 étapes (email, identité, photo, >= 40 %, première activité : annonce pour propriétaire, garde pour gardien) distincte de la complétion 100 (l'identité y compte pour 5 %, chevauchement assumé, pas de fusion) ; affinité séparée ; explication de 5/5 sans promesse de fiabilité ; E3, E4 ; E5 contrat unique validé par Jérémie avant affichage d'un taux ; dernière activité relative, son absence ne signifie pas « peu fiable » ; E6 ; Alma et CommunityPulse secondaires.

### L6 Édition du profil
Alimente L2 et L5. G1 : une source cohérente, données existantes conservées, aucun écrasement automatique ; complétion et confiance distinctes mais navigation allégée ; G2, G3 ; aides progressives courtes ; G4 sans promettre de sauvegarde auto avant le code ; erreurs par champ sans perte des changements ; pays, ville, mobilité combinable sans préchoix, opt-in entraide ; aller-retour réel enregistrer / recharger / fiche publique / recherche testé en préproduction sans écrire sur un profil réel ; G5, G6.

### L7 Recette globale et livraison
Rôles : anonyme, membre non admin, propriétaire, gardien, double rôle, admin (la session admin ne prouve rien pour un non admin). Largeurs : 360, 390, 768, 1024, 1280, 1440, 1920. Rendu réel, pas inspection de code. Cas : France, Lyon, Canada, Montréal, Saint-Ludger, BR, MX, PF, tous pays, zéro résultat, profil incomplet, 39 / 40 %. Aucune candidature ni notification réelle : fixtures isolées ou transaction annulée ; sauvegarde mobilité testée en isolé. Liste, carte, URL, rechargement, retour, tri, compteurs, confidentialité, photos, contact, droits, avis admin, favoris (aucun clic irréversible en production). H2. Resynchronisation GitHub préparée comme prérequis de traçabilité sans élargir de permissions. GO explicite, puis recette production limitée, sans message ni notification.

Gates : L1 moteur, puis L2 destination, puis L3 cartes ; L4 après L3 ; L5 vérification données avant L3/L4 puis implémentation ; L6 alimente L2 et L5 ; L7 transverse final.

## 5. Points non vérifiés

- Mobile, tablette et grand écran : non faits (seule la fiche gardien publique vue à 360 px plus tôt).
- Anonyme : seulement le service d'annonces en local ; session root connectée en préproduction.
- Membre non admin : jamais vérifié.
- Sauvegarde réelle de la mobilité : non faite (visuel seulement, tests unitaires).
- Testés : 3 fiches publiques sur ordinateur, édition visuelle du profil en root admin, Canada 2 cartes correct, avis admin vérifiés précédemment.
- Carte internationale root : 2 repères PF, aucun CA, cause non tranchée.
- A10 non reproduit en local.
- Recette production de la règle 40 % : en attente de GO.

Sujets hors périmètre conservés dans TODO-lovable.md (analytics, SEO/GSC, favoris, push, articles) : inchangés, aucune automatisation ajoutée.
