/**
 * Déclin groupé de candidatures ouvertes, utilisé par le filet de sécurité
 * de la dépublication d'annonce (OwnerSitView).
 *
 * Doctrine d'envoi, décidée le 12/08/2026 :
 * - un déclin groupé emprunte EXACTEMENT le même chemin qu'un déclin unitaire
 *   (`sendTransactionalEmail`, template `application-declined`, clé
 *   d'idempotence `app-declined-<application_id>`), pour que les plafonds de
 *   fréquence et la file d'envoi existants s'appliquent sans exception ;
 * - les candidats sont traités en série, jamais en rafale parallèle, avec une
 *   micro-pause entre deux envois. C'est le pattern déjà utilisé pour les
 *   déclins automatiques à l'acceptation d'une candidature ;
 * - un échec sur un candidat n'interrompt pas les suivants, il est compté.
 *
 * La fermeture automatique des candidatures orphelines reste le filet de
 * dernier recours : ce helper ne la remplace pas, il évite juste qu'elle ait
 * à s'exécuter quand le propriétaire a choisi de répondre.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";

/** Statuts considérés comme « candidature ouverte, sans réponse ». */
export const OPEN_APPLICATION_STATUSES = ["pending", "viewed"] as const;

/** Message type envoyé lors d'un déclin groupé à la dépublication. */
export const BULK_DECLINE_MESSAGE =
  "Merci pour votre candidature ! Cette annonce n'est plus d'actualité, je la retire. N'hésitez pas à postuler à mes prochaines annonces.";

/** Message système déposé dans la conversation, identique au déclin unitaire. */
export const DECLINE_SYSTEM_MESSAGE =
  "Votre candidature a été déclinée pour cette garde.";

export interface OpenApplication {
  id: string;
  sitter_id: string;
  created_at: string;
  first_name: string;
}

export interface BulkDeclineResult {
  declined: number;
  failed: number;
}

/** Pause entre deux candidats, évite la rafale synchrone. */
const SEND_SPACING_MS = 150;

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Étiquette lisible d'une candidature dans la boîte de dialogue.
 * Fonction pure, testée isolément.
 */
export const formatOpenApplicationLabel = (
  app: Pick<OpenApplication, "first_name" | "created_at">,
  locale = "fr-FR",
): string => {
  const name = app.first_name?.trim() || "Candidat";
  const date = new Date(app.created_at);
  if (Number.isNaN(date.getTime())) return name;
  const formatted = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
  }).format(date);
  return `${name}, candidature du ${formatted}`;
};

/**
 * Décline en série une liste de candidatures ouvertes.
 * Ne lève jamais : renvoie le compte des succès et des échecs.
 */
export async function declineOpenApplications(params: {
  applications: OpenApplication[];
  sitId: string;
  sitTitle: string;
  ownerId: string;
  message?: string;
  spacingMs?: number;
}): Promise<BulkDeclineResult> {
  const {
    applications,
    sitId,
    sitTitle,
    ownerId,
    message = BULK_DECLINE_MESSAGE,
    spacingMs = SEND_SPACING_MS,
  } = params;

  let declined = 0;
  let failed = 0;

  for (const app of applications) {
    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: "rejected" as any })
        .eq("id", app.id)
        .in("status", [...OPEN_APPLICATION_STATUSES]);
      if (error) throw error;

      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("sit_id", sitId)
        .eq("sitter_id", app.sitter_id)
        .maybeSingle();

      if (conv?.id) {
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: ownerId,
          content: DECLINE_SYSTEM_MESSAGE,
          is_system: true,
        });
        if (message.trim()) {
          await supabase.from("messages").insert({
            conversation_id: conv.id,
            sender_id: ownerId,
            content: message.trim(),
            is_system: false,
          });
        }
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conv.id);
      }

      // Même file d'envoi et même clé d'idempotence que le déclin unitaire.
      await sendTransactionalEmail({
        templateName: "application-declined",
        recipientUserId: app.sitter_id,
        idempotencyKey: `app-declined-${app.id}`,
        templateData: { sitTitle },
      });

      declined += 1;
    } catch (e) {
      failed += 1;
      logger.error("declineOpenApplications failed", {
        applicationId: app.id,
        error: String(e),
      });
    }

    if (spacingMs > 0) await wait(spacingMs);
  }

  return { declined, failed };
}
