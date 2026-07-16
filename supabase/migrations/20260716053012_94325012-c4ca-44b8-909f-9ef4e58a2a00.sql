
-- Le trigger messages_guard_participant_update bloque la modification du champ
-- content même en service_role. On désactive temporairement les triggers
-- utilisateur pour ce nettoyage ciblé, puis on les réactive.
SET LOCAL session_replication_role = 'replica';

UPDATE public.messages
SET content = 'Bonjour Rosyne,

Votre annonce pour prendre soin de vos deux Spitz et de votre chat a retenu mon attention. Je serais heureuse d''en discuter avec vous pour vous présenter mon parcours et vérifier que mes disponibilités correspondent aux dates de votre absence.

N''hésitez pas à me poser toutes vos questions, je vous répondrai avec plaisir.

Belle journée,'
WHERE id IN (
  '03c7cd9f-e626-4032-a10f-ea7e67eca939',
  '713fc654-f362-46a9-8a80-1d4552f97861'
);

SET LOCAL session_replication_role = 'origin';
