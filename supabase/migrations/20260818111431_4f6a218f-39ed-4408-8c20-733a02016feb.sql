-- FAQ : retour à « accord de garde », commodat relégué à la note juridique
UPDATE public.faq_entries
SET question = 'Qu''est-ce que "Notre accord de garde" ?',
    answer = $$Quand une garde est confirmée, Guardiens génère un accord de garde : le récapitulatif, daté et signé par les deux parties, de ce que vous avez prévu ensemble.

Il reprend les informations essentielles : les dates, les animaux concernés, ce que chacun s'engage à faire, les règles de vie dans le logement, quoi faire si un animal ne va pas bien, et les contacts utiles. La plupart des informations viennent directement du guide de la maison, vous relisez, vous ne remplissez pas.

**Pourquoi c'est utile ?** Parce que même avec les meilleures intentions, un animal malade ou une fuite d'eau ça arrive. Et si le pire arrivait, des dates signées prouvent qui devait restituer le logement, et quand.

Juridiquement, cet accord prend la forme d'un commodat (code civil, articles 1875 et suivants) : un prêt à usage à titre gratuit, avec obligation de restitution à la date convenue.

Signer reste optionnel : la garde est confirmée que vous signiez ou non. Mais ceux qui signent partent généralement plus sereins.$$
WHERE question = 'Qu''est-ce que « Notre commodat » ?';

UPDATE public.faq_entries
SET question = 'L''accord de garde a-t-il une valeur juridique ?',
    answer = $$Oui, et on préfère vous expliquer exactement laquelle.

L'accord de garde n'a pas la valeur d'un acte authentique signé devant notaire, mais il est daté, signé par les deux parties et archivé avec une preuve de lecture. Juridiquement, il prend la forme d'un commodat (code civil, articles 1875 et suivants) : un prêt à usage à titre gratuit, avec obligation de restitution à la date convenue.

Concrètement, si un désaccord survenait sur la restitution du logement, par exemple si un gardien refusait de partir à la date prévue, ce document serait un élément de preuve utile : il établit que le gardien occupait les lieux avec votre accord, et jusqu'à quand. L'occupation sans droit ni titre est interdite par l'article 226-4 du code pénal et la loi du 27 juillet 2023 sur l'occupation illicite des domiciles. Le document ne crée pas cette protection à lui seul, il la rend plus simple à établir.

Cet accord ne remplace pas votre assurance habitation. Il ne crée ni relation de travail, ni bail. Il dit ce que vous avez prévu ensemble, et c'est déjà beaucoup.$$
WHERE question = 'Le commodat de garde a-t-il une valeur juridique ?';

-- Message d'erreur aligné sur le vocabulaire visible (« accord », pas « commodat »)
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
    RAISE EXCEPTION 'Accord déjà signé';
  END IF;

  INSERT INTO garde_accords (garde_id, user_id, role, accepted, declined, declined_at)
  VALUES (p_garde_id, auth.uid(), v_role, false, true, now())
  ON CONFLICT (garde_id, user_id) DO UPDATE
    SET declined = true,
        declined_at = now(),
        role = EXCLUDED.role;
END;
$func$;