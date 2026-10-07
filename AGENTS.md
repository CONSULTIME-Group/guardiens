# Décisions techniques

- Vue d ensemble admin (lot A13) : chaque bloc a sa propre lecture React Query, pas de squelette global, recharts en import différé, analyse IA lue en table et générée au clic ; pourquoi : moins de 16 lectures au chargement et une panne n éteint pas les autres blocs.

- Tableau de bord propriétaire (lot D1) : les blocs partagés avec le gardien changent par variante (prop `layout`/`variant`, défaut inchangé) ou par composant propriétaire dédié ; pourquoi : le rendu gardien reste intact jusqu'au lot D2.

- Lectures d'autrui (profil propriétaire, écussons) : vues member_owner_profiles, public_owner_profiles, public_badge_attributions, tables réservées au titulaire, à l'admin et aux personnes engagées ; pourquoi : SEC1, aucune donnée de foyer ni lien donneur exposé.
- Profil du membre connecté (lot P1) : toute lecture de profiles, sitter_profiles, owner_profiles, public_profiles pour soi passe par src/lib/myProfile.ts (clé ["my-profile", id], 5 min, `fresh` sur les écrans d'édition) ; pourquoi : 19 lectures de profiles par tableau de bord ramenées à une.

- Tableau de bord léger (lot P1b) : lectures du membre partagées par src/lib/dashboardShared.ts, lectures d'autrui groupées en .in() par src/lib/batchedReads.ts, blocs sous la ligne de flottaison montés par DeferredMount, scoring d'affinité découpé (src/lib/yieldToMain.ts) ; pourquoi : au plus 2 lectures par table et 40 au total, verrouillé par src/__tests__/p1b/dashboard-read-budget.test.tsx.

- Démarrage léger (lots P2, P2b) : dictionnaire fr, PublicHeader et PublicFooter dans l'entrée (aucun rendu suspendu au réseau) ; traceurs, bandeau cookies et mesure webVitals réunis dans AfterPaintExtras après le premier affichage ; coquille membre et Dashboard préchargés sans exécution (modulepreload, scripts/vite-plugin-member-preload.mjs) ; pas de manualChunks pour du code applicatif ; pourquoi : entrée sous 300 Ko et 14 préchargements sur /, verrouillés par src/__tests__/p2/startup-build.test.ts, un manualChunks hisse les dépendances partagées dans le chemin critique.

- Tableau de bord fluide (lot P3) : blocs bas du tableau de bord montés par StagedMount (hauteur réservée), barre basse non montée sur ordinateur, prénoms de la cloche des messages lus à l'ouverture ; pourquoi : plus longue tâche sous 200 ms en ralenti x4 et au plus 10 lectures sur / pour un membre, verrouillé par src/__tests__/p3/.

- Espace propriétaire sans doublons (lot P4) : les identifiants de « Pour vous », « Près de chez vous » et des candidatures sont calculés par src/lib/ownerSitterPool.ts, lus en deux salves par src/lib/ownerSpaceReads.ts (affinité, puis avis et compétences une fois le Top 3 annoncé), mesurés sur le simulateur réaliste src/__tests__/p4/ (filtres appliqués, plafond 1 000 lignes) ; pourquoi : le simulateur P1b ignore les filtres et ne voit pas les doublons de production.

- Articles guides refondus : la liste fermée GUIDE_ARTICLE_SLUGS (ArticleRenderer) active la mise en page de lecture dédiée (résumé avant l'image, ancres sur les titres, liens soulignés, un seul bloc de ressources) ; le texte reste en base, `:::faq Titre` porte l'unique titre FAQ ; pourquoi : refondre un article sans changer le rendu des autres.

- Pages villes et guides locaux refondus : liste fermée REVISED_CITY_SLUGS (src/data/cityContent.ts, FAQ visible et JSON-LD lus dans `faq`) et GUIDE_OVERRIDES (src/data/guideOverrides.ts, textes sourcés et lieux retenus par identifiant, base intacte) ; pourquoi : refondre une page sans toucher les autres villes ni réécrire les lignes partagées en base.

- Pages villes servies par la base et refondues : liste fermée DB_CITY_REVISIONS (src/data/dbCityRevisions.ts, FAQ visible et JSON-LD), corps éditorial en base avec sauvegarde datée avant écriture ; dans les guides refondus, commerces réduits à nom, adresse et source, badge « chiens admis » seulement si une source le dit ; pourquoi : aucune promesse non sourcée, les autres villes gardent le gabarit.

- Push : version de public/push-sw.js confirmée par la page avant activation, test ou annonces proches ; un budget unique dans dispatch-web-push ; dédup push_nearby_jobs sans purge ; pourquoi : un ancien worker afficherait un faux message.

- Fond du hero avant React (lot P5) : #boot-hero statique dans index.html (photo et voile seuls, sous le header de 77 px), retiré par script inline hors "/" ou si session, par Landing au montage, garde-fou 15 s ; pourquoi : LCP peint au parse sans toucher à l entrée JS.

- Photos du logement (lot L2) : owner_gallery est la source unique ; properties.photos et properties.cover_photo_url n'acceptent que des URL de la galerie du propriétaire (trg_guard_property_photos_in_gallery), une suppression en galerie retire la photo du logement et remplace les couvertures par la suivante (trg_sync_owner_gallery_delete), fichier supprimé seulement si owner_photo_still_referenced est faux ; pourquoi : une photo envoyée hors Galerie devenait introuvable et impossible à supprimer.
