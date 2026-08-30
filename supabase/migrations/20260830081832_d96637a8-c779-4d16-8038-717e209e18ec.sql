DO $do$
DECLARE
  src text;
BEGIN
  src := pg_get_functiondef('public.notify_sitters_on_new_sit()'::regprocedure);

  IF position('v_species_blocking' in src) > 0 THEN
    RAISE NOTICE 'deja applique';
    RETURN;
  END IF;

  IF position('  c_dormant_period_days constant integer := 30;' in src) = 0
     OR position('  has_any_coords := (sit_lat IS NOT NULL AND sit_lng IS NOT NULL);' in src) = 0
     OR position('        AND NOT EXISTS (
          SELECT 1
          FROM unnest(pet_species) AS ps(species)' in src) = 0 THEN
    RAISE EXCEPTION 'marqueurs introuvables, abandon';
  END IF;

  src := replace(src,
    '  c_dormant_period_days constant integer := 30;',
    '  c_dormant_period_days constant integer := 30;
  -- Filtre espece : dans l ancien declencheur il etait inerte (CONTINUE place
  -- dans la boucle interne). Le rendre bloquant est une decision produit, pas
  -- un correctif. Il reste donc derriere un drapeau, desactive par defaut.
  v_species_blocking boolean := false;');

  src := replace(src,
    '  has_any_coords := (sit_lat IS NOT NULL AND sit_lng IS NOT NULL);',
    '  has_any_coords := (sit_lat IS NOT NULL AND sit_lng IS NOT NULL);

  SELECT COALESCE(f.enabled, false) INTO v_species_blocking
  FROM public.feature_flags f
  WHERE f.key = ''species_filter_blocking'';
  v_species_blocking := COALESCE(v_species_blocking, false);');

  src := replace(src,
    '        AND NOT EXISTS (
          SELECT 1
          FROM unnest(pet_species) AS ps(species)',
    '        AND (
          v_species_blocking = false
          OR NOT EXISTS (
          SELECT 1
          FROM unnest(pet_species) AS ps(species)');

  src := replace(src,
    '                 OR (lower(trim(t.x)) IN (''cheval'', ''chevaux'', ''horse'', ''horses'', ''poney'', ''poneys'') AND lower(ps.species) IN (''cheval'', ''chevaux'', ''horse'', ''horses'', ''poney'', ''poneys''))
            )
        )
    ),',
    '                 OR (lower(trim(t.x)) IN (''cheval'', ''chevaux'', ''horse'', ''horses'', ''poney'', ''poneys'') AND lower(ps.species) IN (''cheval'', ''chevaux'', ''horse'', ''horses'', ''poney'', ''poneys''))
            )
          )
        )
    ),');

  EXECUTE src;
END
$do$;

INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('species_filter_blocking', false, 'Diffusion des annonces : exclut les gardiens dont les especes declarees ne couvrent pas celles de l annonce. Desactive par defaut, comportement historique inerte.')
ON CONFLICT (key) DO NOTHING;