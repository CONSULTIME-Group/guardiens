/**
 * Acceptation d'une candidature de garde : chemin UNIQUE pour tout le front.
 *
 * Utilisé par ApplicationsList (onglet Candidatures), ConversationHeader
 * (messagerie) et la fenêtre de retrait d'annonce (OwnerSitView, motif
 * « via la plateforme »). Le trigger `enforce_application_status_transitions`
 * refuse tout UPDATE direct vers `accepted` hors de la RPC `accept_application`
 * (erreur `must_use_accept_rpc`) : aucun autre chemin n'est admis.
 *
 * Enchaînement, identique à l'historique d'ApplicationsList :
 * 1. RPC atomique `accept_application` (candidature acceptée, autres
 *    candidatures ouvertes déclinées, annonce en `confirmed`) ;
 * 2. message système au gardien retenu, notification `sit_confirmed` ;
 * 3. emails `application-accepted` (gardien) et `sit-confirmed` (propriétaire) ;
 * 4. message système et email `application-declined` pour chaque candidat
 *    décliné automatiquement ;
 * 5. ouverture de l'accord de garde `AccordDeGarde` (role="proprio").
 */
import { fetchMyProfile } from "@/lib/myProfile";
import { useCallback, useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/errorLogger";
import { trackEvent } from "@/lib/analytics";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";
import { publicFirstName } from "@/lib/displayName";
import AccordDeGarde from "@/components/gardes/AccordDeGarde";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface AcceptTarget {
  applicationId: string;
  sitId: string;
  sitterId: string;
  /** Prénom public du gardien, pour les messages et l'accord. */
  sitterFirstName?: string | null;
}

/** Message lisible pour une erreur de la RPC. Fonction pure, testée. */
export function acceptErrorMessage(raw: string | null | undefined): string {
  const msg = String(raw ?? "");
  if (msg.includes("sit_not_open")) return "Cette garde est déjà confirmée ou close.";
  if (msg.includes("application_not_pending"))
    return "Cette candidature a déjà reçu une réponse. Rechargez la page pour voir son état actuel.";
  if (msg.includes("not_owner")) return "Action réservée au propriétaire de l'annonce.";
  if (msg.includes("application_not_found")) return "Cette candidature est introuvable, elle a peut-être été retirée.";
  if (msg.includes("not_authenticated")) return "Votre session a expiré. Reconnectez-vous puis réessayez.";
  return "La confirmation n'a pas abouti. Réessayez dans un instant, notre équipe est prévenue.";
}

const fmt = (d: string | null | undefined, pattern: string): string => {
  if (!d) return "";
  try {
    return format(parseISO(d), pattern, { locale: fr });
  } catch {
    return d;
  }
};

interface Options {
  /** Appelé après une acceptation réussie (rechargement de la vue). */
  onAccepted?: (sitId: string) => void;
  /** Appelé à la fermeture de l'accord de garde. */
  onAccordClosed?: () => void;
}

export function useAcceptApplication(options: Options = {}) {
  const { user } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [accordData, setAccordData] = useState<any>(null);
  const [accordSitId, setAccordSitId] = useState<string | null>(null);

  const acceptApplication = useCallback(
    async (target: AcceptTarget): Promise<boolean> => {
      if (accepting || !user) return false;
      setAccepting(true);
      const { applicationId, sitId, sitterId } = target;
      const sitterName = publicFirstName(target.sitterFirstName ?? "") || "Ce gardien";
      try {
        // 1) RPC atomique.
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "accept_application" as any,
          { p_application_id: applicationId } as any,
        );

        if (rpcError) {
          logger.error("accept_application rpc failed", { error: rpcError.message, applicationId, sitId });
          reportError(rpcError, { component: "useAcceptApplication", application_id: applicationId, sit_id: sitId });
          trackEvent("application_accept_failed", {
            metadata: { reason: rpcError.message, application_id: applicationId, sit_id: sitId },
          });
          toast({
            title: "Impossible d'accepter la candidature",
            description: acceptErrorMessage(rpcError.message),
            variant: "destructive",
          });
          return false;
        }

        const result = (rpcData ?? {}) as {
          sit_id?: string;
          auto_rejected_count?: number;
          auto_rejected_sitter_ids?: string[];
        };
        const autoRejectedIds: string[] = Array.isArray(result.auto_rejected_sitter_ids)
          ? result.auto_rejected_sitter_ids.filter((id): id is string => typeof id === "string")
          : [];
        trackEvent("application_accepted", {
          metadata: { application_id: applicationId, sit_id: result.sit_id ?? sitId },
        });
        trackEvent("sit_confirmed", {
          metadata: { sit_id: result.sit_id ?? sitId, auto_rejected_count: result.auto_rejected_count ?? 0 },
        });

        // Données de l'annonce pour les messages et l'accord.
        const { data: sitFull } = (await supabase
          .from("sits")
          .select("id, title, start_date, end_date, city, properties(pets(name, species, breed))")
          .eq("id", sitId)
          .maybeSingle()) as any;
        const { data: proprio } = (await fetchMyProfile(user.id!)) as any;

        const sitTitle: string = sitFull?.title ?? "";
        const petsRaw: any[] = Array.isArray(sitFull?.properties?.pets) ? sitFull.properties.pets : [];
        const petNames = petsRaw.map((p) => p.name).filter(Boolean);
        const startLong = fmt(sitFull?.start_date, "d MMMM yyyy");
        const endLong = fmt(sitFull?.end_date, "d MMMM yyyy");
        const ownerFirst = publicFirstName(proprio?.first_name ?? "");

        // 2) Message système + notification (post-transaction, non bloquant).
        const petsPart = petNames.length > 0 ? `garder ${petNames.join(", ")}` : "cette garde";
        const datesPart = startLong && endLong ? ` du ${startLong} au ${endLong}` : "";
        const confirmMsg = `La garde est confirmée. Vous avez été choisi(e) pour ${petsPart}${datesPart}.`;
        const { data: acceptedConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("sit_id", sitId)
          .eq("sitter_id", sitterId)
          .maybeSingle();
        if (acceptedConv) {
          await supabase.from("messages").insert({
            conversation_id: acceptedConv.id,
            sender_id: user.id,
            content: confirmMsg,
            is_system: true,
          });
          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", acceptedConv.id);
        }

        const notifLink = `/mes-gardes?sit=${sitId}`;
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", sitterId)
          .eq("type", "sit_confirmed")
          .eq("link", notifLink)
          .maybeSingle();
        if (!existingNotif) {
          const { data: guideCheck } = await supabase
            .from("house_guides")
            .select("id")
            .eq("user_id", user.id)
            .eq("published", true)
            .maybeSingle();
          const startShort = fmt(sitFull?.start_date, "dd MMMM");
          await supabase.from("notifications").insert({
            user_id: sitterId,
            type: "sit_confirmed",
            title: "Garde confirmée",
            body: guideCheck
              ? `Votre garde chez ${ownerFirst || "votre hôte"} est confirmée. Le guide de la maison sera disponible dans votre espace à partir du ${startShort}.`
              : `Votre garde chez ${ownerFirst || "votre hôte"} est confirmée. Rendez-vous dans "Mes gardes" pour les détails.`,
            link: notifLink,
          });
        }

        // 3) Emails, idempotence côté serveur.
        sendTransactionalEmail({
          templateName: "application-accepted",
          recipientUserId: sitterId,
          idempotencyKey: `app-accepted-${applicationId}`,
          templateData: { sitTitle, ownerFirstName: ownerFirst },
        }).catch(() => {});
        sendTransactionalEmail({
          templateName: "sit-confirmed",
          recipientUserId: user.id,
          idempotencyKey: `sit-confirmed-${sitId}`,
          templateData: {
            sitTitle,
            sitterFirstName: publicFirstName(target.sitterFirstName ?? ""),
            startDate: startLong,
            endDate: endLong,
            petNames: petNames.join(", "),
            sitId,
          },
        }).catch(() => {});

        // 4) Candidats déclinés automatiquement par la RPC.
        for (const rejectedSitterId of autoRejectedIds) {
          const { data: rejConv } = await supabase
            .from("conversations")
            .select("id")
            .eq("sit_id", sitId)
            .eq("sitter_id", rejectedSitterId)
            .maybeSingle();
          if (rejConv) {
            await supabase.from("messages").insert({
              conversation_id: rejConv.id,
              sender_id: user.id,
              content: `Le propriétaire a choisi un autre gardien pour cette garde. Merci pour votre candidature !`,
              is_system: true,
            });
            await supabase
              .from("conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", rejConv.id);
          }
          sendTransactionalEmail({
            templateName: "application-declined",
            recipientUserId: rejectedSitterId,
            idempotencyKey: `app-declined-auto-${sitId}-${rejectedSitterId}`,
            templateData: { sitTitle },
          }).catch(() => {});
        }

        // 5) Accord de garde.
        setAccordSitId(sitId);
        setAccordData({
          gardeId: sitId,
          dateDebut: startLong,
          dateFin: endLong,
          adresse: sitFull?.city || proprio?.city || "",
          proprio: { prenom: ownerFirst || "Le propriétaire", telephone: "" },
          gardien: { prenom: publicFirstName(target.sitterFirstName ?? "") || "Le gardien" },
          animaux: petsRaw.map((p) => ({
            prenom: p.name,
            espece: p.species ?? "",
            race: p.breed ?? undefined,
          })),
          reglesVie: { animauxPartout: null, invites: null, tabac: null, autresPrecisions: null },
          voisinConfiance: null,
          urgences: null,
          montantVetMax: 300,
          montantLogementMax: null,
          estLongueDuree: false,
          contributionCharges: null,
        });

        toast({ title: "Garde confirmée !", description: `${sitterName} a été choisi(e) pour cette garde.` });
        options.onAccepted?.(sitId);
        return true;
      } catch (error: any) {
        logger.error("acceptApplication error", { error: String(error), applicationId, sitId });
        reportError(error, { component: "useAcceptApplication", application_id: applicationId, sit_id: sitId });
        trackEvent("application_accept_failed", {
          metadata: { reason: String(error?.message ?? error), application_id: applicationId },
        });
        toast({
          title: "Impossible d'accepter la candidature",
          description: acceptErrorMessage(String(error?.message ?? error)),
          variant: "destructive",
        });
        return false;
      } finally {
        setAccepting(false);
      }
    },
    [accepting, user, options],
  );

  const closeAccord = useCallback(() => {
    trackEvent("accord_dialog_closed_unsigned", { metadata: { sit_id: accordSitId, role: "proprio" } });
    setAccordData(null);
    options.onAccordClosed?.();
  }, [accordSitId, options]);

  const accordDialog: ReactNode = accordData ? (
    <Dialog open onOpenChange={(o) => { if (!o) closeAccord(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Accord de garde</DialogTitle>
        <AccordDeGarde garde={accordData} role="proprio" onClose={closeAccord} />
      </DialogContent>
    </Dialog>
  ) : null;

  return { acceptApplication, accepting, accordDialog };
}
