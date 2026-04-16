-- Confirm all unconfirmed users' emails retroactively
-- The fixed trigger will fire and create role-specific profiles automatically
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmation_token = '',
    updated_at = NOW()
WHERE email_confirmed_at IS NULL
  AND confirmation_sent_at IS NOT NULL;