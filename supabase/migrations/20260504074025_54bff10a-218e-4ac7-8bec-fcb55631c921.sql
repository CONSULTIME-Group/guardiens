ALTER TABLE seo_city_pages
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS hero_image_alt text,
  ADD COLUMN IF NOT EXISTS noindex boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS excerpt text;