-- Lot SEO villes 2b (01/10/2026) : introductions et première section propres à chaque ville (7 pages).
-- Sauvegarde privée avant écriture. Retour arrière en fin de fichier, sans suppression.
CREATE TABLE IF NOT EXISTS public._backup_seo_city_pages_lot2b_20261001 AS
  SELECT now() AS backed_up_at, scp.* FROM public.seo_city_pages scp WHERE false;
ALTER TABLE public._backup_seo_city_pages_lot2b_20261001 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._backup_seo_city_pages_lot2b_20261001 FROM anon, authenticated;
GRANT ALL ON public._backup_seo_city_pages_lot2b_20261001 TO service_role;

DO $do$
DECLARE
  n int;
  r record;
  v_old text := $q$Ces sorties demandent une voiture : précisez si le gardien peut utiliser la vôtre ou s'il dispose d'un véhicule.$q$;
  v_new text := $q$Ces sorties se situent hors de Clermont-Ferrand : convenez du trajet et vérifiez les possibilités de transport avant le départ. Si une voiture est nécessaire, précisez si le gardien peut utiliser la vôtre ou s'il dispose d'un véhicule.$q$;
  v_marker text := $q$## Ce qu'il faut convenir$q$;
  v_def text := $q$[Comprendre le house-sitting en détail](/actualites/c-est-quoi-le-house-sitting).$q$;
BEGIN
  IF EXISTS (SELECT 1 FROM public._backup_seo_city_pages_lot2b_20261001) THEN
    RAISE EXCEPTION 'Sauvegarde lot2b déjà remplie, migration non rejouable';
  END IF;
  INSERT INTO public._backup_seo_city_pages_lot2b_20261001
    SELECT now(), scp.* FROM public.seo_city_pages scp
    WHERE scp.slug IN ('rennes','bordeaux','clermont-ferrand','nice','strasbourg','lille','biarritz');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 7 THEN RAISE EXCEPTION 'Sauvegarde : % lignes au lieu de 7', n; END IF;

  FOR r IN SELECT * FROM (VALUES
  ('rennes',
   $q$Vous partez de Rennes et cherchez une personne pour vivre chez vous, nourrir vos animaux et suivre leurs routines ? Présentez le logement, les dates et les sorties attendues. Le house-sitting repose sur un échange non rémunéré, avec une présence et des frais à convenir avant le départ.$q$,
   $q$Préparer une garde dans Rennes ou sa périphérie$q$,
   $q$Précisez la commune exacte dans l'annonce : un logement à Rennes et une maison à Cesson-Sévigné ou Chantepie ne demandent pas la même organisation de trajet. Indiquez si le gardien peut rejoindre le logement et les promenades quotidiennes à pied, en transports ou avec son véhicule. Pour un appartement, montrez les accès de l'immeuble et l'endroit où ranger les affaires du chien. Pour une maison avec extérieur, faites le tour des clôtures, portillons et plantes à arroser. Lors de la passation, accompagnez le gardien sur la promenade habituelle plutôt que de lui transmettre seulement le nom d'un grand parc. Notez le trajet, sa durée habituelle et l'espace canin que votre chien connaît.$q$),
  ('bordeaux',
   $q$À Bordeaux, confier son logement pendant une absence suppose de préparer autant l'accès à la maison que les habitudes des animaux. Un gardien peut séjourner chez vous et assurer les tâches convenues, sans rémunération de la garde. Décrivez vos besoins pour recevoir des candidatures adaptées.$q$,
   $q$Transmettre les habitudes du logement bordelais$q$,
   $q$Votre annonce doit décrire le logement réellement confié : appartement avec ascenseur ou escaliers, maison avec jardin, cour à sécuriser, pièce réservée au gardien. Indiquez le quartier et les modalités d'arrivée, notamment si le gardien vient en voiture avec ses bagages. Avant un départ en été, expliquez comment vous utilisez les volets, la ventilation et les pièces les plus fraîches, ainsi que l'horaire habituel des promenades. Si vous habitez près des quais, montrez le parcours que votre chien connaît et les traversées à éviter selon son comportement. Pour un jardin ou une cour plantée, laissez des consignes d'arrosage adaptées à chaque plante et aux restrictions en vigueur.$q$),
  ('clermont-ferrand',
   $q$Pour une absence à Clermont-Ferrand, le house-sitting permet de confier ensemble le logement et les animaux à une personne qui séjourne sur place. Commencez par préciser les accès, les besoins de présence et la mobilité nécessaire. La garde n'est pas rémunérée ; les frais éventuels font l'objet d'un accord.$q$,
   $q$Une garde en ville ne s'organise pas comme une sortie dans les volcans$q$,
   $q$Indiquez clairement si le logement se situe dans Clermont-Ferrand ou dans une commune voisine comme Beaumont ou Ceyrat. Le gardien doit pouvoir organiser ses courses, les promenades et un déplacement chez le vétérinaire. Une voiture n'est pas nécessaire pour toute garde en ville : le besoin dépend de votre adresse et des tâches demandées. Pour une excursion hors de Clermont-Ferrand, convenez séparément du transport du chien, de la durée et de l'autorisation de sortir avec lui. Une randonnée ne remplace pas automatiquement sa promenade habituelle. Pour une absence hivernale, transmettez les consignes de chauffage et les précautions d'accès propres à votre logement.$q$),
  ('nice',
   $q$Vous cherchez une garde à domicile à Nice pour conserver les habitudes de votre chien ou de votre chat pendant vos vacances ? Décrivez son rythme, le logement et les conditions de présence souhaitées. Le gardien séjourne chez vous dans le cadre d'un échange non rémunéré.$q$,
   $q$Prévoir les déplacements et la chaleur à Nice$q$,
   $q$À Nice, précisez les contraintes du trajet jusqu'au logement : escaliers, pente, stationnement, ascenseur ou transports à proximité. Ces détails comptent si le gardien arrive avec des bagages ou accompagne un chien âgé. Pour un départ pendant une période chaude, expliquez le fonctionnement des volets et de la climatisation éventuelle, les pièces accessibles à l'animal et les horaires de sortie convenus. Une terrasse ou un balcon doit être présenté avec ses consignes de sécurité. Le bord de mer peut être une destination de promenade, mais une plage autorisée aux chiens ne sera pas nécessairement la plus pratique au quotidien depuis votre adresse. Montrez d'abord le trajet habituel de votre animal.$q$),
  ('strasbourg',
   $q$Faire garder son chien, son chat et son logement à Strasbourg commence par un accord précis sur les sorties et la présence à domicile. Sur Guardiens, une personne séjourne chez vous pendant votre absence, sans être rémunérée pour la garde. Vous échangez avec les candidats avant de choisir.$q$,
   $q$Préparer la passation dans votre quartier de Strasbourg$q$,
   $q$Que le logement soit au centre, à Neudorf ou dans un autre quartier, laissez des indications concrètes : entrée de l'immeuble, badge, local à vélos, stationnement et accès à la pièce où dormira le gardien. Précisez si les courses et les sorties peuvent se faire à pied ou si un transport est nécessaire. Si le chien doit prendre le tram, vérifiez avec le gardien qu'il possède l'équipement requis et qu'il connaît les conditions de transport. Pour les promenades, distinguez le parcours quotidien d'une visite occasionnelle dans une aire d'ébats. En période froide, ajoutez les réglages du chauffage et le contact d'une personne qui peut intervenir sur place.$q$),
  ('lille',
   $q$Vous quittez Lille quelques jours ou plusieurs semaines ? Un gardien peut séjourner dans votre logement et prendre soin des animaux selon les consignes convenues. Présentez vos dates, les accès et les besoins quotidiens : l'échange est non rémunéré, avec des frais éventuels distincts.$q$,
   $q$Décrire le logement et les sorties autour de chez vous à Lille$q$,
   $q$Une annonce utile indique le quartier, la présence d'escaliers et les modalités d'arrivée. Dans le Vieux-Lille, à Wazemmes ou ailleurs, le gardien doit savoir comment rejoindre votre adresse, décharger ses affaires et récupérer les clés. Si le logement dispose d'une cour ou d'un petit jardin, expliquez quels accès doivent rester fermés pour les animaux. Prévoyez aussi le rangement des affaires de promenade et des serviettes pour le retour sous la pluie. Le grand parc le plus connu n'est pas forcément le plus pratique depuis chez vous : montrez le parcours quotidien, les entrées autorisées aux chiens et, si vous en utilisez un, le caniparc habituel.$q$),
  ('biarritz',
   $q$Vous souhaitez confier votre logement et vos animaux à Biarritz pendant une absence ? Le house-sitting permet d'accueillir un gardien sur place, sans rémunération de la garde. Décrivez vos dates et vos besoins de présence ; les candidats peuvent aussi venir d'une autre commune.$q$,
   $q$Organiser l'arrivée et les routines à Biarritz$q$,
   $q$Si le gardien vient de loin, prévoyez une arrivée avant votre départ afin de visiter le logement, rencontrer les animaux et faire une première promenade ensemble. Précisez le stationnement, les accès et le matériel disponible dans la maison. Pour une absence en période touristique, convenez à l'avance du lieu de remise des clés et d'un horaire réaliste. Une sortie vers Mouriscot ou le littoral demande une organisation différente selon votre adresse : indiquez ce qui se fait à pied et ce qui nécessite un véhicule. Le gardien doit disposer des consignes locales utiles, mais surtout connaître le rythme habituel de votre animal, les lieux où vous le promenez et ceux que vous préférez éviter.$q$)
  ) AS t(slug, intro, heading, paragraph) LOOP
    UPDATE public.seo_city_pages SET
      intro_text = r.intro,
      content = '## ' || r.heading || E'\n\n' || r.paragraph || E'\n\n' || v_def || E'\n\n'
        || substring(content FROM position(v_marker IN content)),
      seo_dirty_at = now(), updated_at = now()
    WHERE slug = r.slug AND published = true
      AND content LIKE '## En bref%' AND position(v_marker IN content) > 0;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'Mise à jour % : % lignes', r.slug, n; END IF;
  END LOOP;

  UPDATE public.seo_city_pages SET content = replace(content, v_old, v_new)
  WHERE slug = 'clermont-ferrand' AND position(v_old IN content) > 0;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Phrase Clermont : % lignes', n; END IF;
END
$do$;

-- RETOUR ARRIÈRE (non exécuté) :
-- UPDATE public.seo_city_pages t SET intro_text=b.intro_text, content=b.content, updated_at=now()
--   FROM public._backup_seo_city_pages_lot2b_20261001 b WHERE t.id=b.id;  -- 7 lignes attendues
