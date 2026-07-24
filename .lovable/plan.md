Investigation uniquement, aucun correctif appliqué. Diagnostic fichier par fichier des deux bugs constatés.

## 1. Filtre proximité complètement inactif

Chaîne du filtre :
- `src/pages/EntraideHub.tsx` L324 : `const proximity = useMissionDistance(missions);`
- L371–386 : le filtre `filteredMissions` applique le rayon uniquement `if (proximity.active)`. Sinon aucun filtre distance.
- `src/hooks/useMissionDistance.ts` L109–120 : `active = Boolean(origin)`. `origin` n'est renseigné que par géoloc navigateur OU par géocode du code postal saisi.
- Branche CP L100–116 : `geocodeCity(postal, "France")` avec `postal = "69003"`.
- `src/lib/geocode.ts` L58–70 : appelle l'edge function `geocode` avec `{ city: "69003", country: "France" }`.
- `supabase/functions/geocode/index.ts` L99–105 : construit `URLSearchParams({ format, limit:1, city: "69003", country: "France", countrycodes: "fr" })` et appelle Nominatim.

**Cause racine** : Nominatim traite le paramètre `city=` comme un nom de ville, pas comme un code postal. « 69003 » n'est pas une ville → Nominatim renvoie `[]` → l'edge renvoie `{ lat:null, lng:null }` → `geocodeCity` renvoie `null` (mis en cache mémoire) → `origin` reste `null` → `proximity.active = false` → le bloc `if (proximity.active) { if (d > radius) return false; }` n'est **jamais évalué**. Résultat : toutes les 120 dernières missions passent, d'où l'affichage d'Épinay-sur-Seine (93800) et Noyal-sur-Vilaine (35530) alors qu'on a saisi 69003.

Confirmation base :
- `SELECT ... FROM geocode_cache WHERE normalized_name ILIKE '%69003%'` → 0 ligne. Aucun code postal n'a jamais pu être géocodé.
- Aucun symptôme n'apparaît côté « Ma position » car cette branche pose `origin = {lat,lng}` directement sans passer par l'edge.

L'UI trompe l'utilisateur : le `Select` de rayon reste actif visuellement (L125 `disabled={!active}` — `active` prop vient d'`EntraideHub`, à vérifier au passage), mais aucune boucle silencieuse n'informe que l'origine n'a pas pu être résolue. Aucun toast d'erreur n'est levé côté saisie CP (contrairement à la branche géoloc).

**Options de correctif** (à valider, non appliquées) :
- A. Faire supporter les CP FR côté edge `geocode` : détecter `/^\d{5}$/`, appeler Nominatim avec `postalcode=…` au lieu de `city=…` (ou requête structurée `q=<cp>, France`), et normaliser la clé de cache en `cp:<cp>|fr`.
- B. Fallback côté client dans `useMissionDistance` : si `geocodeCity(cp)` renvoie null pour un CP valide, tenter un second appel avec la ville associée (mais on n'a que le CP saisi, donc nécessite une table de correspondance ou l'appel `postalcode` côté edge → option A reste préférable).
- C. Ajouter un état d'erreur explicite dans le hook (`originResolveError`) et un message dans `ProximityFilter` quand la résolution échoue, pour ne plus laisser croire à l'utilisateur que le filtre est actif.

## 2. Cartes sans vraie photo

Composant carte : `src/components/missions/connected/MissionCard.tsx`
- L82 : `const hasPhoto = Array.isArray(m.photos) && m.photos.length > 0;`
- L83 : `const cover = hasPhoto ? m.photos[0] : null;`
- Fallback : `CategoryGlyph` (SVGs génériques maison/patte/etc. sur gradient `primary`). **Aucun fallback intermédiaire** vers l'avatar auteur ni vers `owner_gallery`.

Champs disponibles côté données :
- `small_missions.photos text[]` : existe, alimenté via `MissionPhotoUpload` dans `src/pages/CreateSmallMission.tsx` (L112, L253, L676–677). Techniquement fonctionnel.
- État réel en base : sur les 9 missions ouvertes/en cours/terminées récentes échantillonnées, **toutes ont `array_length(photos,1)=0`**. Personne n'a joint de photo à ce jour. Les cartes tombent donc systématiquement dans la branche `CategoryGlyph`.
- Avatar auteur : `m.profiles.avatar_url` est hydraté L286–294 dans `EntraideHub.tsx` (via `public_profiles`). Utilisé uniquement pour la pastille auteur, jamais comme couverture.
- `owner_gallery` : jamais requêté par le hub Entraide.
- `pets.photo_url` : jamais requêté (les missions ne sont pas liées formellement à un pet).

**Diagnostic** : le champ existe, l'upload existe, mais l'usage est nul. Le rendu générique est donc le comportement observé partout, pas un bug de rendu — c'est un bug produit à deux niveaux : (a) auteurs ne joignent aucune photo, (b) la carte n'a pas de plan B au-dessus du glyph gris.

**Options de correctif** (à valider, non appliquées) :
- A. Pousser plus fortement l'upload dans `CreateSmallMission` (photo obligatoire pour catégorie « animals » ou « house », ou nudge visuel bloquant à l'édition).
- B. Ajouter une cascade de fallback couverture dans `MissionCard` : `m.photos[0]` → (si catégorie=animals) première `pets.photo_url` de l'auteur → (si catégorie=house/garden) première `owner_gallery` de l'auteur → avatar auteur agrandi et flouté en fond → glyph générique. Nécessite d'enrichir la query L272–275 de `EntraideHub.tsx` avec un batch `pets`/`owner_gallery` par `user_id`.
- C. Solution minimale : n'ajouter que l'avatar auteur agrandi en couverture floutée si aucune photo mission. Zéro requête supplémentaire, ambiance plus humaine que la silhouette grise.

Aucun changement ne sera appliqué sans arbitrage sur les options ci-dessus.
