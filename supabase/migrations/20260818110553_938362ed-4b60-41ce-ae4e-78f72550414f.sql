-- 1. Refus explicite du commodat
ALTER TABLE public.garde_accords
  ADD COLUMN IF NOT EXISTS declined boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz;

ALTER TABLE public.garde_accords ALTER COLUMN document_hash DROP NOT NULL;

-- 2. Signature : pose le rôle, réinitialise un éventuel refus antérieur
CREATE OR REPLACE FUNCTION public.accept_garde_accord(p_garde_id uuid, p_document_hash text, p_document_content jsonb, p_ip_address text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $func$
DECLARE
  v_role text;
BEGIN
  IF EXISTS (SELECT 1 FROM sits s WHERE s.id = p_garde_id AND s.user_id = auth.uid()) THEN
    v_role := 'proprio';
  ELSIF EXISTS (SELECT 1 FROM applications a WHERE a.sit_id = p_garde_id AND a.sitter_id = auth.uid() AND a.status = 'accepted') THEN
    v_role := 'gardien';
  ELSE
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  INSERT INTO garde_accords (garde_id, user_id, role, accepted, accepted_at, ip_address, document_hash, document_content, declined, declined_at)
  VALUES (p_garde_id, auth.uid(), v_role, true, now(), p_ip_address, p_document_hash, p_document_content, false, NULL)
  ON CONFLICT (garde_id, user_id) DO UPDATE
    SET accepted = true,
        accepted_at = now(),
        role = EXCLUDED.role,
        document_hash = EXCLUDED.document_hash,
        document_content = EXCLUDED.document_content,
        declined = false,
        declined_at = NULL;
END;
$func$;

-- 3. Refus explicite et tracé
CREATE OR REPLACE FUNCTION public.decline_garde_accord(p_garde_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $func$
DECLARE
  v_role text;
BEGIN
  IF EXISTS (SELECT 1 FROM sits s WHERE s.id = p_garde_id AND s.user_id = auth.uid()) THEN
    v_role := 'proprio';
  ELSIF EXISTS (SELECT 1 FROM applications a WHERE a.sit_id = p_garde_id AND a.sitter_id = auth.uid() AND a.status = 'accepted') THEN
    v_role := 'gardien';
  ELSE
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  IF EXISTS (SELECT 1 FROM garde_accords ga WHERE ga.garde_id = p_garde_id AND ga.user_id = auth.uid() AND ga.accepted) THEN
    RAISE EXCEPTION 'Commodat déjà signé';
  END IF;

  INSERT INTO garde_accords (garde_id, user_id, role, accepted, declined, declined_at)
  VALUES (p_garde_id, auth.uid(), v_role, false, true, now())
  ON CONFLICT (garde_id, user_id) DO UPDATE
    SET declined = true,
        declined_at = now(),
        role = EXCLUDED.role;
END;
$func$;

-- 4. Lecture croisée sécurisée (propriétaire du sit, gardien accepté, admin)
CREATE OR REPLACE FUNCTION public.get_garde_accord_status(p_garde_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $func$
DECLARE
  v_owner_id uuid;
  v_sitter_id uuid;
  v_proprio garde_accords%ROWTYPE;
  v_gardien garde_accords%ROWTYPE;
BEGIN
  SELECT s.user_id INTO v_owner_id FROM sits s WHERE s.id = p_garde_id;
  IF v_owner_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT a.sitter_id INTO v_sitter_id
  FROM applications a
  WHERE a.sit_id = p_garde_id AND a.status = 'accepted'
  ORDER BY a.updated_at DESC
  LIMIT 1;

  IF auth.uid() IS DISTINCT FROM v_owner_id
     AND auth.uid() IS DISTINCT FROM v_sitter_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;

  SELECT ga.* INTO v_proprio
  FROM garde_accords ga
  WHERE ga.garde_id = p_garde_id AND ga.user_id = v_owner_id
  LIMIT 1;

  IF v_sitter_id IS NOT NULL THEN
    SELECT ga.* INTO v_gardien
    FROM garde_accords ga
    WHERE ga.garde_id = p_garde_id AND ga.user_id = v_sitter_id
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'proprio', CASE WHEN v_proprio.id IS NULL THEN NULL ELSE jsonb_build_object(
      'accepted', v_proprio.accepted,
      'accepted_at', v_proprio.accepted_at,
      'declined', v_proprio.declined,
      'declined_at', v_proprio.declined_at
    ) END,
    'gardien', CASE WHEN v_gardien.id IS NULL THEN NULL ELSE jsonb_build_object(
      'accepted', v_gardien.accepted,
      'accepted_at', v_gardien.accepted_at,
      'declined', v_gardien.declined,
      'declined_at', v_gardien.declined_at
    ) END,
    'document', v_proprio.document_content
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_garde_accord_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_garde_accord(uuid) TO authenticated;

-- 5. FAQ : renommage accord de garde en commodat, explication pédagogique
UPDATE public.faq_entries
SET question = 'Qu''est-ce que « Notre commodat » ?',
    answer = $$Quand une garde est confirmée, Guardiens génère un commodat : le récapitulatif, daté et signé par les deux parties, de ce que vous avez prévu ensemble. Un commodat, c'est le prêt à usage à titre gratuit du code civil (articles 1875 et suivants) : le logement est prêté gratuitement, pour des dates précises, avec obligation de le restituer à la date prévue.

Il reprend les informations essentielles : les animaux concernés, ce que chacun s'engage à faire, les règles de vie dans le logement, quoi faire si un animal ne va pas bien, comment gérer un imprévu. La plupart des informations viennent directement du guide de la maison, vous relisez, vous ne remplissez pas.

**Pourquoi c'est utile ?** Parce que même avec les meilleures intentions, un animal malade ou une fuite d'eau ça arrive. Et si le pire arrivait, des dates signées prouvent qui devait restituer le logement, et quand.

Signer reste optionnel : la garde est confirmée que vous signiez ou non. Mais ceux qui signent partent généralement plus sereins.$$
WHERE question = 'Qu''est-ce que "Notre accord de garde" ?';

UPDATE public.faq_entries
SET question = 'Le commodat de garde a-t-il une valeur juridique ?',
    answer = $$Oui, et on préfère vous expliquer exactement laquelle.

Un commodat est un vrai contrat, défini par les articles 1875 et suivants du code civil : prêt à usage à titre gratuit, avec obligation de restitution à la date convenue. Celui-ci n'a pas la valeur d'un acte authentique signé devant notaire, mais il est daté, signé par les deux parties et archivé avec une preuve de lecture.

Concrètement, si un désaccord survenait sur la restitution du logement, par exemple si un gardien refusait de partir à la date prévue, ce document serait un élément de preuve utile : il établit que le gardien occupait les lieux avec votre accord, et jusqu'à quand. L'occupation sans droit ni titre est interdite par l'article 226-4 du code pénal et la loi du 27 juillet 2023 sur l'occupation illicite des domiciles. Le document ne crée pas cette protection à lui seul, il la rend plus simple à établir.

Ce commodat ne remplace pas votre assurance habitation. Il ne crée ni relation de travail, ni bail. Il dit ce que vous avez prévu ensemble, et c'est déjà beaucoup.$$
WHERE question = 'L''accord de garde a-t-il une valeur juridique ?';