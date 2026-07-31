-- 1. Référentiel départements
CREATE TABLE public.departements (
  code text PRIMARY KEY,
  nom text NOT NULL,
  code_region text NOT NULL,
  nom_region text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departements TO anon, authenticated;
GRANT ALL ON public.departements TO service_role;
ALTER TABLE public.departements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departements_public_read" ON public.departements FOR SELECT USING (true);

INSERT INTO public.departements (code, nom, code_region, nom_region) VALUES
('10','Aube','GES','Grand Est'), ('11','Aude','OCC','Occitanie'), ('12','Aveyron','OCC','Occitanie'), ('13','Bouches-du-Rhône','PAC','Provence-Alpes-Côte d''Azur'), ('14','Calvados','NOR','Normandie'), ('15','Cantal','ARA','Auvergne-Rhône-Alpes'), ('16','Charente','NAQ','Nouvelle-Aquitaine'), ('17','Charente-Maritime','NAQ','Nouvelle-Aquitaine'), ('18','Cher','CVL','Centre-Val de Loire'), ('19','Corrèze','NAQ','Nouvelle-Aquitaine'), ('21','Côte-d''Or','BFC','Bourgogne-Franche-Comté'), ('22','Côtes-d''Armor','BRE','Bretagne'), ('23','Creuse','NAQ','Nouvelle-Aquitaine'), ('24','Dordogne','NAQ','Nouvelle-Aquitaine'), ('25','Doubs','BFC','Bourgogne-Franche-Comté'), ('26','Drôme','ARA','Auvergne-Rhône-Alpes'), ('27','Eure','NOR','Normandie'), ('28','Eure-et-Loir','CVL','Centre-Val de Loire'), ('29','Finistère','BRE','Bretagne'), ('30','Gard','OCC','Occitanie'), ('31','Haute-Garonne','OCC','Occitanie'), ('32','Gers','OCC','Occitanie'), ('33','Gironde','NAQ','Nouvelle-Aquitaine'), ('34','Hérault','OCC','Occitanie'), ('35','Ille-et-Vilaine','BRE','Bretagne'), ('36','Indre','CVL','Centre-Val de Loire'), ('37','Indre-et-Loire','CVL','Centre-Val de Loire'), ('38','Isère','ARA','Auvergne-Rhône-Alpes'), ('39','Jura','BFC','Bourgogne-Franche-Comté'), ('40','Landes','NAQ','Nouvelle-Aquitaine'), ('41','Loir-et-Cher','CVL','Centre-Val de Loire'), ('42','Loire','ARA','Auvergne-Rhône-Alpes'), ('43','Haute-Loire','ARA','Auvergne-Rhône-Alpes'), ('44','Loire-Atlantique','PDL','Pays de la Loire'), ('45','Loiret','CVL','Centre-Val de Loire'), ('46','Lot','OCC','Occitanie'), ('47','Lot-et-Garonne','NAQ','Nouvelle-Aquitaine'), ('48','Lozère','OCC','Occitanie'), ('49','Maine-et-Loire','PDL','Pays de la Loire'), ('50','Manche','NOR','Normandie'), ('51','Marne','GES','Grand Est'), ('52','Haute-Marne','GES','Grand Est'), ('53','Mayenne','PDL','Pays de la Loire'), ('54','Meurthe-et-Moselle','GES','Grand Est'), ('55','Meuse','GES','Grand Est'), ('56','Morbihan','BRE','Bretagne'), ('57','Moselle','GES','Grand Est'), ('58','Nièvre','BFC','Bourgogne-Franche-Comté'), ('59','Nord','HDF','Hauts-de-France'), ('60','Oise','HDF','Hauts-de-France'), ('61','Orne','NOR','Normandie'), ('62','Pas-de-Calais','HDF','Hauts-de-France'), ('63','Puy-de-Dôme','ARA','Auvergne-Rhône-Alpes'), ('64','Pyrénées-Atlantiques','NAQ','Nouvelle-Aquitaine'), ('65','Hautes-Pyrénées','OCC','Occitanie'), ('66','Pyrénées-Orientales','OCC','Occitanie'), ('67','Bas-Rhin','GES','Grand Est'), ('68','Haut-Rhin','GES','Grand Est'), ('69','Rhône','ARA','Auvergne-Rhône-Alpes'), ('70','Haute-Saône','BFC','Bourgogne-Franche-Comté'), ('71','Saône-et-Loire','BFC','Bourgogne-Franche-Comté'), ('72','Sarthe','PDL','Pays de la Loire'), ('73','Savoie','ARA','Auvergne-Rhône-Alpes'), ('74','Haute-Savoie','ARA','Auvergne-Rhône-Alpes'), ('75','Paris','IDF','Île-de-France'), ('76','Seine-Maritime','NOR','Normandie'), ('77','Seine-et-Marne','IDF','Île-de-France'), ('78','Yvelines','IDF','Île-de-France'), ('79','Deux-Sèvres','NAQ','Nouvelle-Aquitaine'), ('80','Somme','HDF','Hauts-de-France'), ('81','Tarn','OCC','Occitanie'), ('82','Tarn-et-Garonne','OCC','Occitanie'), ('83','Var','PAC','Provence-Alpes-Côte d''Azur'), ('84','Vaucluse','PAC','Provence-Alpes-Côte d''Azur'), ('85','Vendée','PDL','Pays de la Loire'), ('86','Vienne','NAQ','Nouvelle-Aquitaine'), ('87','Haute-Vienne','NAQ','Nouvelle-Aquitaine'), ('88','Vosges','GES','Grand Est'), ('89','Yonne','BFC','Bourgogne-Franche-Comté'), ('90','Territoire de Belfort','BFC','Bourgogne-Franche-Comté'), ('91','Essonne','IDF','Île-de-France'), ('92','Hauts-de-Seine','IDF','Île-de-France'), ('93','Seine-Saint-Denis','IDF','Île-de-France'), ('94','Val-de-Marne','IDF','Île-de-France'), ('95','Val-d''Oise','IDF','Île-de-France'), ('971','Guadeloupe','DOM','Outre-mer'), ('972','Martinique','DOM','Outre-mer'), ('973','Guyane','DOM','Outre-mer'), ('974','La Réunion','DOM','Outre-mer'), ('976','Mayotte','DOM','Outre-mer'), ('01','Ain','ARA','Auvergne-Rhône-Alpes'), ('02','Aisne','HDF','Hauts-de-France'), ('03','Allier','ARA','Auvergne-Rhône-Alpes'), ('04','Alpes-de-Haute-Provence','PAC','Provence-Alpes-Côte d''Azur'), ('05','Hautes-Alpes','PAC','Provence-Alpes-Côte d''Azur'), ('06','Alpes-Maritimes','PAC','Provence-Alpes-Côte d''Azur'), ('07','Ardèche','ARA','Auvergne-Rhône-Alpes'), ('08','Ardennes','GES','Grand Est'), ('09','Ariège','OCC','Occitanie'), ('2A','Corse-du-Sud','COR','Corse'), ('2B','Haute-Corse','COR','Corse');

CREATE INDEX idx_departements_region ON public.departements (code_region);

-- 2. Dérivation code postal vers département
CREATE OR REPLACE FUNCTION public.dept_code_from_postal(p_postal text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cp text;
  n integer;
BEGIN
  cp := regexp_replace(coalesce(p_postal, ''), '\s', '', 'g');
  IF cp !~ '^[0-9]{5}$' THEN
    RETURN NULL;
  END IF;
  IF left(cp, 2) = '97' OR left(cp, 2) = '98' THEN
    RETURN left(cp, 3);
  END IF;
  IF left(cp, 2) = '20' THEN
    n := cp::integer;
    IF n <= 20190 THEN RETURN '2A'; ELSE RETURN '2B'; END IF;
  END IF;
  RETURN left(cp, 2);
END;
$$;

-- 3. Colonnes persistées
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS departement_code text;
ALTER TABLE public.sits ADD COLUMN IF NOT EXISTS departement_code text;
CREATE INDEX IF NOT EXISTS idx_profiles_departement_code ON public.profiles (departement_code);
CREATE INDEX IF NOT EXISTS idx_sits_departement_code ON public.sits (departement_code);

CREATE OR REPLACE FUNCTION public.set_profile_departement_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_code text;
BEGIN
  v_code := public.dept_code_from_postal(NEW.postal_code);
  IF v_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.departements d WHERE d.code = v_code) THEN
    v_code := NULL;
  END IF;
  NEW.departement_code := v_code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_departement_code
BEFORE INSERT OR UPDATE OF postal_code ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_departement_code();

-- Les annonces n'ont pas de code postal propre : on hérite de celui du propriétaire.
CREATE OR REPLACE FUNCTION public.set_sit_departement_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT p.departement_code INTO NEW.departement_code
  FROM public.profiles p WHERE p.id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sits_departement_code
BEFORE INSERT OR UPDATE OF user_id ON public.sits
FOR EACH ROW EXECUTE FUNCTION public.set_sit_departement_code();

-- Propagation quand le propriétaire change de code postal
CREATE OR REPLACE FUNCTION public.propagate_departement_code_to_sits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.departement_code IS DISTINCT FROM OLD.departement_code THEN
    UPDATE public.sits SET departement_code = NEW.departement_code WHERE user_id = NEW.id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_profiles_propagate_dept
AFTER UPDATE OF departement_code ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.propagate_departement_code_to_sits();

-- Backfill
UPDATE public.profiles p
SET departement_code = d.code
FROM public.departements d
WHERE d.code = public.dept_code_from_postal(p.postal_code)
  AND p.departement_code IS DISTINCT FROM d.code;

UPDATE public.sits s
SET departement_code = p.departement_code
FROM public.profiles p
WHERE p.id = s.user_id
  AND s.departement_code IS DISTINCT FROM p.departement_code;

-- 4. zone_type 'france' de plein droit
ALTER TABLE public.alert_preferences DROP CONSTRAINT IF EXISTS alert_preferences_zone_type_check;
ALTER TABLE public.alert_preferences ADD CONSTRAINT alert_preferences_zone_type_check
  CHECK (zone_type = ANY (ARRAY['rayon','departement','region','france']));

UPDATE public.alert_preferences
SET zone_type = 'france', region_code = NULL
WHERE region_code = 'FR';

-- 5. Plafond 5 alertes actives
CREATE OR REPLACE FUNCTION public.create_alert_preference(
  p_label text, p_zone_type text, p_city text DEFAULT NULL::text,
  p_postal_code text DEFAULT NULL::text, p_radius_km integer DEFAULT NULL::integer,
  p_departement text DEFAULT NULL::text, p_region_code text DEFAULT NULL::text,
  p_alert_types text[] DEFAULT '{gardes,missions}'::text[],
  p_heure_envoi text DEFAULT '08:00'::text, p_frequence text DEFAULT 'quotidien'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_id uuid;
BEGIN
  SELECT count(*) INTO v_count
  FROM alert_preferences
  WHERE user_id = auth.uid() AND active = true;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 alertes actives atteint';
  END IF;

  INSERT INTO alert_preferences (
    user_id, label, zone_type, city, postal_code,
    radius_km, departement, region_code,
    alert_types, heure_envoi, frequence, active
  ) VALUES (
    auth.uid(), p_label, p_zone_type, p_city, p_postal_code,
    p_radius_km, p_departement, p_region_code,
    p_alert_types, p_heure_envoi, p_frequence, true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- 6. Idempotence transverse : une notification d'annonce par gardien et par jour
CREATE TABLE public.sit_notification_log (
  idempotency_key text PRIMARY KEY,
  user_id uuid NOT NULL,
  notification_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Paris')::date,
  source text NOT NULL,
  sit_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sit_notification_log TO service_role;
ALTER TABLE public.sit_notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sit_notification_log_admin_read" ON public.sit_notification_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_sit_notification_log_user_date ON public.sit_notification_log (user_id, notification_date);

-- Réserve le créneau du jour pour un gardien. Retourne true si la réservation
-- est accordée (aucune notification d'annonce encore envoyée aujourd'hui),
-- false si un autre pipeline a déjà servi ce gardien.
CREATE OR REPLACE FUNCTION public.claim_sit_notification(
  _user_id uuid,
  _source text,
  _sit_ids uuid[] DEFAULT '{}',
  _date date DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date := coalesce(_date, (now() AT TIME ZONE 'Europe/Paris')::date);
  v_key text;
BEGIN
  v_key := 'sit-notification-' || _user_id::text || '-' || to_char(v_date, 'YYYY-MM-DD');
  INSERT INTO public.sit_notification_log (idempotency_key, user_id, notification_date, source, sit_ids)
  VALUES (v_key, _user_id, v_date, _source, coalesce(_sit_ids, '{}'))
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_sit_notification(uuid, text, uuid[], date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_sit_notification(uuid, text, uuid[], date) TO service_role;

-- Libère la réservation si l'envoi échoue en aval.
CREATE OR REPLACE FUNCTION public.release_sit_notification(_user_id uuid, _date date DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.sit_notification_log
  WHERE idempotency_key = 'sit-notification-' || _user_id::text || '-' ||
        to_char(coalesce(_date, (now() AT TIME ZONE 'Europe/Paris')::date), 'YYYY-MM-DD');
$$;

REVOKE ALL ON FUNCTION public.release_sit_notification(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_sit_notification(uuid, date) TO service_role;