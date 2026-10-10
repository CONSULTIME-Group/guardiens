# Décisions techniques

- Vue d ensemble admin (lot A13) : une lecture React Query par bloc, recharts différé, analyse IA générée au clic ; pourquoi : moins de 16 lectures et une panne n éteint pas les autres blocs.

- Tableau de bord propriétaire (lot D1) : les blocs partagés avec le gardien changent par variante (prop `layout`/`variant`, défaut inchangé) ou par composant propriétaire dédié ; pourquoi : le rendu gardien reste intact jusqu'au lot D2.

- Lectures d'autrui (profil propriétaire, écussons) : vues member_owner_profiles, public_owner_profiles, public_badge_attributions, tables réservées au titulaire, à l'admin et aux personnes engagées ; pourquoi : SEC1, aucune donnée de foyer ni lien donneur exposé.
- Profil du membre connecté (lot P1) : toute lecture de profiles, sitter_profiles, owner_profiles, public_profiles pour soi passe par src/lib/myProfile.ts (clé ["my-profile", id], 5 min, `fresh` sur les écrans d'édition) ; pourquoi : 19 lectures de profiles par tableau de bord ramenées à une.

- Tableau de bord léger (lot P1b) : lectures du membre partagées par src/lib/dashboardShared.ts, lectures d'autrui groupées en .in() par src/lib/batchedReads.ts, blocs sous la ligne de flottaison montés par DeferredMount, scoring d'affinité découpé (src/lib/yieldToMain.ts) ; pourquoi : au plus 2 lectures par table et 40 au total, verrouillé par src/__tests__/p1b/dashboard-read-budget.test.tsx.

- Démarrage léger (lots P2, P2b, P5) : seuls a11y, article, footer, nav du dictionnaire dans l'entrée, le reste attendu par lazyWithRetry (dictionaryGate), alerte de build à 300 000 octets ; PublicHeader et PublicFooter dans l'entrée (aucun rendu suspendu au réseau) ; traceurs, bandeau cookies et mesure webVitals réunis dans AfterPaintExtras après le premier affichage ; coquille membre et Dashboard préchargés sans exécution (modulepreload, scripts/vite-plugin-member-preload.mjs) ; pas de manualChunks pour du code applicatif ; pourquoi : entrée sous 300 Ko et 14 préchargements sur /, verrouillés par src/__tests__/p2/startup-build.test.ts, un manualChunks hisse les dépendances partagées dans le chemin critique.

- Tableau de bord fluide (lot P3) : blocs bas par StagedMount, barre basse absente sur ordinateur, prénoms de la cloche lus à l'ouverture ; pourquoi : tâche max 200 ms en ralenti x4, 10 lectures sur /, verrou src/__tests__/p3/.

- Espace propriétaire sans doublons (lot P4) : les identifiants de « Pour vous », « Près de chez vous » et des candidatures sont calculés par src/lib/ownerSitterPool.ts, lus en deux salves par src/lib/ownerSpaceReads.ts (affinité, puis avis et compétences une fois le Top 3 annoncé), mesurés sur le simulateur réaliste src/__tests__/p4/ (filtres appliqués, plafond 1 000 lignes) ; pourquoi : le simulateur P1b ignore les filtres et ne voit pas les doublons de production.

- Push : version de public/push-sw.js confirmée par la page avant activation, test ou annonces proches ; un budget unique dans dispatch-web-push ; dédup push_nearby_jobs sans purge ; adresse perdue en 404/410 renouvelée sans geste (action renew, push_renew_subscription), carte de réactivation seulement sans autorisation ; pourquoi : un ancien worker afficherait un faux message et un abonnement ne s'arrête que par le membre.

- Fond du hero avant React (lot P5) : #boot-hero statique dans index.html (photo et voile seuls, sous le header de 77 px), retiré par script inline hors "/" ou si session, par Landing au montage, garde-fou 15 s ; pourquoi : LCP peint au parse sans toucher à l entrée JS.

- Photos du logement (lot L2) : owner_gallery est la source unique ; properties.photos et properties.cover_photo_url n'acceptent que des URL de la galerie du propriétaire (trg_guard_property_photos_in_gallery), une suppression en galerie retire la photo du logement et remplace les couvertures par la suivante (trg_sync_owner_gallery_delete), fichier supprimé seulement si owner_photo_still_referenced est faux ; pourquoi : une photo envoyée hors Galerie devenait introuvable et impossible à supprimer.

- Rôle d'une inscription Google (lot 0) : rôle choisi gardé en localStorage horodaté et dans ?signup_role=, appliqué par apply_signup_role (profil de moins de 30 min, sans rôle en métadonnées) avant la lecture du profil dans AuthContext ; pourquoi : Google ne transmet pas les métadonnées et un compte existant ne doit jamais changer de rôle.
- Écran d'affinité obligatoire (lot 0) : pré-rempli depuis la base, écritures construites par src/lib/affinityOnboardingWrites.ts (colonnes affichées et renseignées seulement), toute erreur bloque complétion et navigation ; pourquoi : un tableau vide écrasait des réponses existantes.
- Arrivée v2 (lots 1-2) : drapeau arrival_v2, /bienvenue et /arrivee/* via ArrivalRoutes.tsx, écrans lot 2 ré-exportés par ArriveeVous, intention dans profiles.arrival_intent, logique dans src/lib/arrival.ts, aucun import dynamique d'un module de l'entrée ; pourquoi : entrée < 307 200 octets.

<!-- LOVABLE:BEGIN -->
- Publication compiles assets only; exhaustive validation stays in `validate:ci` and GitHub CI with unchanged guard semantics; why: avoid full-suite replays during hosting builds.
<!-- LOVABLE:END -->
