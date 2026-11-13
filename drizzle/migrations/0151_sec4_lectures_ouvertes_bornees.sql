-- SEC4 (13/11/2026) : quatre tables lues en entier par choix produit, droits resserres.
-- Repere : sec4_lectures_ouvertes_bornees. Rejouable, aucune donnee modifiee.
--
-- Les lectures ouvertes restent voulues (aucune donnee personnelle privee) :
--   feature_flags     : interrupteurs du site lus par les visiteurs (sorties, A propos, seuils d'affinite).
--   owner_gallery     : photos de logement publiques (decision du fondateur du 13/10/2026, P3-07 ecarte).
--   sitter_gallery    : galerie gardien reservee aux membres connectes.
--   reputation_config : seuils de reputation lus par la vue profile_reputation (security_invoker).
-- Ce lot retire ce qui depasse ce besoin.

-- 1. Aucun membre ni visiteur ne vide, ne reference ni ne pose de declencheur sur ces tables.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.feature_flags, public.owner_gallery,
  public.sitter_gallery, public.reputation_config FROM PUBLIC, anon, authenticated;

-- 2. feature_flags : lecture limitee aux colonnes utiles au site, sans description ni auteur de la modification.
REVOKE ALL ON public.feature_flags FROM PUBLIC, anon, authenticated;
GRANT SELECT (key, enabled, applies_since, value_int) ON public.feature_flags TO anon, authenticated;
-- Ecriture par les admins seulement (politique « Seuls les admins peuvent modifier les flags »).
GRANT UPDATE (enabled, applies_since, value_int, updated_at, updated_by) ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;

-- 3. reputation_config : aucun droit pour un visiteur (la politique de lecture vise les membres).
REVOKE ALL ON public.reputation_config FROM anon;

-- 4. sitter_gallery : la seule politique de lecture vise les membres connectes, le visiteur n'a rien a y lire.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.sitter_gallery FROM anon;

COMMENT ON POLICY "Flags publiquement lisibles" ON public.feature_flags IS
  'SEC4 : lecture publique voulue (interrupteurs du site), colonnes bornees par GRANT a key, enabled, applies_since, value_int.';
COMMENT ON POLICY "Owner gallery photos are publicly readable" ON public.owner_gallery IS
  'SEC4 : lecture publique voulue, photos de logement affichees sur les annonces et le profil public (decision du 13/10/2026).';
COMMENT ON POLICY "Users can view all gallery photos" ON public.sitter_gallery IS
  'SEC4 : lecture reservee aux membres connectes, voulue (galerie gardien membres seulement).';
COMMENT ON POLICY "config_select_authenticated" ON public.reputation_config IS
  'SEC4 : seuils de reputation lus par la vue profile_reputation (security_invoker), aucune donnee personnelle.';
