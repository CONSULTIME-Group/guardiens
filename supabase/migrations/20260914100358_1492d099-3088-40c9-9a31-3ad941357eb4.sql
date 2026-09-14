create or replace function public.admin_projet_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;

  with projets as (
    select m.id, m.title, m.slug, m.status, m.created_at
    from public.small_missions m
    where m.category = 'projet'
  ),
  resp as (
    select r.mission_id, r.responder_id, r.status, r.created_at
    from public.small_mission_responses r
    join projets p on p.id = r.mission_id
  ),
  per_projet as (
    select p.id,
           p.title,
           p.slug,
           p.status,
           p.created_at,
           (select count(*) from resp r where r.mission_id = p.id) as nb,
           (select min(r.created_at) from resp r where r.mission_id = p.id) as first_at,
           (select count(*) from resp r where r.mission_id = p.id and r.status = 'accepted') as nb_accepted
    from projets p
  )
  select jsonb_build_object(
    'published', (select count(*) from projets),
    'open', (select count(*) from projets where status = 'open'),
    'median_responses', (
      select percentile_cont(0.5) within group (order by nb) from per_projet
    ),
    'median_days_first_response', (
      select percentile_cont(0.5) within group (
        order by extract(epoch from (first_at - created_at)) / 86400.0
      )
      from per_projet where first_at is not null
    ),
    'zero_response_14d', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', id, 'title', title, 'slug', slug,
               'created_at', created_at
             ) order by created_at)
      from per_projet
      where nb = 0
        and created_at < now() - interval '14 days'
        and status in ('open', 'in_progress')
    ), '[]'::jsonb),
    'closed_count', (select count(*) from per_projet where status in ('completed', 'cancelled')),
    'closed_filled', (select count(*) from per_projet where status in ('completed', 'cancelled') and nb_accepted > 0),
    'cross_members', (
      select count(distinct r.responder_id)
      from resp r
      where exists (
        select 1 from public.applications a where a.sitter_id = r.responder_id
      )
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.admin_projet_kpis() to authenticated;