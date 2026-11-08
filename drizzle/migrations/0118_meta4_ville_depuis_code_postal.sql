-- Lot META4 (08/11/2026, « si t'as le code postal, t'as la ville » de Jérémie).
--
-- Constat (base, 08/11/2026) : 41 profils ont un code postal sans ville. Le
-- lot G1 les situe au centre de la commune la plus peuplée du code postal,
-- mais n'écrit pas la ville : leurs annonces affichent alors la position brute
-- (titre Google « … à 69380, Rhône »).
--
-- Reprise unique : chaque commune ci-dessous a été retrouvée par la Base
-- adresse nationale (api-adresse.data.gouv.fr, type municipality, même code
-- postal) à moins de 3 km du point déjà posé par G1, donc la commune que le
-- site utilise déjà pour ce membre. 30 profils sur 41 ; restent 11 profils au
-- code postal invalide, étranger ou sans point cohérent (13100, 51300, 65200).
-- Une ville déjà saisie n'est jamais remplacée. Rejouable.
-- La suite est prise en charge par geocode-profile (même lot).

WITH v(id, postal_code, ville) AS (VALUES
  ('ddd9f401-297a-46eb-87a2-d61f78d729f0'::uuid, '84490', 'Saint-Saturnin-lès-Apt'),
  ('2daee8c2-7036-4149-bcef-993f85ef6b1b'::uuid, '56430', 'Mauron'),
  ('c2ec5890-c1bf-4740-9e56-784245453a03'::uuid, '11250', 'Pomas'),
  ('0b55b137-0db4-4da9-8eaa-c27d51a429f3'::uuid, '12400', 'Saint-Affrique'),
  ('d8d1d340-31f2-4378-adfe-9e5b7950d4df'::uuid, '67000', 'Strasbourg'),
  ('289776f6-706c-4c9b-be88-a636f847bf20'::uuid, '59690', 'Vieux-Condé'),
  ('a5e3eb8f-9e7e-4c80-b5d1-94d36b535091'::uuid, '66300', 'Thuir'),
  ('2d0798f6-4ed7-48ca-8065-dfb93dcbc024'::uuid, '91910', 'Saint-Sulpice-de-Favières'),
  ('106420e5-5022-4891-a768-95af4bd09f88'::uuid, '85100', 'Les Sables-d''Olonne'),
  ('04ce6470-3d68-493f-9a01-c2782fd30632'::uuid, '83600', 'Bagnols-en-Forêt'),
  ('6a9a3f17-52f9-4715-8f22-936763e84909'::uuid, '29190', 'Pleyben'),
  ('6ec24dca-36a4-46be-a869-9131d0a6491a'::uuid, '83510', 'Lorgues'),
  ('b5c417d9-6021-4eb0-b285-bed064fee375'::uuid, '29520', 'Châteauneuf-du-Faou'),
  ('a6ffb5f5-0fc3-428c-a8bb-982c7cb5c78b'::uuid, '01240', 'Saint-Paul-de-Varax'),
  ('75c5b3c7-0366-4380-9350-f86fb0f102f7'::uuid, '92250', 'La Garenne-Colombes'),
  ('73d31161-2453-4427-9448-1a1e04199cab'::uuid, '78100', 'Saint-Germain-en-Laye'),
  ('9a405163-afe3-4767-b40c-5c0a18c75d07'::uuid, '69380', 'Chazay-d''Azergues'),
  ('1bac8c4f-7b04-4386-847f-7522efc7a7a5'::uuid, '30130', 'Pont-Saint-Esprit'),
  ('53ed6588-6379-4600-95ac-8dec89e49406'::uuid, '39000', 'Lons-le-Saunier'),
  ('6b9f8a77-5269-48c4-83f7-6353f1c86831'::uuid, '67270', 'Hochfelden'),
  ('d56f2b3c-3580-416f-b7b8-f9f74fa20218'::uuid, '75001', 'Paris'),
  ('87d44546-db21-4e76-990d-0922911f78f9'::uuid, '69650', 'Quincieux'),
  ('38e73604-9504-4ac2-9f7b-a9fc1dd4623d'::uuid, '69006', 'Lyon'),
  ('63cb2be9-fd4a-44ad-89ef-eb5f8415bd65'::uuid, '69007', 'Lyon'),
  ('3992b7e8-1636-499a-a6a3-94fdb317a8fe'::uuid, '97410', 'Saint-Pierre'),
  ('4cd000e5-0ee5-485a-a786-7e457b9854aa'::uuid, '94250', 'Gentilly'),
  ('dd5246eb-d52f-45b0-bf11-57b0f049a7b2'::uuid, '07340', 'Peaugres'),
  ('6bbe1513-449b-4196-a38c-7a67718061e1'::uuid, '07320', 'Saint-Agrève'),
  ('5ad5ec05-51fc-4777-add8-11db7ed87324'::uuid, '06800', 'Cagnes-sur-Mer'),
  ('ee4add90-6bbd-4354-84c2-0be8bdcfbc0d'::uuid, '97400', 'Saint-Denis')
)
UPDATE public.profiles p
SET city = v.ville
FROM v
WHERE p.id = v.id
  AND trim(p.postal_code) = v.postal_code
  AND (p.city IS NULL OR trim(p.city) = '');
