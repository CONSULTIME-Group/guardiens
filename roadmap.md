# Roadmap

## Gouaches peintes sur les profils (10/10/2026)

- [x] Conserver les peintures, supprimer le zoom et fondre leurs bords sur le papier du profil.
- [x] Profil affiché vérifié à 1280 et 390 px : sujets entiers, contact visible, aucun débordement. 17 tests ciblés verts, build automatique vert, aucune publication.

## État actuel (10/10/2026, 18:45 Paris)

- L1 à L7 livrés et publiés en version réduite (base publiée c33531b2, déploiement 33330154 réussi). Les sections plus bas qui disent « non publié » ou « L6 non lancé » sont historiques.
- Correction de publication réussie : texte IdentityVerifiedMark reformulé, garde test:guard conservée dans le build, liste de référence vide.
- L5 hero et gouaches laissés en l'état actuel.
- L1 membre non admin : dérogation conservée, contrôle RLS non admin non passé.
- Limites explicites, non levées : pas de matrice mobile complète, pas de recette avec session réelle de membre, pas de sauvegarde réelle de profil testée.
- L7 reliquat fermé : test d'intégration src/__tests__/seo4/search-sitter-outage-retry.test.tsx sur le vrai SearchSitter (panne en liste et carte, aucun 0 ni bandeau d'élargissement, Réessayer avec mêmes critères puis reprise). Aucun correctif applicatif nécessaire.

Tâches encore actives :
- Envoi test entraide-ligne-relance (droits admin requis).
- Fonction sitemap à déployer et migration acquire_proximity_send_claim à appliquer (GO de Jérémie).
- Recette mobile et session membre réelle (non faite).

## Diagnostic publication du 10/10/2026
- [x] Préétapes sync/robots et lectures sitemap bornées, sans écriture.
- [x] Annuler la séparation CI seule et rétablir la garde obligatoire en fin de publication.
- [x] Préserver baseline et verdicts ; aucun test global relancé.
- [x] Limite consignée : journaux de publication distants non exposés, étape exacte du déploiement non démontrable.

## Ajustement profil Bénédicte
- [x] Carte contact et rayon dans le flux, sans suivi du défilement.
- [x] Papier du carnet étendu à la largeur du hero sans changer l'asset.
- [x] 8 tests ciblés verts, build automatique vert et contrôle visuel desktop.

## Reprise ciblée L5, hero immersif (10/10/2026)
- [x] (historique, publié en l'état) Remplacer la composition en colonnes par une gouache continue et une protection locale du texte.
- [x] Tests pertinents et contrôles automatiques du build et des types.
- [ ] (limite conservée) Inspecter visuellement quatre profils aux six largeurs, ID et ouverture picker sans sauvegarde.
- [x] Consigner preuves et limites (historique : L5 à L7 publiés depuis).

## Lot E7, page Entraide vue d'un membre

- [x] Extraire `respondToMission` dans `src/lib/missionRespond.ts` et brancher `SmallMissionDetail.tsx` dessus
- [x] Logique pure `src/lib/entraideHubModel.ts` (tri distance, seuil 30 km, sélection des 12 personnes)
- [x] Ligne compacte `NeedRow` et `HelperCard` alimentée par props dans `EntraideCards.tsx`
- [x] Chargement groupé des compteurs et écussons (`.in`), `HelpCounts` en affichage pur, prop `rows` sur `MissionBadgesReceived`
- [x] Refonte `EntraideHub.tsx` : origine profil, en-tête compact, liste par défaut, section 12 personnes, JSON-LD sans Person, meta description
- [x] Carte : besoins en `--secondary`, personnes en `--primary`, légende, centrage origine
- [x] `MissionsCityPage.tsx` : props nouvelles facultatives, rendu inchangé, aucune modification nécessaire
- [x] Tests ciblés E7 + mise à jour `entraide-hub-explicit.test.tsx`
- [x] Vitest complet, tsgo, build, scan des textes
- [x] Mesure des requêtes réseau au chargement, membre connecté, avant et après
- [x] Rapport final 10 lignes avec hash du commit (aucune publication, aucune migration)

## Finition H1 et E7

- [x] Composer la home avec 4 gardes et 2 besoins, avec repli et tri local
- [x] Corriger le compteur national, le hero et le lien réservé aux visiteurs
- [x] Exclure le membre de la liste Entraide et ajuster distances et capitalisation
- [x] Adapter les tests et lancer toutes les vérifications demandées

## Régression du voile du hero

- [x] Rétablir le dégradé, les styles des textes et des boutons, et la mention presse temporaire
- [x] Vérifier le garde-fou, les types, le build et le contraste à 360 px et 1440 px

## Lot H2, accueil resserré et vérité sur la rencontre

- [x] Corriger les formulations produit, SEO et structurées sur la rencontre conseillée
- [x] Resserrer l'accueil à 9 ensembles et intégrer les coups de main au fonctionnement
- [x] Condenser l'histoire, l'affinité et la définition, puis replier le comparatif
- [x] Afficher 6 questions et monter les 3 autres dans un accordéon replié
- [x] Vérifier les textes avant et après, les tests, les types, le build, la hauteur et le LCP
- [x] Livrer le rapport final avec hash, sans migration ni publication

## Ma ligne, jetons dédiés (27/09)
- [x] Table helps_line_tokens (RLS sans policy), edge ma-ligne + send-mass-email adaptés
- [x] Phrase de transparence sous le bouton
- [x] Label retiré (aria-labelledby h1), -mt-10 retiré état expiré
- [x] Tests, tsgo, build, déploiement edge
- [x] Lien test Jérémie
- [ ] Envoi test entraide-ligne-relance (bloqué : droits admin requis)
- [ ] En attente : plan P1 à P3 (GO requis)

- [x] 0025 : réactivation des réponses retirées (reactivated_at), suppression retirée
- [x] Liste des tournures négatives restantes sur l accueil (sans appliquer)

- [x] Lot C1 Consentement cookies (bandeau CNIL, Consent Mode v2, /cookies, admin Pages légales et Trafic). À traiter après le lot A9.
- [x] Lot J2-B Filet humain et pilotage Alma (classification, bouton contact, 3 signaux, feedback, mesure, synthèse lundi, rejeu admin).

- [x] Lot A9 Modération fiable (signalements, contestations, avis, gardes, annonces, entraide, contact)
- [x] Lot J2-C Corrections de relecture d'Alma

## Lot A10, chiffres justes
- [x] Tableau de bord, SEO, Trafic, Analytics, santé emails, Membres, Erreurs, Entraide, taux d'ouverture unique, Nurturing
- [x] Migration d'agrégats SQL en lecture seule (Alma, entonnoir, lecture admin des murmures)
- [x] Alma : événements et historique en agrégats, bandeau de troncature retiré
- [x] Compétences : file d'attente complète via agrégat
- [x] Statistiques d'annonces : « Membres uniques », parité des routes
- [x] Déployer fetch-seo-data (modifiée localement) après GO, contrôle 401

- [x] Lot J3 : corrections Alma après test réel (action principale, titre, CLASSEMENT, onglets admin Alma, indicateur action, profil <40 %, signal test fondateur, admins exclus)

## SEO et compréhension projets/entraide (02/10/2026)

- [x] Projets au plan du site (build + fonction) et robots alignés
- [x] /projets : titre, intro, deux actions, manifeste retiré, date exacte sur carte
- [x] /petites-missions : intro, une explication, FAQ tarif
- [x] Fiches : note compte, contrepartie unique, recommandations honnêtes, note carte projet externe
- [x] Tests ciblés, captures, build final
- [ ] Déployer la fonction sitemap (attend GO publication)

## Anti-double-envoi proximité, complément du 03/10/2026

- [x] RPC dédiée acquire_proximity_send_claim préparée (supabase/prepared-migrations, non appliquée) + test SQL en mémoire
- [x] Branchement dans logic.ts, 2xx vérifié, pannes journal/finalisation exposées à l'admin
- [x] Tests simulés avec voyage dans le temps, typecheck fonction propre
- [ ] Appliquer la migration puis déployer la fonction et publier : attend le GO de Jérémie
- [x] Publication : garde bloquée par texte L5 « contrôle à la main », reformulé (test isolé vert)
