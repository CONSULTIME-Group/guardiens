UPDATE public.profiles
SET city = NULLIF(
  btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(city, '\([^)]*\)', ' ', 'g'),
        '(^|[[:space:],;-])[0-9]{5}($|[[:space:],;-])', '\1 \2', 'g'
      ),
      '\s+', ' ', 'g'
    ),
    E' \t,;-'
  ), ''
)
WHERE city ~ '[()0-9]';

UPDATE public.sits
SET city = NULLIF(
  btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(city, '\([^)]*\)', ' ', 'g'),
        '(^|[[:space:],;-])[0-9]{5}($|[[:space:],;-])', '\1 \2', 'g'
      ),
      '\s+', ' ', 'g'
    ),
    E' \t,;-'
  ), ''
)
WHERE city ~ '[()0-9]';