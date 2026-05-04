# SÉQUENCE 6 — Audit /petites-missions

> Lecture seule. Aucune modification du code.
> Date : 2026-05-04

---

## 1. Routing

| Élément | Valeur |
|---|---|
| Route publique | `/petites-missions` |
| Composant rendu (visiteur non-connecté, cible SEO) | `src/pages/SmallMissionsPublic.tsx` |
| Composant rendu (connecté) | `src/pages/SmallMissions.tsx` (liste interne, hors scope SEO) |
| Wrapper de switch | `SmallMissionsRoute` dans `src/App.tsx` (lignes 176-191) |
| Sous-routes | `/petites-missions/creer` (protégée), `/petites-missions/:id` |

Le SEO se joue **uniquement** sur `SmallMissionsPublic.tsx` (491 lignes).

---

## 2. PageMeta / SEO `<head>`

```tsx
<PageMeta
  title="Petites missions d'entraide locale — Guardiens"
  description="Échangez des coups de main entre gens du coin. Jardinage, animaux, bricolage — sans argent. Gratuite pour tous."
/>
```

| Champ | État |
|---|---|
| `title` | ✅ 56 caractères, contient mot-clé principal |
| `description` | ✅ 138 caractères, claire |
| `canonical` | (déléguée à `PageMeta` global, à vérifier) |
| `og:image` | (déléguée à `PageMeta` global) |
| Aucun `keywords`, `noindex`, `alternate` custom passé |

---

## 3. Structure JSX — Hiérarchie des titres

| Section | Tag | Texte (extrait) |
|---|---|---|
| 1. Hero | `H1` | « Osez demander. Quelqu'un, près de chez vous, n'attend que ça. » |
| 2. Conviction | (aucun titre, juste 3 paragraphes italiques) | — |
| 2.5. Levée des freins | `H2` | « Vous hésitez ? C'est normal. » |
| 3. Deux modes | `H2` | « Deux façons d'entrer dans l'échange. » |
| 3a. Card Besoin | `H3` | « Vous publiez ce dont vous avez besoin. » |
| 3b. Card Offre | `H3` | « Vous publiez ce que vous proposez. » |
| 4. Exemples | `H2` | « Des échanges qui ont eu lieu. » |
| 4a-4f. 6 cards exemples | `H3` ×6 | « Verger à ramasser », « Coup de main au jardin », « Poules à garder », « Chien à promener », « Petit bricolage », « Énergie & bien-être » |
| 5. Règles | (3 cards, `H3` ×3) | « Jamais d'argent. », « Entre gens du coin. », « En lien avec la maison. » |
| 6. CTA final | `H2` | « Osez. Vraiment. Personne ne vous jugera. » |
| 7. FAQ | `H2` | « Questions fréquentes » |

✅ Un seul `H1`. Hiérarchie globalement saine (pas de saut H1→H3).

---

## 4. Volume de contenu

| Métrique | Valeur |
|---|---|
| Lignes de fichier | 491 |
| Mots de contenu visible (estimation) | **~575** |
| Caractères de contenu visible | ~3 500 |

⚠️ **Volume faible pour une page SEO** ciblant "petites missions / entraide locale" — la concurrence éditoriale tourne autour de 1 200-2 000 mots sur ce type de contenu transactionnel + pédagogique.

---

## 5. FAQ Schema.org

✅ **Présente.** Deux blocs JSON-LD :

- **`FAQPage`** dans `<Helmet>` (lignes 471-485) — 6 questions/réponses dupliquées en HTML (Accordion lignes 432-449).
- **`Service`** injecté via `<script dangerouslySetInnerHTML>` (lignes 456-469) — name, description, areaServed France, provider Guardiens.

⚠️ Manque potentiel : `HowTo` (les 3 étapes "01/02/03" décrites pour les 2 modes seraient un candidat naturel) et `BreadcrumbList` (déjà géré par `<PageBreadcrumb>` séparément).

---

## 6. Maillage interne

| Type | Compte |
|---|---|
| `<Link to="/...">` dans le fichier | **0** |
| `<a href="/...">` interne | **0** |
| Liens vers `/actualites` | 0 |
| Liens vers `/house-sitting` | 0 |
| Liens vers `/tarifs` | 0 |
| Liens vers `/faq` | 0 |
| Liens vers articles de blog | 0 |
| `navigate()` programmatiques (CTAs boutons) | 4 → `/petites-missions/creer` ou `/inscription?redirect=...` |
| Liens implicites via `<PublicHeader>` / `<PublicFooter>` | hors fichier |

🔴 **Aucun maillage interne éditorial sortant.** C'est le levier SEO le plus sous-exploité de la page : aucune ancre vers les hubs villes (Lyon/Annecy/Grenoble), tarifs, FAQ ou articles de blog connexes.

---

## 7. Images

| Type | Compte | Détails |
|---|---|---|
| `<img>` réels | **6** | Illustrations gouache (`spotVerger`, `spotJardin`, `spotPoules`, `spotChien`, `spotBricolage`, `spotBienetre`), importées depuis `src/assets/missions/*.png` |
| Attributs | ✅ | `alt` descriptifs, `loading="lazy"`, `width`/`height` 512×512, classes responsive |
| Hero image | ❌ | Aucune image hero (texte uniquement, fond `bg-background`) |
| LCP candidat | Texte H1 (pas d'image au-dessus de la ligne de flottaison) |

Note : un cache-buster `ILLU_VERSION = "gouache-v2-20260427"` est appliqué — pas optimal pour le cache long, mais volontaire.

---

## 8. Sources de contenu : dur vs BDD

| Bloc | Source |
|---|---|
| Hero, conviction, levée des freins, modes, règles, CTA final, FAQ | **Hardcodé** dans le JSX/arrays JS |
| Exemples (6 cards section 4) | **Hardcodé** (`const examples = [...]` lignes 60-67) |
| KPIs (missions réalisées + membres actifs) | **BDD** : `supabase.from("public_stats").select("*").maybeSingle()` lignes 78-94. Champs : `missions_entraide`, `total_inscrits`. |
| Schema.org Service + FAQPage | **Hardcodé** |
| `<PageMeta>` title/description | **Hardcodé** |

➜ Aucune table CMS éditoriale (type `pages_content` ou équivalent) n'alimente cette page. Tout enrichissement passera par modification directe du fichier JSX.

---

## 9. Composants partagés utilisés

- `PageMeta` (`@/components/PageMeta`)
- `PageBreadcrumb` (`@/components/seo/PageBreadcrumb`) — fil d'Ariane `Accueil > Petites missions`
- `PublicHeader` / `PublicFooter`
- `Accordion` shadcn
- `Reveal` (composant local de scroll-reveal)

---

## 10. Synthèse — État SEO

| Critère | État |
|---|---|
| `H1` unique et qualifié | ✅ |
| Hiérarchie titres saine | ✅ |
| FAQ Schema.org | ✅ |
| Service Schema.org | ✅ |
| `PageMeta` configuré | ✅ |
| Breadcrumb | ✅ |
| Volume éditorial | 🔴 ~575 mots (trop court) |
| Maillage interne sortant | 🔴 0 lien éditorial |
| Mot-clé secondaire ("entraide locale", "coup de main", "voisinage gratuit") en H2 | ⚠️ Partiel |
| Contenu pédagogique long-tail (guide, exemples concrets sourcés, légalité de l'échange non-monétaire) | ❌ Absent |
| Section avis / témoignages | ❌ Absente |
| Couverture France entière mentionnée | ⚠️ Implicite uniquement (areaServed JSON-LD) |

---

## Recommandations — 3 axes prioritaires (à valider)

1. **Maillage interne éditorial** : ajouter une bande "Pour aller plus loin" en bas de page avec 4-6 liens contextuels vers `/house-sitting/lyon|annecy|grenoble`, `/tarifs`, `/faq`, et 2-3 articles de blog `/actualites/*` connexes (entraide, voisinage, économie du don). Impact SEO immédiat sur le PageRank interne.

2. **Densification éditoriale (+600 à +800 mots)** : ajouter 2 sections rédactionnelles longues — (a) "Pourquoi l'entraide locale fonctionne" (cadre social + témoignages), (b) "Cadre légal et fiscal de l'échange non-monétaire" (rassurance YMYL, mot-clé "échange sans argent légal"). Cible : passer à ~1 300 mots.

3. **Enrichissement Schema.org `HowTo`** : convertir les 2 cards "01/02/03" (Besoin/Offre) en deux blocs `HowTo` JSON-LD distincts pour capter les rich snippets "comment publier une demande d'aide". Coût technique faible, gain de visibilité SERP élevé.

---
