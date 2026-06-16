UPDATE public.sitter_profiles
SET life_pace='equilibre',
    languages=ARRAY['Français','Anglais'],
    interests=ARRAY['Nature','Lecture','Cuisine','Randonnée'],
    work_during_sit='full_remote',
    updated_at=now()
WHERE user_id='f93147c1-42b9-4f7d-b64f-c3cacff2a50e';