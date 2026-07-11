DROP TRIGGER IF EXISTS trg_anon_ratelimit_contact_messages ON public.contact_messages;
CREATE TRIGGER trg_anon_ratelimit_contact_messages
  BEFORE INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_anon_insert_rate_limit('60');