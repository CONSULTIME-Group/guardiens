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
 *   micro-pause entre deux envois ;
 * - un échec sur un candidat n'interrompt pas les suivants, il est compté ;
 * - une candidature dont le statut a changé entre l'ouverture de la boîte de
 *   dialogue et le clic est ignorée : ni message, ni email.
 *
 * Ce que fait réellement le système sans ce helper, vérifié le 12/08/2026 :
 * le RPC `unpublish_sit` passe en `cancelled` toutes les candidatures
 * `pending`, `viewed` et `discussing` de l'annonce, sans message ni email.
 * La clôture automatique `close_orphan_applications` ne prend PAS le relais :
 * elle ne balaie que les sits `cancelled`, `archived` ou `expired`, alors
 * qu'une dépublication produit un `draft`. Ce helper est donc la seule
 * occasion de notifier les candidats.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";

/** Statuts considérés comme « candidature ouverte, sans réponse ». */
export const OPEN_APPLICATION_STATUSES = [
  "pending",
  "viewed",
  "discussing",
] as const;

export type OpenApplicationStatus = (typeof OPEN_APPLICATION_STATUSES)[number];

/** Message type envoyé lors d'un déclin groupé à la dépublication. */
export const BULK_DECLINE_MESSAGE =
  "Merci pour votre candidature ! Cette annonce n'est plus d'actualité, je la retire. N'hésitez pas à postuler à mes prochaines annonces.";

/** Variante pour un candidat avec qui des échanges ont déjà eu lieu. */
export const BULK_DECLINE_MESSAGE_DISCUSSING =
  "Merci pour nos échanges. Cette annonce n'est plus d'actualité, je la retire. N'hésitez pas à postuler à mes prochaines annonces.";

/** Choisit le message type selon le statut de départ de la candidature. */
export const pickBulkDeclineMessage = (status?: string): string =>
  status === "discussing"
    ? BULK_DECLINE_MESSAGE_DISCUSSING
    : BULK_DECLINE_MESSAGE;

/** Message système déposé dans la conversation, identique au déclin unitaire. */
export const DECLINE_SYSTEM_MESSAGE =
  "Votre candidature a été déclinée pour cette garde.";

export interface OpenApplication {
  id: string;
  sitter_id: string;
  created_at: string;
  first_name: string;
  status?: string;
}

export interface BulkDeclineResult {
  declined: number;
  failed: number;
  /** Candidatures dont le statut avait changé, volontairement ignorées. */
  skipped: number;
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
 * Ne lève jamais : renvoie le compte des succès, des échecs et des ignorés.
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
    message,
    spacingMs = SEND_SPACING_MS,
  } = params;

  let declined = 0;
  let failed = 0;
  let skipped = 0;

  for (const app of applications) {
    try {
      // `.select` est indispensable : un update qui ne matche aucune ligne ne
      // renvoie pas d'erreur. Sans lui, un candidat accepté entre-temps
      // recevrait un déclin.
      const { data: updated, error } = await supabase
        .from("applications")
        .update({ status: "rejected" as any })
        .eq("id", app.id)
        .in("status", [...OPEN_APPLICATION_STATUSES])
        .select("id");
      if (error) throw error;

      if (!updated || updated.length === 0) {
        skipped += 1;
        if (spacingMs > 0) await wait(spacingMs);
        continue;
      }

      const body = (message ?? pickBulkDeclineMessage(app.status)).trim();

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
        if (body) {
          await supabase.from("messages").insert({
            conversation_id: conv.id,
            sender_id: ownerId,
            content: body,
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

  return { declined, failed, skipped };
}
