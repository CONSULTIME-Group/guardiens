-- SEC2 (11/11/2026, revue securite, accord de Jeremie) :
-- consume_application_action_token etait executable par anon et authenticated
-- et renvoie l'email du gardien dans sa reponse. Son seul appelant est la
-- fonction serveur application-quick-action, avec la cle de service.
-- Droits retires en production le 11/11/2026 vers 10 h 40.
-- Aucune donnee modifiee. Rejouable.
REVOKE EXECUTE ON FUNCTION public.consume_application_action_token(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_application_action_token(text, text) TO service_role;
