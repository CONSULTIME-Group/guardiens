-- View publique des conseils Alma : filtre stricte des types "conseils" seulement.
-- Les types usage_nudge, founder_anecdote, social_stat, animal_humor, city_did_you_know
-- restent réservés aux whispers Alma et ne sont PAS exposés ici.
CREATE OR REPLACE VIEW public.alma_public_tips
WITH (security_invoker = true) AS
SELECT
  id,
  fact_type,
  content,
  source_url,
  needs_pro_referral,
  seasonal_start_month,
  seasonal_end_month,
  context_filter
FROM public.alma_cultural_facts
WHERE active = true
  AND fact_type IN (
    'pet_care_tip',
    'dog_behavior_tip',
    'cat_behavior_tip',
    'home_care_tip',
    'seasonal_advice',
    'breed_did_you_know',
    'mutual_aid_tip'
  );

GRANT SELECT ON public.alma_public_tips TO anon, authenticated;
