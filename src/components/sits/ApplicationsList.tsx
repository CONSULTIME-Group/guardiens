import { useState, useEffect, useMemo } from "react";
import { logger } from "@/lib/logger";
import { trackEvent } from "@/lib/analytics";

import AccordDeGarde from "@/components/gardes/AccordDeGarde";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";
import {
  Star, MapPin, CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import EmergencyBadge from "@/components/profile/EmergencyBadge";
import TrustHaloAvatar from "@/components/sitters/TrustHaloAvatar";
import OwnerToSitterAffinity from "@/components/matching/OwnerToSitterAffinity";
import { computeAffinityResultFull, type AffinitySitterInput, type AffinityOwnerInput } from "@/lib/affinityScore";
import { useViewerOwnerForAffinity } from "@/hooks/useViewerOwnerForAffinity";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { format, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ApplicationsListProps {
  sitId: string;
  sitTitle: string;
  petNames: string[];
  startDate: string;
  endDate: string;
  propertyId: string;
  sitStatus?: string;
}

const statusStyles: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-primary/10 text-primary" },
  viewed: { label: "En attente", className: "bg-primary/10 text-primary" },
  discussing: { label: "En discussion", className: "bg-accent text-foreground" },
  accepted: { label: "Acceptée", className: "bg-primary/10 text-primary" },
  rejected: { label: "Déclinée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Annulée", className: "bg-muted text-muted-foreground" },
};

const statusOrder: Record<string, number> = {
  pending: 0, viewed: 0, discussing: 1, accepted: 2, rejected: 3, cancelled: 4,
};

const ApplicationsList = ({ sitId, sitTitle, petNames, startDate, endDate, propertyId, sitStatus }: ApplicationsListProps) => {
  const { user } = useAuth();
  const { owner: viewerOwner } = useViewerOwnerForAffinity();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmApp, setConfirmApp] = useState<any>(null);
  const [declineApp, setDeclineApp] = useState<any>(null);
  const [declineMessage, setDeclineMessage] = useState("");
  const [declineCustom, setDeclineCustom] = useState(false);
  const [declinedOpen, setDeclinedOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"affinity" | "rating" | "recent">("affinity");
  const navigate = useNavigate();
  const [showAccord, setShowAccord] = useState(false);
  const [accordData, setAccordData] = useState<any>(null);
  const declineTemplates = [
    "Merci pour votre candidature ! J'ai trouvé un gardien dont le profil correspondait davantage à mes besoins cette fois-ci. N'hésitez pas à postuler à mes prochaines annonces !",
    "Merci de votre intérêt ! Les dates ne correspondent malheureusement pas tout à fait. J'espère qu'on pourra collaborer une prochaine fois !",
    "Merci pour votre message ! J'ai choisi un gardien plus proche géographiquement pour cette garde. Bonne continuation sur Guardiens !",
  ];

  const load = async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, sitter:profiles!applications_sitter_id_fkey(id, first_name, last_name, city, avatar_url, bio, identity_verified, completed_sits_count, is_founder)")
      .eq("sit_id", sitId)
      .order("created_at", { ascending: false });

    if (!data) {
      setLoading(false);
      return;
    }

    const sitterIds = [...new Set(data.map((a: any) => a.sitter_id).filter(Boolean))] as string[];

    if (sitterIds.length === 0) {
      setApplications([]);
      setLoading(false);
      return;
    }

    const [spRes, revRes, badgeRes, emRes] = await Promise.all([
      supabase.from("sitter_profiles")
        .select("user_id, experience_years, animal_types, life_pace, languages, interests, work_during_sit, sensitivities, special_animal_skills, sitter_type")
        .in("user_id", sitterIds),
      supabase.from("reviews").select("reviewee_id, overall_rating").in("reviewee_id", sitterIds).eq("published", true),
      supabase.from("badge_attributions").select("user_id, badge_id").in("user_id", sitterIds),
      supabase.from("emergency_sitter_profiles").select("user_id").in("user_id", sitterIds).eq("is_active", true),
    ]);

    const spMap = new Map<string, any>();
    (spRes.data || []).forEach((r: any) => spMap.set(r.user_id, r));

    const revMap = new Map<string, number[]>();
    (revRes.data || []).forEach((r: any) => {
      const arr = revMap.get(r.reviewee_id) || [];
      arr.push(r.overall_rating);
      revMap.set(r.reviewee_id, arr);
    });

    const badgeGrouped = new Map<string, Map<string, number>>();
    (badgeRes.data || []).forEach((b: any) => {
      const inner = badgeGrouped.get(b.user_id) || new Map<string, number>();
      inner.set(b.badge_id, (inner.get(b.badge_id) || 0) + 1);
      badgeGrouped.set(b.user_id, inner);
    });

    const emSet = new Set<string>((emRes.data || []).map((r: any) => r.user_id));

    const enriched = data.map((app: any) => {
      const sp = spMap.get(app.sitter_id) || null;
      const ratings = revMap.get(app.sitter_id) || [];
      const avgRating = ratings.length > 0
        ? (ratings.reduce((s, n) => s + n, 0) / ratings.length).toFixed(1)
        : null;
      const inner = badgeGrouped.get(app.sitter_id);
      const badgeCounts = inner
        ? Array.from(inner.entries())
            .map(([badge_key, count]) => ({ badge_key, count }))
            .sort((a, b) => b.count - a.count)
        : [];
      const affinityInput: AffinitySitterInput | null = sp
        ? {
            animal_types: sp.animal_types,
            life_pace: sp.life_pace,
            languages: sp.languages,
            interests: sp.interests,
            work_during_sit: sp.work_during_sit,
            sensitivities: sp.sensitivities,
            special_animal_skills: sp.special_animal_skills,
            sitter_type: sp.sitter_type,
            experience_years: sp.experience_years,
          }
        : null;
      return {
        ...app,
        sitterProfile: sp,
        sitterAffinityInput: affinityInput,
        avgRating,
        reviewCount: ratings.length,
        badgeCounts,
        isEmergencySitter: emSet.has(app.sitter_id),
      };
    });

    enriched.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));
    setApplications(enriched);
    setLoading(false);
  };


  useEffect(() => { load(); }, [sitId]);

  const [accepting, setAccepting] = useState(false);

  const handleAccept = async (app: any) => {
    if (accepting) return;
    setAccepting(true);
    try {
      const sitterName = app.sitter?.first_name || "Ce gardien";
      const sitterId = app.sitter_id;

      // 1) Appel RPC atomique côté serveur.
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "accept_application" as any,
        { p_application_id: app.id } as any,
      );

      if (rpcError) {
        logger.error("accept_application rpc failed", { error: rpcError.message });
        trackEvent("application_accept_failed", {
          metadata: { reason: rpcError.message, application_id: app.id, sit_id: sitId },
        });
        toast({
          title: "Impossible d'accepter la candidature",
          description: rpcError.message.includes("sit_not_open")
            ? "Cette garde n'accepte plus de nouvelles confirmations."
            : rpcError.message.includes("not_owner")
              ? "Action réservée au propriétaire de l'annonce."
              : "Une erreur est survenue, réessayez dans un instant.",
          variant: "destructive",
        });
        setConfirmApp(null);
        load();
        return;
      }

      const result = (rpcData ?? {}) as { sit_id?: string; auto_rejected_count?: number };
      trackEvent("application_accepted", {
        metadata: { application_id: app.id, sit_id: result.sit_id ?? sitId },
      });
      trackEvent("sit_confirmed", {
        metadata: {
          sit_id: result.sit_id ?? sitId,
          auto_rejected_count: result.auto_rejected_count ?? 0,
        },
      });

      // 2) Messages système + notifications + emails (post-transaction, non bloquant).
      const petNamesStr = petNames.join(", ");
      const confirmMsg = `La garde est confirmée. Vous avez été choisi(e) pour garder ${petNamesStr} du ${startDate} au ${endDate}.`;
      const { data: acceptedConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("sit_id", sitId)
        .eq("sitter_id", sitterId)
        .maybeSingle();

      if (acceptedConv && user) {
        await supabase.from("messages").insert({
          conversation_id: acceptedConv.id,
          sender_id: user.id,
          content: confirmMsg,
          is_system: true,
        });

        const { data: guideData } = await supabase
          .from("house_guides")
          .select("id")
          .eq("property_id", propertyId)
          .maybeSingle();

        if (guideData) {
          await supabase.from("messages").insert({
            conversation_id: acceptedConv.id,
            sender_id: user.id,
            content: "Le guide de la maison est disponible. Vous y trouverez l'adresse exacte, les codes d'accès, les contacts utiles et toutes les consignes.",
            is_system: true,
          });
        }

        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", acceptedConv.id);
      }

      // Notification + emails (dédup via idempotencyKey).
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", sitterId)
        .eq("type", "sit_confirmed")
        .eq("link", `/mes-gardes`)
        .maybeSingle();

      if (!existingNotif) {
        const { data: proprio } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", user!.id)
          .single();

        const { data: guideCheck } = await supabase
          .from("house_guides")
          .select("id")
          .eq("user_id", user!.id)
          .eq("published", true)
          .maybeSingle();

        let startFormatted = "";
        if (startDate) {
          try {
            startFormatted = format(parseISO(startDate), "dd MMMM", { locale: fr });
          } catch {
            startFormatted = startDate;
          }
        }

        await supabase.from("notifications").insert({
          user_id: sitterId,
          type: "sit_confirmed",
          title: "Garde confirmée",
          body: guideCheck
            ? `Votre garde chez ${proprio?.first_name ?? "votre hôte"} est confirmée. Le guide de la maison sera disponible dans votre espace à partir du ${startFormatted}.`
            : `Votre garde chez ${proprio?.first_name ?? "votre hôte"} est confirmée. Rendez-vous dans "Mes gardes" pour les détails.`,
          link: `/mes-gardes`,
        });

        sendTransactionalEmail({
          templateName: "application-accepted",
          recipientUserId: sitterId,
          idempotencyKey: `app-accepted-${app.id}`,
          templateData: {
            sitTitle,
            ownerFirstName: proprio?.first_name ?? "",
          },
        }).catch(() => {});

        let endFormatted = "";
        if (endDate) {
          try { endFormatted = format(parseISO(endDate), "dd MMMM yyyy", { locale: fr }); } catch { endFormatted = endDate; }
        }
        const startFormattedFull = startDate
          ? (() => { try { return format(parseISO(startDate), "dd MMMM yyyy", { locale: fr }); } catch { return startDate; } })()
          : "";
        sendTransactionalEmail({
          templateName: "sit-confirmed",
          recipientUserId: user!.id,
          idempotencyKey: `sit-confirmed-${sitId}`,
          templateData: {
            sitTitle,
            sitterFirstName: app.sitter?.first_name ?? "",
            startDate: startFormattedFull,
            endDate: endFormatted,
            petNames: petNames.join(", "),
            sitId,
          },
        }).catch(() => {});
      }

      // Message système + email pour les candidatures auto-déclinées.
      const { data: autoRejected } = await supabase
        .from("applications")
        .select("sitter_id")
        .eq("sit_id", sitId)
        .eq("status", "rejected")
        .neq("id", app.id);

      if (autoRejected && user) {
        for (const ra of autoRejected) {
          const { data: rejConv } = await supabase
            .from("conversations")
            .select("id")
            .eq("sit_id", sitId)
            .eq("sitter_id", ra.sitter_id)
            .maybeSingle();
          if (rejConv) {
            await supabase.from("messages").insert({
              conversation_id: rejConv.id,
              sender_id: user.id,
              content: `Le propriétaire a choisi un autre gardien pour cette garde. Merci pour votre candidature !`,
              is_system: true,
            });
            await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", rejConv.id);
          }

          sendTransactionalEmail({
            templateName: "application-declined",
            recipientUserId: ra.sitter_id,
            idempotencyKey: `app-declined-auto-${sitId}-${ra.sitter_id}`,
            templateData: { sitTitle },
          }).catch(() => {});
        }
      }

      // 3) Construire accordData enrichi (sit + property + pets réels).
      const { data: sitFull } = await supabase
        .from("sits")
        .select("id, start_date, end_date, property_id, properties(address, city), pets:pets(name, species, breed, birth_date)")
        .eq("id", sitId)
        .maybeSingle() as any;

      const { data: proprioProfile } = await supabase
        .from("profiles")
        .select("first_name, city, phone_number")
        .eq("id", user!.id)
        .maybeSingle() as any;

      const pets = Array.isArray(sitFull?.pets) && sitFull.pets.length > 0
        ? sitFull.pets.map((p: any) => ({
            prenom: p.name,
            espece: p.species ?? "",
            race: p.breed ?? undefined,
          }))
        : petNames.map((name: string) => ({ prenom: name, espece: "" }));

      const adresse = sitFull?.properties?.address
        || sitFull?.properties?.city
        || proprioProfile?.city
        || "";

      setAccordData({
        gardeId: sitId,
        dateDebut: startDate ?? "",
        dateFin: endDate ?? "",
        adresse,
        proprio: {
          prenom: proprioProfile?.first_name ?? "Le propriétaire",
          telephone: proprioProfile?.phone_number ?? "",
        },
        gardien: {
          prenom: app.sitter?.first_name ?? "Le gardien",
        },
        animaux: pets,
        reglesVie: {
          animauxPartout: null,
          invites: null,
          tabac: null,
          autresPrecisions: null,
        },
        voisinConfiance: null,
        urgences: null,
        montantVetMax: 300,
        montantLogementMax: null,
        estLongueDuree: false,
        contributionCharges: null,
      });
      setShowAccord(true);

      toast({ title: "Garde confirmée !", description: `${sitterName} a été choisi(e) pour cette garde.` });
      setConfirmApp(null);
      load();
    } catch (error: any) {
      logger.error('handleAccept error', { error: String(error) });
      trackEvent("application_accept_failed", {
        metadata: { reason: String(error?.message ?? error), application_id: app.id },
      });
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la confirmation.",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };


  const handleDecline = async (app: any, message?: string) => {
    try {
      const { error: declineErr } = await supabase.from("applications").update({ status: "rejected" as any }).eq("id", app.id);
      if (declineErr) throw declineErr;

    if (user) {
      const { data: rejConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("sit_id", sitId)
        .eq("sitter_id", app.sitter_id)
        .maybeSingle();
      if (rejConv) {
        const systemMsg = "Votre candidature a été déclinée pour cette garde.";
        await supabase.from("messages").insert({
          conversation_id: rejConv.id,
          sender_id: user.id,
          content: systemMsg,
          is_system: true,
        });
        if (message?.trim()) {
          await supabase.from("messages").insert({
            conversation_id: rejConv.id,
            sender_id: user.id,
            content: message.trim(),
            is_system: false,
          });
        }
        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", rejConv.id);
      }

      // Email transactionnel, candidature déclinée manuellement (non-bloquant)
      sendTransactionalEmail({
        templateName: "application-declined",
        recipientUserId: app.sitter_id,
        idempotencyKey: `app-declined-${app.id}`,
        templateData: { sitTitle },
      }).catch(() => {});
    }

      toast({ title: "Candidature déclinée" });
      setDeclineApp(null);
      setDeclineMessage("");
      setDeclineCustom(false);
      load();
    } catch (error) {
      logger.error('handleDecline error', { error: String(error) });
      toast({
        title: "Erreur",
        description: "Impossible de décliner la candidature.",
        variant: "destructive",
      });
    }
  };

  const handleReinvite = async (app: any) => {
    try {
      const { error } = await supabase.rpc('reinvite_candidat', {
        p_application_id: app.id,
        p_sit_id: sitId,
        p_sitter_id: app.sitter_id,
      } as any);
      if (error) throw error;
      toast({
        title: "Invitation envoyée",
        description: `${app.sitter?.first_name ?? "Le gardien"} a été invité à reconsidérer sa candidature.`,
      });
      load();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message ?? "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  const duration = startDate && endDate
    ? differenceInDays(parseISO(endDate), parseISO(startDate))
    : null;

  const rawActive = applications.filter(a => !["rejected", "cancelled"].includes(a.status));
  const declinedApps = applications.filter(a => ["rejected", "cancelled"].includes(a.status));

  // Précalcul du score d'affinité par candidat, pour le tri.
  const affinityByApp = useMemo(() => {
    const map = new Map<string, number>();
    if (!viewerOwner) return map;
    rawActive.forEach((app: any) => {
      if (!app.sitterAffinityInput) return;
      const res = computeAffinityResultFull(viewerOwner as AffinityOwnerInput, app.sitterAffinityInput);
      if (res?.displayed) map.set(app.id, res.score);
    });
    return map;
  }, [rawActive, viewerOwner]);

  const activeApps = useMemo(() => {
    const arr = [...rawActive];
    const isPending = (s: string) => s === "pending" || s === "viewed";
    arr.sort((a, b) => {
      // Statut "en attente" en tête, quel que soit le tri secondaire.
      const pa = isPending(a.status) ? 0 : 1;
      const pb = isPending(b.status) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (sortMode === "affinity") {
        const sa = affinityByApp.get(a.id) ?? -1;
        const sb = affinityByApp.get(b.id) ?? -1;
        if (sa !== sb) return sb - sa;
      } else if (sortMode === "rating") {
        const ra = a.avgRating ? parseFloat(a.avgRating) : -1;
        const rb = b.avgRating ? parseFloat(b.avgRating) : -1;
        if (ra !== rb) return rb - ra;
      }
      // recent (défaut secondaire) : plus récentes d'abord
      const da = new Date(a.created_at ?? 0).getTime();
      const db = new Date(b.created_at ?? 0).getTime();
      return db - da;
    });
    return arr;
  }, [rawActive, sortMode, affinityByApp]);


  if (loading) return <p className="text-sm text-muted-foreground">Chargement des candidatures...</p>;

  const renderCard = (app: any) => {
    const sitter = app.sitter;
    const status = statusStyles[app.status] || statusStyles.pending;
    const completedSits = sitter?.completed_sits_count || 0;

    return (
      <div key={app.id} className="bg-card border border-border rounded-2xl p-5 mb-4">
        {/* Identité + signaux de confiance */}
        <div className="flex items-start gap-3">
          <Link to={`/gardiens/${app.sitter_id}`} className="shrink-0" aria-label={`Voir le profil de ${sitter?.first_name || "ce gardien"}`}>
            <TrustHaloAvatar
              size="h-12 w-12"
              verified={sitter?.identity_verified}
              avgRating={app.avgRating ? parseFloat(app.avgRating) : null}
              sitsCount={completedSits}
            >
              {sitter?.avatar_url ? (
                <img src={sitter.avatar_url} alt={`Photo de ${sitter.first_name || "gardien"}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-lg">
                  {sitter?.first_name?.charAt(0) || "?"}
                </div>
              )}
            </TrustHaloAvatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/gardiens/${app.sitter_id}`} className="text-base font-semibold text-foreground hover:underline">
                {sitter?.first_name || "Gardien"}
              </Link>
              {sitter?.identity_verified && <VerifiedBadge size="sm" />}
              {app.isEmergencySitter && <EmergencyBadge size="sm" showTooltip />}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap mt-0.5">
              {sitter?.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {sitter.city}
                </span>
              )}
              <span>{completedSits} garde{completedSits !== 1 ? "s" : ""} sur Guardiens</span>
              {app.avgRating ? (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Star className="h-3 w-3 fill-current" />
                  {app.avgRating}
                  <span className="text-muted-foreground">({app.reviewCount} avis)</span>
                </span>
              ) : (
                <span className="italic">Aucun avis</span>
              )}
              {app.badgeCounts && app.badgeCounts.length > 0 && (
                <span>
                  {app.badgeCounts.reduce((n: number, b: any) => n + b.count, 0)} écusson{app.badgeCounts.reduce((n: number, b: any) => n + b.count, 0) > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {app.sitterAffinityInput && (
              <div className="mt-2">
                <OwnerToSitterAffinity
                  sitterProfile={app.sitterAffinityInput}
                  context="owner_applications_list"
                  targetId={app.sitter_id}
                  size="sm"
                  showCta={false}
                  scope="list"
                />
              </div>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${status.className}`}>
            {status.label}
          </span>
        </div>

        {/* Message du candidat */}
        {app.message && (
          <div className="bg-muted/50 rounded-xl p-3 text-sm text-foreground/80 my-3 italic">
            {app.message}
          </div>
        )}

        {/* CTAs */}
        {(app.status === "pending" || app.status === "viewed") && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Link
              to={`/gardiens/${app.sitter_id}`}
              target="_blank"
              className="border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary transition-colors"
            >
              Voir le profil
            </Link>
            <button
              onClick={async () => {
                if (!user) return;
                const { startConversationAndNavigate } = await import("@/lib/conversation");
                const convId = await startConversationAndNavigate(
                  { otherUserId: app.sitter_id, context: "sit_application", sitId },
                  navigate,
                );
                if (convId) {
                  await supabase.from("applications").update({ status: "discussing" as any }).eq("id", app.id);
                }
              }}
              className="border border-primary text-primary rounded-full px-4 py-2 text-sm hover:bg-primary/10 transition-colors"
            >
              Contacter
            </button>
            <button
              onClick={() => setConfirmApp(app)}
              className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Accepter
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeclineApp(app)}
              className="text-muted-foreground hover:text-destructive ml-auto"
            >
              Décliner
            </Button>
          </div>
        )}

        {app.status === "discussing" && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Link
              to={`/gardiens/${app.sitter_id}`}
              target="_blank"
              className="border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary transition-colors"
            >
              Voir le profil
            </Link>
            <button
              onClick={() => setConfirmApp(app)}
              className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Accepter
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeclineApp(app)}
              className="text-muted-foreground hover:text-destructive ml-auto"
            >
              Décliner
            </Button>
          </div>
        )}

        {app.status === "accepted" && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-primary font-medium inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Garde confirmée
            </p>
            <button
              onClick={async () => {
                const { data: conv } = await supabase
                  .from("conversations").select("id")
                  .eq("sit_id", sitId).eq("sitter_id", app.sitter_id).maybeSingle();
                if (conv) navigate(`/messages?c=${conv.id}`);
                else navigate("/messages");
              }}
              className="inline-block border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary transition-colors"
            >
              Voir la messagerie
            </button>
          </div>
        )}

        {(app.status === "rejected" || app.status === "cancelled") && (
          <div className="flex gap-4 items-center mt-3">
            <Link
              to={`/gardiens/${app.sitter_id}`}
              target="_blank"
              className="text-xs text-primary hover:underline"
            >
              Voir le profil →
            </Link>
            <button
              onClick={async () => {
                if (!user) return;
                const { startConversationAndNavigate } = await import("@/lib/conversation");
                await startConversationAndNavigate(
                  { otherUserId: app.sitter_id, context: "sit_application", sitId },
                  navigate,
                );
              }}
              className="text-xs text-primary hover:underline"
            >
              Contacter →
            </button>
            {app.status === "rejected" && sitStatus === "published" && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleReinvite(app); }}
              >
                Inviter à nouveau
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header retiré : OwnerSitView encadre déjà la section avec son propre h2 "Candidatures reçues (N)". */}


      {applications.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aucune candidature pour le moment.</p>
      ) : (
        <>
          {activeApps.length > 1 && (
            <div className="flex items-center justify-end gap-2 mb-3">
              <label htmlFor="app-sort" className="text-xs text-muted-foreground">Trier par</label>
              <Select value={sortMode} onValueChange={(v) => setSortMode(v as any)}>
                <SelectTrigger id="app-sort" className="h-8 w-[180px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="affinity">Affinité</SelectItem>
                  <SelectItem value="rating">Note</SelectItem>
                  <SelectItem value="recent">Plus récentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {activeApps.map(renderCard)}

          {declinedApps.length > 0 && (
            <Collapsible open={declinedOpen} onOpenChange={setDeclinedOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-4 mb-2">
                <ChevronDown className={`h-4 w-4 transition-transform ${declinedOpen ? "rotate-180" : ""}`} />
                Candidatures déclinées ({declinedApps.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                {declinedApps.map(renderCard)}
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}

      {/* ── Accept Dialog ── */}
      {confirmApp && (
        <Dialog open={!!confirmApp} onOpenChange={() => setConfirmApp(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">
                Accepter la candidature de {confirmApp.sitter?.first_name} ?
              </DialogTitle>
              <DialogDescription>
                Les autres candidats seront automatiquement déclinés. Cette action confirme la garde.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setConfirmApp(null)}>Annuler</Button>
              <Button onClick={() => handleAccept(confirmApp)}>
                Confirmer l'acceptation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Decline Dialog ── */}
      {declineApp && (
        <Dialog open={!!declineApp} onOpenChange={(o) => { if (!o) { setDeclineApp(null); setDeclineMessage(""); setDeclineCustom(false); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Décliner la candidature de {declineApp.sitter?.first_name} ?</DialogTitle>
              <DialogDescription>
                Le gardien sera notifié. Vous pouvez toujours accepter d'autres candidatures.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-2">
              <p className="text-sm font-medium text-foreground">Message d'accompagnement <span className="text-muted-foreground font-normal">(optionnel)</span></p>
              
              {declineTemplates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setDeclineMessage(tpl); setDeclineCustom(false); }}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                    declineMessage === tpl && !declineCustom
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {tpl}
                </button>
              ))}

              <button
                type="button"
                onClick={() => { setDeclineCustom(true); if (declineTemplates.includes(declineMessage)) setDeclineMessage(""); }}
                className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                  declineCustom
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                }`}
              >
                Écrire un message personnalisé
              </button>

              {declineCustom && (
                <textarea
                  value={declineMessage}
                  onChange={(e) => setDeclineMessage(e.target.value)}
                  placeholder="Votre message au gardien…"
                  maxLength={300}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setDeclineApp(null); setDeclineMessage(""); setDeclineCustom(false); }}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDecline(declineApp, declineMessage)}
              >
                Confirmer le déclin
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showAccord && accordData && (
        <Dialog
          open={showAccord}
          onOpenChange={(o) => {
            if (!o) {
              trackEvent("accord_dialog_closed_unsigned", {
                metadata: { sit_id: sitId, role: "proprio" },
              });
              setShowAccord(false);
              setConfirmApp(null);
              load();
            }
          }}
        >
          <DialogContent className="max-w-2xl p-0 overflow-hidden">
            <DialogTitle className="sr-only">Accord de garde</DialogTitle>
            <AccordDeGarde
              garde={accordData}
              role="proprio"
              onClose={() => {
                trackEvent("accord_dialog_closed_unsigned", {
                  metadata: { sit_id: sitId, role: "proprio" },
                });
                setShowAccord(false);
                setConfirmApp(null);
                load();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ApplicationsList;
