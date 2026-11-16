-- Lot RCM1 (16/11/2026) : remise en file des pages retitrées le 15/11
-- (lot SEO-V1, 160 pages villes) et de l'article de définition, pour que
-- leur copie téléphone soit refaite. À lancer UNE FOIS, après le
-- déploiement de consume-seo-dirty avec adaptiveType mobile (sinon la copie
-- ordinateur serait refaite une seconde fois pour rien).
-- Budget : environ 175 rendus, moins de 2 % du plafond mensuel de 9 900.
insert into public.seo_url_outbox (path)
select '/house-sitting/' || slug from public.seo_city_pages where published
union
select '/actualites/c-est-quoi-le-house-sitting'
on conflict (path) do update set dirty_at = clock_timestamp(), next_attempt_at = clock_timestamp();
