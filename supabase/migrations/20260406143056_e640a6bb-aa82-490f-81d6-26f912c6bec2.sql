-- Add referral_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Generate referral codes for existing profiles that don't have one
UPDATE public.profiles
SET referral_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
WHERE referral_code IS NULL;

-- Set default for new profiles
ALTER TABLE public.profiles ALTER COLUMN referral_code SET DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);