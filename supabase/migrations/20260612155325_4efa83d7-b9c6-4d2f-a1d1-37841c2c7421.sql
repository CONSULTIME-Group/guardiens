DELETE FROM public.geocode_cache
WHERE normalized_name = 'marrakech'
  AND lat BETWEEN 48 AND 49
  AND lng BETWEEN 2 AND 3;

INSERT INTO public.geocode_cache (city_name, normalized_name, lat, lng)
VALUES ('MARRAKECH, Morocco', 'marrakech|morocco', 31.6258257, -7.9891608)
ON CONFLICT (normalized_name) DO UPDATE
SET city_name = EXCLUDED.city_name,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng;