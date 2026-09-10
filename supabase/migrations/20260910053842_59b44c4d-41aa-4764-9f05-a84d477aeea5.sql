CREATE TABLE public.alma_moods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mood TEXT NOT NULL CHECK (mood IN ('petillante','pelotonnee','reveuse','chiffonnee','attentive','endormie')),
  content TEXT NOT NULL,
  weather_condition TEXT,
  season TEXT,
  time_of_day TEXT,
  weight INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.alma_moods IS 'Carnet des humeurs d''Alma (lot 2). Une ligne = une phrase d''ambiance, jamais une reponse a une question.';

CREATE INDEX idx_alma_moods_mood_active ON public.alma_moods (mood, active);

GRANT SELECT ON public.alma_moods TO authenticated;
GRANT ALL ON public.alma_moods TO service_role;

ALTER TABLE public.alma_moods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read alma moods"
ON public.alma_moods FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert alma moods"
ON public.alma_moods FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update alma moods"
ON public.alma_moods FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete alma moods"
ON public.alma_moods FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.alma_mood_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_id UUID NOT NULL REFERENCES public.alma_moods(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.alma_mood_views IS 'Historique des humeurs affichees. Sert a la non repetition sur 30 jours et aux vues admin.';

CREATE INDEX idx_alma_mood_views_user_created ON public.alma_mood_views (user_id, created_at DESC);
CREATE INDEX idx_alma_mood_views_mood_created ON public.alma_mood_views (mood_id, created_at DESC);

GRANT SELECT ON public.alma_mood_views TO authenticated;
GRANT ALL ON public.alma_mood_views TO service_role;

ALTER TABLE public.alma_mood_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own alma mood views"
ON public.alma_mood_views FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.alma_weather_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_key TEXT NOT NULL UNIQUE,
  condition TEXT NOT NULL,
  temperature NUMERIC,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.alma_weather_cache IS 'Cache meteo Open-Meteo, cle = latitude et longitude arrondies au dixieme de degre. Aucune donnee personnelle.';

GRANT ALL ON public.alma_weather_cache TO service_role;

ALTER TABLE public.alma_weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read alma weather cache"
ON public.alma_weather_cache FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.alma_conversations ADD COLUMN IF NOT EXISTS input_mode TEXT;
COMMENT ON COLUMN public.alma_conversations.input_mode IS 'voice ou keyboard, renseigne par le composeur du dock.';

CREATE OR REPLACE FUNCTION public.get_alma_mood(
  p_user_id uuid,
  p_weather text DEFAULT NULL,
  p_season text DEFAULT NULL,
  p_time_of_day text DEFAULT NULL,
  p_mood text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mood text;
  v_row public.alma_moods%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501', MESSAGE = 'unauthorized';
  END IF;

  -- Phase 1 : une humeur eligible, tiree uniformement parmi les humeurs qui
  -- ont encore au moins une ligne jamais vue par cette personne sous 30 jours.
  SELECT m.mood
    INTO v_mood
  FROM public.alma_moods m
  WHERE m.active = true
    AND (p_mood IS NULL OR m.mood = p_mood)
    AND (m.weather_condition IS NULL OR m.weather_condition = p_weather)
    AND (m.season IS NULL OR m.season = p_season)
    AND (m.time_of_day IS NULL OR m.time_of_day = p_time_of_day)
    AND NOT EXISTS (
      SELECT 1 FROM public.alma_mood_views v
      WHERE v.user_id = p_user_id
        AND v.mood_id = m.id
        AND v.created_at > now() - interval '30 days'
    )
  GROUP BY m.mood
  ORDER BY random() ASC
  LIMIT 1;

  IF v_mood IS NULL THEN
    RETURN NULL;
  END IF;

  -- Phase 2 : tirage pondere par weight a l'interieur de l'humeur retenue.
  SELECT *
    INTO v_row
  FROM public.alma_moods m
  WHERE m.active = true
    AND m.mood = v_mood
    AND (m.weather_condition IS NULL OR m.weather_condition = p_weather)
    AND (m.season IS NULL OR m.season = p_season)
    AND (m.time_of_day IS NULL OR m.time_of_day = p_time_of_day)
    AND NOT EXISTS (
      SELECT 1 FROM public.alma_mood_views v
      WHERE v.user_id = p_user_id
        AND v.mood_id = m.id
        AND v.created_at > now() - interval '30 days'
    )
  ORDER BY (-ln(random()) / GREATEST(m.weight, 1)) ASC
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.alma_mood_views (user_id, mood_id, mood)
  VALUES (p_user_id, v_row.id, v_row.mood);

  RETURN jsonb_build_object(
    'id', v_row.id,
    'mood', v_row.mood,
    'content', v_row.content
  );
END
$function$;

GRANT EXECUTE ON FUNCTION public.get_alma_mood(uuid, text, text, text, text) TO authenticated;