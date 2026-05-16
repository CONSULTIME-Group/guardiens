-- RPC sécurisé pour la dépublication d'une annonce.
-- Centralise les vérifications côté serveur :
--   * l'appelant doit être authentifié
--   * l'appelant doit être le propriétaire OU admin
--   * l'annonce doit exister
--   * son statut doit être 'published' (pas confirmed/cancelled/draft/expired)
--   * la date de fin ne doit pas être passée
-- Effets de bord (atomiques) :
--   * passage status = 'draft'
--   * cleanup : applications encore actives (pending/viewed/discussing) → 'cancelled'
-- Retourne le nombre de candidatures clôturées.
CREATE OR REPLACE FUNCTION public.unpublish_sit(p_sit_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_end_date date;
  v_cancelled integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  SELECT user_id, status::text, end_date
    INTO v_owner, v_status, v_end_date
  FROM public.sits
  WHERE id = p_sit_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'SIT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_owner <> v_uid AND NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;

  IF v_status <> 'published' THEN
    RAISE EXCEPTION 'INVALID_STATUS:%', v_status USING ERRCODE = 'P0001';
  END IF;

  IF v_end_date IS NOT NULL AND v_end_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'SIT_ENDED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.sits
     SET status = 'draft'
   WHERE id = p_sit_id;

  WITH cancelled_apps AS (
    UPDATE public.applications
       SET status = 'cancelled'
     WHERE sit_id = p_sit_id
       AND status IN ('pending', 'viewed', 'discussing')
    RETURNING 1
  )
  SELECT count(*) INTO v_cancelled FROM cancelled_apps;

  RETURN v_cancelled;
END;
$$;

REVOKE ALL ON FUNCTION public.unpublish_sit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unpublish_sit(uuid) TO authenticated;