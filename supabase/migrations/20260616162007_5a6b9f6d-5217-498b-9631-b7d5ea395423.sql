UPDATE public.owner_profiles
SET life_pace = 'equilibre',
    languages = ARRAY['Français','Anglais'],
    interests = ARRAY['Nature','Lecture','Cuisine','Voyages'],
    home_ambiance = ARRAY['Calme','Cosy','Familial'],
    household_composition = ARRAY['Couple','Enfants'],
    updated_at = now()
WHERE user_id = '7bf29905-d372-4669-93b1-ec7def9b06d5';