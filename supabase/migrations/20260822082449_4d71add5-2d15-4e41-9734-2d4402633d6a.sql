-- trg_notify_garde_accord_signed est une fonction de trigger interne :
-- elle ne doit pas être appelable via l'API. Le trigger l'exécute avec les
-- droits du propriétaire de la table, indépendamment de ce REVOKE.
REVOKE EXECUTE ON FUNCTION public.trg_notify_garde_accord_signed() FROM anon, authenticated, public;