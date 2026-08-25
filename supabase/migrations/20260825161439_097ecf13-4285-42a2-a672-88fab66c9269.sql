UPDATE public.breed_profiles
SET rich_content = replace(
  replace(
    replace(
      replace(
        replace(
          replace(
            replace(rich_content, 'la jument boit', 'le cheval boit'),
            'la jument est', 'le cheval est'
          ),
          'la jument et', 'le cheval et'
        ),
        'la jument pour', 'le cheval pour'
      ),
      'la jument ait', 'le cheval ait'
    ),
    'la jument a une', 'le cheval a une'
  ),
  'la jument mange', 'le cheval mange'
)
WHERE species = 'horse' AND breed = 'mérens';

UPDATE public.breed_profiles
SET rich_content = replace(
  replace(
    replace(
      replace(
        replace(rich_content, 'Pour une jument de 500 kg', 'Pour un cheval de 500 kg'),
        'la jument dans son environnement', 'le cheval dans son environnement'
      ),
      'Marchez à côté de la jument, jamais devant elle ni derrière elle',
      'Marchez à côté du cheval, jamais devant lui ni derrière lui'
    ),
    'Tenter de forcer une jument à faire quelque chose qu''elle refuse ou qui l''effraie',
    'Tenter de forcer un cheval à faire quelque chose qu''il refuse ou qui l''effraie'
  ),
  'de la jument (type et quantité', 'du cheval (type et quantité'
)
WHERE species = 'horse' AND breed = 'mérens';