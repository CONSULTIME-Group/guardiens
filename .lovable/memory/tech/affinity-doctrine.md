# Affinité, règle définitive : « tri, on filtre jamais »

Décision de Jérémie, 20/08/2026. Règle définitive, sans constante d'arbitrage ni bascule, partout (UI et SQL).

## Aucun filtre de pool

Aucun critère de confiance n'exclut un gardien d'un vivier : identité vérifiée, complétude du profil, ancienneté, note, abonnement. Tout ça se TRIE et s'affiche en badge, rien de tout ça ne FILTRE.

- Seules exclusions admises : incompatibilité déclarée en distribution sortante (allergie déclarée, refus d'espèce) et critères de délivrabilité et consentement (compte actif, opt-in, non supprimé, dans le rayon déclaré).
- Seules hygiènes de pool admises : compte actif, hors soi-même, rôle gardien ou polyvalent.
- Seuil 60 % : applique UNIQUEMENT au bouton « candidater ». Le gardien sous le seuil reçoit les mêmes annonces, même ordre, voit la page de l'annonce. CTA invitant à compléter, alimenté par la fonction SQL `sitter_missing_opportunities`.
- La règle vaut aussi pour les compteurs : `count_eligible_sitters`, `admin_liquidity_snapshot`, `count_mission_notification_audience` comptent le vivier réel, sans filtre de confiance, sinon les chiffres mentent sur la distribution.

## Plafonds jamais silencieux

Tout plafond (lecture, scoring, affichage) : trier d'abord, plafonner ensuite, et journaliser (console.info / console.warn / RAISE NOTICE) le nombre de profils écartés. Interdit : `.limit(n)` avant tri, `slice` avant tri.

## Ordre de tri des classements de gardiens

1. Score de tri (`sortScore`) décroissant, jamais le score brut.
2. Identité vérifiée avant non vérifiée, à score de tri égal.
3. Photo de profil présente avant absente.
4. Distance croissante (coord approx, ville en repli, NULL en fin de liste).

## Score de tri : on affiche le brut, on classe sur le pondéré

Formule : `sortScore = round(score × confiance)`.

- `score` : le score brut affiché (0 à 100), normalisé sur le dénominateur dynamique des critères réellement évalués.
- `confiance = maxPoints / maxPossibleWeight(owner)`, bornée à 1. Numérateur : somme des poids des critères réellement évalués (ceux entrés dans le dénominateur dynamique). Dénominateur : somme des poids des critères évaluables pour CE couple d'après les seules déclarations du propriétaire : espèces 2 si au moins une espèce connue, présence 2 uniquement si l'exigence est discriminante (« 100% sur place » est exclu, compatible par construction), véhicule 2 si voiture requise, critères mous 1 chacun s'ils sont renseignés, besoins spéciaux 1 si un signal est détecté.
- Règle d'affichage : on AFFICHE le brut, on CLASSE sur le pondéré, partout (Top 3, recherche, candidatures, digest). Plus aucun tri sur le score brut.
- Un critère satisfait par construction pour tout le monde n'est pas un critère : il sort du dénominateur (cas de la présence « 100% sur place »).

Défaut dormant, noté le 20/08/2026 : le retrait du filtre `identity_verified` et l'arrivée du `sortScore` devaient partir ensemble. Tant que le vivier filtrait sur l'identité vérifiée, un seul profil totalement vide y était éligible et le défaut était invisible. Le retrait du filtre a fait entrer 112 profils vides dans le classement : avec l'ancien `evalPresence` (« 100% sur place » rendait 2/2 à tout le monde), ils seraient tous sortis à 100 % affiché chez les propriétaires à exigence « 100% sur place » et auraient occupé le haut du classement. Ne jamais réintroduire l'un sans l'autre.

## Parité des entrées

Tout site qui alimente le moteur doit fournir les 16 champs d'`AffinitySitterInput` ET les 10 champs d'`AffinityOwnerInput`, par projection SQL complète ou par littéral complet. Un champ omis produit un score différent selon l'écran pour le même couple (cas réels : ApplicationsList jetait six champs gardien le 20/08/2026 ; 11 surfaces sur 16 perdaient au moins un champ propriétaire le 21/08/2026). Verrouillé par `src/lib/__tests__/affinity-input-parity.test.ts` : chaque source est contrôlée et tout nouvel appel direct au moteur (ou à son alias `computeAffinityScore`) non répertorié fait échouer la suite.

Attention aux champs hors table : `accepts_sitter_pets` et `accepts_sitter_children` vivent sur `sits`, `car_required` sur `properties`, `pets` est une jointure. Un `select("*")` sur `owner_profiles` ne les fournit PAS : ils doivent être injectés explicitement. Contexte sans annonce (profil public, onboarding J+1, classement transverse) : `null` explicite avec commentaire, neutre dans le moteur, jamais pénalisant. Le hook `useViewerOwnerForAffinity` est la source unique pour toute surface où un propriétaire consulte un gardien hors annonce : interdiction de reconstruire une entrée propriétaire par une requête propre.

## Moteur unique

Un seul calcul partagé client et Edge : `supabase/functions/_shared/affinity/`. `src/lib/affinityScore.ts` ré-exporte. `calculate_affinity_score_pg` et `get_owner_top_3_sitters` sont dépréciées (COMMENT ON, plus aucun appelant). Test de parité : le score servi à l'affichage est strictement égal à celui de la distribution.

## Mesure avant / après (20/08/2026)

Le filtre identité vérifiée + complétude 60 % excluait 934 gardiens sur 990 (94 %). Pool du Top 3 passé de 56 à environ 990 pour chaque propriétaire mesuré (11 lignes nominatives produites, Jennifer, Catherine, Marion, Isabelle, Géraldine, Tristan, Lisa, Hélène, Nathalie, Christel, Ophélya).

## Garde-fous

`src/__tests__/top3-trust-policy.test.ts` verrouille : aucune constante d'arbitrage, aucun filtre identité / complétude, ordre de tri exact, plafonds tracés, badge « Identité vérifiée » affiché, section jamais vide dès 1 candidat.

`src/lib/__tests__/affinity-input-parity.test.ts` verrouille la parité des entrées (16 champs partout).
