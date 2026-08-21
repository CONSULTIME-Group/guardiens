CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER FUNCTION public.create_email_deep_link(text, text, uuid, text, uuid)
  SET search_path = public, extensions;

ALTER FUNCTION public.issue_application_action_token(uuid, text)
  SET search_path = public, extensions;