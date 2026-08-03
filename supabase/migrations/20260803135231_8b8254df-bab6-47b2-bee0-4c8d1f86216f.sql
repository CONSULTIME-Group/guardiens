ALTER TABLE public._backup_fusion_conv_20260802 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_fusion_msg_20260802 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._backup_fusion_conv_20260802 FROM anon, authenticated;
REVOKE ALL ON public._backup_fusion_msg_20260802 FROM anon, authenticated;
GRANT ALL ON public._backup_fusion_conv_20260802 TO service_role;
GRANT ALL ON public._backup_fusion_msg_20260802 TO service_role;

ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.trg_indexnow_articles() SET search_path = public;
ALTER FUNCTION public.trg_recache_prerender() SET search_path = public;