# Surface client : vues et fonctions

Date : 20/09/2026. Migration : `drizzle/migrations/0008_client_surface_lockdown.sql`.

## Règle permanente

Une vue du schéma `public` est en lecture seule côté client, toujours. Les rôles
`anon` et `authenticated` ne détiennent jamais INSERT, UPDATE, DELETE, TRUNCATE,
REFERENCES ni TRIGGER sur une vue. Motif : `public_profiles` (vue simple sur
`profiles`, propriétaire postgres, sans `security_invoker`) était modifiable et
supprimable via PostgREST. 20 vues portaient des droits d'écriture client.

## Fonctions réservées au service role

`check_content_quality`, `claim_mission_event`, `detect_low_email_delivery`,
`detect_stale_digest_queue`, `purge_cron_run_details`,
`recalc_seo_city_nearby_counts`, `recalc_seo_city_page_counts`,
`recalc_seo_department_page_counts`, `reconcile_email_click_events`,
`refresh_sitter_reply_stats`, `retry_missing_geocoding`, `increment_cp_relance`,
`increment_photo_analysis_quota`, `recalc_completed_sits_count`,
`recalculate_cancellations`, `recalculate_completed_sits`,
`increment_redirect_hit` (toutes surcharges).
`calculate_profile_completion` reste accessible à `authenticated` (appel `src/`).

## Sauvegardes

`_backup_view_grants_20260920`, `_backup_fn_acl_20260920`.

## Vérification

```sql
SELECT g.table_name, g.grantee, g.privilege_type
FROM information_schema.role_table_grants g
JOIN information_schema.views v ON v.table_schema = g.table_schema AND v.table_name = g.table_name
WHERE g.table_schema = 'public' AND g.grantee IN ('anon','authenticated','PUBLIC')
  AND g.privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER');

SELECT p.proname, pg_get_function_identity_arguments(p.oid), p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = ANY (ARRAY['claim_mission_event','increment_redirect_hit']);
```

Test automatisé : `node scripts/audit/test-client-surface.mjs` (inclus dans `npm run test:sql`).
