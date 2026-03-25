
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Function to notify owners when a sitter becomes available
CREATE OR REPLACE FUNCTION public.notify_owners_sitter_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sitter_city text;
  sitter_name text;
  owner_record record;
BEGIN
  -- Only trigger when is_available changes from false to true
  IF NEW.is_available = true AND (OLD.is_available = false OR OLD.is_available IS NULL) THEN
    -- Get sitter info
    SELECT p.city, p.first_name INTO sitter_city, sitter_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    -- If sitter has no city, skip
    IF sitter_city IS NULL OR sitter_city = '' THEN
      RETURN NEW;
    END IF;

    -- Find owners in the same city
    FOR owner_record IN
      SELECT p.id, p.first_name
      FROM public.profiles p
      WHERE p.role IN ('owner', 'both')
        AND p.id != NEW.user_id
        AND lower(p.city) = lower(sitter_city)
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        owner_record.id,
        'sitter_available',
        'Nouveau gardien disponible',
        coalesce(sitter_name, 'Un gardien') || ' est maintenant disponible dans votre zone (' || sitter_city || ').',
        '/search'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on sitter_profiles update
CREATE TRIGGER on_sitter_available
  AFTER UPDATE ON public.sitter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owners_sitter_available();
