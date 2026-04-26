// Helper client mutualisé pour invoquer l'edge function `send-transactional-email`.
//
// Centralise :
//   - la résolution de l'email destinataire à partir d'un user_id (via la vue
//     `safe_user_emails` ou un appel admin selon disponibilité),
//   - la construction d'`idempotencyKey` stables,
//   - le logging d'erreur silencieux (l'envoi d'email ne doit JAMAIS bloquer
//     un flux UX critique comme accepter une candidature).
//
// Usage :
//   await sendTransactionalEmail({
//     templateName: "application-accepted",
//     recipientUserId: app.sitter_id,
//     idempotencyKey: `app-accepted-${app.id}`,
//     templateData: { sitTitle, ownerFirstName },
//   });

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface SendTransactionalEmailParams {
  templateName: string;
  /** Soit l'email direct, soit un user_id à résoudre */
  recipientEmail?: string;
  recipientUserId?: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
}

/**
 * Résout l'email d'un utilisateur via l'auth admin (côté client impossible) ou
 * via la table `profiles` si une colonne email y est exposée. À défaut, on
 * laisse l'edge function tenter de récupérer l'email côté serveur.
 *
 * Stratégie actuelle : on délègue à l'edge function en passant `recipientUserId`
 * dans `templateData` et on s'attend à ce qu'elle résolve l'email côté serveur.
 * Si `recipientEmail` est fourni explicitement, on l'utilise.
 */
export async function sendTransactionalEmail(
  params: SendTransactionalEmailParams,
): Promise<{ success: boolean; error?: unknown }> {
  const { templateName, recipientEmail, recipientUserId, idempotencyKey, templateData } = params;

  if (!recipientEmail && !recipientUserId) {
    logger.warn("[sendTransactionalEmail] missing recipient", { templateName, idempotencyKey });
    return { success: false, error: "missing_recipient" };
  }

  let email = recipientEmail;

  // Résolution côté client si on n'a qu'un user_id : on tente la RPC ou la
  // vue sécurisée si elle existe ; sinon on échoue silencieusement.
  if (!email && recipientUserId) {
    try {
      const { data, error } = await supabase
        .rpc("get_user_email_for_notification" as any, { p_user_id: recipientUserId });
      if (!error && typeof data === "string" && data.length > 0) {
        email = data;
      }
    } catch (e) {
      // RPC absente — on tombera dans le warn ci-dessous
    }
  }

  if (!email) {
    logger.warn("[sendTransactionalEmail] could not resolve recipient email", {
      templateName,
      recipientUserId,
      idempotencyKey,
    });
    return { success: false, error: "email_not_resolved" };
  }

  try {
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName,
        recipientEmail: email,
        idempotencyKey,
        templateData: templateData ?? {},
      },
    });
    if (error) {
      logger.error("[sendTransactionalEmail] invoke failed", {
        templateName,
        idempotencyKey,
        error: String(error),
      });
      return { success: false, error };
    }
    return { success: true };
  } catch (e) {
    logger.error("[sendTransactionalEmail] threw", {
      templateName,
      idempotencyKey,
      error: String(e),
    });
    return { success: false, error: e };
  }
}
