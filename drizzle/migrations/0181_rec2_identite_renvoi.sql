-- Lot REC2 (22/11/2026, recette complete du 22/11, « ok go tout » de Jeremie).
-- Repere : rec2_identite_renvoi.
--
-- Constat du 22/11/2026 : un membre dont la piece d'identite est « en cours
-- de verification » (needs_review) ne peut pas en renvoyer une autre. Le
-- bouton « Retirer et renvoyer un document » ecrit le statut pending, et
-- prevent_profile_sensitive_self_update n'admet ce passage que depuis
-- not_submitted, pending ou rejected : « Modification interdite d'un champ
-- sensible du profil ». 2 echecs journalises le 03/11/2026, 5 membres passes
-- par needs_review en 30 jours. Reproduit en production dans une transaction
-- annulee.
--
-- Corps repris de pg_get_functiondef du 22/11/2026. Seul changement :
-- needs_review rejoint les statuts de depart d'une soumission par le membre.
-- verified reste ferme : une identite verifiee ne se resoumet pas.
-- Meme signature, SECURITY DEFINER et search_path inchanges. Aucune donnee
-- modifiee. Rejouable.

CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- rec2_identite_renvoi : renvoi d'une piece autorise depuis needs_review.
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.allow_internal_profile_update', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Escape hatch : le membre peut soumettre son dossier (statut -> 'pending')
  -- depuis un état non décidé. Les statuts 'verified' / 'rejected' / 'needs_review'
  -- restent réservés à l'équipe (verify-identity, admin-manage-identity-verification).
  IF NEW.identity_verification_status IS DISTINCT FROM OLD.identity_verification_status
     AND NOT (
       NEW.identity_verification_status IS NOT DISTINCT FROM 'pending'
       AND COALESCE(OLD.identity_verification_status, 'not_submitted') IN ('not_submitted', 'pending', 'rejected', 'needs_review')
     )
  THEN
    RAISE EXCEPTION 'Modification interdite d''un champ sensible du profil';
  END IF;

  -- Une soumission autorisee ne dispense jamais du controle des autres champs.
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.is_founder IS DISTINCT FROM OLD.is_founder
     OR NEW.pro_status IS DISTINCT FROM OLD.pro_status
     OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspended_by IS DISTINCT FROM OLD.suspended_by
     OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
     OR NEW.suspended_until IS DISTINCT FROM OLD.suspended_until
     OR NEW.boosted_until IS DISTINCT FROM OLD.boosted_until
     OR NEW.free_months_credit IS DISTINCT FROM OLD.free_months_credit
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.completed_sits_count IS DISTINCT FROM OLD.completed_sits_count
     OR NEW.cancellation_count IS DISTINCT FROM OLD.cancellation_count
     OR NEW.cancellations_as_proprio IS DISTINCT FROM OLD.cancellations_as_proprio
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
  THEN
    RAISE EXCEPTION 'Modification interdite d''un champ sensible du profil';
  END IF;
  RETURN NEW;
END;
$function$;
