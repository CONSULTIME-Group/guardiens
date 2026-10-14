-- Lot V1 (14/10/2026) : email de Noël v3, « un email, un geste ».
-- Source : claude/email-noel-v3-cadrage-et-maquettes-14-octobre-2026.md,
-- maquettes Claude Design « Guardiens · Email Noël v3 », décisions de Jérémie
-- du 14/10/2026 (photo du logement obligatoire pour publier, un seul email de
-- Noël). État relu en base le 14/10/2026 (lecture seule) : aucune annonce
-- publiée, expirée ou terminée sans photo (logement, galerie ou couverture).
-- Fichier rejouable : CREATE ... IF NOT EXISTS, CREATE OR REPLACE, DROP
-- TRIGGER IF EXISTS avant CREATE TRIGGER, aucune écriture de ligne.
-- Convention Y2 : tout REVOKE vise PUBLIC, anon et authenticated nommément,
-- puis un GRANT rend l'accès voulu.

-- =========================================================================
-- V1.1. Jetons de la page /annonce-noel/:jeton.
-- Un jeton par propriétaire et par campagne, 30 jours, réutilisable. Il
-- ouvre seulement les questions, la photo et la préparation du brouillon :
-- la publication passe par la connexion (fiche de l'annonce).
-- Lu et écrit par la fonction annonce-noel et par send-mass-email
-- (service_role) seulement.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.owner_noel_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign text NOT NULL DEFAULT 'noel_v3',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  draft_sit_id uuid REFERENCES public.sits(id) ON DELETE SET NULL,
  -- Réponses de la page (dates choisies) et textes générés (titre, texte),
  -- pour ne jamais écraser un texte que le propriétaire a réécrit.
  answers jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_owner_noel_tokens_profile
  ON public.owner_noel_tokens (profile_id, campaign);

ALTER TABLE public.owner_noel_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.owner_noel_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.owner_noel_tokens TO service_role;

COMMENT ON TABLE public.owner_noel_tokens IS
  'Lot V1 : jetons de la page /annonce-noel/:jeton (questions, photo, brouillon). Service_role seul.';

-- =========================================================================
-- V1.2. Photo obligatoire à la première publication, côté serveur.
-- Jusqu'ici contrôlée seulement par le navigateur (src/lib/sitPublishRules.ts,
-- bloquant « photo »). Même règle : une photo de couverture sur l'annonce, une
-- photo du logement, ou une photo dans la galerie du propriétaire.
-- À toute mise en ligne depuis un brouillon (première publication, ou
-- republication d'une annonce repassée en brouillon) et à toute insertion
-- publiée, comme la règle du navigateur. Une republication automatique
-- (create_avis_annulation, annulée vers publiée) ou une expirée remise en
-- ligne ne passe jamais par ce contrôle : elle ne doit pas échouer pour une
-- photo retirée depuis.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.guard_sit_publish_requires_photo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'published'::sit_status
     AND (TG_OP = 'INSERT' OR OLD.status = 'draft'::sit_status)
     AND btrim(COALESCE(NEW.cover_photo_url, '')) = ''
     AND NOT EXISTS (
       SELECT 1 FROM public.properties p
       WHERE p.id = NEW.property_id
         AND (COALESCE(array_length(p.photos, 1), 0) > 0 OR btrim(COALESCE(p.cover_photo_url, '')) <> '')
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.owner_gallery g WHERE g.user_id = NEW.user_id
     ) THEN
    RAISE EXCEPTION 'Ajoutez au moins une photo de votre logement pour publier votre annonce.'
      USING ERRCODE = 'P0001', HINT = 'sit_photo_required';
  END IF;
  RETURN NEW;
END;
$function$;

-- Fonction de déclencheur : Postgres refuse tout appel direct d'une fonction
-- RETURNS trigger, aucun droit EXECUTE à retirer.

DROP TRIGGER IF EXISTS trg_guard_sit_publish_requires_photo ON public.sits;
CREATE TRIGGER trg_guard_sit_publish_requires_photo
  BEFORE INSERT OR UPDATE OF status ON public.sits
  FOR EACH ROW EXECUTE FUNCTION public.guard_sit_publish_requires_photo();
