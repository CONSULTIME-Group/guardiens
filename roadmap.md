# Roadmap

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

## Lot A10, chiffres justes (en cours)
- [x] Tableau de bord, SEO, Trafic, Analytics, santé emails, Membres, Erreurs, Entraide, taux d'ouverture unique, Nurturing
- [ ] Migration d'agrégats SQL en lecture seule (Alma, entonnoir, lecture admin des murmures)
- [ ] Alma : événements et historique en agrégats, bandeau de troncature retiré
- [ ] Compétences : file d'attente complète via agrégat
- [ ] Statistiques d'annonces : « Membres uniques », parité des routes
- [ ] Déployer fetch-seo-data (modifiée localement) après GO, contrôle 401
