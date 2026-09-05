create or replace function public.sitters_awaiting_gallery_photo(p_limit int default 600)
returns table (id uuid, email text, first_name text)
language sql
security definer
set search_path = public
as $$
  -- Cible du nudge 'nudge-sitter-gallery-photo' : gardiens dont la fiche
  -- /gardiens/:id est en noindex faute de signal de confiance.
  --
  -- ATTENTION : cette regle duplique volontairement isSitterProfileIndexable
  -- de src/lib/sitterProfileIndexability.js (bio d'au moins 80 caracteres ET
  -- au moins un signal de confiance : identite verifiee OU au moins une photo
  -- de galerie). Les deux doivent rester alignees, toute evolution de l'une
  -- impose l'autre.
  select p.id, p.email, p.first_name
  from public.profiles p
  left join public.sitter_profiles sp on sp.user_id = p.id
  where p.role in ('sitter', 'both')
    and p.email is not null
    and length(trim(p.email)) > 0
    and (p.account_status is null or p.account_status = 'active')
    and p.identity_verified = false
    and not exists (
      select 1 from public.sitter_gallery g where g.user_id = p.id
    )
    and (
      length(coalesce(nullif(p.bio, ''), '')) >= 80
      or (coalesce(p.bio, '') = '' and length(coalesce(sp.motivation, '')) >= 80)
    )
  order by p.created_at desc
  limit p_limit
$$;

revoke all on function public.sitters_awaiting_gallery_photo(int) from public;
revoke all on function public.sitters_awaiting_gallery_photo(int) from anon;
revoke all on function public.sitters_awaiting_gallery_photo(int) from authenticated;
grant execute on function public.sitters_awaiting_gallery_photo(int) to service_role;