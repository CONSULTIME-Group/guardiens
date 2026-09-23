# Lot E6, question de déroulement, cartes, photos et bloc d'accueil

## État vérifié

- `small_missions` contient 6 besoins ouverts, dont 4 avec au moins une photo.
- `public_small_missions` expose déjà `photos` et `end_date`, avec lecture publique et connectée. La migration 0018 la recréera uniquement pour y ajouter `sit_mode`.
- `public_helpers` contient actuellement 726 personnes disponibles, toutes avec des coordonnées publiques arrondies.
- Le hub charge aujourd'hui besoins et personnes ensemble dans `EntraideMap`. Les pages villes utilisent le même composant, sans onglets.
- La home charge déjà certaines ressources après une période d'inactivité. Le nouveau bloc suivra ce principe et restera sous la ligne de flottaison.

## 1. Question « Comment ça se passe ? »

1. Conserver `looksLikeMultiDaySit` comme signal d'ouverture de la question, jamais comme décision automatique.
2. Dans la dernière étape du formulaire, afficher un choix unique obligatoire lorsque le signal est présent :
   - `at_home` : « Quelqu'un s'installe chez moi pendant mon absence »
   - `visits` : « Quelqu'un passe chez moi »
   - `at_helper` : « Mon animal va chez la personne »
3. Pour `at_home`, afficher le bloc validé avec le bouton vers `/sits/create`, en reprenant titre, description, ville et dates. Le lien « Publier quand même un besoin » autorise ensuite la publication avec `sit_mode = at_home`.
4. Pour `visits`, poursuivre directement avec `sit_mode = visits`.
5. Pour `at_helper`, poursuivre avec `sit_mode = at_helper` et la ligne « Un coup de main entre gens du coin, en échange d'un service ou d'une attention. » Le contrôle des mentions d'argent reste actif.
6. Enregistrer le choix lors de la création. Réinitialiser la réponse si les champs changent au point de faire disparaître puis réapparaître le signal.
7. Centraliser les libellés d'affichage :
   - `at_home` : « Présence chez {prénom} pendant son absence »
   - `visits` : « Passages chez {prénom} »
   - `at_helper` : « L'animal vient chez vous »
8. Afficher cette ligne sur la fiche publique et connectée du besoin. La ligne utilise le prénom réel déjà chargé, avec un libellé générique affirmatif lorsque le prénom est absent.
9. Transmettre `sit_mode` et le prénom réel depuis `notify-mission-wave`, puis afficher la même ligne dans `mission-help-needed`.

### Fichiers exacts

- `src/lib/missionSitRedirect.ts`
- `src/pages/CreateSmallMission.tsx`
- `src/pages/SmallMissionDetail.tsx`
- `supabase/functions/notify-mission-wave/index.ts`
- `supabase/functions/_shared/transactional-email-templates/mission-help-needed.tsx`
- `src/__tests__/entraide-e5-diffusion-unique.test.ts`
- `src/pages/__tests__/create-small-mission-sit-mode.test.tsx` (nouveau)
- `src/pages/__tests__/small-mission-sit-mode.test.tsx` (nouveau)

## 2. Carte pilotée par l'onglet

1. Ajouter à `EntraideMap` une propriété `activeKind: "needs" | "helpers"`.
2. Produire deux couches et deux regroupements indépendants afin qu'un besoin et une personne au même endroit restent distincts.
3. Onglet « Besoins » :
   - besoins en marqueurs principaux, plus grands, couleur principale, cliquables ;
   - personnes en petits points discrets, sans interaction ;
   - popup besoin avec première photo éventuelle, titre, ville, date, distance et bouton « Voir le besoin ».
4. Onglet « Autour de vous » : personnes en marqueurs principaux cliquables, besoins en points de contexte discrets.
5. Sur ordinateur, ouvrir la carte par défaut dans l'onglet « Besoins ». Sur mobile, ouvrir la liste par défaut. La ville saisie devient le centre, sinon la France reste le cadrage initial.
6. Sur les 14 pages villes, ajouter les mêmes onglets et la même bascule Liste ou Carte. Le centre et le rayon éditorial propres à chaque ville restent inchangés. La liste suit aussi l'onglet actif.
7. Conserver le décalage géographique existant des coordonnées publiques.

### Fichiers exacts

- `src/components/entraide/EntraideMap.tsx`
- `src/lib/entraideMap.ts`
- `src/pages/EntraideHub.tsx`
- `src/pages/MissionsCityPage.tsx`
- `src/pages/__tests__/entraide-hub-explicit.test.tsx`
- `src/pages/__tests__/missions-city-pages.test.tsx`
- `src/lib/__tests__/entraideMap.test.ts`
- `src/components/entraide/__tests__/EntraideMap.test.tsx` (nouveau)

## 3. Photos des besoins

1. Ajouter `photos` aux sélections de `public_small_missions` du hub et des pages villes, puis au type `EntraideNeed`.
2. Dans `NeedCard`, afficher la première photo en tête, ratio 4:3, `loading="lazy"`, texte alternatif égal au titre nettoyé.
3. Pour un besoin sans photo, afficher un en-tête typographique sobre avec ville et date, en utilisant les couleurs sémantiques existantes.
4. Réutiliser cette présentation dans la popup du besoin, avec un bouton libellé « Voir le besoin ».

### Fichier exact supplémentaire

- `src/components/entraide/EntraideCards.tsx`

## 4. Bloc home « Autour de vous »

1. Insérer le bloc immédiatement après `ConfianceSection`, donc sous la ligne de flottaison et avant le pied de page.
2. Charger dynamiquement le composant après `requestIdleCallback`, avec repli temporisé. La requête démarre uniquement après ce chargement.
3. Lire directement `public_helpers` avec un comptage exact et des pages de coordonnées arrondies. Le titre utilise ce nombre réel : « {n} personnes prêtes à donner un coup de main près de chez vous ».
4. Afficher le sous-titre validé : « Arroser un jardin, nourrir un chat, changer une ampoule : demandez, les gens du coin répondent. »
5. Dessiner une carte statique de France en SVG local, sans Leaflet, et placer les points à partir des coordonnées arrondies. Le SVG aura un libellé accessible et une densité visuelle stable.
6. Ajouter les boutons « Demander un coup de main » vers `/petites-missions/creer` et « Voir qui est autour de moi » vers `/petites-missions`.

### Fichiers exacts

- `src/pages/Landing.tsx`
- `src/components/landing/NearbyHelpSection.tsx` (nouveau)
- `src/components/landing/NearbyHelpFranceMap.tsx` (nouveau)
- `src/pages/__tests__/landing-nearby-help.test.tsx` (nouveau)

## Migration 0018

Migration officielle : `drizzle/migrations/0018_entraide_sit_mode.sql`.

Copie documentaire : `supabase/migrations/20260923063000_entraide_sit_mode_ne_pas_rejouer.sql`, avec l'en-tête « COPIE DOCUMENTAIRE, NE PAS REJOUER ».

SQL prévu :

```sql
CREATE TYPE public.mission_sit_mode AS ENUM ('at_home', 'visits', 'at_helper');

ALTER TABLE public.small_missions
  ADD COLUMN sit_mode public.mission_sit_mode;

COMMENT ON COLUMN public.small_missions.sit_mode IS
  'Déroulement déclaré pour un besoin animal détecté comme garde potentielle.';

CREATE OR REPLACE VIEW public.public_small_missions AS
SELECT
  id, user_id, slug, title, description, category, exchange_offer,
  city, postal_code, round(latitude, 2) AS latitude,
  round(longitude, 2) AS longitude, date_needed, end_date,
  duration_estimate, status, mission_type, photos, pet_species, pet_size,
  created_at, max_participants, accepting_applications, hebergement, repas,
  ce_que_vous_apprendrez, nature_projet, savoir_faire_attendus,
  savoir_faire_transmis, offre, mois_accueil, sit_mode
FROM public.small_missions
WHERE status = 'open'::public.small_mission_status
  AND moderation_hidden_at IS NULL
  AND hidden_at IS NULL;

GRANT SELECT ON public.public_small_missions TO anon, authenticated;
GRANT ALL ON public.public_small_missions TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.public_small_missions FROM anon, authenticated, PUBLIC;
```

La colonne reste nullable pour les besoins existants et pour les créations hors signal. Les politiques de `small_missions` et les droits de la vue restent identiques. Les types du client seront régénérés par l'outil de migration.

## Mesure du poids et du LCP

1. Avant toute modification, établir la référence sur la home avec cinq chargements à froid en Chromium, en mobile 360 px et ordinateur 1440 px, même profil réseau et processeur, cache désactivé. Relever la médiane LCP via `PerformanceObserver`, l'élément LCP et les erreurs réseau.
2. Relever la taille gzip du paquet initial de la home et des paquets différés dans le manifeste de production.
3. Après réalisation, répéter exactement le même protocole. Critères : aucun octet Leaflet dans le paquet initial de la home, nouveau bloc dans un paquet différé, aucune requête `public_helpers` avant la période d'inactivité, médiane LCP stable dans la marge de mesure de 100 ms.
4. Rapporter les valeurs avant et après, le poids gzip ajouté au paquet initial et au paquet différé.

## Tests et ordre d'exécution

1. Écrire le code et les tests, puis exécuter les tests ciblés.
2. Vérifier 5 textes qui ouvrent la question et 5 textes qui poursuivent directement, dont « nourrir les poules samedi » et « changer une ampoule ».
3. Vérifier les trois choix, le bloc `at_home`, la reprise des champs vers `/sits/create`, la publication explicite du besoin, la valeur enregistrée, les trois libellés sur la fiche et dans l'email.
4. Vérifier chaque onglet sur hub et pages villes, les couches actives et discrètes, l'absence d'interaction sur les points de contexte, les popups, le cadrage France ou ville, et les défauts ordinateur ou mobile.
5. Vérifier les cartes avec photo et sans photo, le chargement différé des images et les textes alternatifs.
6. Vérifier le compteur exact, le SVG, les deux liens et le chargement après période d'inactivité sur la home.
7. Exécuter Vitest complet, `test:sql`, `tsgo` et le build. Scanner les textes E6 pour les deux caractères de tiret interdits et le vocabulaire proscrit.
8. Une fois tout vert, appliquer la migration 0018, contrôler colonne, type, vue, droits et valeurs existantes nulles, puis redéployer `notify-mission-wave` et `send-transactional-email`.
9. Vérifier le parcours réel sur mobile 360 px et ordinateur 1440 px. Le front reste sans publication par mes soins.

## Rapport final

- Fichiers exacts modifiés et créés.
- Diff synthétique par partie.
- Tests chiffrés, résultat de `test:sql`, `tsgo`, build et contrôles de texte.
- Mesures LCP et poids avant et après.
- État de la migration 0018 et de la vue publique.
- Fonctions redéployées.
- Portée réelle, front construit mais jamais publié.
- Hash du commit disponible après la création du commit par le système.
