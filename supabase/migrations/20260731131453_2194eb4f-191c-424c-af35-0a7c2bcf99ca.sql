ALTER TABLE public.alert_preferences ADD COLUMN IF NOT EXISTS source text;
CREATE INDEX IF NOT EXISTS idx_alert_preferences_source ON public.alert_preferences (source) WHERE source IS NOT NULL;