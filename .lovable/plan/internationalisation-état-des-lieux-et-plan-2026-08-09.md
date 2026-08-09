# Internationalisation : état des lieux et plan

## État des lieux du mécanisme actuel

**La langue vit uniquement dans l'URL, en paramètre `?lang=xx`.** Le détecteur i18next est configuré sur `order: ["querystring"]` avec `caches: []`, donc aucun stockage local, aucun cookie, aucune lecture de `Accept-Language`. Le composant `LangUrlSync` va plus loin : à chaque navigation, si l'URL ne porte pas de `?lang`, il rebascule i18next sur le français.

**Conséquence directe : c'est la cause du bug signalé.** Tous les liens internes de l'application (sidebar, header public, cartes, fils d'Ariane) pointent vers des chemins nus, sans paramètre de langue. Un anglophone qui clique sur "English" obtient `?lang=en` sur la page courante, puis perd l'anglais au premier clic sur n'importe quel lien. Ce n'est pas un problème de contenu, c'est un reset systématique.

**Couverture réelle du contenu :**
- Interface : 1 289 clés traduites en 5 langues, mais une partie des pages applicatives porte encore du français en dur (libellés de navigation notamment).
- Articles : 118 publiés, 80 traductions anglaises, donc 38 sans version anglaise.
- Fiches de race : 77, aucune table de traduction.
- Pages villes (163) et annuaire pros : aucune traduction.

**SEO déjà correct :** `PageMeta` met les variantes non traduites en `noindex, follow`, conserve `html lang="fr"` et ne déclare en hreflang que les langues réellement traduites. Rien à changer de ce côté.

## Phase 1 : le bug d'expérience

### 1. Persistance de la langue
Garder l'URL comme source de vérité, mais arrêter de la perdre :
- Ajouter un stockage local du choix explicite de langue (écrit uniquement quand l'utilisateur sélectionne une langue dans le sélecteur).
- `LangUrlSync` : si l'URL n'a pas de `?lang` et qu'un choix explicite existe, réécrire l'URL avec le paramètre (remplacement d'historique) au lieu de retomber en français.
- Fournir un helper `withLang(path)` et l'appliquer à la navigation interne principale, pour que les liens portent le paramètre quand la langue active n'est pas le français.
- Aucune détection `Accept-Language` automatique : le français reste le défaut pour un premier visiteur sans choix, ce qui préserve le canonique et le crawl.

### 2. Repli explicite
Un composant `UntranslatedNotice` : bandeau sobre, en haut du contenu, affiché seulement quand la langue active n'est pas le français et que la page ne dispose pas de traduction. Texte type : "This page is not available in English yet. Showing the French version." Branché sur les pages qui savent déjà si elles ont une traduction (article, race, ville, pro, listings). La logique d'absence de traduction est déjà calculée pour le `noindex`, on la réutilise.

### 3. Navigation honnête
Dans les listes d'articles et de contenus, en langue non française : marquer les entrées disponibles seulement en français par un libellé discret ("FR only"), et ajouter un filtre "Available in English" (par défaut désactivé, donc aucune perte de contenu). Le marquage repose sur les langues réellement présentes en base, chargées avec la liste.

## Phase 2 : combler les traductions

### 2a. 38 articles publiés sans version anglaise
La table existe. Réutiliser le script de traduction déjà en place, en lot, avec le glossaire existant (vouvoiement, marque non traduite, placeholders préservés) et un validateur bloquant sur le vocabulaire proscrit avant écriture.

### 2b. 77 fiches de race
Créer `breed_profile_translations` sur le modèle d'`article_translations` (clé étrangère, `lang`, champs texte de la fiche, `noindex`, horodatages), avec `GRANT` et politiques de lecture publique et écriture réservée au service. Puis générer les traductions anglaises, avec la même validation.

### 2c. Pages villes
Hors périmètre, elles restent en français.

## Pages de positionnement
Landing, tarifs, manifeste : aucune écriture automatique en base. Je vous soumets les textes anglais pour relecture avant publication.

## Garde-fous
Vouvoiement en français, aucun emoji, aucun tiret cadratin ni demi-cadratin, mots proscrits (voisin, à vie, gratuitement) interdits y compris dans les traductions et les JSON-LD. Le validateur est appliqué avant toute écriture en base, et couvert par un test.

## Détails techniques
- `src/i18n/index.ts` : conserver `order: ["querystring"]`, ajouter la relecture du choix explicite au démarrage.
- `src/components/LangUrlSync.tsx` : réécriture d'URL au lieu du repli français inconditionnel.
- Nouveau `src/lib/lang.ts` : `withLang`, lecture et écriture du choix explicite.
- Nouveau `src/components/i18n/UntranslatedNotice.tsx`.
- Migration `breed_profile_translations` avec `GRANT` puis RLS et politiques.
- Scripts de remplissage exécutés hors application, écriture via l'outil d'insertion.
