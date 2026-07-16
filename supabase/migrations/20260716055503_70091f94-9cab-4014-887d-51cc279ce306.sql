
DO $$
DECLARE k text;
DECLARE admin_uid uuid := '7bf29905-d372-4669-93b1-ec7def9b06d5';
BEGIN
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name='supabase_service_role_key' LIMIT 1;
  IF k IS NULL THEN RAISE EXCEPTION 'no service_role key in vault'; END IF;

  PERFORM net.http_post(
    url:='https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-transactional-email',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||k),
    body:=jsonb_build_object(
      'templateName','application-message-restored',
      'recipientEmail','nisusiwona@gmail.com',
      'idempotencyKey','app-msg-restored-0f50c71e-fe00-4e05-b799-1c11e44dcdab',
      'templateData',jsonb_build_object(
        'firstName','Iwona',
        'sitTitle','Cherche personne de confiance pour prendre soin de mes deux Spitz et de mon vieux chat pendant notre absence.',
        'ownerFirstName','Rosyne',
        'conversationId','7b8a503b-537d-47ae-9948-19575a16e8dd'
      )
    )
  );

  PERFORM net.http_post(
    url:='https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/send-transactional-email',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||k),
    body:=jsonb_build_object(
      'templateName','application-message-restored',
      'recipientEmail','martinehascoet@orange.fr',
      'idempotencyKey','app-msg-restored-62dd903b-eecf-47d1-be4e-9743b091cb88',
      'templateData',jsonb_build_object(
        'firstName','Martine',
        'sitTitle','Cherche personne de confiance pour prendre soin de mes deux Spitz et de mon vieux chat pendant notre absence.',
        'ownerFirstName','Rosyne',
        'conversationId','76ad819f-1049-4dbd-8acf-e223f185d2ee'
      )
    )
  );

  INSERT INTO public.admin_action_logs (admin_id, action, target_type, target_id, note, metadata)
  VALUES
    (admin_uid, 'email_apology_sent', 'application', '0f50c71e-fe00-4e05-b799-1c11e44dcdab'::uuid,
     'Email d''excuse envoyé à Iwona (nisusiwona@gmail.com) après remplacement du refus LLM.',
     jsonb_build_object('template','application-message-restored','recipient','nisusiwona@gmail.com')),
    (admin_uid, 'email_apology_sent', 'application', '62dd903b-eecf-47d1-be4e-9743b091cb88'::uuid,
     'Email d''excuse envoyé à Martine (martinehascoet@orange.fr) après remplacement du refus LLM.',
     jsonb_build_object('template','application-message-restored','recipient','martinehascoet@orange.fr'));
END $$;
