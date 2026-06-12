
-- IndexNow auto: seo_city_pages
CREATE OR REPLACE FUNCTION public.trg_indexnow_seo_city_pages()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.slug IS DISTINCT FROM NEW.slug OR OLD.updated_at IS DISTINCT FROM NEW.updated_at) THEN
    PERFORM public.trigger_indexnow_push('/house-sitting/' || NEW.slug, 'auto-city');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_indexnow_seo_city_pages ON public.seo_city_pages;
CREATE TRIGGER trg_indexnow_seo_city_pages AFTER INSERT OR UPDATE OF slug, updated_at ON public.seo_city_pages FOR EACH ROW EXECUTE FUNCTION public.trg_indexnow_seo_city_pages();

-- IndexNow auto: seo_department_pages
CREATE OR REPLACE FUNCTION public.trg_indexnow_seo_department_pages()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.slug IS DISTINCT FROM NEW.slug OR OLD.updated_at IS DISTINCT FROM NEW.updated_at) THEN
    PERFORM public.trigger_indexnow_push('/departement/' || NEW.slug, 'auto-department');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_indexnow_seo_department_pages ON public.seo_department_pages;
CREATE TRIGGER trg_indexnow_seo_department_pages AFTER INSERT OR UPDATE OF slug, updated_at ON public.seo_department_pages FOR EACH ROW EXECUTE FUNCTION public.trg_indexnow_seo_department_pages();

-- IndexNow auto: small_missions (only when open / published)
CREATE OR REPLACE FUNCTION public.trg_indexnow_small_missions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'open'::small_mission_status AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.trigger_indexnow_push('/petites-missions/' || NEW.id::text, 'auto-mission');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_indexnow_small_missions ON public.small_missions;
CREATE TRIGGER trg_indexnow_small_missions AFTER INSERT OR UPDATE OF status ON public.small_missions FOR EACH ROW EXECUTE FUNCTION public.trg_indexnow_small_missions();
