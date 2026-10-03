-- File privee persistante : les anciennes adresses survivent aux suppressions.
CREATE TABLE public.seo_url_outbox (
  path text PRIMARY KEY CHECK (path ~ '^/[a-zA-Z0-9_/-]*$' AND path NOT LIKE '//%' AND path NOT LIKE '%/../%'),
  dirty_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  first_dirty_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX seo_url_outbox_oldest ON public.seo_url_outbox(first_dirty_at, path);
ALTER TABLE public.seo_url_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seo_url_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_url_outbox TO service_role;

-- Budget local conservateur, chaque tentative reserve sa place avant le reseau.
CREATE TABLE public.seo_render_budget (
  month date PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);
CREATE TABLE public.seo_consumer_lease (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  holder uuid,
  expires_at timestamptz NOT NULL DEFAULT '-infinity'
);
INSERT INTO public.seo_consumer_lease(singleton) VALUES (true);
ALTER TABLE public.seo_render_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_consumer_lease ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seo_render_budget, public.seo_consumer_lease FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.seo_render_budget, public.seo_consumer_lease TO service_role;

CREATE FUNCTION public.enqueue_seo_url(p_path text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_path IS NULL THEN RETURN; END IF;
  INSERT INTO public.seo_url_outbox(path) VALUES (p_path)
  ON CONFLICT(path) DO UPDATE SET dirty_at=GREATEST(clock_timestamp(),seo_url_outbox.dirty_at+interval '1 microsecond'),next_attempt_at=clock_timestamp();
END $$;

CREATE FUNCTION public.seo_enqueue_urls(p_paths text[]) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p text;
BEGIN
  IF cardinality(p_paths) IS NULL OR cardinality(p_paths)<1 OR cardinality(p_paths)>200 THEN
    RAISE EXCEPTION 'Provide between 1 and 200 paths';
  END IF;
  FOREACH p IN ARRAY p_paths LOOP
    IF p IS NULL THEN RAISE EXCEPTION 'Invalid public path'; END IF;
    PERFORM public.enqueue_seo_url(p);
  END LOOP;
  RETURN cardinality(p_paths);
END $$;
REVOKE ALL ON FUNCTION public.seo_enqueue_urls(text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seo_enqueue_urls(text[]) TO service_role;

CREATE FUNCTION public.seo_acquire_consumer(p_holder uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE acquired boolean;
BEGIN
  UPDATE public.seo_consumer_lease SET holder=p_holder,expires_at=clock_timestamp()+interval '5 minutes'
   WHERE singleton AND (expires_at<clock_timestamp() OR holder=p_holder);
  acquired := FOUND;
  RETURN acquired;
END $$;

CREATE FUNCTION public.seo_reserve_render(p_holder uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE m date := date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')::date;
BEGIN
  UPDATE public.seo_consumer_lease SET expires_at=clock_timestamp()+interval '5 minutes'
   WHERE singleton AND holder=p_holder AND expires_at>clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'SEO consumer lease expired'; END IF;
  INSERT INTO public.seo_render_budget(month,attempts)
  SELECT m,count(*)::integer FROM public.prerender_recache_log
   WHERE created_at>=m::timestamp AT TIME ZONE 'UTC'
  ON CONFLICT(month) DO NOTHING;
  UPDATE public.seo_render_budget SET attempts=attempts+1 WHERE month=m AND attempts<18000;
  RETURN FOUND;
END $$;

CREATE FUNCTION public.seo_release_consumer(p_holder uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  UPDATE public.seo_consumer_lease SET holder=NULL,expires_at='-infinity' WHERE singleton AND holder=p_holder;
$$;

CREATE FUNCTION public.queue_owner_public_sits(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id,slug FROM public.sits WHERE user_id=p_user AND status::text<>'draft' LOOP
    PERFORM public.enqueue_seo_url('/annonces/'||COALESCE(NULLIF(r.slug,''),r.id::text));
    PERFORM public.enqueue_seo_url('/annonces/'||r.id);
  END LOOP;
  IF FOUND THEN PERFORM public.enqueue_seo_url('/annonces'); END IF;
END $$;

CREATE FUNCTION public.queue_property_seo_dependency() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old_row jsonb; new_row jsonb; r jsonb; u uuid; pid uuid;
BEGIN
  IF TG_OP<>'INSERT' THEN old_row:=to_jsonb(OLD); END IF;
  IF TG_OP<>'DELETE' THEN new_row:=to_jsonb(NEW); END IF;
  IF TG_OP='UPDATE' AND (old_row-ARRAY['created_at','caption']) IS NOT DISTINCT FROM
     (new_row-ARRAY['created_at','caption']) THEN RETURN NEW; END IF;
  FOREACH r IN ARRAY ARRAY[old_row,new_row] LOOP
    IF r IS NULL THEN CONTINUE; END IF;
    IF TG_TABLE_NAME='pets' THEN
      pid:=(r->>'property_id')::uuid;
      SELECT user_id INTO u FROM public.properties WHERE id=pid;
    ELSE u:=(r->>'user_id')::uuid; END IF;
    IF u IS NOT NULL THEN
      PERFORM public.queue_owner_public_sits(u);
      PERFORM public.enqueue_seo_url('/gardiens/'||u);
      PERFORM public.enqueue_seo_url('/');
    END IF;
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.queue_breed_seo_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r jsonb; old_row jsonb; new_row jsonb; k text;
BEGIN
  IF TG_OP<>'INSERT' THEN old_row:=to_jsonb(OLD); END IF;
  IF TG_OP<>'DELETE' THEN new_row:=to_jsonb(NEW); END IF;
  IF TG_OP='UPDATE' AND old_row-'generated_at' IS NOT DISTINCT FROM new_row-'generated_at' THEN RETURN NEW; END IF;
  FOREACH r IN ARRAY ARRAY[old_row,new_row] LOOP
    IF r IS NULL THEN CONTINUE; END IF;
    k:=trim(both '-' from regexp_replace(replace(replace(lower(public.unaccent(r->>'breed')),'œ','oe'),'æ','ae'),'[^a-z0-9]+','-','g'));
    PERFORM public.enqueue_seo_url('/races/'||lower(r->>'species')||'-'||k);
  END LOOP;
  PERFORM public.enqueue_seo_url('/races');
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

-- Pas de contenu membre dans la file. Seulement des chemins publics.
CREATE FUNCTION public.queue_public_seo_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old_row jsonb; new_row jsonb; r jsonb; fields text[]; k text;
        prefix text := TG_ARGV[0]; hub text := TG_ARGV[1]; old_path text; new_path text;
        legacy boolean := TG_TABLE_NAME IN ('articles','seo_city_pages','city_guides','seo_department_pages','profiles');
        dirty_advanced boolean := false; s text;
BEGIN
  IF TG_OP<>'INSERT' THEN old_row:=to_jsonb(OLD); END IF;
  IF TG_OP<>'DELETE' THEN new_row:=to_jsonb(NEW); END IF;
  fields:=string_to_array(TG_ARGV[2],',');
  IF TG_OP='UPDATE' THEN
    dirty_advanced := (new_row->>'seo_dirty_at') IS NOT NULL AND (new_row->>'seo_dirty_at') IS DISTINCT FROM (old_row->>'seo_dirty_at');
    IF NOT EXISTS (SELECT 1 FROM unnest(fields) AS f WHERE old_row->f IS DISTINCT FROM new_row->f) THEN
      IF TG_TABLE_NAME='profiles' AND dirty_advanced THEN
        PERFORM public.enqueue_seo_url('/'); PERFORM public.enqueue_seo_url('/house-sitting');
      END IF;
      RETURN NEW;
    END IF;
  END IF;
  FOREACH r IN ARRAY ARRAY[old_row,new_row] LOOP
    IF r IS NULL THEN CONTINUE; END IF;
    IF TG_TABLE_NAME='profiles' THEN k:=r->>'id';
    ELSE k:=COALESCE(NULLIF(r->>'slug',''),r->>'id'); END IF;
    IF TG_TABLE_NAME='small_missions' THEN
      prefix:=CASE WHEN r->>'category'='projet' THEN '/projets/' ELSE '/petites-missions/' END;
      -- La route historique et la variante UUID peuvent avoir leur propre copie.
      PERFORM public.enqueue_seo_url('/petites-missions/'||(r->>'id'));
      PERFORM public.enqueue_seo_url('/projets/'||(r->>'id'));
      IF r->>'category'='projet' AND r->>'slug' IS NOT NULL THEN
        PERFORM public.enqueue_seo_url('/petites-missions/'||(r->>'slug'));
      END IF;
    ELSIF TG_TABLE_NAME='sits' THEN
      PERFORM public.enqueue_seo_url('/annonces/'||(r->>'id'));
    END IF;
    IF TG_TABLE_NAME='profiles' THEN
      FOR s IN SELECT slug FROM public.seo_city_pages WHERE city=r->>'city' LOOP
        PERFORM public.enqueue_seo_url('/house-sitting/'||s);
      END LOOP;
      FOR s IN SELECT slug FROM public.city_guides WHERE city=r->>'city' LOOP
        PERFORM public.enqueue_seo_url('/guides/'||s);
      END LOOP;
      PERFORM public.queue_owner_public_sits((r->>'id')::uuid);
    END IF;
    IF r=old_row THEN old_path:=prefix||k; ELSE new_path:=prefix||k; END IF;
  END LOOP;
  IF TG_OP='DELETE' OR old_path IS DISTINCT FROM new_path THEN
    PERFORM public.enqueue_seo_url(old_path);
  END IF;
  -- Les lignes porteuses d'un marqueur restent consommees par leur famille.
  IF NOT legacy OR TG_OP='INSERT' OR new_row->>'seo_dirty_at' IS NULL THEN
    PERFORM public.enqueue_seo_url(new_path);
  END IF;
  PERFORM public.enqueue_seo_url(hub);
  PERFORM public.enqueue_seo_url('/');
  IF TG_TABLE_NAME='small_missions' THEN
    PERFORM public.enqueue_seo_url('/projets'); PERFORM public.enqueue_seo_url('/petites-missions');
  END IF;
  IF TG_TABLE_NAME='profiles' THEN PERFORM public.enqueue_seo_url('/house-sitting'); END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

-- Dependance : une galerie, un avis ou un ecusson modifie la fiche publique.
CREATE FUNCTION public.queue_profile_seo_dependency() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old_row jsonb; new_row jsonb; r jsonb; u uuid;
BEGIN
  IF TG_OP<>'INSERT' THEN old_row:=to_jsonb(OLD); END IF;
  IF TG_OP<>'DELETE' THEN new_row:=to_jsonb(NEW); END IF;
  IF TG_OP='UPDATE' AND (old_row-ARRAY['updated_at','created_at','caption','sensitivities']) IS NOT DISTINCT FROM
     (new_row-ARRAY['updated_at','created_at','caption','sensitivities']) THEN RETURN NEW; END IF;
  FOREACH r IN ARRAY ARRAY[old_row,new_row] LOOP
    IF r IS NULL THEN CONTINUE; END IF;
    u:=(r->>TG_ARGV[0])::uuid;
    IF u IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id=u) THEN
      IF EXISTS(SELECT 1 FROM public.profiles WHERE id=u AND seo_dirty_at IS NULL) THEN
        PERFORM public.enqueue_seo_url('/gardiens/'||u);
      END IF;
      PERFORM public.enqueue_seo_url('/'); PERFORM public.enqueue_seo_url('/house-sitting');
      PERFORM public.queue_owner_public_sits(u);
    END IF;
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.queue_guide_place_seo_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE gids uuid[]; gid uuid; s text;
BEGIN
  IF TG_OP='INSERT' THEN gids:=ARRAY[NEW.city_guide_id];
  ELSIF TG_OP='DELETE' THEN gids:=ARRAY[OLD.city_guide_id];
  ELSE
    IF (to_jsonb(OLD)-ARRAY['created_at','google_rating_attempted_at']) IS NOT DISTINCT FROM
       (to_jsonb(NEW)-ARRAY['created_at','google_rating_attempted_at']) THEN RETURN NEW; END IF;
    gids:=ARRAY[OLD.city_guide_id,NEW.city_guide_id];
  END IF;
  FOREACH gid IN ARRAY gids LOOP
    SELECT slug INTO s FROM public.city_guides WHERE id=gid;
    IF s IS NOT NULL THEN PERFORM public.enqueue_seo_url('/guides/'||s); END IF;
  END LOOP;
  PERFORM public.enqueue_seo_url('/guides');
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER seo_url_outbox_articles AFTER INSERT OR UPDATE OR DELETE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.queue_public_seo_change('/actualites/','/actualites','slug,title,excerpt,content,cover_image_url,category,tags,author_name,published,published_at,meta_title,meta_description,canonical_url,hero_image_alt,internal_links,noindex');
CREATE TRIGGER seo_url_outbox_cities AFTER INSERT OR UPDATE OR DELETE ON public.seo_city_pages FOR EACH ROW EXECUTE FUNCTION public.queue_public_seo_change('/house-sitting/','/house-sitting','slug,city,department,h1_title,intro_text,content,cover_image_url,published,noindex,meta_title,meta_description,canonical_url,excerpt,sitter_count,active_sits_count,nearby_sitter_count,allow_nearby_indexing,aggregate_cities');
CREATE TRIGGER seo_url_outbox_guides AFTER INSERT OR UPDATE OR DELETE ON public.city_guides FOR EACH ROW EXECUTE FUNCTION public.queue_public_seo_change('/guides/','/guides','slug,city,postal_code,intro,ideal_for,department,published,leash_rule,leash_rule_source');
CREATE TRIGGER seo_url_outbox_departments AFTER INSERT OR UPDATE OR DELETE ON public.seo_department_pages FOR EACH ROW EXECUTE FUNCTION public.queue_public_seo_change('/departement/','/departement','slug,department,region,h1_title,intro_text,meta_title,meta_description,highlights,published,noindex,sitter_count,active_sits_count');
CREATE TRIGGER seo_url_outbox_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.queue_public_seo_change('/gardiens/','/house-sitting','role,account_status,first_name,city,bio,avatar_url,identity_verified,postal_code,profile_completion,departement_code,certifications,is_founder,completed_sits_count,hero_image_index');
CREATE TRIGGER seo_url_outbox_sits AFTER INSERT OR UPDATE OR DELETE ON public.sits FOR EACH ROW EXECUTE FUNCTION public.queue_public_seo_change('/annonces/','/annonces','slug,title,property_id,start_date,end_date,flexible_dates,specific_expectations,status,is_urgent,environments,owner_message,daily_routine,cover_photo_url,city,country,accepting_applications,moderation_hidden_at,hidden_at,accepts_sitter_pets,accepts_sitter_children');
CREATE TRIGGER seo_url_outbox_missions AFTER INSERT OR UPDATE OR DELETE ON public.small_missions FOR EACH ROW EXECUTE FUNCTION public.queue_public_seo_change('/petites-missions/','/petites-missions','slug,title,description,category,exchange_offer,city,postal_code,date_needed,end_date,duration_estimate,status,photos,mission_type,pet_species,pet_size,moderation_hidden_at,hidden_at,hebergement,repas,ce_que_vous_apprendrez,nature_projet,savoir_faire_attendus,savoir_faire_transmis,offre,mois_accueil,accepting_applications');
CREATE TRIGGER seo_url_outbox_associations AFTER INSERT OR UPDATE OR DELETE ON public.animal_associations FOR EACH ROW EXECUTE FUNCTION public.queue_public_seo_change('/associations/','/associations','slug,name,association_type,city,postal_code,departement_code,species,description,needs,website_url,photos,status,consent_status,logo_url,tagline,key_figures,press,needs_details');
CREATE TRIGGER zz_seo_url_outbox_sitter_details AFTER INSERT OR UPDATE OR DELETE ON public.sitter_profiles FOR EACH ROW EXECUTE FUNCTION public.queue_profile_seo_dependency('user_id');
CREATE TRIGGER zz_seo_url_outbox_sitter_gallery AFTER INSERT OR UPDATE OR DELETE ON public.sitter_gallery FOR EACH ROW EXECUTE FUNCTION public.queue_profile_seo_dependency('user_id');
CREATE TRIGGER seo_url_outbox_reviews AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.queue_profile_seo_dependency('reviewee_id');
CREATE TRIGGER seo_url_outbox_badges AFTER INSERT OR UPDATE OR DELETE ON public.badge_attributions FOR EACH ROW EXECUTE FUNCTION public.queue_profile_seo_dependency('user_id');
CREATE TRIGGER seo_url_outbox_guide_places AFTER INSERT OR UPDATE OR DELETE ON public.city_guide_places FOR EACH ROW EXECUTE FUNCTION public.queue_guide_place_seo_change();

CREATE TRIGGER seo_url_outbox_properties AFTER INSERT OR UPDATE OR DELETE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.queue_property_seo_dependency();
CREATE TRIGGER seo_url_outbox_pets AFTER INSERT OR UPDATE OR DELETE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.queue_property_seo_dependency();
CREATE TRIGGER seo_url_outbox_owner_gallery AFTER INSERT OR UPDATE OR DELETE ON public.owner_gallery FOR EACH ROW EXECUTE FUNCTION public.queue_property_seo_dependency();
CREATE TRIGGER seo_url_outbox_breeds AFTER INSERT OR UPDATE OR DELETE ON public.breed_profiles FOR EACH ROW EXECUTE FUNCTION public.queue_breed_seo_change();
REVOKE ALL ON FUNCTION public.queue_owner_public_sits(uuid),public.queue_property_seo_dependency(),public.queue_breed_seo_change() FROM PUBLIC,anon,authenticated;

REVOKE ALL ON FUNCTION public.enqueue_seo_url(text),public.seo_acquire_consumer(uuid),public.seo_reserve_render(uuid),public.seo_release_consumer(uuid),public.queue_public_seo_change(),public.queue_profile_seo_dependency(),public.queue_guide_place_seo_change() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_seo_url(text),public.seo_acquire_consumer(uuid),public.seo_reserve_render(uuid),public.seo_release_consumer(uuid) TO service_role;
COMMENT ON TABLE public.seo_url_outbox IS 'Demandes privees de recache des anciennes URL, suppressions et hubs. Acquittement par path et dirty_at apres journalisation.';
COMMENT ON TABLE public.seo_render_budget IS 'Au plus 18000 tentatives mensuelles du consommateur Guardiens. Ne mesure pas les captures externes ni les autres domaines du compte partage.';

-- Sauvegarde avant remplacement du marqueur historique, aucune donnee metier.
CREATE TABLE public._backup_content_seo_trigger_20261003_2130 AS
SELECT oid::regprocedure::text AS signature,pg_get_functiondef(oid) AS definition,proacl
FROM pg_proc WHERE oid='public.trg_recache_prerender()'::regprocedure;
ALTER TABLE public._backup_content_seo_trigger_20261003_2130 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._backup_content_seo_trigger_20261003_2130 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public._backup_content_seo_trigger_20261003_2130 TO service_role;

CREATE OR REPLACE FUNCTION public.trg_recache_prerender() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE fields text[];
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'articles' THEN fields:=ARRAY['slug','published','canonical_url','noindex','meta_title','meta_description','content','title','excerpt','cover_image_url','category','tags','author_name','hero_image_alt','internal_links'];
    WHEN 'seo_city_pages' THEN fields:=ARRAY['slug','published','canonical_url','noindex','meta_title','meta_description','content','h1_title','intro_text','excerpt','cover_image_url','sitter_count','active_sits_count','nearby_sitter_count','allow_nearby_indexing','aggregate_cities'];
    WHEN 'seo_department_pages' THEN fields:=ARRAY['slug','published','noindex','meta_title','meta_description','h1_title','intro_text','highlights','sitter_count','active_sits_count'];
    WHEN 'city_guides' THEN fields:=ARRAY['slug','published','intro','ideal_for','leash_rule','leash_rule_source','city','department'];
    ELSE RETURN NEW;
  END CASE;
  IF EXISTS(SELECT 1 FROM unnest(fields) AS f WHERE to_jsonb(NEW)->f IS DISTINCT FROM to_jsonb(OLD)->f) THEN
    NEW.seo_dirty_at:=GREATEST(clock_timestamp(),OLD.seo_dirty_at+interval '1 microsecond');
  END IF;
  RETURN NEW;
END $$;

-- Les gabarits de toutes les familles publiques participent au detecteur.
CREATE FUNCTION public.seo_queue_template_family(p_family text,p_dry_run boolean) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r record; paths text[]; p text; n integer;
BEGIN
  IF p_family='sitters' THEN
    SELECT count(*)::integer INTO n FROM public.public_profiles;
    IF NOT p_dry_run THEN
      UPDATE public.profiles SET seo_dirty_at=GREATEST(clock_timestamp(),seo_dirty_at+interval '1 microsecond')
       WHERE id IN (SELECT id FROM public.public_profiles);
    END IF;
    RETURN n;
  ELSIF p_family='sits' THEN
    SELECT array_agg(DISTINCT urls.p) INTO paths FROM (
      SELECT '/annonces/'||COALESCE(NULLIF(slug,''),id::text) AS p FROM public.sits WHERE status::text<>'draft'
      UNION SELECT '/annonces/'||id AS p FROM public.sits WHERE status::text<>'draft'
    ) AS urls;
  ELSIF p_family IN ('missions','projets') THEN
    SELECT array_agg(DISTINCT urls.p) INTO paths FROM (
      SELECT CASE WHEN category::text='projet' THEN '/projets/' ELSE '/petites-missions/' END||COALESCE(NULLIF(slug,''),id::text) AS p
        FROM public.public_small_missions WHERE (category::text='projet')=(p_family='projets')
      UNION SELECT '/petites-missions/'||id AS p FROM public.public_small_missions WHERE (category::text='projet')=(p_family='projets')
      UNION SELECT '/projets/'||id AS p FROM public.public_small_missions WHERE category::text='projet' AND p_family='projets'
      UNION SELECT '/petites-missions/'||slug AS p FROM public.public_small_missions WHERE category::text='projet' AND p_family='projets' AND slug IS NOT NULL
    ) AS urls;
  ELSIF p_family='breeds' THEN
    SELECT array_agg('/races/'||lower(species)||'-'||trim(both '-' from
      regexp_replace(replace(replace(lower(public.unaccent(breed)),'œ','oe'),'æ','ae'),'[^a-z0-9]+','-','g')))
      INTO paths FROM public.breed_profiles;
  ELSIF p_family='associations' THEN
    SELECT array_agg('/associations/'||slug) INTO paths FROM public.public_animal_associations WHERE slug IS NOT NULL;
  ELSE RAISE EXCEPTION 'Unknown SEO family'; END IF;
  n:=COALESCE(cardinality(paths),0);
  IF NOT p_dry_run AND n>0 THEN
    FOREACH p IN ARRAY paths LOOP PERFORM public.enqueue_seo_url(p); END LOOP;
  END IF;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.seo_queue_template_family(text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seo_queue_template_family(text,boolean) TO service_role;

CREATE TABLE public._backup_seo_family_state_20261003_2130 AS
SELECT * FROM public.prerender_family_state;
ALTER TABLE public._backup_seo_family_state_20261003_2130 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._backup_seo_family_state_20261003_2130 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public._backup_seo_family_state_20261003_2130 TO service_role;
INSERT INTO public.prerender_family_state(family,last_hash,last_global_hash,last_marked_at)
SELECT f,NULL,NULL,NULL FROM unnest(ARRAY['sitters','sits','missions','projets','breeds','associations']) AS f
ON CONFLICT(family) DO NOTHING;