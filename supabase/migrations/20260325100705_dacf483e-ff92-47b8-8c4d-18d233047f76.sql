
-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_new_application boolean NOT NULL DEFAULT true,
  email_messages boolean NOT NULL DEFAULT true,
  email_reminders boolean NOT NULL DEFAULT true,
  email_sitter_suggestions boolean NOT NULL DEFAULT true,
  email_review_prompts boolean NOT NULL DEFAULT true,
  message_email_delay text NOT NULL DEFAULT '30min',
  profile_visibility text NOT NULL DEFAULT 'all',
  show_last_seen boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Account deletion requests table
CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  scheduled_deletion_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  cancelled_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion request" ON public.account_deletion_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deletion request" ON public.account_deletion_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deletion request" ON public.account_deletion_requests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
