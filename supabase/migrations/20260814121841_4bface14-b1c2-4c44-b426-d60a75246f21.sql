update public.error_logs
set severity = 'ignored_third_party',
    context = coalesce(context, '{}'::jsonb) || '{"filtered": true, "filter_reason": "extension", "retroactive_filter": "2026-08-14"}'::jsonb
where fingerprint = 'l588z7';