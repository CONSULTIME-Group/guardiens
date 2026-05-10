
CREATE TABLE public.sit_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sit_id uuid NOT NULL REFERENCES public.sits(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  sitter_id uuid NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  responded_at timestamptz,
  UNIQUE (sit_id, sitter_id),
  CHECK (owner_id <> sitter_id),
  CHECK (status IN ('sent','viewed','applied','declined'))
);

CREATE INDEX idx_sit_invitations_sitter ON public.sit_invitations(sitter_id, status);
CREATE INDEX idx_sit_invitations_owner ON public.sit_invitations(owner_id, created_at DESC);
CREATE INDEX idx_sit_invitations_sit ON public.sit_invitations(sit_id);

ALTER TABLE public.sit_invitations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_invitation_quota(_owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.sit_invitations
  WHERE owner_id = _owner_id
    AND created_at > now() - interval '24 hours';
  RETURN v_count < 20;
END;
$$;

CREATE POLICY "owners read own invitations"
  ON public.sit_invitations FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "owners insert invitations on own sits"
  ON public.sit_invitations FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.sits s
      WHERE s.id = sit_id
        AND s.user_id = auth.uid()
        AND s.status = 'published'
    )
    AND public.check_invitation_quota(auth.uid())
  );

CREATE POLICY "owners delete own invitations"
  ON public.sit_invitations FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "sitters read their invitations"
  ON public.sit_invitations FOR SELECT
  USING (sitter_id = auth.uid());

CREATE POLICY "sitters update their invitations"
  ON public.sit_invitations FOR UPDATE
  USING (sitter_id = auth.uid())
  WITH CHECK (sitter_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mark_invitation_applied()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sit_invitations
  SET status = 'applied', responded_at = now()
  WHERE sit_id = NEW.sit_id
    AND sitter_id = NEW.sitter_id
    AND status IN ('sent','viewed');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mark_invitation_applied
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.mark_invitation_applied();

CREATE OR REPLACE FUNCTION public.notify_sit_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sit_title text;
  v_owner_name text;
  v_owner_avatar text;
  v_city text;
BEGIN
  SELECT s.title INTO v_sit_title FROM public.sits s WHERE s.id = NEW.sit_id;
  SELECT p.first_name, p.avatar_url, p.city
    INTO v_owner_name, v_owner_avatar, v_city
  FROM public.profiles p WHERE p.id = NEW.owner_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
  VALUES (
    NEW.sitter_id,
    'sit_invitation',
    'Invitation à candidater',
    coalesce(v_owner_name, 'Un propriétaire')
      || ' vous invite à candidater pour « '
      || coalesce(v_sit_title, 'sa garde')
      || ' »'
      || coalesce(' à ' || v_city, '')
      || '.',
    '/sits/' || NEW.sit_id,
    v_owner_name,
    v_owner_avatar
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_sit_invitation
AFTER INSERT ON public.sit_invitations
FOR EACH ROW EXECUTE FUNCTION public.notify_sit_invitation();
