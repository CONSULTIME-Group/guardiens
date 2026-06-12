# Plan acquisition « pub automatique » (zéro budget média)

Objectif : maximiser l'acquisition gratuite et automatisée. 4 chantiers séquencés, livrables concrets, mesurables.

## Chantier 1 — SEO programmatique massif (priorité #1)

Étendre les silos existants pour multiplier les portes d'entrée Google.

1. **Pages villes** : passer de ~3 hubs à **150 villes France** (top 150 démographique). Génération via `generate-city-page` déjà en place, batch admin déclenchable. Slug, H1, intro, meta, JSON-LD LocalBusiness.
2. **Pages départements** : 96 départements (table `seo_department_pages` existe). Auto-générées avec liens vers villes du département.
3. **Pages races** : enrichir `breed_profiles` (déjà 14 colonnes). Cible 40 races chien + 20 races chat avec contenu long (1500 mots) + JSON-LD Article.
4. **Articles longue traîne** : 20 articles « comment trouver un gardien à [ville] », « partir en vacances avec [race] », générés via `generate-article`.

Maillage interne : chaque page ville link vers département + 3 villes voisines + 3 races populaires. Chaque article link vers ville + race citée.

## Chantier 2 — Soumission automatique Google (IndexNow + GSC)

1. **IndexNow** : table `indexnow_submissions` déjà présente. Edge function `auto-submit-indexnow` déclenchée à chaque INSERT/UPDATE sur `sits`, `seo_city_pages`, `articles`, `small_missions`. Soumission Bing+Yandex instantanée.
2. **Google Search Console** : connecteur GSC déjà disponible. Edge function quotidienne `gsc-submit-sitemap` qui ping le sitemap + remonte les KPIs (impressions/clics) dans une table `gsc_metrics` pour dashboard admin.
3. **Sitemap dynamique** : ajouter les nouvelles villes/départements/races automatiquement dans `scripts/generate-sitemap.mjs`.

## Chantier 3 — Partage social optimisé (chaque lien = pub)

1. **OG images dynamiques par page** : edge function `og-image` qui génère une image PNG (titre + ville + photo animal) à la volée pour chaque sit, profil gardien, page ville, article. Cache 30 jours.
2. **Bouton « Partager » 1-clic** sur fiches sit + profils gardien : WhatsApp, SMS, Messenger, Email avec texte pré-rempli + lien parrainage si user connecté.
3. **JSON-LD enrichi** : Review aggregateRating sur profils gardiens (déjà partiel), Product sur sits, FAQPage sur articles (boost rich snippets Google).

## Chantier 4 — Réactivation cycle de vie (emails déjà branchés)

1. **Relance propriétaires sans annonce** : J+3 après inscription si 0 sit publié, J+10 si toujours 0.
2. **Relance gardiens sans candidature** : J+7 après inscription si 0 application, suggestions 3 sits proches.
3. **Réveil inactifs 30j** : digest hebdo « 5 nouvelles annonces près de chez vous ».
4. **Boost parrainage** : email mensuel aux users actifs « partagez et gagnez 1 mois offert » + bouton WhatsApp.

## Séquencement recommandé

```text
Semaine 1  →  Chantier 1 (SEO programmatique villes + départements)
Semaine 2  →  Chantier 2 (IndexNow + GSC auto)
Semaine 3  →  Chantier 1 (races + articles longue traîne)
Semaine 4  →  Chantier 3 (OG dynamique + partage 1-clic)
Semaine 5  →  Chantier 4 (emails cycle de vie)
```

## Détails techniques

- **Stack** : edge functions Deno + Lovable AI Gateway (`google/gemini-2.5-flash`) pour génération contenu. Coût IA : ~0,001 €/page.
- **Throttling** : génération par batch de 10, queue dans `email_deferred_queue` étendue ou nouvelle table `seo_generation_queue`.
- **Vocabulaire** : respect strict mémoires projet (pas de « voisin », pas d'« AURA », pas de tiret cadratin, vouvoiement). Guardrails déjà dans `_shared/ai-gateway.ts`.
- **Tests** : `jsonld-validation.test.ts` + `no-em-dash-guard.test.ts` existants protègent contre les régressions.
- **Mesure** : dashboard admin `/admin/seo` avec impressions GSC, pages indexées, taux clic, top requêtes.

## Hors scope (volontairement)

- Pas de Google/Meta/TikTok Ads (engage votre CB, hors mandat).
- Pas de posting auto réseaux sociaux (pas de connecteur actif, risque ban).
- Pas d'envoi cold email à listes externes (RGPD).

## Décision attendue

Je commence par **Chantier 1 étape 1 (150 villes France)** ? Ou vous voulez ajuster le périmètre / l'ordre avant ?
