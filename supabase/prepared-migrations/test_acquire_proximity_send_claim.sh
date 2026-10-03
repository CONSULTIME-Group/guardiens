#!/usr/bin/env bash
# Test SQL inerte : PostgreSQL jetable dans /tmp, aucune base réelle touchée.
# Usage : bash supabase/prepared-migrations/test_acquire_proximity_send_claim.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="$(mktemp -d /tmp/pgprox.XXXX)"
PORT=55439
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE
initdb -D "$DIR/data" -U postgres -A trust >/dev/null
pg_ctl -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
trap 'pg_ctl -D "$DIR/data" -m immediate stop >/dev/null 2>&1; rm -rf "$DIR"' EXIT
P() { psql -h "$DIR" -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -Atq "$@"; }

# Socle copié de la production (table + finish + acquire global, inchangés).
P <<'SQL'
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
CREATE TABLE public.member_email_send_claims (
  claim_key text PRIMARY KEY, owner_token uuid NOT NULL, state text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION public.finish_member_email_send_claim(p_claim_key text, p_owner_token uuid, p_outcome text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('sent','retryable','uncertain') THEN
    RAISE EXCEPTION 'invalid send outcome' USING ERRCODE = '22023'; END IF;
  UPDATE public.member_email_send_claims SET state = p_outcome, updated_at = now()
    WHERE claim_key = p_claim_key AND owner_token = p_owner_token AND state = 'sending';
  RETURN FOUND;
END $$;
SQL
P -f "$HERE/20261003110000_acquire_proximity_send_claim.sql"

fail() { echo "ÉCHEC: $*"; exit 1; }
eq() { [ "$1" = "$2" ] || fail "$3 (obtenu '$1', attendu '$2')"; echo "ok  $3"; }
K=$(printf 'a%.0s' {1..64}); T1=11111111-1111-1111-1111-111111111111; T2=22222222-2222-2222-2222-222222222222
acq() { P -c "select public.acquire_proximity_send_claim('$1','$2')"; }
age() { P -c "update member_email_send_claims set updated_at = now() - interval '$2' where claim_key='$1'"; }
owner() { P -c "select owner_token from member_email_send_claims where claim_key='$1'"; }

eq "$(acq $K $T1)" acquired "clé neuve acquise"
eq "$(acq $K $T2)" busy "deuxième acquisition concurrente refusée"
age $K '16 minutes'
eq "$(acq $K $T2)" busy "sending vieux de 16 min : jamais repris"
age $K '30 days'
eq "$(acq $K $T2)" busy "sending vieux de 30 jours : jamais repris"
eq "$(owner $K)" $T1 "propriétaire d'origine conservé"
eq "$(P -c "select public.finish_member_email_send_claim('$K','$T2','sent')")" f "un autre jeton ne peut pas finaliser"
eq "$(P -c "select public.finish_member_email_send_claim('$K','$T1','uncertain')")" t "le propriétaire finalise en uncertain"
age $K '7 hours'
eq "$(acq $K $T2)" uncertain "uncertain vieux de 7 h : jamais repris"
eq "$(owner $K)" $T1 "propriétaire toujours inchangé"

K2=$(printf 'b%.0s' {1..64})
acq $K2 $T1 >/dev/null; P -c "select public.finish_member_email_send_claim('$K2','$T1','retryable')" >/dev/null
eq "$(acq $K2 $T2)" acquired "retryable explicite : réacquis"
eq "$(owner $K2)" $T2 "nouveau propriétaire après retryable"
P -c "select public.finish_member_email_send_claim('$K2','$T2','sent')" >/dev/null
age $K2 '1 year'
eq "$(acq $K2 $T1)" sent "sent : jamais réacquis"

P -c "select public.acquire_proximity_send_claim('pas-hex','$T1')" >/dev/null 2>&1 && fail "clé invalide acceptée"; echo "ok  clé invalide refusée"

for r in anon authenticated; do
  eq "$(P -c "select has_function_privilege('$r','public.acquire_proximity_send_claim(text,uuid)','EXECUTE')")" f "$r sans droit d'exécution"
done
eq "$(P -c "select has_function_privilege('service_role','public.acquire_proximity_send_claim(text,uuid)','EXECUTE')")" t "service_role peut exécuter"
eq "$(P -c "select count(*) from information_schema.routine_privileges where routine_name='acquire_proximity_send_claim' and grantee='PUBLIC'")" 0 "aucun droit PUBLIC"
eq "$(P -c "select prosecdef::text || ' ' || array_to_string(proconfig, ',') from pg_proc where proname='acquire_proximity_send_claim'")" "true search_path=public, pg_temp" "SECURITY DEFINER et search_path fixé"
echo "TOUS LES TESTS SQL PASSENT"
