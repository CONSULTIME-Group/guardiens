# Audit technique Guardiens, 18/09/2026

Lecture seule. Aucun fichier modifié, aucune migration, aucune donnée touchée.
Sources : code courant, base de production (requêtes SELECT), linter base, scan dépendances, appels HTTP de vérification.

## Synthèse

Trois points critiques : un correctif déjà écrit mais non publié qui casse la page Messages en production, des pages de test publiquement accessibles et indexables, et une faille React Router de gravité haute. Le reste est de la dette maîtrisable, avec plusieurs configurations mortes qui donnent une fausse impression de fonctionnement.

## 1. Bugs et incohérences runtime

**C1. Critique, avéré. Écart entre le code et la production.**
`src/pages/Messages.tsx` et `src/hooks/useAutoOpenConversation.ts` ne sélectionnent plus `pro_status`, mais le bundle servi sur guardiens.fr le fait encore. Preuve : `error_logs`, 12 occurrences entre le 14 et le 17/09, `column public_profiles.pro_status does not exist` (400). Impact : liste de conversations vide pour les personnes touchées. Correction : publier.

**C2. Haute, avéré. Perte silencieuse d'un message envoyé.**
`src/pages/Messages.tsx:542` : l'insert ne lit pas `{ error }`, et `setNewMessage("")` (l. 545) vide le champ même en cas de refus RLS ou de trigger de modération. Correction locale : lire l'erreur, restaurer le texte, afficher un toast (pattern déjà présent l. 495-501).

**C3. Haute, avéré. Canal temps réel recréé en boucle.**
`src/pages/Messages.tsx:354-379` : l'effet dépend de `conversations`, or `loadConversations()` recrée le tableau (l. 306), donc chaque message entrant détruit et recrée l'abonnement. Risque de perte d'événements pendant la resouscription. Correction locale : dépendre de `user?.id` et lire la liste via une ref.

**C4. Moyenne, avéré. Erreurs de lecture avalées.**
`Messages.tsx:147-151`, `382-401`, `457` : `error` jamais lu, une panne réseau ou RLS se présente comme « aucune conversation ». Correction locale : journaliser et signaler.

**C5. Moyenne, risque. Statut fondateur jamais révoqué côté client.**
`src/contexts/AuthContext.tsx:148-161` : `checkFounderExpiry` lit les abonnements puis n'en fait rien. À confirmer qu'un cron s'en charge, sinon le badge reste à vie.

Vérifié sans anomalie : routes de `App.tsx` toutes pourvues d'un composant, gardes `ProtectedRoute` / `PublicOnlyRoute` cohérentes, et aucun select restant sur une colonne absente des vues `public_profiles`, `public_sitter_profiles`, `public_small_missions`.

## 2. Sécurité

**S1. Haute, avéré. Pages de test et de prévisualisation ouvertes en production.**
`src/App.tsx:596-605` et `:489` : `/test/hero-gallery`, `/test/empty-states`, `/test/error-boundary`, `/dev/preview/*`, `/test-accord` sans garde d'environnement. Vérifié en ligne : `/test/hero-gallery`, `/dev/preview/cockpits`, `/test-accord` répondent 200. Seul `/test-accord` est en Disallow dans robots.txt, les autres sont donc crawlables. Correction locale : envelopper ces routes dans `import.meta.env.DEV`.

**S2. Haute, avéré. Page admin hors de la coquille admin.**
`src/App.tsx` : `<Route path="/admin/hero-weights">` est déclarée au même niveau que les routes de test, en dehors du bloc `AdminLayout`. À vérifier que `src/pages/AdminHeroWeights.tsx` porte sa propre vérification de rôle ; sinon la page est accessible à tout visiteur.

**S3. Haute, avéré. Vulnérabilité de dépendance.**
`react-router-dom` 7.18.0, contournement CSRF en mode RSC, corrigé en 7.18.2. Également `dompurify` 3.4.11, deux XSS moyennes, corrigées au-delà de 3.4.12.

**S4. Moyenne, risque. Dérive de configuration des fonctions serveur.**
147 fonctions déployées, 56 seulement déclarées dans `supabase/config.toml`. Les publiques absentes du fichier (`sitemap`, `og-page`, `og-sit`, `stripe-webhook`, `redirect-lookup`, `notify-indexnow`) répondent bien aujourd'hui (200 ou 400, jamais 401), donc leur `verify_jwt` a été réglé hors fichier. Un redéploiement depuis la configuration versionnée les repasserait en JWT obligatoire et casserait le sitemap, les images sociales et le webhook de paiement. Correction locale : compléter `config.toml`.

**S5. Faible, avéré mais surévalué par le scanner. Table de sauvegarde sans RLS.**
`backup_sourcage_20260914`, RLS désactivée. Aucun GRANT sur cette table (`information_schema.role_table_grants` vide), donc elle reste inaccessible via l'API. Correction locale : activer RLS pour éteindre l'alerte, ou supprimer la table après validation.

**S6. Information. 18 vues SECURITY DEFINER et 398 fonctions SECURITY DEFINER exécutables par anon ou authenticated.** C'est le socle de l'architecture (vues publiques, RPC admin protégées par `has_role`), pas un défaut en soi, mais la surface mérite une revue ciblée des RPC les plus sensibles.

Stockage : 6 buckets publics (`avatars`, `badges`, `email-assets`, `mission-photos`, `property-photos`, `sitter-gallery`), les buckets sensibles (`identity-documents`, `pro-documents`, `experience-screenshots`, `pets-photos`, `association-photos`, `breed-images`, `pro-logos`) sont privés. Conforme.

## 3. SEO technique

**Sain et vérifié** : `normalizeCanonical` (`src/lib/seo.ts:35-51`), propagation `noindex` et `canonical_url` depuis la base pour les articles (`ArticleDetail.tsx:366-367`), les villes (`CityPage.tsx:677`) et les départements (`DepartmentPage.tsx:200`), neutralisation des anciennes URL `?lang=`, validateur JSON-LD (1267 fichiers, 300 blocs, 0 erreur), robots.txt généré depuis `src/data/siteRoutes.ts`, sitemap à 655 URLs.

**E1. Moyenne, avéré. `vercel.json` est une configuration morte et trompeuse.**
Le site n'est pas servi par Vercel : `/pros` répond 200 alors que le fichier déclare une 301 vers `/search`, et la cible de sa règle de prérendu (`functions/v1/ssr-prerender`) répond 404 et n'existe dans aucune fonction déployée. Les en-têtes de sécurité qui y figurent (X-Frame-Options, Referrer-Policy, Permissions-Policy) ne sont donc probablement pas appliqués non plus. Le prérendu réel passe par le worker Cloudflare (`cloudflare-worker-prerender.js`, lui-même un simple miroir de documentation). Correction locale : supprimer `vercel.json` ou y écrire qu'il est inactif, et vérifier où sont posés les en-têtes de sécurité.

**E2. Faible, avéré. Fonction `sitemap` orpheline et désynchronisée.**
`supabase/functions/sitemap/index.ts:5-20` liste `/conseils` (route inexistante) et omet `/devenir-home-sitter` et `/associations`. Rien ne l'appelle aujourd'hui. Correction locale : la supprimer ou la faire dériver de `src/data/siteRoutes.ts`.

**E3. Faible, à trancher. Fiches races toujours indexables.**
`breed_profiles` n'a pas de colonne `noindex` (vérifié en base) et `BreedPage.tsx:198-206` n'en passe aucune, contrairement aux villes et départements qui se désindexent sous seuil de contenu. Choix assumé ou oubli.

## 4. GEO, visibilité moteurs IA

`public/llms.txt` est présent, structuré et complet, robots.txt autorise explicitement GPTBot, ClaudeBot, PerplexityBot et Google-Extended.

**G1. Moyenne, avéré. `llms.txt` cite une page qui n'existe pas comme annoncée.**
Ligne 23 : `/pros` présenté comme un annuaire de professionnels vérifiés. En production `/pros` répond 200 sur l'application, mais l'annuaire décrit n'y est plus (la configuration prévoyait une redirection vers `/search`). Une IA qui cite cette URL envoie l'internaute sur autre chose. Correction locale : corriger ou retirer la ligne.

**G2. Faible. Cohérence des entités auteurs** : `src/data/authors.ts` alimente le JSON-LD Person, la page auteur et le pied d'article depuis une source unique, portraits 512x512 en place. Rien à signaler.

## 5. Dette et obsolescence

**D1. Moyenne, avéré. Trois fichiers de verrouillage de dépendances.**
`bun.lock`, `bun.lockb` et `package-lock.json` coexistent, et la CI fait `npm ci` alors que le développement utilise bun. Deux graphes de dépendances possibles. Correction : choisir bun et supprimer les autres, ou aligner la CI.

**D2. Faible. Documentation contredite par le code.**
`audit/AUDIT_SESSION_2026_05_04.md:66` annonce en critique que `canonical_url` n'est pas transmis à `PageMeta` : corrigé depuis (`ArticleDetail.tsx:367`). `TODO-lovable.md:19` traite `FavoriteButton` de composant mort alors qu'il est importé dans 8 fichiers. `README.md` reste le gabarit vide.

**D3. Information.** Les fichiers `.mock.*` ne sont pas du code mort : ils sont câblés par alias dans `vite.config.ts:106-128` en mode `visual-test`.

**D4. Faible, risque.** `mdast-util-gfm-*` et `micromark-extension-gfm-*` épinglés en dépendances directes sans commentaire, séquelle du correctif iOS 15 sur `MarkdownBody`. À documenter.

## 6. CI et tests

**T1. Moyenne, avéré. Playwright n'est jamais exécuté automatiquement.**
19 specs dans `tests/`, 3 seulement ont un script npm, et `.github/workflows/test-guard.yml:26-30` ne lance que `tsc -b` et `test:guard` (Vitest). Les parcours d'inscription, l'accessibilité et les contrastes ne sont couverts par aucune porte.

**T2. Moyenne, avéré. Seule vraie porte : `npm run build`.**
`package.json:12` termine le build par `test:guard`, qui compare aux 18 échecs tolérés de `scripts/test-guard/baseline.json`. Le workflow GitHub, lui, ne bloque pas la publication (dit explicitement dans son en-tête). Un contributeur qui voit le vert GitHub peut se croire couvert.

## 7. Emails et tâches planifiées

67 tâches actives dans `cron.job`. Points d'attention :

**M1. Moyenne, risque. Concurrence non verrouillée.**
Quatre tâches tournent chaque minute ou toutes les 5 minutes (`flush-deferred-emails`, `process-mass-email-queue`, `email-pipeline-watchdog`, `mass-email-watchdog`). La table `worker_locks` existe en base mais n'est référencée par aucune fonction serveur. Si un lot dépasse sa minute, deux exécutions se chevauchent. `process-email-queue` s'en protège par `read_email_batch` (claim en base), les autres restent à vérifier une par une.

**M2. Bon point.** `process-email-queue` gère le 429 Resend, une fenêtre `retry_after_until`, une taille de lot et un `send_delay_ms` configurables, avec file de rebut. Architecture saine.

**M3. Faible.** `relance-cp-manquant` existe en double, une version active hebdomadaire et une version quotidienne désactivée. À nettoyer.

## 8. Contradictions documentation et code

Regroupées ci-dessus : E1 (`vercel.json`), E2 (fonction sitemap), G1 (`llms.txt`), S4 (`config.toml`), D2 (audit de mai, TODO, README).

## Ordre d'attaque proposé

1. Publier (C1), c'est le seul défaut visible par les membres aujourd'hui.
2. Fermer les pages de test et vérifier `/admin/hero-weights` (S1, S2).
3. Monter react-router-dom et dompurify (S3).
4. Corriger l'envoi de message et le canal temps réel (C2, C3).
5. Compléter `config.toml` avant tout redéploiement de fonctions (S4).
6. Nettoyage : `vercel.json`, `llms.txt`, lockfiles, fonction sitemap orpheline.

Dites-moi lesquels vous voulez que je traite, je n'ai rien modifié.
