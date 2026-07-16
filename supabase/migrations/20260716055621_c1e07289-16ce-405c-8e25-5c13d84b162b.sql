
DO $$
DECLARE k text;
DECLARE admin_uid uuid := '7bf29905-d372-4669-93b1-ec7def9b06d5';
BEGIN
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name='supabase_service_role_key' LIMIT 1;
  IF k IS NULL THEN RAISE EXCEPTION 'no service_role key in vault'; END IF;

  -- Notification in-app pour Rosyne (owner) : deux candidatures reçues
  INSERT INTO public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
  VALUES
    ('3083785c-b98e-4fed-a9d3-4005b4e0c0bb', 'new_application', 'Nouvelle candidature',
     'MARTINE a postulé pour « Cherche personne de confiance pour prendre soin de mes deux Spitz et de mon vieux chat pendant notre absence. ».',
     '/sits/c456ae11-ec2f-45d3-8e03-daa23eea6daa#candidatures',
     'MARTINE', NULL),
    ('3083785c-b98e-4fed-a9d3-4005b4e0c0bb', 'new_application', 'Nouvelle candidature',
     'Iwona a postulé pour « Cherche personne de confiance pour prendre soin de mes deux Spitz et de mon vieux chat pendant notre absence. ».',
     '/sits/c456ae11-ec2f-45d3-8e03-daa23eea6daa#candidatures',
     'Iwona', NULL);

  -- Email "première candidature" à Rosyne (idempotent via clé unique)
  PERFORM net.http_post(
    url:='https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-transactional-email',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||k),
    body:=jsonb_build_object(
      'templateName','first-application-received',
      'recipientEmail','rozenn.290@gmail.com',
      'idempotencyKey','first-application-62dd903b-eecf-47d1-be4e-9743b091cb88',
      'templateData',jsonb_build_object(
        'sitterFirstName','MARTINE',
        'sitTitle','Cherche personne de confiance pour prendre soin de mes deux Spitz et de mon vieux chat pendant notre absence.',
        'messagePreview','',
        'sitterCity',NULL,
        'sitterExperience',NULL
      )
    )
  );

  PERFORM net.http_post(
    url:='https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-transactional-email',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||k),
    body:=jsonb_build_object(
      'templateName','new-application',
      'recipientEmail','rozenn.290@gmail.com',
      'idempotencyKey','new-application-0f50c71e-fe00-4e05-b799-1c11e44dcdab',
      'templateData',jsonb_build_object(
        'sitterFirstName','Iwona',
        'sitTitle','Cherche personne de confiance pour prendre soin de mes deux Spitz et de mon vieux chat pendant notre absence.',
        'sitId','c456ae11-ec2f-45d3-8e03-daa23eea6daa',
        'messagePreview','',
        'sitterCity',NULL,
        'sitterExperience',NULL,
        'sitterAvatarUrl',NULL
      )
    )
  );

  INSERT INTO public.admin_action_logs (admin_id, action, target_type, target_id, note, metadata)
  VALUES (admin_uid, 'owner_notification_backfill', 'sit', 'c456ae11-ec2f-45d3-8e03-daa23eea6daa'::uuid,
    'Rattrapage manuel : notifications in-app + emails first-application/new-application envoyés à Rosyne pour les deux candidatures 07-15 (aucun envoi trouvé côté trigger).',
    jsonb_build_object('applications', jsonb_build_array('0f50c71e-fe00-4e05-b799-1c11e44dcdab','62dd903b-eecf-47d1-be4e-9743b091cb88')));
END $$;
