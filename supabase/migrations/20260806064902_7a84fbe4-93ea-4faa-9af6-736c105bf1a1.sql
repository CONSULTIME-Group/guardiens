insert into public.feature_flags (key, enabled, value_int, description)
values ('cp_relance_max', true, 4, 'Plafond du nombre de relances "code postal manquant" par gardien. Modifiable ici sans redeploiement de la fonction relance-cp-manquant.')
on conflict (key) do update set value_int = excluded.value_int, enabled = excluded.enabled, description = excluded.description;