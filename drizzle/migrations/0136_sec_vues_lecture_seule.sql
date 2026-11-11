-- SEC (11/11/2026) : une vue du schema public reste en lecture seule cote client.
-- La vue public_entraide_need_activity (0101) avait herite des droits par
-- defaut : anon et authenticated detenaient DELETE, et la vue (proprietaire
-- postgres, sans security_invoker) laissait supprimer les lignes de
-- small_missions des 90 derniers jours avec la cle publique.
-- Droits retires en production le 11/11/2026 a 09 h 40 (accord de Jeremie).
-- Cette migration rejoue la regle de 0008 sur toutes les vues existantes.
-- Regle pour la suite (verrou src/__tests__/security/view-grants-guard.test.ts) :
-- toute migration qui cree une vue public.* retire ces droits dans le meme fichier.
-- Aucune donnee modifiee. Rejouable.
DO $$
DECLARE v record;
BEGIN
  FOR v IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
  LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated, PUBLIC',
      v.relname
    );
  END LOOP;
END $$;
