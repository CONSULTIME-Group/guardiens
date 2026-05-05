# Audit lecture seule — /gardien-urgence

Date : 2026-05-05  
Méthode : S6 (cf. /petites-missions, 4 mai 2026)  
Contexte GSC : pos 6 / 33 imp sur « gardien d'urgence animaux ».  
Cible : pos 1-3 + capter angle mort GEO Q3 (chien réactif/agressif/urgence).

---

## 1. Architecture technique

| Élément | Valeur |
|---|---|
| Composant principal | `src/pages/EmergencySitter.tsx` (300 lignes) |
| Route | `src/App.tsx:252` → `<Route path="/gardien-urgence" element={<EmergencySitter />} />` (lazy `App.tsx:126`) |
| Components secondaires | `PageMeta` (L96), `PublicHeader` (L104), `PageBreadcrumb` (L105), `PublicFooter` (L295), `Helmet` inline JSON-LD (L101-103), `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` (shadcn), `Button`, `Link` (react-router) |
| `siteRoutes.ts` | **Oui**, `src/data/siteRoutes.ts:161-167` — `path:"/gardien-urgence"`, `title:"Gardien d'urgence — Garde en moins de 24h | Guardiens"`, `metaDescription:"Besoin d'un gardien en urgence pour vos animaux ? Activez l'alerte Guardiens et trouvez un gardien vérifié près de chez vous en moins de 24 heures."`, `h1:"Gardien d'urgence"`, `sitemapPriority:"0.7"`, `changeFreq:"weekly"`, **`index` non défini → indexable par défaut** |
| `public/sitemap.xml` | **Oui** — `<loc>https://guardiens.fr/gardien-urgence</loc>` présent (1 occurrence pour la page hub + 1 article lié) |
| Helmet `noindex` | **Non** (PageMeta `EmergencySitter.tsx:96-100` n'envoie pas `noindex`) → page **indexable** |

⚠️ **Incohérence titre** : `siteRoutes.ts` annonce `"Gardien d'urgence — Garde en moins de 24h | Guardiens"`, le composant rend `"Gardien d'urgence — Intervention rapide | Guardiens"` (`EmergencySitter.tsx:97`).  
⚠️ **Incohérence description** : description `siteRoutes.ts` ≠ description `PageMeta` (L98).

---

## 2. Contenu éditorial existant

| # | Section | H2 / Titre | Kicker / sous-titre | Mots ≈ | Type |
|---|---|---|---|---|---|
| 1 | Hero (L107-124) | H1 « Les gardiens d'urgence » | Paragraphe + 1 ligne complémentaire | ~75 | Pitch / promesse |
| 2 | Comment ça marche (L126-140) | H2 « Comment ça marche ? » | 3 étapes (Zap/Bell/Home) | ~80 | Process descriptif |
| 3 | Tranquillité proprio (L142-167) | H2 « La tranquillité d'avoir quelqu'un de confiance à côté » | « Pour les propriétaires » | ~70 | 3 cards bénéfices |
| 4 | Devenez gardien d'urgence (L169-213) | H2 « Devenez gardien d'urgence » | + intro 1 ligne | ~70 | Conditions + Avantages (2 listes) |
| 5 | Engagement (L215-231) | H3 « Un engagement, pas juste un badge » | — | ~70 | Encadré règle |
| 6 | FAQ (L233-250) | H2 « Questions fréquentes » | 6 Q/R | ~250 | Accordion FAQ |
| 7 | Villes (L252-280) | H2 « Gardiens d'urgence par ville » | + 4 villes Lyon/Annecy/Grenoble/Chambéry | ~40 | Maillage géo |
| 8 | Footer CTA (L282-293) | — | 3 boutons | ~10 | CTA |

**Total approximatif : ~665 mots de corps éditorial** (FAQ comprise).

---

## 3. Schemas JSON-LD existants

| Schema | Localisation | Contenu | Conformité |
|---|---|---|---|
| `FAQPage` | `Helmet` (L77-85, injecté L101-103) | 6 questions (`faqs[]` L50-75) → `mainEntity` `Question`/`Answer` | À valider via `scripts/validate-jsonld.mjs` (vocabulaire « gens du coin »/« voisin » à vérifier — cf. §7) |

**Manquants notables** :
- ❌ Pas de `Service` (alors que c'est un service distinctif).
- ❌ Pas de `BreadcrumbList` JSON-LD (le composant `PageBreadcrumb` peut l'injecter — à vérifier).
- ❌ Pas de `WebPage`/`Organization` au niveau page.

---

## 4. Maillage interne sortant

| URL cible | Ancre | Position | Indexable |
|---|---|---|---|
| `/search?emergency=true` (L159) | « Trouver un gardien d'urgence près de chez moi » | Section proprio (CTA) | **Non** (`/search` `index:false` `siteRoutes.ts:144`) ⚠️ |
| `/dashboard` (L206) | « Voir si je suis éligible » | Section gardien | Non (privé) |
| `/house-sitting/lyon` (L260) | « Lyon » | Villes | Oui (silo géo) |
| `/house-sitting/annecy` (L261) | « Annecy » | Villes | Oui |
| `/house-sitting/grenoble` (L262) | « Grenoble » | Villes | Oui |
| `/house-sitting/chambery` (L263) | « Chambéry » | Villes | Oui (à vérifier dans sitemap) |
| `/tarifs` (L274) | « Voir les tarifs » | Villes | Oui |
| `/search?emergency=true` (L285) | « Trouver un gardien d'urgence » | Footer CTA | **Non** ⚠️ |
| `/dashboard` (L288) | « Voir mon éligibilité » | Footer CTA | Non (privé) |
| `/faq` (L291) | « FAQ complète » | Footer CTA | Oui |

⚠️ **Liens vers `/search` (privé/non indexable)** = jus SEO perdu, et 2 CTA principaux pointent vers route Disallow.  
⚠️ **Aucun lien sortant vers** : `/petites-missions`, `/guides`, `/actualites/devenir-gardien-urgence-guardiens` (article sœur dans le sitemap), `/a-propos`, `/contact`, articles de blog connexes.

---

## 5. Images & média

**Aucune image** dans le composant. Hero = gradient CSS (`bg-gradient-to-br from-accent via-background to-primary/5`) + icônes Lucide.  
- Pas de `<img>`, pas de `<picture>`, pas de `preload`.
- OG image = `DEFAULT_OG_IMAGE` (héritée de `PageMeta`).

⚠️ Manque illustration sur-mesure (gouache / dessin), conforme aux directives de marque.

---

## 6. CTAs actuels

| Label | URL | Position | Type |
|---|---|---|---|
| « Trouver un gardien d'urgence près de chez moi » | `/search?emergency=true` | Section proprio (L159-164) | Primary `size="lg"` |
| « Voir si je suis éligible » | `/dashboard` | Section gardien (L206-211) | Outline `size="lg"` |
| « Lyon » / « Annecy » / « Grenoble » / « Chambéry » | `/house-sitting/{city}` | Villes (L259-272) | Link/chip |
| « Voir les tarifs » | `/tarifs` | Villes (L273-278) | Link/chip |
| « Trouver un gardien d'urgence » | `/search?emergency=true` | Footer CTA (L285) | Primary `size="sm"` |
| « Voir mon éligibilité » | `/dashboard` | Footer CTA (L288) | Outline `size="sm"` |
| « FAQ complète » | `/faq` | Footer CTA (L291) | Link primary |

---

## 7. Conformité doctrine éditoriale

### Mots proscrits
| Terme | Résultat |
|---|---|
| « voisin » / « voisinage » | ✅ Aucune occurrence |
| « à vie » | ✅ Aucune occurrence |
| « pour toujours » | ✅ Aucune occurrence |
| « gratuit* » parasite | ✅ Aucune occurrence |
| « gratuitement » | ✅ Aucune |
| « jamais » (engagement) | ✅ Aucune |
| « Auvergne-Rhône-Alpes » / « AURA » | ✅ Aucune |

### Vouvoiement
| Test | Résultat |
|---|---|
| « tu » / impératifs tutoyés | ✅ Aucune occurrence |
| Vouvoiement (« vous », « votre ») | ✅ Présent (L116, L223, L227, L173, L209…) |
| « Filtrez » / « Remplissez » (L57, L60) | ✅ Vouvoiement impératif correct |

### Voix « On » vs « nous »
- L256 : « **nos** gardiens sont les plus actifs » → **« nous » implicite** ⚠️ doctrine = « on ».  
  Reste du corps neutre/vouvoiement, pas d'autre « nous ».

### Mention « gens du coin »
❌ **Absente** — alors que c'est l'expression officielle remplaçant « voisin ».  
Page parle de « près de chez vous » (L32, L162, etc.) et de « proximité » (L121) mais jamais « gens du coin ».

### Mention concurrents
✅ Aucune (Animaute, Holidog, EMT, Nomador absents).

### Récap écarts
| Ligne | Problème |
|---|---|
| L256 | « nos gardiens » → préférer formulation neutre / « les gardiens » / « on » |
| Globale | Absence de « gens du coin » → manque l'ancrage lexical de marque |
| L97 vs `siteRoutes.ts:163` | Title divergent |
| L98 vs `siteRoutes.ts:164` | Description divergente |

---

## 8. Angles morts détectés

| # | Angle | État |
|---|---|---|
| A | Cas concrets d'urgence (hospitalisation, deuil, déplacement pro imprévu, animal malade) | **Présent mais sous-traité** — Hero L117 cite « imprévu, annulation, départ précipité » + L15 « annulation, imprévu familial, départ professionnel », sans aucun récit ni cas typé |
| B | Chien réactif / agressif / urgence (angle mort GEO Q3) | **Manquant** — aucune mention de profil animal complexe, comportement, gardiens spécialisés |
| C | Conditions précises pour devenir gardien d'urgence | **Présent** — liste claire L35-41 |
| D | Délai d'intervention typique | **Présent mais flou** — « quelques heures » (L24, L121) ; titre `siteRoutes.ts` annonce « moins de 24h » mais le mot ne figure pas dans le corps de page |
| E | Différence concrète vs garde classique | **Manquant** — page ne contraste jamais avec une garde planifiée (délai, exigences, durée typique, prix) |
| F | Témoignages / récits anonymes | **Manquant** — zéro témoignage, zéro citation |
| G | FAQ pratique | **Présent** — 6 Q/R, mais centrées sur le statut gardien, pas sur le besoin propriétaire (« combien ça coûte en urgence ? », « et si je suis hospitalisé(e) ? », « mon chien est réactif, est-ce possible ? », « combien de temps pour être contacté(e) ? ») |
| H | Couverture géographique (national vs local) | **Présent mais sous-traité** — L256 « partout en France » + 4 villes seulement, pas de carte ni de promesse claire France entière |

**Autres angles morts secondaires** :
- ❌ Pas d'explication du **mécanisme d'alerte** (push, email, SMS, rayon 35 km — chiffre cité L20 mais pas expliqué côté propriétaire).
- ❌ Pas de **rassurance assurance / responsabilité** en contexte d'urgence.
- ❌ Pas de **lien vers article pilier** `/actualites/devenir-gardien-urgence-guardiens` pourtant indexé.
- ❌ Pas de **section « que faire en attendant »** (premier réflexe propriétaire).

---

## 9. Recommandations préliminaires

### Top 3 priorités d'enrichissement
1. **Section « Cas concrets d'urgence » (angle A + B)** — 4 à 6 mini-récits typés (hospitalisation, deuil, déplacement pro, animal malade, **chien réactif**, déménagement précipité). Déverrouille l'angle mort GEO Q3 + capte requêtes longue traîne. **Effort : moyen.**
2. **Refonte FAQ orientée propriétaire (angle G + D)** — passer de 6 à 10-12 questions, ajouter « combien de temps pour être contacté ? », « mon chien est réactif, est-ce possible ? », « et la nuit / le week-end ? », « différence avec une garde classique ? ». **Effort : court.**
3. **Section différentiation vs garde classique (angle E)** — tableau comparatif (délai, durée, exigences gardien, type de demande). Renforce la promesse « moins de 24h » (déjà dans le title). **Effort : court.**

### Top 2 risques techniques
1. **CTA principaux (`/search?emergency=true`) pointent vers une route `index:false`** — `siteRoutes.ts:144`. Les deux CTA primaires (L159, L285) envoient le jus SEO dans un cul-de-sac. **Effort : court** (rediriger vers une route publique ou ajouter un état emergency à une page indexable).
2. **JSON-LD limité à `FAQPage` + incohérence title/description entre `siteRoutes.ts` et le composant** — manque `Service`, `BreadcrumbList`, et title/desc divergents nuisent au CTR. **Effort : court.**

### Risque doctrine secondaire
- L256 « nos gardiens » → corriger en passant à « on » / formulation neutre. **Effort : très court.**
- Absence totale de l'ancrage « gens du coin ». **Effort : court** (1-2 reformulations Hero/Section proprio).

---

**Fin de l'audit.** Aucune modification de code effectuée. En attente de validation cas par cas avant enrichissement.
