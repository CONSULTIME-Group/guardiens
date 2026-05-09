
# Audit complet de la Landing Page + recommandations expertes

## 1. Cartographie actuelle (15 sections après navbar)

```text
NAVBAR + Bandeau gratuité (FreePeriodBanner)
1.  HERO                         (fond image + ticker)
2.  POURQUOI PUBLIER             (3 cartes bénéfices proprio)
3.  LOCAL OU NATIONAL            (illu France + 3 chips km + 2 articles)
4.  BANDEAU SAISONNIER           (CTA proprio intermédiaire)
5.  CE QU'ON FAIT ENSEMBLE       (3 cartes : Proprio / Gardien / Entraide)
6.  COMMENT ÇA MARCHE            (3 étapes + CTA proprio)
7.  VITRINE DÉMO                 (DemoListingShowcase)
8.  OUTILS DE CONFIANCE          (3 cartes : Connaître / Sécuriser / Communiquer + CTA proprio)
9.  OSEZ L'ENTRAIDE              (récit + 12 chips exemples + 2 CTA)
10. TÉMOIGNAGES                  (carrousel)
11. GUIDES & CONSEILS            (2 colonnes SEO + 2 CTA)
12. NOTRE HISTOIRE               (texte long, 2 colonnes + photo)
13. VILLES PRIORITAIRES          (Lyon / Annecy / Grenoble / France)
14. ENCART FONDATEUR             (fond primary, daté 13 juin)
15. CTA FINAL                    (fond foreground, 3 boutons + footer daté)
FOOTER
```

## 2. Problèmes identifiés

### A. Doublons sémantiques (3 sections disent la même chose)
- **Sections 2 + 5 + 8** racontent toutes « Bénéfices proprio = gratuit, vérifié, encadré ».
  - Section 2 « Pourquoi publier » : Gratuit · Rencontre · Profils vérifiés.
  - Section 5 « Ce qu'on fait ensemble » : Proprio (gratuit) · Gardien · Entraide.
  - Section 8 « Outils de confiance » : Connaître (avis, profils) · Sécuriser (vérif identité, accord) · Communiquer.
- **« Gratuit pour les propriétaires » apparaît 5 fois** (ticker hero, badge S2, badge S5, S8, S13).
- **Section 3 (« Local ou National »)** redit ce que dit déjà le hero (« près de chez vous, partout en France »).

### B. Trop de CTAs propriétaire qui se ressemblent
6 boutons « Publier mon annonce / Je cherche un gardien / Créer mon compte » :
- Hero · Bandeau saisonnier (S4) · Comment ça marche (S6) · Outils confiance (S8) · Osez l'entraide (S9 secondaire) · Encart Fondateur (S14) · CTA final (S15).
- → fatigue d'engagement, on ne sait plus lequel cliquer.

### C. Date « 14 juillet » et « 13 juin » répétées sans hiérarchie
- Bandeau gratuité (top), ticker hero, encart Fondateur (S14), footer du CTA final (S15) → **4 occurrences visibles**.
- Le ticker et le bandeau gratuité se cumulent visuellement en haut de page (3 strates : bandeau + nav + ticker).

### D. Hero encore un peu chargé (post-cleanup)
Reste après dernière modif :
```
[ticker]   ● Gratuit pour tous · jusqu'au 14 juillet 2026
[H1]       Quelqu'un du coin veille sur votre maison.
[lead it.] Home sitting, garde d'animaux et petites missions… (italique gros)
[lead 2]   Confiez vos animaux à un gardien… (gris)
[lead 3]   Du coin… ou d'ailleurs : annonces accessibles partout (italique pâle)
[CTAs]     Publier / Je veux garder
[liens]    Découvrir l'entraide → · Gardien d'urgence →
[meta]     Badge Fondateur pour les inscrits avant le 13 juin.
[KPIs]     maisons / animaux / inscrits / missions
```
→ Encore **3 lignes de promesse** + **2 liens secondaires** + **1 mention Fondateur isolée** = 9 blocs.

### E. Ordre narratif perfectible
Actuel : Pourquoi → Local/National → Saisonnier → Ce qu'on fait → Comment → Démo → Outils → Entraide → Témoignages → Guides → Histoire → Villes → Fondateur → CTA.

Ce n'est pas un parcours **AIDA** propre. La preuve sociale (témoignages, démo, villes) est dispersée. L'histoire arrive à la fin alors qu'elle est l'élément de différenciation le plus fort.

### F. Détails techniques
- Section 14 (`bg-primary`) puis section 15 (`bg-foreground`) → 2 CTA blocks consécutifs sur fond sombre, redondants.
- Section 9 (Osez l'entraide) contient 12 chips qui font doublon avec la carte Entraide de section 5.
- Bandeau saisonnier (S4) coupe le rythme entre la promesse et l'explication produit.

## 3. Refonte proposée — version expert

### 3.1. Nouvelle structure (10 sections au lieu de 15)

```text
NAVBAR + FreePeriodBanner (le bandeau suffit, ticker hero supprimé)

1. HERO épuré           (1 promesse, 1 lead, 2 CTA, trust-line, KPI)
2. CE QU'ON FAIT        (3 cartes Proprio / Gardien / Entraide — pivot du site)
3. COMMENT ÇA MARCHE    (3 étapes + 1 CTA unique proprio)
4. VITRINE DÉMO         (DemoListingShowcase — preuve produit)
5. CONFIANCE & PÉRIMÈTRE (fusion S2 « Pourquoi » + S3 « Local/National » + S8 « Outils »
                          → 1 section riche, 4 piliers : gratuit, rencontre, vérifié, périmètre libre)
6. OSEZ L'ENTRAIDE      (récit court + chips + 1 CTA — narration émotionnelle)
7. TÉMOIGNAGES          (carrousel inchangé)
8. NOTRE HISTOIRE       (remontée ici : pivot émotionnel avant la conversion finale)
9. GUIDES + VILLES      (fusion S11 + S13 en 1 grille mixte, SEO préservé)
10. CTA FINAL           (fusion S14 + S15 : Fondateur + double CTA, fond primary unique)

FOOTER
```

Bénéfices : −33 % de sections, narration AIDA, 1 seule mention « Fondateur » (CTA final), suppression des 3 sections en doublon.

### 3.2. Hero — version finale 5 blocs

```
[eyebrow]   HOME SITTING · GARDE D'ANIMAUX · ENTRAIDE
[H1]        Quelqu'un du coin veille sur votre maison.
[lead]      Confiez vos animaux, demandez un coup de main, proposez-en un —
            près de chez vous, partout en France.
[CTAs]      [Publier mon annonce]   [Je veux garder]
[KPIs]      maisons · animaux · inscrits · missions
```

Suppressions :
- Ticker (info portée par le `FreePeriodBanner` au-dessus, plus de doublon).
- 2ᵉ et 3ᵉ leads italiques (redondance).
- Liens « Découvrir l'entraide » et « Gardien d'urgence » (déplacés en S2 et footer respectivement).
- Ligne « Badge Fondateur 13 juin » (déplacée en S10 unique).

### 3.3. Normalisation des CTAs
Règle : **1 CTA primaire par section maximum**, alternance sémantique :
- S1 Hero : Publier + Je veux garder (côte à côte, dual rôle).
- S2 « Ce qu'on fait » : 3 micro-CTA contextualisés dans les cartes.
- S3 « Comment ça marche » : 1 CTA proprio.
- S5 « Confiance & périmètre » : pas de CTA (lecture).
- S6 « Osez l'entraide » : 1 CTA petites missions.
- S9 « Guides + villes » : pas de CTA bouton (les villes/articles SONT les CTA).
- S10 final : Publier + Je veux garder + ligne Fondateur datée.

→ De **6 CTA proprio** redondants à **3 CTA proprio** stratégiquement placés (haut, milieu, bas).

### 3.4. Hiérarchie des dates de gratuité
- **Bandeau global** (`FreePeriodBanner`) : reste — info légale visible en haut.
- **Hero** : aucune mention de date (le bandeau juste au-dessus suffit).
- **CTA final unique (S10)** : « Inscription gratuite jusqu'au 14 juillet 2026 · Badge Fondateur pour les inscrits avant le 13 juin. »
- **Plus aucune mention ailleurs.** → 2 occurrences au lieu de 4.

### 3.5. Section 5 « Confiance & périmètre » (fusion)
Format : titre + sous-titre, puis grille 4 colonnes (sur desktop) :
```
01 Gratuit pour les propriétaires
02 Une rencontre avant chaque garde
03 Profils vérifiés (identité, avis, historique)
04 Périmètre libre (5 km → France entière)
```
Garde l'illustration France gouache à droite (gros levier visuel), supprime les 3 chips km redondants (info portée par le pilier 04). **−1 section, −12 lignes de copy.**

### 3.6. Section 9 « Guides + villes » (fusion)
Mise en page : 1 colonne « Guides & conseils » (4 liens articles) + 1 colonne « House-sitting par ville » (Lyon/Annecy/Grenoble + lien France entière). Conserve tous les liens SEO actuels, supprime les 4 cartes 1-col-mobile / 4-col-desktop redondantes. **−1 section.**

## 4. Détails techniques (implémentation)

- Aucune nouvelle dépendance.
- `FreeTickerChip` reste utilisable (pages Pricing/SmallMissionsPublic), seul son usage hero est supprimé.
- Constantes `FOUNDER_START`, `LAUNCH_DATE`, `GRACE_END` inchangées → test `free-period-dates-consistency.test.ts` passe.
- Toutes les classes restent en tokens sémantiques (bg-background, text-foreground, primary…). Aucune couleur hardcodée.
- Pas d'icône Lucide décorative ajoutée (respect de la règle « No icons in content »). Les `ArrowRight` actuels dans les liens textuels sont conservés (icône fonctionnelle de nav).
- Vouvoiement strictement préservé.
- Aucune mention de « voisin/voisinage » ni « AURA ».
- SEO : H1 inchangé, eyebrow conserve les 3 mots-clés majeurs, tous les liens SEO existants (guides, villes, articles) préservés.
- A11y : `role="status"` reste sur le bandeau global, focus order respecté, contraste tokens identique.
- Performance : −5 sections = ~−400 lignes de JSX rendues côté client, gain modeste mais réel sur LCP perçu (moins de DOM).
- Une seule édition de fichier : `src/pages/Landing.tsx`. Aucune route, aucune autre page modifiée.

## 5. Livrables

1. Refonte de `src/pages/Landing.tsx` selon la structure 10 sections.
2. Hero épuré 5 blocs.
3. Suppression du `FreeTickerChip` du hero (composant conservé pour autres pages).
4. Fusion S2+S3+S8 → nouvelle section « Confiance & périmètre ».
5. Fusion S11+S13 → nouvelle section « Guides + villes ».
6. Fusion S14+S15 → nouveau CTA final unique avec mention Fondateur intégrée.
7. Vérification visuelle desktop (1258px) + mobile (375px) via screenshot.

Aucune logique métier, aucun edge function, aucune migration. Pure refonte de présentation.
