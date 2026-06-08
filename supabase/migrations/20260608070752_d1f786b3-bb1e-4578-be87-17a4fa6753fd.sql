
-- Merge duplicate breed_profiles and normalize references

-- 1) Update text references in dependent tables to canonical breed names
UPDATE public.pets SET breed = 'Maine Coon' WHERE lower(breed) = 'main coon';
UPDATE public.past_animals SET breed = 'Maine Coon' WHERE lower(breed) = 'main coon';
UPDATE public.sitter_gallery SET animal_breed = 'Maine Coon' WHERE lower(animal_breed) = 'main coon';

UPDATE public.pets SET breed = 'Européen' WHERE lower(breed) IN ('gouttière','european','européen tabby');
UPDATE public.past_animals SET breed = 'Européen' WHERE lower(breed) IN ('gouttière','european','européen tabby');
UPDATE public.sitter_gallery SET animal_breed = 'Européen' WHERE lower(animal_breed) IN ('gouttière','european','européen tabby');

UPDATE public.pets SET breed = 'Malinois' WHERE lower(breed) = 'berger belge malinois';
UPDATE public.past_animals SET breed = 'Malinois' WHERE lower(breed) = 'berger belge malinois';
UPDATE public.sitter_gallery SET animal_breed = 'Malinois' WHERE lower(animal_breed) = 'berger belge malinois';

UPDATE public.pets SET breed = 'Gris du Gabon' WHERE lower(breed) = 'perroquet gris du gabon';
UPDATE public.past_animals SET breed = 'Gris du Gabon' WHERE lower(breed) = 'perroquet gris du gabon';
UPDATE public.sitter_gallery SET animal_breed = 'Gris du Gabon' WHERE lower(animal_breed) = 'perroquet gris du gabon';

UPDATE public.articles SET related_breed = 'Maine Coon' WHERE lower(related_breed) = 'main coon';
UPDATE public.articles SET related_breed = 'Européen' WHERE lower(related_breed) IN ('gouttière','european','européen tabby');
UPDATE public.articles SET related_breed = 'Malinois' WHERE lower(related_breed) = 'berger belge malinois';
UPDATE public.articles SET related_breed = 'Gris du Gabon' WHERE lower(related_breed) = 'perroquet gris du gabon';

-- 2) Delete duplicate breed_profiles entries (keep canonical)
DELETE FROM public.breed_profiles
WHERE (species='bird'  AND breed='perroquet gris du gabon')
   OR (species='cat'   AND breed IN ('european','européen tabby','gouttière','main coon'))
   OR (species='dog'   AND breed='berger belge malinois');
