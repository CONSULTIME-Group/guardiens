
REVOKE ALL ON FUNCTION public._calculate_owner_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._calculate_sitter_score(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._calculate_owner_score(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._calculate_sitter_score(uuid) TO service_role;
