revoke execute on function public.invite_helper_to_mission(uuid, uuid) from public;
revoke execute on function public.invite_helper_to_mission(uuid, uuid) from anon;
grant execute on function public.invite_helper_to_mission(uuid, uuid) to authenticated;