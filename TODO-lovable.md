# TODO Lovable — Prompts différés

Fichier de suivi des tâches reportées. Mis à jour manuellement après chaque session Lovable.

## Analytics (V1.1)

- [ ] Webhook Supabase INSERT profiles → Edge Function `track-signup-completed` (remplacer le retry 500ms côté client par source de vérité serveur)

- [ ] Event `signup_email_verified` sur callback de vérification email

- [ ] Events `application_started`, `application_completed`, `application_abandoned` sur le formulaire de candidature

## Partage social

- [ ] Ajouter paramètres UTM sur URLs partagées dans ShareButtons (format : `?utm_source=share&utm_medium={channel}&utm_campaign=sit_{sit_id}`)

## Favoris

- [ ] Décider : intégrer bouton FavoriteButton sur PublicSitDetail OU supprimer le composant mort

- [ ] Si intégration : events `sit_favorite_added` / `sit_favorite_removed`

## Contact / Messagerie fiche annonce

- [ ] Statu quo : `sit_apply_clicked` couvre l'intent. Réévaluer si ajout d'un bouton "Poser une question" en V2.

## SEO / Search Console

- [ ] **Relancer connexion Google Search Console** (bloqué actuellement par OAuth « Invalid session »)
  - Pré-requis utilisateur : autoriser popups + cookies tiers sur `lovable.dev` et `accounts.google.com`, garder l'onglet Lovable ouvert pendant tout le flow.
  - Commande de reprise : dire « relance GSC » dans le chat → l'agent rappelle `standard_connectors--connect connector_id=google_search_console`.
  - Une fois connecté, flow META verification sur `https://guardiens.lovable.app/` puis soumettre `https://guardiens.lovable.app/sitemap.xml` (ou idéalement `https://guardiens.fr/sitemap.xml` si on déclare la propriété sur le domaine custom).
  - **Échéance impérative** : à définir (pas de date fixée, pivot pricing "gratuit sans deadline" du 5 juillet 2026).
  - Finding tracker associé : `gsc:gsc` (catégorie indexing, impact mid). Marqué « ignored » manuellement dans Lovable → SEO & AI search.

## Preuve d'activité locale dans seo_city_pages (reporté)

- [ ] Injecter les gardes archivées comme preuve d'activité sur les pages ville (« 12 gardes réalisées à Lyon depuis mai 2026 »).
  - Reporté volontairement : avec 18 annonces au total (dont 8 archivées), les chiffres affichés seraient trop faibles pour rassurer, et parfois nuls sur la majorité des villes. Un compteur à 1 ou 2 dessert la page.
  - Reprendre quand le stock d'annonces archivées le justifie (ordre de grandeur : au moins 10 gardes réalisées sur une même ville).
  - Contrainte de sécurité à respecter à ce moment : agrégats uniquement, jamais de dates précises ni de lien vers l'annonce archivée.

## Lot visibilité 40 % et mobilité (état au 10/10/2026, non publié)

- [x] Visibilité sans seuil de complétion : Canada = 2 gardiens (85 % et 35 %), fiches consultables
- [x] Garde-fou candidature 40 % côté base (trigger + application_completion_allowed) et message UI
- [ ] QA finale en production après GO de publication (Canada 2, refus 39 %, accord 40 %)
- [x] Fiche propriétaire : « prépare sa première annonce » affiché alors qu'une garde est terminée (statut completed ignoré), corrigé
- [ ] Fiche propriétaire Cécile : aucun animal déclaré alors que l'annonce Rouans en compte 4. Donnée de saisie, ne pas recopier les animaux de l'annonce sur la fiche (info privée), inviter la propriétaire à compléter
- [x] Fiche gardien hors France : « Montréal, Canada » dans l'en-tête et la description
- [ ] Bloc PracticalGrid présent dans le code de la fiche gardien mais jamais affiché : décider affichage ou suppression
- [ ] Libellé de région à valider : « Rhône, Alpes et Massif central »
- [x] Audit connecté (session Jérémie, exécuté par Codex le 10/10/2026) :
  - [x] /profile propriétaire OK
  - [x] Édition mobilité (rôle gardien, Mobilité et Rayon) : formulaire ouvert, options local / région / France entière / monde / continents / ajouter un pays (Canada) présentes, aucun choix précoché. Aucun champ modifié, aucune sauvegarde envoyée, rôle rétabli Propriétaire. Audit visuel seulement : le roundtrip réel reste couvert par les tests (lot2-travel-zones), pas par une écriture en production.
  - [x] Recette recherche connectée : Canada (2) = 2 cartes (Venaya, Godelive) ; bascule de pays affiche « Chargement » sans anciens résultats Lyon ; mode « Peuvent venir ici » Canada = 2 ; fiche Venaya (35 %) ouvre avec « Montréal, Canada », mobilité « Non renseignée », photo inexistante désactivée ; fiche Godelive : photo et dépliage savoir-faire OK ; fiche propriétaire Cécile et avis admin (liste, détail, lien) validés précédemment.
  - [x] Confidentialité lue par Codex : politiques SELECT de profiles restreintes (titulaire et admin), vues publiques à projections contrôlées. Limite : pas de vérification en tant que membre non admin, la couverture exacte des politiques pour un membre ordinaire reste à confirmer.
- [ ] Anomalie fiche Venaya (35 %) : FreshStartStory affiche « Venaya a rempli son profil » alors que le profil est incomplet. Remplacer par une formulation neutre, ne jamais dire « complété » sous le seuil.
- [ ] Mémoire affinité : mentionne encore le seuil 60 %, le site applique 40 %
- [ ] Connexion GitHub perdue côté Lovable : les modifications restent dans Lovable

## Audit recherche d'annonces /annonces et /annonces/international (10/10/2026, sans correctif de comportement)

Navigateur local non connecté, ordinateur seulement (1280 px). Aucun audit mobile ni connecté à ce tour.

- [ ] Bug, drawer « Voir N résultats » : AdvancedFiltersSheet reçoit results.length (SearchSitter.tsx, prop currentResultsCount), qui inclut les annonces passées et attribuées ; le titre de liste compte seulement les disponibles (availableSitsCount). Mesuré : 15 publiées + 17 fermées (public_closed_sits : 14 archived, 3 completed) = 32
- [ ] Bug, compteur France : densityCounts.france = franceExactCount = annonces publiées (expirées et hors France incluses) + 17 fermées (SearchSitter.tsx, searchSits). Alimente « 32 annonces hors de votre zone », « Toute la France (32) », SitterDiscoveryBanner et l'élargissement auto, alors que la densité rayon/département/région ne compte que les ouvertes françaises
- [ ] Bug, libellé : « N annonces disponibles près de vous » choisi dès qu'une ville est saisie (countLabel), même en zone « Toute la France » ; en mode France la grille inclut le Québec (choix voulu dans filterByLocation, commentaire « restent visibles en mode Toute la France »), d'où « près de vous » avec une annonce au Canada
- [ ] Incohérence compteur hors France : PublicListings et SearchSitter comptent les publiées hors FR sans accepting_applications ni date de fin ; InternationalShowcase exige accepting_applications et se masque sous 3 ; InternationalListings ne filtre ni date ni acceptation (limite 60). Mesuré : 3 (CA, 2 PF)
- [ ] Choix produit à arbitrer : titre SEO fixe « en France » (public_listings.meta_title) quelle que soit la ville ; aucun filtre pays dans le drawer, l'étranger passe par le lien séparé /annonces/international
- [ ] Localisation : la zone se calcule sur la ville et le code postal du PROPRIÉTAIRE (s.owner.city), pas sur sits.city ; une annonce Marlhes d'un propriétaire Saint-Étienne est placée à Saint-Étienne. Observé aussi « PARIS, RHÔNE < 1 km » près de Lyon dans les annonces passées : à investiguer
- [ ] Constat Codex « 2 annonces département » et « grille 15 avec Québec » non reproduit à l'identique en local (local : 0 près de Lyon, bandeau 32 hors zone) ; la grille 15 correspond au mode France, cause probable : bascule ou élargissement vers France
- [ ] Performance : InternationalListings géocode chaque annonce au chargement (jusqu'à 60 appels) ; SearchSitter rapatrie jusqu'à 500 ouvertes + 500 fermées puis filtre côté client
- [x] Données privées : projection explicite des sits, propriétaires lus via public_profiles, annonces fermées via la vue réduite public_closed_sits (sans dates ni texte libre)
- [x] Code mort retiré dans SearchSitter.tsx : 30 imports jamais utilisés (ReportButton, EnvironmentPills, Tooltip, Toast, Input, Slider, Switch, Tabs, Popover, Checkbox, Sheet, icônes, alertRadius, getRegionName, getDeptsInRegion), constante animalChips, appel useToast. Conservés : ILLUSTRATIONS (gouaches), setMissionTypeFilter, userCompletedSits (alimentés par des hooks), useInternationalSitsCount (utilisé par la landing)

## Chantier profils, cartes et recherche (plan du 10/10/2026, aucun lot lancé)

- [ ] Suivi : [plan du chantier](docs/plan-chantier-profils-recherche-2026-10-10.md) (registre des constats, lots L1 à L7 en séquence stricte, recettes après build, points non vérifiés)

## Lot L1 moteur d'annonces (10/10/2026)
- [ ] A1 à A9 : première version e92029d revue avec 5 bloquants (rayon, NULL candidatures, code postal propriétaire, lectures > 1 000, autorisation mal transcrite), corrigés le 10/10, statut partiellement validé. Détail : [plan, section 6](docs/plan-chantier-profils-recherche-2026-10-10.md)
- [x] Migration 0065 additive déjà appliquée (L1 n'est pas frontend seul)
- [x] Autorisation : L1 à L7 autorisés en séquence conditionnelle, GO requis seulement pour la production
- [x] Microcorrectif L1 (10/10) : point géocodé écarté si son département diffère du profil (Montreuil 93/62), ville propriétaire gardée si pays NULL. Voir plan. L1 toujours partiel.
- [ ] A10 non reproduit, cause non tranchée
- [ ] Recette connectée, vue carte, régression Canada et avis admin en navigateur
- [x] A1 requalifié choix produit (10/10, Jérémie) : lieu = ville du propriétaire, repli annonce. « Paris »/69 affichée Lyon, Marlhes cherchée à Saint-Étienne. Ancienne règle « lieu à confirmer » retirée
- [ ] Compteurs hors France serveur encore sur sits.country (0 divergence mesurée), à aligner en L2
- [ ] Géocodage indisponible pour 6 villes (lieux à préciser sur la carte), Montreuil ambigu
- [ ] RLS non administrateur non vérifiable ici (SET ROLE refusé en bac à sable)
- [ ] Panneau Filtres à vérifier connecté (désactivé en visiteur)

### Preuve recette root L1, build 064a30a472477a47c79a742588a762a39c8bf422 (10/10/2026)
- [x] Preview distante, session admin réelle : Lyon 15 km = 0, drawer « Voir 0 résultat » ; élargissement explicite département = 2, drawer « Voir 2 résultats »
- [x] Saint-Étienne 15 km = 1 ; carte « Garde 16 animaux à Marlhes » affiche « SAINT-ÉTIENNE, LOIRE · < 1 KM » (ville propriétaire prioritaire)
- [ ] Recette membre non admin : bloquée (SET ROLE refusé, aucun compte membre de test) ; L1 partiellement validé, L2 non démarré
- Versions distinctes : anonyme 4 largeurs sur c5331c, anonyme 1280 sur 064, root admin sur 064

## L1 gate de clôture (10/10/2026, code 064a30a47)
- [x] Visiteur 1280 : Lyon 0 ouverte + 1 non située du département, France 13, panne geocode visible (A9), aucun élargissement automatique.
- [x] Preuve statique RLS membre (catalogue en lecture seule) : même population ouverte que visiteur et admin. Ce n'est PAS une recette RLS réelle.
- [ ] Recette membre non admin réelle : bloquée (aucun compte de test déclaré, SET ROLE refusé, pas d'usurpation). Décision Jérémie : accepter la preuve statique ou fournir un compte de test.
- [ ] Noté : annonces en pause d'autrui (7) visibles en grisé pour l'admin seulement ; homonymes (Saint-Denis) sans choix, renvoyé en L2 ; panne vérification département sans message dédié.
- [ ] L2 non démarré, critères précisés dans le plan.

## L1 clos par dérogation, L2 livré (10/10/2026)
- [x] L1 clos par décision Jérémie 14:28 ; recette membre non admin NON passée, retirée de la gate.
- [x] L2 livré non publié (détail et preuves dans le plan) : page internationale pays, ville, rayon, dates, animaux, liste/carte, adresse partageable, carrousel dès 1.
- [ ] L2 à valider : suggestion de ville cliquée, dates/animaux en navigateur, carte gardiens CA, session connectée.
- [ ] L3 non lancé, attend validation L2.
- [x] L2 compléments revue root 44aa7a1 : choix du pays sur /annonces, robustesse moteur et suggestions, bulles carte, animaux visiteur via public_pets, sitemap remis. Détail dans le plan.
- [ ] Validation root de L2 attendue ; L3 non lancé. Donnée : annonce Punaauia sans animal déclaré.
- [x] L2 recherche gardiens : pays explicite sans ville du profil, pas de tri par distance sans ville, titres contextuels. Recette connectée à faire par root.
- [x] L2 critère 2 : « Peuvent venir ici » ne lit que les zones déclarées (NULL jamais inclus). Recette root finale avant L3.
- [x] L2 revue 0c0fff3 : homonymes par département, suggestions fermées à chaque changement d'adresse, aucun 0 affiché en cas de panne. Ouvert : état vide France en panne (L1).

- [x] L2, état vide mobilité (10/10/2026) : preuve root build 443e09e, Canada résidence 2 / mobilité 0 ; libellé corrigé « Aucun gardien n'a encore déclaré cette destination », suggestion chiffrée de résidents retirée en mode mobilité ; types/build verts, contrôle visiteur confirmé.

## Checkpoint 10/10/2026
- L2 VALIDÉ par root (preuves exactes dans le plan, section « Clôture L2 »).
- L3 livré sans publication, en attente de relecture root : entraide déclarée, confiance (sources corrigées), dernière visite, réactivité 90 j sans taux, chronologie, E7 constaté (double rôle = max des scores, non modifié). L4 non lancé.
- L7 : corriger le faux état vide du moteur France SearchSitter après échec de requête.
- L3 VALIDÉ root 3c25bb75. L4 livré sans publication, en attente de relecture root (détail dans le plan). L6/L7 : ajouter fixture visuelle réactivité publique et confiance 5/5 vs complétion 100.

- L5 livré (non publié), en attente de revue root ; à faire en L7 : galerie en session, recouvrement Alma, tuiles propriétaire « Membre depuis Ce mois ».

## Reprise L5 : composition précédente rejetée
- [x] Hero immersif plein fond, identité/contact superposés et protection crème locale, index personnalisés conservés. Checkpoint applicatif `c5ea02ed82fd18c4d57293ab84c31d079054b17f` ; diff et preuves dans le plan.
- [x] 49 tests ciblés verts ; harness build OK 10/10/2026 14:45:39 UTC ; 24 captures aux six largeurs réellement inspectées, planches `/tmp/browser/l5-immersive/final-{390,768,1024,1280,1440,1920}.jpg` ; aucun débordement, hero desktop 320 px, CTA 44 ou 64 px.
- [x] ID survol/focus/clic et picker ouverture seulement en fixture isolée avec écritures réseau bloquées ; aucun profil/contact/favori réel modifié.
- [ ] Limites explicites : recette après build sur Vite, artefact statique absent, preuve typecheck séparée indisponible ; têtes d'animaux partiellement protégées sur mobile, validation visuelle Jérémie attendue ; galerie/session réelle et grille picker complète non revérifiées.
- [ ] L5 reste à valider par Jérémie ; L6 non commencé ; aucune publication.

- L6 livré non publié (voir plan, section L6) ; recette visuelle et sauvegarde réelle à faire sur compte de test. L7 en attente de retour.
- L7 réduit livré non publié (voir plan, section L7) ; limites : panne recherche sans test auto, captures édition non faites.
