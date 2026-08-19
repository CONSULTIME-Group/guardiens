update public.breed_profiles
set difficulty_level = regexp_replace(difficulty_level, '^(Exigeant|Modéré|Facile)\s*,\s*', '\1. ')
where (species = 'dog' and breed = 'cane corso' and difficulty_level ~ '^Exigeant\s*,')
   or (species = 'farm_animal' and breed = 'poule pondeuse' and difficulty_level ~ '^Modéré\s*,');