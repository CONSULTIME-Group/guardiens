-- Lot SEO1 (19/10/2026) : « Guardiens est gratuit », dit simplement, dans les
-- articles publiés (doctrine X3c et Y3).
--
-- PRÉPARÉ, NON APPLIQUÉ. À appliquer en une fois, après relecture.
--
-- Ce que fait la transaction, sur le seul champ content des 118 articles listés :
--  1. « La plateforme / Guardiens / Elle / L’accès est actuellement (100 %)
--     gratuit(e) (pour les propriétaires et les gardiens | les deux rôles ...) »
--     devient « Guardiens est gratuit » (gras conservé) ;
--  2. la phrase d'échéance « ... au plus tôt au second semestre 2027, avec
--     trente jours de préavis ... » est retirée ; quand elle portait le lien
--     /tarifs, elle devient « Le fonctionnement est détaillé sur la [page
--     tarifs](/tarifs). », pour garder le lien ;
--  3. deux tournures dépendantes : « ; elle facilite la mise en relation »
--     devient « ; la plateforme facilite la mise en relation », et « présentent
--     le fonctionnement actuel et ses évolutions éventuelles » perd sa fin.
--
-- Exclus, jamais touchés (13 slugs, vérifiés par la transaction) :
--  - exception décidée par Jérémie le 17/10/2026 (AGENTS.md, lots X3c/Y3) :
--    expat-proprietaire-faire-garder-maison-etranger, garde-kaz-house-sitting-la-reunion,
--    garde-maison-animaux-tahiti, garde-maison-animaux-nouvelle-caledonie ;
--  - articles comparatifs refondus le 17/10/2026 (prix de prestataires locaux,
--    hors périmètre SEO1) : garde-animaux-savoie-guide, garde-chat-domicile-lyon,
--    ou-faire-garder-chien-lyon-vacances, pension-chien-alternatives-guide,
--    pet-sitting-grenoble-chartreuse, pet-sitting-saint-etienne-loire,
--    pet-sitting-valence-drome, vacances-longues-garde-animal-2-semaines,
--    veterinaire-urgence-lyon-guide (La Réunion compte aussi parmi les 10).
--
-- Comptage en lecture seule sur la base de production, 19/10/2026 :
--   SELECT count(*) FROM articles WHERE published;                              -> 133
--   ... AND content ~* 'actuellement[^.\n]{0,80}gratuit';                       -> 131
--   ... AND content ~ 'second semestre 2027';                                   -> 54
--   Hors 13 exclus, (actuellement ... gratuit) OU (second semestre 2027)         -> 118 articles touchés
--     dont 118 avec « actuellement ... gratuit » et 42 avec l'échéance 2027.
--   Simulation des remplacements (SELECT seul) : 0 « actuellement ... gratuit »,
--   0 « 2027 » ni « préavis » restant, parité du gras ** identique, aucune ligne
--   vide ni double espace créé, 118 liens /tarifs conservés.
--   excerpt, meta_title et meta_description : 0 occurrence, non modifiés.
--
-- Sauvegarde : public._backup_articles_seo1_gratuit_20261019 (ligne entière,
-- avant modification, service_role seul). Retour arrière :
--   UPDATE public.articles a SET content = b.content
--     FROM public._backup_articles_seo1_gratuit_20261019 b WHERE a.id = b.id;
--
-- Garde de version : chaque article doit porter le updated_at relevé le
-- 19/10/2026, sinon la transaction s'arrête (article modifié depuis : à
-- préparer de nouveau). Rejouable : un article déjà sauvegardé est ignoré.
-- Effets des triggers d'articles : updated_at, seo_dirty_at et seo_url_outbox
-- (les 118 pages ont déjà seo_dirty_at posé, aucun rendu de plus), IndexNow.
BEGIN;

CREATE TABLE IF NOT EXISTS public._backup_articles_seo1_gratuit_20261019 AS
  SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_seo1_gratuit_20261019 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_seo1_gratuit_20261019 TO service_role;
ALTER TABLE public._backup_articles_seo1_gratuit_20261019 ENABLE ROW LEVEL SECURITY;

CREATE TEMP TABLE _seo1_exclus (slug text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _seo1_exclus (slug) VALUES
('expat-proprietaire-faire-garder-maison-etranger'),
('garde-kaz-house-sitting-la-reunion'),
('garde-maison-animaux-tahiti'),
('garde-maison-animaux-nouvelle-caledonie'),
('garde-animaux-savoie-guide'),
('garde-chat-domicile-lyon'),
('ou-faire-garder-chien-lyon-vacances'),
('pension-chien-alternatives-guide'),
('pet-sitting-grenoble-chartreuse'),
('pet-sitting-saint-etienne-loire'),
('pet-sitting-valence-drome'),
('vacances-longues-garde-animal-2-semaines'),
('veterinaire-urgence-lyon-guide');

CREATE TEMP TABLE _seo1_cible (id uuid PRIMARY KEY, slug text NOT NULL UNIQUE, version timestamptz NOT NULL) ON COMMIT DROP;
INSERT INTO _seo1_cible (id, slug, version) VALUES
('2e274e04-2033-4adc-a2e7-fb57a90fdb30'::uuid, 'abandon-animaux-france-chiffres-causes', '2026-10-18 01:10:53.304037+00'::timestamptz),
('f5c294a5-2b3f-4630-afd9-aafee77473c4'::uuid, 'accueillir-gardien-bonnes-pratiques', '2026-10-17 21:47:18.472283+00'::timestamptz),
('20d86e06-d173-4af2-9ff0-f93fc9ecbad0'::uuid, 'apprendre-menuiserie-permaculture-ecoconstruction-gratuitement', '2026-10-18 03:14:20.335406+00'::timestamptz),
('338ce11e-7ec3-44bc-b20e-1e9c4a84cb77'::uuid, 'arroser-plantes-pendant-vacances-guide', '2026-10-17 14:38:38.885282+00'::timestamptz),
('e9ffc11c-1435-4664-9835-d13d50f0a1ba'::uuid, 'arroser-plantes-vacances-annecy', '2026-10-17 23:51:57.872672+00'::timestamptz),
('aff2d4ad-2426-48bc-9bd2-f681fe6fec94'::uuid, 'arroser-plantes-vacances-grenoble', '2026-10-17 23:51:57.872672+00'::timestamptz),
('585fc8ba-625d-4e68-939e-28f43165b466'::uuid, 'arroser-plantes-vacances-lyon', '2026-10-17 23:59:37.183729+00'::timestamptz),
('038658e2-b34c-485b-b55d-fce5fb46070c'::uuid, 'bengal-guide-race', '2026-10-18 01:18:52.746831+00'::timestamptz),
('78b9688a-138d-40ac-9907-608c85d07740'::uuid, 'berger-allemand-guide-race', '2026-10-18 01:33:57.30322+00'::timestamptz),
('0f3f7b7b-3dfe-409e-80d6-0de7309c72b8'::uuid, 'berger-australien-guide', '2026-10-18 03:22:16.878166+00'::timestamptz),
('6304afb0-b22b-43c4-aab6-88ff7f8cb45c'::uuid, 'berger-australien-guide-race', '2026-10-18 01:33:57.30322+00'::timestamptz),
('50c52ea5-2f6c-419d-a819-f207c4c6a4d2'::uuid, 'bien-etre-animal-pendant-absence', '2026-10-17 21:55:20.85689+00'::timestamptz),
('f2aae657-e99d-413d-af5a-befe600252ac'::uuid, 'boom-pet-sitting-lyon-2026', '2026-10-17 23:40:09.271452+00'::timestamptz),
('932672b5-7188-45ac-86e8-36a2e96e275a'::uuid, 'border-collie-guide-race-complet', '2026-10-18 01:45:36.474038+00'::timestamptz),
('3ee52f4f-260e-48da-9731-a7d2f6509484'::uuid, 'border-collie-lyon-guide-race', '2026-10-18 03:22:16.878166+00'::timestamptz),
('cb6ee5b7-bbdc-4479-8016-ac3474889ce6'::uuid, 'bouledogue-francais-guide-race-complet', '2026-10-18 01:45:36.474038+00'::timestamptz),
('46449ca8-ad9a-40ce-98d8-50300bdcf8db'::uuid, 'bouledogue-francais-lyon-guide-race', '2026-10-18 03:28:57.618345+00'::timestamptz),
('9ab49bd0-af00-40a0-bc19-6f91a30e2d53'::uuid, 'bricolage-montage-meubles-entraide-grenoble-lyon', '2026-10-18 01:55:16.286167+00'::timestamptz),
('6c52710a-3130-49dd-8856-47ec9233feae'::uuid, 'c-est-quoi-le-house-sitting', '2026-10-18 07:23:54.304923+00'::timestamptz),
('8603173d-7991-4176-9a81-c249992c2c6c'::uuid, 'cavalier-king-charles-guide-race', '2026-10-18 01:55:16.286167+00'::timestamptz),
('066f3e6b-090b-4403-bea8-e73cd53cfa32'::uuid, 'chantier-participatif-low-tech-participer-lancer-projet', '2026-10-18 02:03:03.281892+00'::timestamptz),
('8f6b5e3f-b5e1-44b8-a955-36e263f6c5aa'::uuid, 'chantier-participatif-projet-collectif-cadre-legal', '2026-10-18 02:03:03.281892+00'::timestamptz),
('831afcaf-295b-45dd-a263-2362ad1cf086'::uuid, 'checklist-partir-vacances-animaux', '2026-10-17 21:47:18.472283+00'::timestamptz),
('a0413726-3373-446d-9724-a35bcb69864a'::uuid, 'chien-reactif-agressif-garde-solutions', '2026-10-18 04:00:20.476453+00'::timestamptz),
('32a5c3d1-d4a8-40d1-ac2b-657f4bcb3ab2'::uuid, 'choisir-gardien-bons-criteres', '2026-10-17 12:03:08.920585+00'::timestamptz),
('bf7fd4b6-8f74-4f12-b985-f65c30fd5868'::uuid, 'comment-devenir-home-sitter-france-guide-debutant', '2026-10-18 00:26:22.708237+00'::timestamptz),
('4b0e630d-5f5b-45a4-9291-9ec1ffb482c3'::uuid, 'comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers', '2026-10-18 00:42:21.766269+00'::timestamptz),
('9ed3b734-059c-4ab4-8b7a-e93626de5f0a'::uuid, 'commodat-garde-guardiens', '2026-10-17 17:41:08.963946+00'::timestamptz),
('ec936ed2-0b3a-4d0d-bc8e-bcfd32f9d574'::uuid, 'confier-sa-maison-absence-risques', '2026-10-17 22:01:20.682867+00'::timestamptz),
('be648df7-e302-4f6c-9722-3afddab06946'::uuid, 'conseil-gardien-creer-profil-attractif-lyon', '2026-10-18 03:28:57.618345+00'::timestamptz),
('4ff21b11-8263-4b88-b1f9-5b3070ef3ecd'::uuid, 'conseils-garder-chien', '2026-10-18 03:36:54.016706+00'::timestamptz),
('f823df5c-cbfe-4438-af84-395abfb3c314'::uuid, 'courses-aide-domicile-entraide-senior-lyon', '2026-10-18 02:10:19.552905+00'::timestamptz),
('0e0f3398-8392-4c11-b65d-bb64c0a3fc38'::uuid, 'creer-profil-gardien-attractif', '2026-10-18 00:20:11.035773+00'::timestamptz),
('8569a535-d61b-4241-bdf7-7ebd28f72567'::uuid, 'demenagement-entraide-locale-france', '2026-10-18 02:10:19.552905+00'::timestamptz),
('f6c93f52-8254-45cb-b112-e9d877aec504'::uuid, 'devenir-gardien-guide-complet', '2026-10-18 03:36:54.016706+00'::timestamptz),
('76e35c45-fc49-41d1-8153-4e6decb07534'::uuid, 'devenir-gardien-maison-etranger', '2026-10-18 00:26:22.708237+00'::timestamptz),
('db4b6975-6eec-45aa-9bab-2083780faa0e'::uuid, 'devenir-gardien-pro-animalier', '2026-10-18 00:34:50.601606+00'::timestamptz),
('df375802-4edd-415e-9163-51bfdc68cfb7'::uuid, 'devenir-gardien-urgence-guardiens', '2026-10-18 00:34:50.601606+00'::timestamptz),
('a0d4e878-7d07-42bf-b44d-0071df5a608b'::uuid, 'devenir-pet-sitter-guide-debutant', '2026-10-18 03:41:48.901591+00'::timestamptz),
('cbabc950-1059-456f-a15f-f22e7d8165a9'::uuid, 'echange-reciproque-garde-maison-expatries', '2026-10-17 15:22:53.604389+00'::timestamptz),
('a2c25c3a-ff8f-4a91-a862-a67ca63b6f86'::uuid, 'entretenir-jardin-pendant-absence', '2026-10-17 14:09:23.215493+00'::timestamptz),
('6a893d5b-dafa-43b5-a612-00a44d945f56'::uuid, 'erreurs-premiere-garde', '2026-10-18 03:41:48.901591+00'::timestamptz),
('ea8e64fd-6533-4a4b-9cf2-ca998620544d'::uuid, 'faire-garder-animal-pendant-hospitalisation', '2026-10-17 21:35:54.985932+00'::timestamptz),
('396a1800-2617-4cdb-b47f-5cf055b02169'::uuid, 'francais-etranger-garde-maison-france', '2026-10-17 15:22:53.604389+00'::timestamptz),
('87ae0e1f-f8d3-4bc9-a575-cb6d345c799e'::uuid, 'garde-a-domicile-vs-pension', '2026-10-18 03:43:23.437826+00'::timestamptz),
('a9ee0ce2-154c-4a68-a9cb-0f0afa3512b2'::uuid, 'garde-animaux-croix-rousse-lyon', '2026-10-17 22:19:43.812994+00'::timestamptz),
('ff6660e2-ac7c-4b6e-b8fe-939a41662a4e'::uuid, 'garde-animaux-domicile-chien-chat', '2026-10-17 21:55:20.85689+00'::timestamptz),
('ab3ab827-3af5-4dbb-a099-186ac1843269'::uuid, 'garde-animaux-haute-savoie-guide', '2026-10-18 04:00:20.476453+00'::timestamptz),
('f36aa609-312a-4f5f-b001-a750b8f46449'::uuid, 'garde-chat-domicile-house-sitting', '2026-10-18 07:23:48.170753+00'::timestamptz),
('d8cb308a-3e38-43d7-93bb-3cf01b403cc0'::uuid, 'garde-chat-presquile-lyon', '2026-10-17 22:19:43.812994+00'::timestamptz),
('d7a85b8a-a14f-4822-b006-a4b55591187a'::uuid, 'garde-chien-faire-garder-son-chien', '2026-10-18 07:23:48.170753+00'::timestamptz),
('82e6449c-ec8f-4af1-93ee-37d5495cc72a'::uuid, 'garde-chien-lyon-solutions', '2026-10-18 03:43:23.437826+00'::timestamptz),
('964c100a-2b1f-4256-9922-73e87e6be01d'::uuid, 'garde-ferme-animaux-monts-du-lyonnais', '2026-10-17 23:14:04.242644+00'::timestamptz),
('174464d9-0f57-4d88-8e21-118bc7a8e0ce'::uuid, 'garder-une-maison-ce-n-est-pas-garder-un-animal', '2026-10-17 12:03:08.920585+00'::timestamptz),
('03f0bf66-bbbd-4953-b2e1-901e28677629'::uuid, 'gardiennage-maison-vacances-aura', '2026-10-18 03:44:41.093355+00'::timestamptz),
('31aa4845-6c2e-4b14-bcc4-942d38162996'::uuid, 'gerer-animaux-difficiles-garde', '2026-10-17 23:08:06.871551+00'::timestamptz),
('f2e05421-9bd3-4c10-8d10-7bb63b5767ae'::uuid, 'golden-retriever-guide-race-complet', '2026-10-18 02:18:10.002589+00'::timestamptz),
('30cf1329-10bc-4d60-890b-4e7caba75672'::uuid, 'golden-retriever-lyon-guide-race', '2026-10-18 03:44:41.093355+00'::timestamptz),
('5332601d-1924-4401-aaa7-0aa7bac46aba'::uuid, 'guide-house-sitting-lyon', '2026-10-18 03:46:37.229181+00'::timestamptz),
('1b75e168-4afe-46fc-baa7-573549e4dc15'::uuid, 'house-sitting-aix-les-bains', '2026-10-17 23:14:04.242644+00'::timestamptz),
('32216cbc-2167-4d1f-b854-f67a7f9665cd'::uuid, 'house-sitting-annecy', '2026-10-18 03:48:08.972938+00'::timestamptz),
('27dbc88c-09ab-428a-9eff-ce203b0c6aa6'::uuid, 'house-sitting-aura-guide-complet', '2026-10-18 03:48:08.972938+00'::timestamptz),
('4bf0d4b1-701e-4e70-af61-1f619355ce67'::uuid, 'house-sitting-auvergne-rhone-alpes', '2026-10-18 07:23:51.537498+00'::timestamptz),
('25bbd1ca-5cce-48b6-8d5b-e8d76a5bb8e8'::uuid, 'house-sitting-cadre-juridique-france', '2026-10-18 03:54:43.668218+00'::timestamptz),
('dec87147-f07d-4de3-9b3b-922304f05a15'::uuid, 'house-sitting-caluire-et-cuire', '2026-10-18 03:49:18.385879+00'::timestamptz),
('112ffce1-6481-431b-92e3-a9d4b882c451'::uuid, 'house-sitting-chambery', '2026-10-18 03:49:18.385879+00'::timestamptz),
('5597f4d2-e24e-49a9-9f0e-87b1779c123d'::uuid, 'house-sitting-ete-aura-guide', '2026-10-17 22:39:54.700778+00'::timestamptz),
('e9a8923c-2198-49f7-8311-e8b79d14e46e'::uuid, 'house-sitting-grenoble', '2026-10-18 03:49:51.919853+00'::timestamptz),
('9be6a6f6-9ea8-481b-8aa1-df2ee29a8e33'::uuid, 'house-sitting-haute-savoie-annecy-megeve', '2026-10-17 22:51:36.682669+00'::timestamptz),
('fcff585e-80dc-4ea0-92ea-f55553be8720'::uuid, 'house-sitting-hiver-montagne-savoie', '2026-10-17 14:09:23.215493+00'::timestamptz),
('85c53401-ae2b-443a-b952-f6f97cf13e67'::uuid, 'house-sitting-lyon', '2026-10-18 03:49:51.919853+00'::timestamptz),
('c97538a6-2f6b-436d-a34e-6df589a62315'::uuid, 'house-sitting-noel-fetes-fin-annee', '2026-10-17 13:33:40.707684+00'::timestamptz),
('43285193-b26f-4a4a-8506-6c025b7bb26c'::uuid, 'house-sitting-saint-etienne-guide', '2026-10-18 03:50:27.636542+00'::timestamptz),
('80fce89b-d6ee-4e87-a48e-c2a45e05cb6d'::uuid, 'house-sitting-vs-pension-comparatif', '2026-10-18 03:50:27.636542+00'::timestamptz),
('809eceed-88ac-4846-9f61-052d74530567'::uuid, 'house-sitting-week-end-court-sejour-aura', '2026-10-17 13:33:40.707684+00'::timestamptz),
('d35378d8-1e1a-4802-9e2a-5c02fec2fab9'::uuid, 'idees-coups-de-main-entraide-pres-de-chez-soi', '2026-10-18 02:18:10.002589+00'::timestamptz),
('746dd0ef-85c2-48b3-855f-7da8514f8f75'::uuid, 'jardinage-entraide-locale-grenoble', '2026-10-18 02:23:59.567113+00'::timestamptz),
('0772cb38-0044-41b3-96b0-b5e06c19f6cd'::uuid, 'jardinage-entraide-quartier-annecy', '2026-10-18 02:23:59.567113+00'::timestamptz),
('623caac4-3e9a-489a-9ab0-af7c277f244c'::uuid, 'jardinage-entraide-quartier-lyon', '2026-10-18 02:32:44.128131+00'::timestamptz),
('e27e5a15-8e68-4d0d-85dc-9bc73543d393'::uuid, 'labrador-retriever-guide-race', '2026-10-18 02:32:44.128131+00'::timestamptz),
('6e50012e-1eef-4f7a-8bb7-bd94ca532a3e'::uuid, 'maine-coon-guide-race', '2026-10-18 02:40:59.754732+00'::timestamptz),
('87433836-e77b-4ac9-8e57-52fe304a381e'::uuid, 'malinois-guide-race-complet', '2026-10-18 02:40:59.754732+00'::timestamptz),
('f4933b1d-fbe3-49ee-8896-cf1f2141b370'::uuid, 'malinois-lyon-guide-race', '2026-10-18 03:51:03.431554+00'::timestamptz),
('a6f2ba49-6419-4c1f-ad3d-8aaf1f9178ee'::uuid, 'meilleures-villes-vivre-chien-autour-lyon', '2026-10-17 23:59:37.183729+00'::timestamptz),
('f786937a-18d5-462b-a57b-29df051faa3a'::uuid, 'notre-histoire-pet-sitting-argentine-lyon', '2026-10-18 00:56:34.142742+00'::timestamptz),
('da5e8d08-c966-4e00-a462-ba90f6bb6111'::uuid, 'oser-demander-coup-de-main-pres-de-chez-soi', '2026-10-18 02:51:37.099035+00'::timestamptz),
('7c970d8e-1b4d-4888-b5ee-13f0c905bdc7'::uuid, 'parcs-balades-chiens-annecy-guide', '2026-10-18 00:12:43.859326+00'::timestamptz),
('d7e944f1-0b67-4289-ab2e-0930171bf613'::uuid, 'parcs-balades-chiens-grenoble-guide', '2026-10-18 00:12:43.859326+00'::timestamptz),
('e2f7c52d-ad81-4aa9-82b3-9d3f74e7d3b3'::uuid, 'parcs-chiens-lyon-guide-complet', '2026-10-18 03:54:43.668218+00'::timestamptz),
('536a9b03-ce7a-47b8-a154-081c571d1e56'::uuid, 'persan-guide-race', '2026-10-18 02:51:37.099035+00'::timestamptz),
('f42aa8c2-b888-439c-85b7-c7d223438d52'::uuid, 'pet-sitting-annecy-guide', '2026-10-18 03:51:03.431554+00'::timestamptz),
('6613e922-06b6-4194-8043-f64c44c42dcf'::uuid, 'pet-sitting-chambery-savoie', '2026-10-18 03:51:33.409096+00'::timestamptz),
('5b3956a3-61f9-4e17-a093-794e4a6663d5'::uuid, 'pet-sitting-clermont-ferrand', '2026-10-18 04:02:35.701425+00'::timestamptz),
('26443d76-7140-4b7a-becd-5b90010c3c0c'::uuid, 'pet-sitting-clermont-ferrand-guide', '2026-10-18 03:51:33.409096+00'::timestamptz),
('0ac1d393-0d63-4b52-a7dc-58c2f55183ed'::uuid, 'pet-sitting-grenoble-guide', '2026-10-18 03:52:09.284941+00'::timestamptz),
('c5eb7f77-fe14-4b7c-8ad1-a1035bcb663f'::uuid, 'pet-sitting-lyon-guide-complet', '2026-10-18 07:23:51.537498+00'::timestamptz),
('11a43ec4-f19f-42c2-a280-23968fe37fad'::uuid, 'pet-sitting-lyon-ouest-lyonnais', '2026-10-17 22:26:36.102042+00'::timestamptz),
('36521fd1-ec0f-4cc9-802e-e599d625d4ae'::uuid, 'pet-sitting-venissieux', '2026-10-17 23:33:12.086889+00'::timestamptz),
('3049c31e-f0df-4918-bf42-823790f5c994'::uuid, 'pet-sitting-villeurbanne', '2026-10-17 23:40:09.271452+00'::timestamptz),
('6ea0dd2c-64f5-48e2-ab78-ce8ab20b8e4f'::uuid, 'petites-missions-entraide-guardiens', '2026-10-18 07:23:54.304923+00'::timestamptz),
('803bd897-b6de-46af-a251-db5cd13054da'::uuid, 'petites-missions-entraide-guide', '2026-10-18 03:52:09.284941+00'::timestamptz),
('45f7dd7b-f720-4924-b51d-4ca670e38664'::uuid, 'premiers-pas-sur-guardiens', '2026-10-18 00:42:21.766269+00'::timestamptz),
('fa36743d-99b5-49e5-a4a9-bb11d5cc49b2'::uuid, 'preparer-maison-avant-garde', '2026-10-17 13:01:02.465113+00'::timestamptz),
('eb952a26-cf7a-4ac4-aa7d-b50ff9f11ff8'::uuid, 'preparer-maison-avant-vacances', '2026-10-18 03:54:12.940465+00'::timestamptz),
('b57f3a0e-a94c-4105-86d5-dfdcde75c6ed'::uuid, 'proprietaire-preparer-garde-maison', '2026-10-18 03:54:12.940465+00'::timestamptz),
('4af7e670-0be8-4eec-8402-42015b31a346'::uuid, 'rediger-bonne-annonce-house-sitting', '2026-10-17 13:01:02.465113+00'::timestamptz),
('3c6d8b50-89d1-4e3c-9c5e-85d6c753a5fe'::uuid, 'reseau-entraide-quartier-lyon-aura', '2026-10-18 02:58:49.651855+00'::timestamptz),
('d5a83947-081b-4561-9cb2-d50a942c4380'::uuid, 'reussir-premiere-garde-house-sitting', '2026-10-18 00:20:11.035773+00'::timestamptz),
('74a5441b-86b4-460a-a06d-cd6d4256256b'::uuid, 's-absenter-avec-animal-guide-solutions-2026', '2026-10-17 22:01:20.682867+00'::timestamptz),
('70052de6-d633-448f-b4e1-67848ec3694f'::uuid, 'se-sentir-utile-pres-de-chez-soi', '2026-10-18 03:06:55.098316+00'::timestamptz),
('1acc66ba-0223-465c-8dd4-1230443610e2'::uuid, 'securiser-maison-absence-prolongee', '2026-10-17 14:38:38.885282+00'::timestamptz),
('a6982d18-ae4b-4527-825a-beb78ba0914c'::uuid, 'securite-confiance-house-sitting', '2026-10-17 17:41:08.963946+00'::timestamptz),
('5473153c-efce-443e-a189-522e990f4e06'::uuid, 'siamois-guide-race', '2026-10-18 03:06:55.098316+00'::timestamptz),
('dfb2cc62-5272-40e1-ac4b-18e055e4ddc6'::uuid, 'technologie-recreer-lien-pres-de-chez-soi', '2026-10-18 03:14:20.335406+00'::timestamptz),
('ddc0342e-f690-426e-a6af-bf1a4d72e86b'::uuid, 'temoignage-premiere-garde-auvergne', '2026-10-18 01:10:53.304037+00'::timestamptz),
('e12213b6-d33a-42c8-a543-0d8d4fab4126'::uuid, 'veterinaire-urgence-annecy-haute-savoie', '2026-10-17 22:59:15.210777+00'::timestamptz),
('903ba318-fc29-4218-bccb-18849bc16e57'::uuid, 'veterinaire-urgence-grenoble-isere', '2026-10-17 22:59:15.210777+00'::timestamptz),
('9808681c-da08-4b95-a714-8327d457216d'::uuid, 'voyager-gratuitement-france-house-sitting', '2026-10-18 00:56:34.142742+00'::timestamptz);

-- Réécriture, appliquée telle quelle par la simulation du 19/10/2026.
CREATE OR REPLACE FUNCTION pg_temp.seo1_gratuit(c text) RETURNS text LANGUAGE sql IMMUTABLE AS $f$
  SELECT
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(c,
    'Sur Guardiens, (\*\*)?la plateforme est (\*\*)?actuellement', '\1Guardiens est \2actuellement', 'g'),
    '(?:[Ll]a plateforme|Guardiens|Elle|L’accès|L''accès) est (\*\*)?actuellement (?:100[ \u00a0\u202f]?%[ \u00a0\u202f]?)?gratuite?(?: pour (?:les propriétaires et les gardiens|les deux rôles|propriétaires et gardiens|tous les membres))?(\*\*)?(?: pour (?:les propriétaires et les gardiens|les deux rôles|propriétaires et gardiens|tous les membres))?', 'Guardiens est \1gratuit\2', 'g'),
    'sur Guardiens, plateforme actuellement gratuite pour les deux rôles', 'Guardiens est gratuit', 'g'),
    'présentent le fonctionnement actuel et ses évolutions éventuelles', 'présentent le fonctionnement actuel', 'g'),
    '(\*\*)? ; elle facilite la mise en relation', '\1 ; la plateforme facilite la mise en relation', 'g'),
    '(^|\n)[^.\n]*second semestre 2027[^.\n]*\(/tarifs\)[^.\n]*\.', '\1Le fonctionnement est détaillé sur la [page tarifs](/tarifs).', 'g'),
    '[ \u00a0\u202f]+[^.\n]*second semestre 2027[^.\n]*\(/tarifs\)[^.\n]*\.', ' Le fonctionnement est détaillé sur la [page tarifs](/tarifs).', 'g'),
    '(^|\n)[^.\n]*second semestre 2027[^.\n]*\.[ \u00a0\u202f]*', '\1', 'g'),
    '[ \u00a0\u202f]+[^.\n]*second semestre 2027[^.\n]*\.', '', 'g')
$f$;

DO $seo1$
DECLARE
  n_pending integer;
  n_updated integer;
BEGIN
  IF (SELECT count(*) FROM _seo1_cible) <> 118 THEN
    RAISE EXCEPTION 'SEO1 : 118 articles attendus dans la liste';
  END IF;
  IF EXISTS (SELECT 1 FROM _seo1_cible c JOIN _seo1_exclus e USING (slug)) THEN
    RAISE EXCEPTION 'SEO1 : un slug exclu figure dans la liste';
  END IF;

  -- Articles restant à traiter : ceux qui ne sont pas encore sauvegardés.
  CREATE TEMP TABLE _seo1_pending ON COMMIT DROP AS
    SELECT c.* FROM _seo1_cible c
     WHERE NOT EXISTS (SELECT 1 FROM public._backup_articles_seo1_gratuit_20261019 b WHERE b.id = c.id);
  SELECT count(*) INTO n_pending FROM _seo1_pending;

  PERFORM 1 FROM public.articles a JOIN _seo1_pending p ON p.id = a.id ORDER BY a.id FOR UPDATE OF a;
  IF EXISTS (
    SELECT 1 FROM _seo1_pending p LEFT JOIN public.articles a ON a.id = p.id AND a.slug = p.slug
     WHERE a.id IS NULL OR a.published IS NOT TRUE OR a.updated_at IS DISTINCT FROM p.version
  ) THEN
    RAISE EXCEPTION 'SEO1 : article absent, dépublié ou modifié depuis le 19/10/2026, à préparer de nouveau';
  END IF;

  INSERT INTO public._backup_articles_seo1_gratuit_20261019
    SELECT a.* FROM public.articles a JOIN _seo1_pending p ON p.id = a.id;

  UPDATE public.articles a SET content = pg_temp.seo1_gratuit(a.content)
    FROM _seo1_pending p
   WHERE a.id = p.id AND a.updated_at = p.version;
  GET DIAGNOSTICS n_updated = ROW_COUNT;
  IF n_updated <> n_pending THEN
    RAISE EXCEPTION 'SEO1 : % articles modifiés au lieu de %', n_updated, n_pending;
  END IF;

  -- Contrôles de sortie, sur les 118 articles de la liste.
  IF EXISTS (
    SELECT 1 FROM public.articles a JOIN _seo1_cible c ON c.id = a.id
     WHERE a.content ~* 'actuellement[^.\n]{0,80}gratuit' OR a.content ~ 'second semestre 2027' OR a.content ~* 'préavis'
  ) THEN
    RAISE EXCEPTION 'SEO1 : une mention de gratuité datée subsiste';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.articles a JOIN public._backup_articles_seo1_gratuit_20261019 b ON b.id = a.id
     WHERE (length(a.content) - length(replace(a.content, '**', ''))) / 2 % 2
        <> (length(b.content) - length(replace(b.content, '**', ''))) / 2 % 2
        OR (b.content ~ '\(/tarifs\)' AND a.content !~ '\(/tarifs\)')
        OR (a.content ~ '\n\n\n' AND b.content !~ '\n\n\n')
  ) THEN
    RAISE EXCEPTION 'SEO1 : mise en forme altérée (gras, lien /tarifs ou paragraphe vide)';
  END IF;
  -- Aucun autre article publié hors exclusions ne garde la tournure.
  IF EXISTS (
    SELECT 1 FROM public.articles a
     WHERE a.published AND a.slug NOT IN (SELECT slug FROM _seo1_exclus)
       AND (a.content ~* 'actuellement[^.\n]{0,80}gratuit' OR a.content ~ 'second semestre 2027')
  ) THEN
    RAISE EXCEPTION 'SEO1 : un article publié hors liste garde « actuellement gratuit » ou l''échéance 2027, à préparer de nouveau';
  END IF;

  RAISE NOTICE 'SEO1 : % articles réécrits, sauvegarde public._backup_articles_seo1_gratuit_20261019', n_updated;
END $seo1$;

COMMIT;

-- Recette après application (lecture seule) :
-- SELECT count(*) FROM public.articles WHERE published AND content ~* 'actuellement[^.\n]{0,80}gratuit';
--   -> 13 (les 4 refontes d'exception et les 9 autres articles comparatifs, laissés tels quels)
-- SELECT count(*) FROM public._backup_articles_seo1_gratuit_20261019;  -> 118
