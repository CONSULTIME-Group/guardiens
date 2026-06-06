create or replace function public.invite_helper_to_mission(
  p_mission_id uuid,
  p_helper_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_mission record;
  v_owner_name text;
  v_owner_avatar text;
  v_notif_id uuid;
  v_existing_count int;
begin
  if v_caller is null then
    raise exception 'auth required' using errcode = '28000';
  end if;

  select id, user_id, title, category
    into v_mission
    from public.small_missions
   where id = p_mission_id
     and user_id = v_caller
     and status in ('open', 'in_progress')
   limit 1;

  if v_mission.id is null then
    raise exception 'mission not found or not owned by caller' using errcode = '42501';
  end if;

  if p_helper_id = v_caller then
    raise exception 'cannot invite yourself' using errcode = '22023';
  end if;

  select count(*) into v_existing_count
    from public.notifications
   where user_id = p_helper_id
     and type = 'mission_invitation'
     and link = '/petites-missions/' || p_mission_id::text
     and created_at > now() - interval '7 days';

  if v_existing_count > 0 then
    return null;
  end if;

  select first_name, avatar_url
    into v_owner_name, v_owner_avatar
    from public.profiles
   where id = v_caller;

  insert into public.notifications (user_id, type, title, body, link, actor_name, actor_avatar_url)
  values (
    p_helper_id,
    'mission_invitation',
    coalesce(v_owner_name, 'Un membre') || ' vous propose un coup de main',
    'Vos compétences correspondent à cette demande : « ' || v_mission.title || ' »',
    '/petites-missions/' || p_mission_id::text,
    v_owner_name,
    v_owner_avatar
  )
  returning id into v_notif_id;

  return v_notif_id;
end;
$$;

grant execute on function public.invite_helper_to_mission(uuid, uuid) to authenticated;