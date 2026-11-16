-- Lot SRC4 (16/11/2026) : réponse déclarée à « Comment avez-vous connu Guardiens ? ».
-- Complète la source mesurée du lot SRC1 (profile_signup_sources) par ce que le
-- membre dit lui-même : partage privé, bouche à oreille, nom tapé après une vidéo,
-- réponse d'un assistant IA. Question facultative, une seule réponse par membre,
-- posée à l'étape d'accueil (OnboardingAffinity).
--
-- Une ligne par membre dans public.profile_declared_sources, écrite une seule fois
-- (clé primaire, ON CONFLICT DO NOTHING) par record_declared_source, pour le seul
-- membre connecté. Table fermée aux membres en lecture ; lecture réservée à
-- l'équipe par admin_declared_sources. Aucune donnée existante modifiée.
-- Rejouable. Repère : src4_source_declaree.
--
-- Les valeurs suivent DECLARED_SOURCE_VALUES de src/lib/declaredSource.ts.

CREATE TABLE IF NOT EXISTS public.profile_declared_sources (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  answer text NOT NULL CHECK (answer IN (
    'tiktok', 'instagram', 'facebook', 'groupe_facebook', 'youtube', 'linkedin',
    'google', 'assistant_ia', 'bouche_a_oreille', 'association', 'presse', 'autre'
  )),
  context text NOT NULL CHECK (context IN ('accueil', 'annonce')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_declared_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_declared_sources FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_declared_sources TO service_role;

CREATE INDEX IF NOT EXISTS profile_declared_sources_answer_idx
  ON public.profile_declared_sources (answer);

-- Écriture par le membre connecté, une seule fois. Ne lève jamais d'erreur pour
-- une valeur hors liste : rend false (src4_source_declaree).
CREATE OR REPLACE FUNCTION public.record_declared_source(p_answer text, p_context text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;
  IF p_answer IS NULL OR p_answer NOT IN (
    'tiktok', 'instagram', 'facebook', 'groupe_facebook', 'youtube', 'linkedin',
    'google', 'assistant_ia', 'bouche_a_oreille', 'association', 'presse', 'autre'
  ) THEN
    RETURN false;
  END IF;
  IF p_context IS NULL OR p_context NOT IN ('accueil', 'annonce') THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RETURN false;
  END IF;

  INSERT INTO public.profile_declared_sources (user_id, answer, context)
  VALUES (v_uid, p_answer, p_context)
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.record_declared_source(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_declared_source(text, text) TO authenticated, service_role;

-- Lecture équipe : réponses des membres inscrits sur la période (jours de Paris),
-- avec le nombre de ces membres qui ont publié au moins une annonce de garde.
-- Comptes supprimés et équipe exclus, comme admin_signup_sources.
CREATE OR REPLACE FUNCTION public.admin_declared_sources(p_from date, p_to date)
RETURNS TABLE (answer text, members bigint, with_published_sit bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH cohort AS (
    SELECT p.id
    FROM public.profiles p
    WHERE p.created_at >= (p_from::timestamp AT TIME ZONE 'Europe/Paris')
      AND p.created_at < ((p_to + 1)::timestamp AT TIME ZONE 'Europe/Paris')
      AND (p.account_status IS NULL OR p.account_status::text <> 'deleted')
      AND NOT public.has_role(p.id, 'admin'::public.app_role)
  )
  SELECT
    coalesce(d.answer, 'sans_reponse') AS answer,
    count(*)::bigint AS members,
    count(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM public.sits s WHERE s.user_id = c.id AND s.published_at IS NOT NULL
    ))::bigint AS with_published_sit
  FROM cohort c
  LEFT JOIN public.profile_declared_sources d ON d.user_id = c.id
  GROUP BY 1
  ORDER BY 2 DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_declared_sources(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_declared_sources(date, date) TO authenticated, service_role;
