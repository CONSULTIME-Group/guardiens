-- Remove duplicate FAQ entries (keep one of each pair)
DELETE FROM public.faq_entries WHERE id IN (
  '5b359850-e848-45d5-80bc-5ea4e79ca1e6',
  'b71bc16c-76fb-496f-946b-2919ce6354a5'
);