CREATE TABLE IF NOT EXISTS public.worker_locks (
  lock_key text PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  locked_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.worker_locks TO service_role;
ALTER TABLE public.worker_locks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.try_acquire_worker_lock(
  p_lock_key text,
  p_ttl_seconds integer DEFAULT 120,
  p_owner text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acquired boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('worker_locks:' || p_lock_key));

  INSERT INTO public.worker_locks (lock_key, locked_until, locked_by, updated_at)
  VALUES (p_lock_key, now() + make_interval(secs => greatest(p_ttl_seconds, 5)), p_owner, now())
  ON CONFLICT (lock_key) DO UPDATE
    SET locked_until = now() + make_interval(secs => greatest(p_ttl_seconds, 5)),
        locked_by = p_owner,
        updated_at = now()
    WHERE public.worker_locks.locked_until <= now()
  RETURNING true INTO v_acquired;

  RETURN coalesce(v_acquired, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_worker_lock(p_lock_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.worker_locks
     SET locked_until = now() - interval '1 second', updated_at = now()
   WHERE lock_key = p_lock_key
  RETURNING true;
$$;

REVOKE ALL ON FUNCTION public.try_acquire_worker_lock(text, integer, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_worker_lock(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_acquire_worker_lock(text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_worker_lock(text) TO service_role;