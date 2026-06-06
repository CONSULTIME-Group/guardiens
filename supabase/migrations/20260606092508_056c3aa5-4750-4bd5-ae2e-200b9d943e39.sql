update public.profiles
set skill_categories = (
  select array_agg(distinct case when c = 'house' then 'coups_de_main' else c end)
  from unnest(skill_categories) as c
)
where skill_categories @> array['house'];