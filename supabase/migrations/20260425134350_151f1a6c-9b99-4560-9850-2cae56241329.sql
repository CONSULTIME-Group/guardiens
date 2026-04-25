-- 1) Retirer la policy SELECT admin générale sur applications
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;

-- 2) Fonction : compteurs par annonce (admin uniquement)
CREATE OR REPLACE FUNCTION public.admin_get_application_counts(p_sit_ids uuid[])
RETURNS TABLE(sit_id uuid, total integer, pending integer, accepted integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  RETURN QUERY
  SELECT
    a.sit_id,
    COUNT(*)::integer AS total,
    COUNT(*) FILTER (WHERE a.status IN ('pending', 'viewed', 'discussing'))::integer AS pending,
    COUNT(*) FILTER (WHERE a.status = 'accepted')::integer AS accepted
  FROM public.applications a
  WHERE a.sit_id = ANY(p_sit_ids)
  GROUP BY a.sit_id;
END;
$$;

-- 3) Fonction : détail des candidatures d'UNE annonce pour la fiche admin
--    Retourne uniquement : id, statut, date, gardien (id + prénom + avatar)
--    PAS de message, PAS de champs internes
CREATE OR REPLACE FUNCTION public.admin_get_sit_applications(p_sit_id uuid)
RETURNS TABLE(
  id uuid,
  status text,
  created_at timestamptz,
  sitter_id uuid,
  sitter_first_name text,
  sitter_avatar_url text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.status::text,
    a.created_at,
    a.sitter_id,
    p.first_name,
    p.avatar_url
  FROM public.applications a
  LEFT JOIN public.profiles p ON p.id = a.sitter_id
  WHERE a.sit_id = p_sit_id
  ORDER BY a.created_at DESC;
END;
$$;

-- 4) Fonction : gardien accepté pour une liste d'annonces (utilisé par AdminSitsManagement)
CREATE OR REPLACE FUNCTION public.admin_get_accepted_sitters(p_sit_ids uuid[])
RETURNS TABLE(
  sit_id uuid,
  sitter_id uuid,
  first_name text,
  last_name text,
  avatar_url text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  RETURN QUERY
  SELECT
    a.sit_id,
    a.sitter_id,
    p.first_name,
    p.last_name,
    p.avatar_url
  FROM public.applications a
  LEFT JOIN public.profiles p ON p.id = a.sitter_id
  WHERE a.sit_id = ANY(p_sit_ids)
    AND a.status = 'accepted';
END;
$$;

-- 5) Fonction : diagnostic admin — méta-données uniquement (pas de contenu)
CREATE OR REPLACE FUNCTION public.admin_get_applications_diagnostic()
RETURNS TABLE(
  id uuid,
  status text,
  created_at timestamptz,
  sit_id uuid,
  sitter_id uuid,
  sit_title text,
  sit_user_id uuid,
  sit_status text,
  sitter_first_name text,
  sitter_last_name text,
  owner_first_name text,
  owner_last_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Accès admin requis';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.status::text,
    a.created_at,
    a.sit_id,
    a.sitter_id,
    s.title,
    s.user_id,
    s.status::text,
    sp.first_name,
    sp.last_name,
    op.first_name,
    op.last_name
  FROM public.applications a
  LEFT JOIN public.sits s ON s.id = a.sit_id
  LEFT JOIN public.profiles sp ON sp.id = a.sitter_id
  LEFT JOIN public.profiles op ON op.id = s.user_id
  ORDER BY a.created_at DESC;
END;
$$;