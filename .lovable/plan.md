# Nurturing, lot N2

Aucune migration, aucun déploiement et aucune publication avant votre GO.

## État vérifié au 22 septembre 2026 à 17:09 UTC

- La sélection actuelle des annonces applique encore un plafond de 50 km et le rayon déclaré du gardien.
- Un gardien sans coordonnées déclenche actuellement le report `skipped_no_coordinates`.
- La relance dormant repose encore sur les fenêtres J+30, J+45 et J+75.
- `get_owner_nurturing_context` exclut actuellement les profils sans identité vérifiée, sous 60 % de complétion ou vus depuis plus de 90 jours.
- Le compteur élargi demandé donne une médiane mesurée de 8,5, soit 9 après arrondi usuel, et 12 propriétaires à zéro dans la base au moment de la vérification. Cette mesure diffère légèrement des 10 annoncés et sera remesurée après migration.
- Avec la nouvelle règle dormant, 946 gardiens actifs sont éligibles aujourd'hui : inscrits depuis au moins 30 jours, aucune candidature, moins de 3 envois, dernier envoi vieux d'au moins 14 jours, hors administrateurs. Trois autres profils éligibles fonctionnellement ont un compte non actif et restent hors envoi.
- `get_owner_nurturing_context` est appelé par `evaluate-journeys` et `send-onboarding-j1`.
- La fonction appartient à `postgres` et son exécution est accordée à `authenticated` et `service_role`.

## Partie A, annonces nationales et relance dormant

### Fichiers modifiés

- `supabase/functions/_shared/nearby-open-sits.ts`
- `supabase/functions/_shared/journey-defer.ts`
- `supabase/functions/_shared/dormant-sitter-cap.ts`
- `supabase/functions/evaluate-journeys/index.ts`
- `supabase/functions/nudge-sitter-dormant/index.ts`
- `src/__tests__/nearby-open-sits.test.ts`
- `src/__tests__/journey-defer.test.ts`
- `src/__tests__/dormant-sitter-cap.test.ts`

### Comportement

- Charger les annonces ouvertes en France selon la définition existante : publiée, date de début future, candidatures ouvertes, visible côté propriétaire et modération.
- Avec coordonnées, sélectionner les 3 annonces les plus proches, sans limite de distance et sans lecture du rayon déclaré. La distance reste arrondie à l'entier et affichée.
- Sans coordonnées, sélectionner les 3 annonces ouvertes les plus récentes. La carte omet la distance.
- Reporter uniquement lorsque la France entière ne contient aucune annonce ouverte, avec `skipped_no_open_sit` puis `no_open_sit_expired` après 21 jours.
- Remplacer les jalons dormant par une décision pure : ancienneté minimale 30 jours, aucune candidature, maximum 3 envois, intervalle minimal 14 jours depuis le dernier envoi effectif, administrateurs exclus.
- Conserver le contrôle de compte actif déjà appliqué au vivier d'envoi. Retirer les critères de complétion et d'identité de `detect_dormant_sitters`, car tous les gardiens dormants actifs doivent devenir éligibles.
- Lire dans `email_send_log` le nombre et la date du dernier envoi effectif par gardien, sans compter les lignes différées, supprimées, refusées ou échouées.

## Partie B, compteur et cartes propriétaire

### Fichiers créés ou modifiés

- `drizzle/migrations/0016_owner_nurturing_context.sql`
- `supabase/migrations/20260922170900_owner_nurturing_context_ne_pas_rejouer.sql`, copie documentaire uniquement
- `supabase/functions/_shared/transactional-email-templates/owner-no-sit-j3.tsx`
- `supabase/functions/evaluate-journeys/index.ts`
- `supabase/functions/send-onboarding-j1/index.ts`
- `src/integrations/supabase/types.ts`, régénéré automatiquement par l'outil de migration si nécessaire
- Un test SQL ciblé dans le dispositif `test:sql` existant, avec vérification du contrat JSON et des droits

### SQL prévu pour la migration 0016

```sql
CREATE OR REPLACE FUNCTION public.get_owner_nurturing_context(_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _first_name text;
  _city text;
  _postal_code text;
  _lat double precision;
  _lng double precision;
  _profile_completion integer;
  _radius_km integer := 30;
  _nearby_count integer := 0;
  _top_names text[] := ARRAY[]::text[];
  _top_sitters jsonb := '[]'::jsonb;
BEGIN
  SELECT p.first_name, p.city, p.postal_code, p.latitude, p.longitude, p.profile_completion
    INTO _first_name, _city, _postal_code, _lat, _lng, _profile_completion
  FROM public.profiles p
  WHERE p.id = _owner_id;

  IF _lat IS NOT NULL AND _lng IS NOT NULL THEN
    WITH nearby AS MATERIALIZED (
      SELECT
        p.id,
        p.first_name,
        p.city,
        p.avatar_url,
        p.identity_verified,
        p.last_seen_at,
        public.haversine_km(_lat, _lng, p.latitude, p.longitude) AS distance_km
      FROM public.profiles p
      WHERE p.id <> _owner_id
        AND p.role IN ('sitter', 'both')
        AND p.account_status = 'active'
        AND p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        AND public.haversine_km(_lat, _lng, p.latitude, p.longitude) < _radius_km
    ), ranked AS MATERIALIZED (
      SELECT *
      FROM nearby
      ORDER BY
        (identity_verified IS TRUE AND NULLIF(btrim(avatar_url), '') IS NOT NULL) DESC,
        last_seen_at DESC NULLS LAST,
        distance_km ASC,
        id ASC
      LIMIT 3
    )
    SELECT
      (SELECT count(*) FROM nearby),
      COALESCE(
        (SELECT array_agg(
          r.first_name || CASE WHEN r.city IS NOT NULL THEN ' (' || r.city || ')' ELSE '' END
          ORDER BY
            (r.identity_verified IS TRUE AND NULLIF(btrim(r.avatar_url), '') IS NOT NULL) DESC,
            r.last_seen_at DESC NULLS LAST,
            r.distance_km ASC,
            r.id ASC
        ) FROM ranked r WHERE r.first_name IS NOT NULL),
        ARRAY[]::text[]
      ),
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'first_name', r.first_name,
            'city', r.city,
            'avatar_url', r.avatar_url,
            'distance_km', round(r.distance_km::numeric)::integer,
            'url', 'https://guardiens.fr/gardiens/' || r.id::text
          )
          ORDER BY
            (r.identity_verified IS TRUE AND NULLIF(btrim(r.avatar_url), '') IS NOT NULL) DESC,
            r.last_seen_at DESC NULLS LAST,
            r.distance_km ASC,
            r.id ASC
        ) FROM ranked r),
        '[]'::jsonb
      )
    INTO _nearby_count, _top_names, _top_sitters;
  END IF;

  RETURN jsonb_build_object(
    'first_name', _first_name,
    'city', _city,
    'postal_code', _postal_code,
    'profile_completion', COALESCE(_profile_completion, 0),
    'nearby_sitters_count', COALESCE(_nearby_count, 0),
    'radius_km', _radius_km,
    'top_3_sitter_names', COALESCE(_top_names, ARRAY[]::text[]),
    'top_3_sitters', COALESCE(_top_sitters, '[]'::jsonb)
  );
END;
$function$;

ALTER FUNCTION public.get_owner_nurturing_context(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_owner_nurturing_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_nurturing_context(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.get_owner_nurturing_context(uuid) IS
  'Contexte des relances proprietaire. Compte tous les gardiens actifs a moins de 30 km et retourne les trois profils prioritaires.';
```

Le compteur inclut tous les profils actifs de rôle `sitter` ou `both` avec coordonnées à moins de 30 km. Aucun seuil de complétion, contrôle d'identité ou activité récente ne filtre le vivier. Le classement des 3 cartes applique uniquement l'ordre demandé. `top_3_sitter_names` reste présent pour compatibilité.

## Partie C, textes et rendus

### Gabarits modifiés

- `supabase/functions/_shared/transactional-email-templates/sitter-encourage-candidature.tsx`
- `supabase/functions/_shared/transactional-email-templates/dormant-sitter-nudge.tsx`
- `supabase/functions/_shared/transactional-email-templates/availability-nudge.tsx`
- `supabase/functions/_shared/transactional-email-templates/relance-profil-incomplet.tsx`
- `supabase/functions/_shared/transactional-email-templates/relance-cp-manquant.tsx`
- `supabase/functions/_shared/transactional-email-templates/owner-no-sit-j3.tsx`
- `supabase/functions/_shared/transactional-email-templates/owner-no-sit-j10.tsx`
- `supabase/functions/_shared/transactional-email-templates/owner-no-sit-j21.tsx`
- `supabase/functions/_shared/transactional-email-templates/owner-activation-nudge.tsx`
- `supabase/functions/_shared/transactional-email-templates/seasonal-nurture.tsx`
- `supabase/functions/_shared/transactional-email-templates/reactivation-d30.tsx`
- `supabase/functions/_shared/transactional-email-templates/_nearby-sits.tsx`
- `supabase/functions/_shared/transactional-email-templates/_legal-footer.tsx`, seulement si nécessaire pour rendre le nouveau pied commun sans affecter les autres emails

### Appelants vérifiés

- `supabase/functions/evaluate-journeys/index.ts`
- `supabase/functions/nudge-sitter-dormant/index.ts`
- `supabase/functions/relance-cp-manquant/index.ts`
- `supabase/functions/send-relance-profil-incomplet/index.ts`
- `supabase/functions/send-owner-activation-campaign/index.ts`
- `supabase/functions/send-seasonal-nurture/index.ts`

Chaque objet, pré-en-tête, paragraphe, liste, bouton, signature, variante et pied fourni sera recopié à l'identique. Les seules opérations autour de ces textes seront l'injection des données entre accolades, les accords singulier et pluriel demandés, la variante « Bonjour, » sans prénom et l'omission visuelle de la distance lorsqu'elle manque.

La règle lexicale est compatible avec les textes finaux fournis. Les mentions « sans distance » et « sans prénom » décrivent des variantes et ne sont pas des chaînes visibles. Les anciennes phrases négatives citées pour remplacement seront supprimées.

## Tests

### Tests créés ou modifiés

- `src/__tests__/nearby-open-sits.test.ts`
- `src/__tests__/dormant-sitter-cap.test.ts`
- `src/__tests__/journey-defer.test.ts`
- Nouveau test de rendu N2 dans `supabase/functions/_shared/transactional-email-templates/`, au format `*_test.ts`
- Nouveau test SQL ciblé rattaché à `test:sql`

### Matrice couverte

- Annonce à 300 km retenue.
- Tri des 3 annonces par distance avec coordonnées.
- Sans coordonnées, tri des 3 annonces par date de publication récente et aucune distance rendue.
- Report uniquement avec zéro annonce ouverte en France, échéance 21 jours conservée.
- Dormant : 29 et 30 jours, aucune candidature, espacement à 13 et 14 jours, plafond à 3, administrateur exclu.
- Chaque gabarit réécrit rendu avec prénom et avec salutation neutre.
- Gabarits annonce rendus avec et sans distance.
- Compteurs rendus avec 0, 1 et plusieurs.
- Cartes propriétaire avec photo et avec initiale de remplacement.
- Présence exacte des textes validés, sujets dynamiques compris.
- Échec sur toute chaîne visible contenant une construction `ne ... pas`, `n'... pas`, `jamais`, `aucun`, `sans`, `rien`, un tiret cadratin ou un demi-cadratin.
- Échec si `3 candidatures` ou `en moyenne` réapparaît.
- Vitest complet, `test:sql` et contrôle TypeScript.

## Migration, déploiements et portée

Après votre GO uniquement :

1. Implémenter les fichiers ci-dessus.
2. Exécuter les tests ciblés, Vitest complet, `test:sql` et le contrôle TypeScript.
3. Appliquer la migration Drizzle 0016 avec l'outil de migration, puis conserver la copie documentaire marquée « NE PAS REJOUER ».
4. Remesurer le compteur propriétaire et le nombre de gardiens dormant éligibles.
5. Redéployer `evaluate-journeys`, `nudge-sitter-dormant`, `send-transactional-email` et `send-onboarding-j1`, seul autre appelant vérifié de `get_owner_nurturing_context`.
6. Fournir la liste exacte des fichiers, le diff, les résultats chiffrés, la migration appliquée, les fonctions redéployées, le hash du commit et la portée réelle.

`discover-mutual-aid` reste en pause. Aucune séquence de nurturing n'est réactivée ou modifiée hors des règles N2. Aucun email de masse ne part. Le front reste non publié.
