-- Store the shared secret in vault so the trigger can read it.
SELECT vault.create_secret(
  '61682048a8eca26a939009aa7e0a390efc0786cc3ed1a93d09fda94c5eb9ec0b',
  'GEOCODE_PROFILE_SECRET',
  'Shared secret between trg_geocode_profile trigger and geocode-profile edge function'
);

-- Cleanup temporary debug helpers
DROP FUNCTION IF EXISTS public._debug_geocode_secret_len();
DROP FUNCTION IF EXISTS public._debug_vault_names();

-- Kick off backfill (touching postal_code re-fires the trigger)
UPDATE public.profiles
SET postal_code = postal_code
WHERE city IS NOT NULL
  AND postal_code IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL);