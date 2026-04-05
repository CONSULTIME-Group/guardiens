
-- 1. Fix avis_publics view: add security_invoker
ALTER VIEW public.avis_publics SET (security_invoker = true);

-- 2. Fix functions missing search_path
CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_cancellations(p_user_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF p_role = 'gardien' THEN
    UPDATE profiles
    SET cancellation_count = (
      SELECT COUNT(*) FROM sits s
      JOIN applications a ON a.sit_id = s.id AND a.status = 'accepted'
      WHERE a.sitter_id = p_user_id
        AND s.status = 'cancelled'
        AND s.cancelled_by = 'gardien'
    )
    WHERE id = p_user_id;
  ELSIF p_role = 'proprio' THEN
    UPDATE profiles
    SET cancellations_as_proprio = (
      SELECT COUNT(*) FROM sits
      WHERE user_id = p_user_id
        AND status = 'cancelled'
        AND cancelled_by = 'proprio'
    )
    WHERE id = p_user_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_update_cancellations()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  v_sitter_id uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.status = 'cancelled' THEN
    IF NEW.cancelled_by = 'gardien' THEN
      SELECT a.sitter_id INTO v_sitter_id
      FROM applications a
      WHERE a.sit_id = NEW.id AND a.status = 'accepted'
      LIMIT 1;
      IF v_sitter_id IS NOT NULL THEN
        PERFORM recalculate_cancellations(v_sitter_id, 'gardien');
      END IF;
    END IF;
    IF NEW.cancelled_by = 'proprio' THEN
      PERFORM recalculate_cancellations(NEW.user_id, 'proprio');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_cancellations_as_proprio()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.cancellations_as_proprio < 0 THEN
    RAISE EXCEPTION 'cancellations_as_proprio must be >= 0';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_min_gardien_sits()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.min_gardien_sits NOT IN (0, 1, 3, 5) THEN
    RAISE EXCEPTION 'min_gardien_sits must be 0, 1, 3 or 5';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Fix reviews INSERT policy: require sit participation
DROP POLICY IF EXISTS "Users can create reviews for their sits" ON public.reviews;
CREATE POLICY "Users can create reviews for their sits"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND (
    EXISTS (SELECT 1 FROM public.sits WHERE id = reviews.sit_id AND user_id = auth.uid() AND status = 'completed')
    OR EXISTS (SELECT 1 FROM public.applications WHERE sit_id = reviews.sit_id AND sitter_id = auth.uid() AND status = 'accepted')
  )
);

-- 4. Tighten breed_profiles INSERT (only service_role should insert, via edge functions)
DROP POLICY IF EXISTS "Authenticated can insert breed profiles" ON public.breed_profiles;
CREATE POLICY "Service role can insert breed profiles"
ON public.breed_profiles
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

-- 5. Tighten location_profiles INSERT
DROP POLICY IF EXISTS "Authenticated can insert location profiles" ON public.location_profiles;
CREATE POLICY "Service role can insert location profiles"
ON public.location_profiles
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

-- 6. Tighten geocode_cache INSERT
DROP POLICY IF EXISTS "Authenticated users can insert geocode cache" ON public.geocode_cache;
CREATE POLICY "Service role can insert geocode cache"
ON public.geocode_cache
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');
