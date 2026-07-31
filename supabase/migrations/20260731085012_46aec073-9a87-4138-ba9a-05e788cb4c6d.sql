-- Retour arrière immédiat : la policy remplacée était exactement
--
--   CREATE POLICY "Sitter profiles are viewable by authenticated users"
--     ON public.sitter_profiles
--     FOR SELECT
--     TO authenticated
--     USING (true);
--
DROP POLICY IF EXISTS "Sitter profiles are viewable by authenticated users" ON public.sitter_profiles;

CREATE POLICY "Users can view their own sitter profile"
  ON public.sitter_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);