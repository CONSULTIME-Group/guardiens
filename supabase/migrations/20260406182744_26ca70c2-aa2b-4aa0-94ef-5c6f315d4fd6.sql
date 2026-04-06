
-- 1. Add new enum values
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trial';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'past_due';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'monthly';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'one_shot';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'prorata';

-- 2. Subscriptions: new columns + unique constraint
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS subscription_type text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS trial_end timestamptz,
  ADD COLUMN IF NOT EXISTS admin_override boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_override_note text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3. Profiles: add missing columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_months_credit integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id);

-- 4. Table referrals
CREATE TABLE IF NOT EXISTS referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid REFERENCES profiles(id),
  referred_id uuid REFERENCES profiles(id),
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','activated','rewarded','failed')),
  triggered_at timestamptz,
  reward_applied_referrer boolean DEFAULT false,
  reward_applied_referred boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referred_id)
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_referrals"
  ON referrals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Table admin_subscription_logs
CREATE TABLE IF NOT EXISTS admin_subscription_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  params jsonb,
  performed_by uuid REFERENCES profiles(id),
  performed_at timestamptz DEFAULT now(),
  stripe_called boolean DEFAULT false,
  note text NOT NULL,
  result jsonb
);
ALTER TABLE admin_subscription_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only_logs"
  ON admin_subscription_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Function apply_referral_reward
CREATE OR REPLACE FUNCTION apply_referral_reward(p_referred_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  SELECT referred_by INTO v_referrer_id
  FROM profiles WHERE id = p_referred_id;
  IF v_referrer_id IS NULL THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM referrals
    WHERE referred_id = p_referred_id AND status = 'rewarded'
  ) THEN RETURN; END IF;

  -- Reward referred: +30 days
  UPDATE subscriptions
  SET expires_at = expires_at + interval '30 days'
  WHERE user_id = p_referred_id AND status IN ('active','trial');

  IF NOT FOUND THEN
    UPDATE profiles
    SET free_months_credit = free_months_credit + 1
    WHERE id = p_referred_id;
  END IF;

  -- Reward referrer: +30 days
  UPDATE subscriptions
  SET expires_at = expires_at + interval '30 days'
  WHERE user_id = v_referrer_id AND status IN ('active','trial');

  IF NOT FOUND THEN
    UPDATE profiles
    SET free_months_credit = free_months_credit + 1
    WHERE id = v_referrer_id;
  END IF;

  -- Mark as rewarded
  INSERT INTO referrals (referrer_id, referred_id, status, triggered_at, reward_applied_referrer, reward_applied_referred)
  VALUES (v_referrer_id, p_referred_id, 'rewarded', now(), true, true)
  ON CONFLICT (referred_id) DO UPDATE SET
    status = 'rewarded',
    triggered_at = now(),
    reward_applied_referrer = true,
    reward_applied_referred = true;
END;
$$;
