-- Lot SEO villes 2 (01/10/2026) : refonte de six pages villes servies par la base et création de Biarritz.
-- Sauvegarde privée avant écriture. Retour arrière en fin de fichier.
CREATE TABLE IF NOT EXISTS public._backup_seo_city_pages_lot2_20261001 AS
  SELECT now() AS backed_up_at, scp.* FROM public.seo_city_pages scp WHERE false;
ALTER TABLE public._backup_seo_city_pages_lot2_20261001 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._backup_seo_city_pages_lot2_20261001 FROM anon, authenticated;
GRANT ALL ON public._backup_seo_city_pages_lot2_20261001 TO service_role;

DO $do$
DECLARE
  n int;
  v_intro_hs text := $q$Faire garder sa maison à {C}, c'est confier son logement à une personne qui y séjourne pendant votre absence. Ce n'est ni une pension, où l'animal part chez un professionnel, ni de simples visites : le gardien vit chez vous et s'occupe de ce qui a été convenu (animaux, plantes, courrier). Sur Guardiens, vous publiez une annonce, des gardiens postulent, vous échangez, vous pouvez les rencontrer, puis vous choisissez. La garde n'est pas rémunérée ; les frais éventuels se décident à part.$q$;
  v_def text := $q$[Comprendre le house-sitting en détail](/actualites/c-est-quoi-le-house-sitting).$q$;
  v_conv_a text := $q$## Ce qu'il faut convenir avant de partir

- **Présence réelle** : combien d'heures votre animal peut rester seul, et si le gardien travaille ou s'absente dans la journée. Une garde n'est pas une présence 24h/24.
- **Routines** : repas, sorties, médicaments, habitudes du chat ou du chien. Écrivez-les, puis montrez-les lors d'une rencontre.
- **Compétences** : chien réactif, animal âgé, traitement. Dites-le dans l'annonce et vérifiez en échangeant ; un profil ou un écusson ne garantit pas l'expérience.
- **Clés** : remise en main propre, badges, double confié à une personne relais.
$q$;
  v_conv_b text := $q$
- **Frais** : qui paie la nourriture, la litière ou une consultation vétérinaire, et comment se fait le remboursement.$q$;
  v_tail text := $q$## Garde à domicile, visites ou pension

Un gardien qui séjourne chez vous laisse l'animal dans ses repères, avec une présence définie ensemble. Des visites conviennent surtout aux chats autonomes. Une pension offre un encadrement professionnel, sur devis, avec ses propres conditions d'accueil. Aucune option ne convient à tous les animaux : [comparer les alternatives à la pension](/actualites/pension-chien-alternatives-guide).

## Budget et frais réels

La garde elle-même n'est pas payée, mais une absence a un coût : nourriture des animaux, litière, éventuels soins, parfois un trajet pour la remise des clés. Fixez qui avance quoi et gardez les tickets. Les conditions de la plateforme sont détaillées sur la page [Tarifs](/tarifs), et l'article [préparer sa maison avant une garde](/actualites/preparer-maison-avant-garde) liste ce qu'il faut laisser.

## En cas d'imprévu

Notez dans l'accord votre vétérinaire habituel, une clinique de garde et une personne relais joignable à {C}. Vérifiez les horaires par téléphone avant le départ. Le réseau de gardiens d'urgence de Guardiens n'est pas encore activé : si le gardien doit annuler, c'est votre solution de secours personnelle qui prend le relais. [Gérer un imprévu pendant une garde](/actualites/gerer-imprevu-pendant-garde).
$q$;
  v_lede text := $q$Un gardien séjourne chez vous pendant votre absence et veille sur votre logement et vos animaux. La garde n'est pas rémunérée sur Guardiens ; présence, clés et frais se conviennent avant le départ.$q$;
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM public._backup_seo_city_pages_lot2_20261001) THEN
    RAISE EXCEPTION 'Sauvegarde lot2 déjà remplie, migration non rejouable';
  END IF;
  INSERT INTO public._backup_seo_city_pages_lot2_20261001
    SELECT now(), scp.* FROM public.seo_city_pages scp
    WHERE scp.slug IN ('rennes','bordeaux','clermont-ferrand','nice','strasbourg','lille');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'Sauvegarde : % lignes au lieu de 6', n; END IF;
  IF EXISTS (SELECT 1 FROM public.seo_city_pages WHERE slug = 'biarritz') THEN
    RAISE EXCEPTION 'La page biarritz existe déjà';
  END IF;

  FOR r IN SELECT * FROM (VALUES
  ('rennes','Rennes','espaces canins, imprévus.','Place du Champ-Jacquet à Rennes',
   $q$Le nombre de candidatures dépend de vos dates et de votre quartier ; aucun délai n'est garanti.$q$,
   $q$- **Logement** : vélo ou local à vélos, stationnement résident, règles de copropriété à transmettre.$q$,
   $q$## Sorties avec un chien à Rennes

La Ville et la Métropole de Rennes rappellent que les chiens sont autorisés dans tous les parcs et jardins, **tenus en laisse**, sauf dans les espaces canins ([animaux en ville, Rennes Métropole](https://environnement-sante.metropole.rennes.fr/animaux-en-ville-tout-ce-qu-il-faut-savoir/)). Il en existe trois types :

- **Espaces canins** : petits espaces, surtout pour les besoins et les petits chiens, laisse non obligatoire.
- **Espaces canins libres** : grands espaces clos pour se dépenser, laisse non obligatoire.
- **Espace canin partagé** : un seul pour l'instant, aux Prairies Saint-Martin, clôturé mais ouvert aux autres usagers.

Dans tous ces espaces, les déjections sont ramassées et la personne qui promène le chien en reste responsable. La carte des espaces canins est publiée sur la même page. Le [guide des sorties avec un chien à Rennes](/guides/rennes) reprend ces règles et quelques lieux.$q$),
  ('bordeaux','Bordeaux','parcs, chaleur, imprévus.','La place de la Bourse à Bordeaux, de nuit',
   $q$Les candidatures dépendent de vos dates, de la saison et de votre secteur ; aucun délai n'est garanti.$q$,
   $q$- **Chaleur** : en été, horaires de sortie souhaités, volets, eau à disposition, pièce la plus fraîche pour l'animal.$q$,
   $q$## Sorties avec un chien à Bordeaux

La Ville compte plus d'une centaine de parcs, jardins et squares. Leur fonctionnement est encadré par un règlement des espaces verts qui porte notamment sur les horaires d'ouverture et **la présence des chiens** ([parcs et jardins, Ville de Bordeaux](https://www.bordeaux.fr/les-parcs-et-jardins-de-bordeaux)). Les règles ne sont pas les mêmes partout : avant de lâcher ou de promener un chien dans un parc, lisez l'affichage à l'entrée. Les horaires varient aussi selon la saison, une information utile à transmettre au gardien pour les sorties du soir.

En période de vigilance canicule ou de pollution, la Ville publie des recommandations sur son site : demandez au gardien de les suivre et d'adapter les sorties.$q$),
  ('clermont-ferrand','Clermont-Ferrand','sorties vers les volcans, hiver, imprévus.','Vue de Clermont-Ferrand',
   $q$Aucun délai de réponse n'est garanti : il dépend de vos dates et de votre secteur.$q$,
   $q$- **Hiver** : réglage du chauffage, mise hors gel, accès au logement par temps de neige, surtout sur les hauteurs.$q$,
   $q$## Sorties avec un chien autour de Clermont-Ferrand

En ville, vérifiez l'affichage à l'entrée de chaque parc : nous n'avons pas trouvé de règle officielle récente parc par parc à vous citer. Hors de la ville, l'Office de tourisme donne deux repères utiles :

- Sur l'ensemble du périmètre **Chaîne des Puys et faille de Limagne**, les chiens doivent être tenus en laisse, et certains secteurs, comme le puy de Combegrasse, leur sont interdits même en laisse ([volcans d'Auvergne, Office de tourisme](https://www.clermontauvergnetourisme.com/volcan-auvergne/)).
- Au **lac d'Aydat**, les animaux sont interdits sur la plage et ses abords, mais le tour du lac est possible avec un chien en laisse ([lac d'Aydat, Office de tourisme](https://www.clermontauvergnetourisme.com/lac-aydat/)).

Ces sorties demandent une voiture : précisez si le gardien peut utiliser la vôtre ou s'il dispose d'un véhicule. Pour d'autres repères, lisez le [guide des sorties avec un chien à Clermont-Ferrand](/guides/clermont-ferrand) et l'article [pet-sitting à Clermont-Ferrand](/actualites/pet-sitting-clermont-ferrand).$q$),
  ('nice','Nice','plages chiens, chaleur.','La promenade des Anglais à Nice',
   $q$L'été, l'agglomération attire beaucoup de monde : publiez tôt pour laisser le temps d'échanger. Aucun délai de réponse n'est garanti.$q$,
   $q$- **Chaleur** : horaires de sortie, climatisation ou ventilation, eau, ombre ; à Nice, l'été dure longtemps.$q$,
   $q$## Sorties avec un chien à Nice

- En ville, sur la voie publique, **tous les chiens doivent être tenus en laisse** ; ils peuvent être lâchés dans les aires d'ébats, sous la responsabilité de la personne qui les promène, à condition d'être sociables et de revenir au rappel ([avoir un chien en ville, Ville de Nice](https://www.nice.fr/avoir-un-chien-en-ville/)).
- **Pas toutes les plages** : pour un bain, la Ville oriente vers la plage de la Lanterne ou la plage de Lenval, dédiées aux chiens, aux heures les plus douces ([animaux et fortes chaleurs, Ville de Nice](https://www.nice.fr/animaux-de-compagnie-et-fortes-chaleurs-les-bons-gestes-a-appliquer/)). La liste des plages publiques figure sur la [page plages de la Ville](https://www.nice.fr/nature/plages-mer-et-littoral/).
- **Fortes chaleurs** : sorties tôt le matin ou le soir, éviter le bitume au soleil qui peut brûler les coussinets, ne jamais laisser un animal seul en voiture (même source).$q$),
  ('strasbourg','Strasbourg','laisse, aires d''ébats, tram, imprévus.','Strasbourg vue du ciel, vers la cathédrale',
   $q$Aucun délai de réponse n'est garanti ; il dépend de vos dates et de votre quartier.$q$,
   $q$- **Hiver** : réglage du chauffage et consignes en cas de gel.$q$,
   $q$## Sorties avec un chien à Strasbourg

La Ville et l'Eurométropole de Strasbourg posent des règles claires ([les chiens, Strasbourg.eu](https://www.strasbourg.eu/les-chiens)) :

- **Laisse obligatoire** sur la voie publique, dans toute la ville.
- **Aires d'ébats** : ce sont les seuls endroits où lâcher le chien.
- **Tram** : tous les chiens, hors catégorie 1, sont admis gratuitement ; un chien trop grand pour un sac voyage tenu en laisse et muselé.
- **Épillets** : présents dans les parcs et prairies, ils peuvent blesser le chien ; demandez au gardien de vérifier pelage et pattes au retour.
- Certains lieux sont interdits aux chiens, comme les magasins d'alimentation.$q$),
  ('lille','Lille','parcs, caniparcs, imprévus.','Vues de Lille',
   $q$Aucun délai de réponse n'est garanti ; il dépend de vos dates et de votre quartier.$q$,
   $q$- **Logement** : maison de ville ou appartement, cour, accès au jardin, règles de copropriété à transmettre.$q$,
   $q$## Sorties avec un chien à Lille

- Les chiens sont admis dans de nombreux parcs, mais **pas dans tous** : la liste des parcs accessibles est fixée par arrêté municipal et indiquée par un affichage sur place ([règlement des parcs et jardins, Ville de Lille](https://www.lille.fr/Nature-a-Lille/Parcs-et-equipements-nature/Le-reglement-des-parcs-et-jardins)).
- Dans ces parcs, les chiens sont **tenus en laisse**, sauf dans les caniparcs, qui ont leur propre règlement (même source).
- Exemple : au parc Barberousse, la Ville indique « chiens autorisés en laisse » ([fiche du parc Barberousse](https://www.lille.fr/Nos-equipements/Parc-Barberousse)).

Avant une première sortie, repérez avec le gardien les parcs autorisés près de chez vous et le caniparc le plus proche.$q$)
  ) AS t(slug, city, md_tail, alt, avail, conv_extra, dogs) LOOP
    UPDATE public.seo_city_pages SET
      h1_title = 'House-sitting à ' || r.city || ' : faire garder sa maison et ses animaux',
      meta_title = CASE WHEN r.slug = 'clermont-ferrand' THEN 'House-sitting à Clermont-Ferrand : maison et animaux | Guardiens'
                   ELSE 'House-sitting à ' || r.city || ' : garde de maison et d''animaux | Guardiens' END,
      meta_description = CASE WHEN r.slug IN ('clermont-ferrand','strasbourg')
                   THEN 'À ' || r.city || ', un gardien séjourne chez vous, sans rémunération de la garde. Ce qu''il faut convenir, ' || r.md_tail
                   ELSE 'À ' || r.city || ', un gardien séjourne chez vous et veille sur la maison et les animaux, sans rémunération. Ce qu''il faut convenir, ' || r.md_tail END,
      intro_text = v_lede,
      hero_image_alt = r.alt,
      content = '## En bref : le house-sitting à ' || r.city || E'\n\n' || replace(v_intro_hs, '{C}', r.city) || E'\n\n'
        || r.avail || ' ' || v_def || E'\n\n' || v_conv_a || r.conv_extra || v_conv_b || E'\n\n'
        || r.dogs || E'\n\n' || replace(v_tail, '{C}', r.city),
      seo_dirty_at = now(), updated_at = now()
    WHERE slug = r.slug AND published = true;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'Mise à jour % : % lignes', r.slug, n; END IF;
    UPDATE public.seo_city_pages SET excerpt = meta_description WHERE slug = r.slug;
  END LOOP;

  -- Biarritz : règle existante appliquée (0 gardien résident, donc noindex).
  -- Coordonnées : Base Adresse Nationale, commune 64122 (api-adresse.data.gouv.fr).
  INSERT INTO public.seo_city_pages (city, department, slug, h1_title, meta_title, meta_description, excerpt,
    intro_text, content, published, noindex, sitter_count, active_sits_count, latitude, longitude, geocoded_at,
    allow_nearby_indexing)
  VALUES ('Biarritz', 'Pyrénées-Atlantiques', 'biarritz',
    'House-sitting à Biarritz : faire garder sa maison et ses animaux',
    'House-sitting à Biarritz : garde de maison et d''animaux | Guardiens',
    'À Biarritz, un gardien peut séjourner chez vous, sans rémunération de la garde. Ce qu''il faut convenir, chemin chiens de Mouriscot, clés, imprévus.',
    'À Biarritz, un gardien peut séjourner chez vous, sans rémunération de la garde. Ce qu''il faut convenir, chemin chiens de Mouriscot, clés, imprévus.',
    $q$Un gardien séjourne chez vous pendant votre absence et veille sur votre logement et vos animaux. La garde n'est pas rémunérée sur Guardiens. Aucun gardien n'indique encore résider à Biarritz : les candidatures viendront de gardiens prêts à se déplacer.$q$,
    '## En bref : le house-sitting à Biarritz' || E'\n\n' || replace(v_intro_hs, '{C}', 'Biarritz') || E'\n\n'
    || $q$À ce jour, aucun gardien inscrit n'indique résider à Biarritz. Vous pouvez publier une annonce, mais aucune disponibilité n'est garantie : publiez tôt, surtout pour l'été.$q$ || ' ' || v_def || E'\n\n'
    || v_conv_a || $q$- **Arrivée du gardien** : s'il vient de loin, convenez du jour d'arrivée, d'un temps de passation et de la remise des clés en main propre.$q$ || v_conv_b || E'\n\n'
    || $q$## Sorties avec un chien à Biarritz

- La Ville a créé un **chemin pour chiens en liberté** dans l'espace naturel de Mouriscot, près du centre équestre, entre l'allée Gabrielle Dorziat et la rue du Lavoir de Compère : un sentier d'environ 300 mètres menant à une clairière. Seul ce périmètre est concerné, pas l'ensemble du site ([chemin chien en liberté, Ville de Biarritz](https://www.biarritz.fr/les-actualites/actualite/creation-d-un-chemin-chien-en-liberte-a-mouriscot)).
- Sur ce chemin, le chien reste à moins de 100 mètres et revient au rappel, il doit être sociable et identifié, les déjections sont ramassées ; les chiens de catégorie 1 et 2 n'y sont pas admis, sauf dérogation (même source).
- Ailleurs, la brigade de la Ville patrouille dans les parcs et espaces naturels pour faire respecter, entre autres, la tenue des chiens en laisse ([tranquillité et sécurité, Ville de Biarritz](https://www.biarritz.fr/cadre-de-vie-bizi-ingurunea/au-quotidien/tranquillite-et-securite/titre-par-defaut)).

Pour les plages, l'accès des chiens est fixé par la Ville : vérifiez l'affichage à chaque accès avant d'y emmener un chien.$q$
    || E'\n\n' || replace(v_tail, '{C}', 'Biarritz'),
    true, true, 0, 0, 43.472166, -1.555076, now(), false);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Insertion biarritz : % lignes', n; END IF;
END
$do$;

-- RETOUR ARRIÈRE (non exécuté) :
-- UPDATE public.seo_city_pages t SET h1_title=b.h1_title, meta_title=b.meta_title, meta_description=b.meta_description,
--   excerpt=b.excerpt, intro_text=b.intro_text, hero_image_alt=b.hero_image_alt, content=b.content, updated_at=now()
--   FROM public._backup_seo_city_pages_lot2_20261001 b WHERE t.id=b.id;  -- 6 lignes attendues
-- UPDATE public.seo_city_pages SET published=false, updated_at=now() WHERE slug='biarritz';  -- sans suppression
