-- Alignement des champs publics, sauvegarde avant remplacement de la fonction.
CREATE TABLE public._backup_content_seo_trigger_20261003_2235 AS
SELECT oid::regprocedure::text AS signature,pg_get_functiondef(oid) AS definition,proacl
FROM pg_proc WHERE oid='public.trg_recache_prerender()'::regprocedure;
ALTER TABLE public._backup_content_seo_trigger_20261003_2235 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._backup_content_seo_trigger_20261003_2235 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public._backup_content_seo_trigger_20261003_2235 TO service_role;

CREATE OR REPLACE FUNCTION public.trg_recache_prerender() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE fields text[];
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'articles' THEN fields:=ARRAY['slug','title','excerpt','content','cover_image_url','category','tags','author_name','published','published_at','meta_title','meta_description','canonical_url','hero_image_alt','internal_links','noindex'];
    WHEN 'seo_city_pages' THEN fields:=ARRAY['slug','city','department','h1_title','intro_text','content','cover_image_url','published','noindex','meta_title','meta_description','canonical_url','excerpt','sitter_count','active_sits_count','nearby_sitter_count','allow_nearby_indexing','aggregate_cities'];
    WHEN 'seo_department_pages' THEN fields:=ARRAY['slug','department','region','h1_title','intro_text','meta_title','meta_description','highlights','published','noindex','sitter_count','active_sits_count'];
    WHEN 'city_guides' THEN fields:=ARRAY['slug','city','postal_code','intro','ideal_for','department','published','leash_rule','leash_rule_source'];
    ELSE RETURN NEW;
  END CASE;
  IF EXISTS(SELECT 1 FROM unnest(fields) AS f WHERE to_jsonb(NEW)->f IS DISTINCT FROM to_jsonb(OLD)->f) THEN
    NEW.seo_dirty_at:=GREATEST(clock_timestamp(),OLD.seo_dirty_at+interval '1 microsecond');
  END IF;
  RETURN NEW;
END $$;

