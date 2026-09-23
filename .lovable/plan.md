# Lot H1, une home qui fait publier

## État vérifié

- La home assemble actuellement le hero, le bandeau de chiffres, les annonces, le sommaire, le bloc sombre, la confiance, le fonctionnement, l'histoire, les témoignages statiques, le CTA intermédiaire, la définition, le bloc international, le comparatif, la FAQ, le CTA final et « Autour de vous ».
- Le hero vit directement dans `src/pages/Landing.tsx`. Son image est chargée en priorité et constitue l'élément LCP actuel.
- `LiveListingsStrip` charge uniquement les gardes et complète leurs photos depuis les propriétés et galeries.
- `public_small_missions` expose les besoins ouverts, leurs photos, leurs dates et leurs coordonnées arrondies.
- Les données utiles au compteur sont dans `profiles` : rôle, compte actif, disponibilité d'entraide et coordonnées. `count_eligible_sitters` fournit déjà le modèle de calcul géographique, mais aucune fonction publique ne renvoie les deux compteurs H1 ensemble.
- La base contient actuellement quatre avis publiés et validés avec commentaire, dont deux relient les comptes fondateurs administrateurs, ainsi qu'aucune preuve d'entraide publique. La fonction publique exclura tout contenu impliquant un administrateur. Les deux avis éligibles actuels permettent le seuil validé de deux contenus.
- Le formulaire de besoin ne lit actuellement aucun paramètre de titre. Le préremplissage H1 sera une exception explicite et limitée aux six exemples demandés.
- Le menu public ne porte aucune entrée professionnelle. L'entrée demandée se trouve dans `src/lib/userMenuModel.ts`, clé `pro`.

## Ordre final de la page

1. Hero
2. Bandeau de chiffres existant
3. En ce moment près de chez vous
4. Sommaire actualisé
5. Un service après l'autre, seul bloc sombre
6. Demander un coup de main, en un clic
7. Comment ça marche, garde et coup de main
8. Trois conditions pour se faire confiance, avec l'affinité en quatrième point
9. CTA intermédiaire existant
10. Autour de vous
11. Qu'est-ce que Guardiens ?
12. Notre histoire, inchangée
13. Ils l'ont vécu
14. Bloc international existant, inchangé
15. Comparatif existant
16. FAQ existante
17. CTA final à deux portes

## 1. Hero orienté publication

- Conserver exactement le H1 et la ligne italique demandés.
- Remplacer le lede et les deux actions par les textes fournis, avec la garde comme action principale.
- Ajouter un champ compact « Votre ville ». Après validation, appeler `geocodeCity`, arrondir latitude et longitude à deux décimales, puis appeler la nouvelle RPC.
- Afficher uniquement le résultat agrégé : « {n} gardiens et {m} personnes prêtes à aider à moins de 30 km ». Sous un pour chaque compteur concerné, employer « Soyez parmi les premiers de votre secteur. »
- Ajouter le lien « Vous voulez garder ? Créez votre profil. »
- Suivre les deux actions et la validation de ville. Les compteurs restent absents pendant la saisie et en cas de ville non reconnue.
- À 360 px, limiter les éléments avant la ligne de flottaison au H1, à la ligne italique, au lede, à l'action principale et au champ ville. L'eyebrow et les pastilles quittent le hero. L'action secondaire et le lien gardien suivent immédiatement dans le flux.
- Conserver l'image, son chargement prioritaire, son cadrage et les adaptations de session déjà en place lorsque leurs destinations restent compatibles.

## 2. RPC publique de proximité, migration Drizzle 0019

Fichier créé par l'outil de migration : `drizzle/migrations/0019_home_proximity_counts.sql`.

```sql
CREATE OR REPLACE FUNCTION public.home_proximity_counts(
  p_lat double precision,
  p_lng double precision
)
RETURNS TABLE(gardiens_count integer, helpers_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH origin AS (
    SELECT
      round(p_lat::numeric, 2)::double precision AS lat,
      round(p_lng::numeric, 2)::double precision AS lng
  ), eligible AS (
    SELECT
      p.role,
      p.available_for_help,
      6371 * acos(
        least(1.0, greatest(-1.0,
          cos(radians(origin.lat)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(origin.lng)) +
          sin(radians(origin.lat)) * sin(radians(p.latitude))
        ))
      ) AS distance_km
    FROM public.profiles p
    CROSS JOIN origin
    WHERE p.account_status = 'active'
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      AND origin.lat IS NOT NULL
      AND origin.lng IS NOT NULL
  )
  SELECT
    count(*) FILTER (
      WHERE role IN ('sitter'::public.user_role, 'both'::public.user_role)
        AND distance_km <= 30
    )::integer AS gardiens_count,
    count(*) FILTER (
      WHERE available_for_help IS TRUE
        AND distance_km <= 30
    )::integer AS helpers_count
  FROM eligible;
$$;

COMMENT ON FUNCTION public.home_proximity_counts(double precision, double precision) IS
  'Deux compteurs publics agrégés dans un rayon de 30 km pour la home.';

REVOKE ALL ON FUNCTION public.home_proximity_counts(double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.home_proximity_counts(double precision, double precision)
  TO anon, authenticated, service_role;
```

La fonction renvoie exactement une ligne et deux entiers. Elle conserve le vivier complet, sans filtre de complétude, identité, photo, ancienneté, note ou abonnement. Aucun identifiant ni aucune coordonnée ne sort de la fonction.

## 3. En ce moment près de chez vous

- Étendre `LiveListingsStrip` avec les besoins ouverts dont `mission_type = besoin`.
- Pour chaque besoin, utiliser la première photo éventuelle, le titre, la ville, la date et le lien public existant.
- Composer la liste avec les gardes en premier, puis les besoins. Après saisie d'une ville, trier chaque groupe par distance à la position saisie. Tous les éléments chargés restent éligibles au classement avant le plafond d'affichage.
- Conserver les états de chargement et l'état vide, avec des actions vers les deux parcours.

## 4. Un service après l'autre

- Remplacer `PretexteSection` par un composant dédié qui reprend exactement l'eyebrow, le titre, les trois étapes datées, la phrase de clôture, le paragraphe, la signature, le lien article et les deux actions fournis.
- Réemployer les trois aquarelles du fonctionnement actuel pour les trois étapes.
- Conserver l'image verbale de `landing.pretexte.p2` sous cette forme courte : « La mami du quartier vous raconte son histoire pendant que vous ramassez ses fruits. Gerardo vous aide à bricoler, puis partage avec vous un repas fait maison. »
- Garder le fond pin, le grain et les toits peints. Ce composant reste le seul bloc sombre du corps de page.

## 5. Demander un coup de main, en un clic

- Afficher les six exemples fournis comme liens directs vers `/petites-missions/creer?titre=...` pour un membre connecté.
- Pour un visiteur, utiliser `/inscription?redirect=` avec l'URL encodée `/petites-missions/creer?titre=...`, afin de revenir au formulaire après inscription.
- Suivre chaque clic avec le texte choisi et sa position.
- Dans `CreateSmallMission`, lire une seule fois `titre`, passer la valeur par `sanitizeUserTitle`, respecter la longueur maximale et initialiser uniquement le titre.
- L'utilisateur garde la main sur la modification et la publication. Aucun autre paramètre ni aucune contrepartie ne se remplit.
- Vérifier que `sanitizeRedirect` conserve la query string interne et ajouter un test de régression.

## 6. Comment ça marche

- Réécrire `HowItWorksSection` en deux colonnes, avec les trois phrases exactes de la garde et les trois phrases exactes du coup de main.
- Conserver les illustrations existantes lorsque leur sens correspond et actualiser `HomeJsonLd` pour que le HowTo visible et les données structurées racontent le même parcours de garde.

## 7. Trois conditions pour se faire confiance

- Réécrire `ConfianceSection` avec les trois conditions et leurs textes exacts.
- Conserver `AffinityDemoCard` comme quatrième point.
- Reformuler le texte d'affinité ainsi : « Vous décrivez le gardien recherché : rythme de vie, présence, expérience avec vos animaux et mobilité. Le score d'affinité classe chaque candidature critère par critère. Vous voyez le détail du calcul et vous choisissez. »
- Placer `MidJourneyCta` immédiatement après cette section, avec son comportement existant.

## 8. Autour de vous

- Remonter le composant H1 existant à cet emplacement.
- Conserver son import dynamique, son démarrage après période d'inactivité, sa carte SVG et son compteur direct. Aucune ressource cartographique lourde ne rejoint le paquet initial.

## 9. Qu'est-ce que Guardiens ?

Reformulations proposées :

- `landing.usages.sitter.text` : « Vivez dans des maisons, prenez soin des animaux et découvrez chaque lieu de l'intérieur. Une garde, c'est aussi un voyage. »
- `landing.usages.mutual.text` : « Arroser un potager, monter une étagère, partager une compétence, rendre visite à une personne isolée : les coups de main créent des échanges entre gens du coin toute l'année. »
- `landing.what_is.body_3` : « À côté des gardes, les membres se rendent des coups de main : arrosage, courses, compagnie, un meuble à déplacer, un colis à réceptionner. Pour l'un, c'est un vrai besoin. Pour l'autre, c'est une heure et un bon moment. L'échange se décide entre vous. »
- `landing.what_is.body_4` : « La mise en relation s'appuie sur un score d'affinité calculé sur plusieurs critères pondérés, propres à chaque couple, où le mode de vie compte autant que la distance. Les membres documentent leur profil, font vérifier leur identité et publient des avis croisés après leurs expériences. Un statut de gardien d'urgence répond aux imprévus. »
- Les paragraphes 1, 2, 5, 6 et 7 restent identiques, leur formulation est affirmative.

`UsagesSection` continue d'afficher les sept paragraphes utiles au référencement. Les anciennes phrases ciblées disparaissent aussi de leurs clés devenues inutilisées.

## 10. Ils l'ont vécu

- Remplacer les témoignages statiques par une section alimentée uniquement par `public.home_social_proof()` via `src/lib/homeSocialProof.ts`.
- Ajouter à la migration 0019 une fonction `STABLE SECURITY DEFINER`, avec `search_path = public`, exécutable par `anon`, `authenticated` et `service_role`.
- La fonction fusionne les avis publiés, validés et commentés avec les preuves d'entraide publiques, puis exclut tout contenu dont l'auteur ou le destinataire possède le rôle `admin` dans `user_roles`.
- La sortie contient au plus six lignes et exactement cinq informations publiques : type, prénom, ville, texte et date. Aucun identifiant ni aucune coordonnée ne sort de la fonction.
- Fusionner et trier par date récente. Afficher prénom, ville et date sur chaque contenu.
- Masquer toute la section pendant le chargement, en cas d'échec, et lorsque le total éligible est inférieur à deux.
- Tester explicitement l'exclusion d'un avis impliquant un administrateur et le seuil d'affichage à deux contenus.
- Supprimer `src/data/homeTestimonials.ts`, `TestimonialsSection`, `RealMembersStrip` s'ils deviennent sans appelant, les clés `landing.testimonials.items.*` et la phrase de source statique.

## 11. Fin de page et navigation

- Conserver Notre histoire, le comparatif et la FAQ.
- Conserver le bloc international inchangé, immédiatement après « Ils l'ont vécu » et avant le comparatif.
- Limiter `LandingTocBar` à six entrées : En ce moment, Un service après l'autre, Comment ça marche, Confiance, Autour de vous et FAQ.
- Adapter le CTA final aux deux portes demandées et remplacer son lede par le texte exact fourni.
- Retirer uniquement l'entrée `pro` de `buildUserMenuEntries`. Le profil gardien et `pro_status` restent intacts.

## Fichiers exacts

### Modifiés

- `src/pages/Landing.tsx`
- `src/pages/CreateSmallMission.tsx`
- `src/components/landing/LiveListingsStrip.tsx`
- `src/components/landing/HowItWorksSection.tsx`
- `src/components/landing/ConfianceSection.tsx`
- `src/components/landing/AroundYouSection.tsx`
- `src/components/landing/UsagesSection.tsx`
- `src/components/landing/LandingTocBar.tsx`
- `src/components/landing/FinalCtaSection.tsx`
- `src/components/landing/HomeJsonLd.tsx`
- `src/lib/userMenuModel.ts`
- `src/lib/analytics.ts`
- `src/i18n/locales/fr/common.json`
- `src/integrations/supabase/types.ts`, régénéré par la migration
- `src/__tests__/no-prefilled-copy.test.ts`
- `src/lib/__tests__/user-menu-model.test.ts`

### Créés

- `src/components/landing/HomeProximitySearch.tsx`
- `src/components/landing/ServiceAfterServiceSection.tsx`
- `src/components/landing/QuickHelpSection.tsx`
- `src/components/landing/LivedItSection.tsx`
- `src/lib/homeListings.ts`
- `src/lib/homeSocialProof.ts`
- `drizzle/migrations/0019_home_counts_and_social_proof.sql`, créé et appliqué par l'outil de migration après validation complète
- `src/__tests__/landing-h1-structure.test.tsx`
- `src/__tests__/landing-h1-proximity.test.tsx`
- `src/__tests__/landing-h1-social-proof.test.tsx`
- `src/__tests__/landing-h1-prefill.test.tsx`
- `src/lib/__tests__/safeRedirect.test.ts`
- `scripts/test-home-proximity-counts.mjs`
- `scripts/test-home-social-proof.mjs`

### Supprimés si aucun appelant ne subsiste

- `src/components/landing/PretexteSection.tsx`
- `src/components/landing/TestimonialsSection.tsx`
- `src/components/landing/RealMembersStrip.tsx`
- `src/data/homeTestimonials.ts`

## Validation et séquence

1. Mesurer la référence LCP avant modification avec cinq chargements à froid, cache désactivé, en 360 px et 1440 px. Relever médiane, minimum, maximum, élément LCP et erreurs réseau.
2. Implémenter le front et les tests ciblés. Vérifier visuellement le hero à 360 px et 1440 px, son absence de débordement et la visibilité du H1, de l'action principale et du champ ville sans défilement.
3. Vérifier l'ordre des sections, le bloc international inchangé à sa nouvelle place, les deux catégories d'annonces, le tri de proximité, les six préremplissages, le retour après inscription, le seuil combiné de deux contenus, l'exclusion des administrateurs et la disparition des témoignages statiques.
4. Scanner tous les textes H1 pour les constructions négatives, les deux caractères de tiret interdits, les mots proscrits, les accents et le vouvoiement.
5. Exécuter Vitest complet par tranches si nécessaire, `test:sql`, `tsgo` et le build. Conserver un état compilable avant toute action sur la base.
6. Une fois tout vert, appliquer la migration 0019. Vérifier les signatures, `SECURITY DEFINER`, `search_path`, les droits anon et authenticated, le refus des rôles non autorisés, une seule ligne et exactement deux colonnes entières pour les compteurs, au plus six lignes et exactement cinq colonnes publiques pour la preuve sociale, la parité des comptes à 30 km et l'exclusion des administrateurs.
7. Régénérer les types, rejouer les tests et le build, puis mesurer le LCP après modification avec le même protocole. Le champ ville et les sections différées restent hors de l'élément LCP.
8. Aucun redéploiement de fonction serveur et aucune publication du front. Vous publierez après lecture du rapport final.
9. Rapport final en douze lignes maximum : fichiers exacts, résumé du diff, tests, contrôles de base, LCP avant et après, hash du commit et portée réelle.
