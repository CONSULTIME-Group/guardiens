/**
 * Vue propriétaire de l'annonce de garde (`/sits/:id` quand on est l'owner).
 *
 * Comportements préservés depuis l'ancien `SitDetail.tsx` :
 * - Bandeau brouillon + dialogue de confirmation de publication (avec rappel des dates)
 * - Bandeau d'alerte gardien d'urgence (≤ 15 jours)
 * - Boutons de partage (annonce publiée)
 * - Historique des modifications de dates
 * - PostConfirmationChecklist côté propriétaire
 * - Onglets : Candidatures, Animaux, Logement (avec overrides + CTA profil), Attentes, Avis
 * - Réouverture des candidatures (compteur ±)
 * - Bloc "Gérer cette garde" (OwnerSitManagement) + modal d'annulation
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Calendar, MapPin, Send, Star, Home, Users, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatSitPeriod } from "@/lib/dateRange";

import EmergencyAlertBanner from "@/components/sits/EmergencyAlertBanner";
import SitDateHistory from "@/components/sits/SitDateHistory";
import ApplicationsList from "@/components/sits/ApplicationsList";
import PostConfirmationChecklist from "@/components/sits/PostConfirmationChecklist";
import CancelSitModal from "@/components/sits/CancelSitModal";
import OwnerSitManagement from "@/components/sits/shared/OwnerSitManagement";
import SitPhotoManager from "@/components/sits/owner/SitPhotoManager";
import DraftChecklist from "@/components/sits/owner/DraftChecklist";
import InviteSittersBlock from "@/components/sits/owner/InviteSittersBlock";

import SitDetailHeader from "./SitDetailHeader";
import SitFooterReassurance from "./SitFooterReassurance";
import ReopenApplicationsCard from "./ReopenApplicationsCard";
import SitOverridesEditor from "./SitOverridesEditor";
import { useSitDerived } from "./useSitDerived";
import SitImmersiveContent from "./SitImmersiveContent";
import ReviewsTab from "./tabs/ReviewsTab";
import type { SitData } from "./types";

interface OwnerGalleryPhoto {
  id: string;
  photo_url: string;
}

interface OwnerSitViewProps {
  sit: SitData;
  setSit: (sit: SitData) => void;
  owner: any;
  property: any;
  pets: any[];
  ownerProfile: any;
  reviews: any[];
  coords: { lat: number; lng: number } | null;
  appCount: number;
  pendingAppCount: number;
  hasReviewedThisSit: boolean;
  initialLogementOverride: string;
  initialAnimauxOverride: string;
  ownerGallery: OwnerGalleryPhoto[];
  setOwnerGallery: (photos: OwnerGalleryPhoto[]) => void;
  currentUserId: string;
}


const OwnerSitView = ({
  sit,
  setSit,
  owner,
  property,
  pets,
  ownerProfile,
  reviews,
  coords,
  appCount,
  pendingAppCount,
  hasReviewedThisSit,
  initialLogementOverride,
  initialAnimauxOverride,
  ownerGallery,
  setOwnerGallery,
  currentUserId,
}: OwnerSitViewProps) => {
  const { toast } = useToast();
  const [publishing, setPublishing] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [unpublishConfirmOpen, setUnpublishConfirmOpen] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [unpublishReason, setUnpublishReason] = useState<string>("");
  const [unpublishReasonOther, setUnpublishReasonOther] = useState<string>("");
  const [pendingAppsToCancel, setPendingAppsToCancel] = useState<number>(0);
  const [logementOverride, setLogementOverride] = useState(initialLogementOverride);
  const [animauxOverride, setAnimauxOverride] = useState(initialAnimauxOverride);
  const [internalAppCount, setInternalAppCount] = useState(appCount);
  // Marqueur "vient juste de publier" → déclenche scroll + highlight du bloc d'invitation
  const [justPublished, setJustPublished] = useState(false);

  // sync if parent re-fetches
  useEffect(() => setInternalAppCount(appCount), [appCount]);

  // Sauvegarde debounced des overrides logement/animaux.
  // - Stocke la dernière valeur en attente dans `pendingOverrides` (ref)
  //   pour pouvoir flusher de manière synchrone en cas de unmount/navigation.
  // - Sans ce flush, l'utilisateur qui quitte la page < 800ms après son
  //   dernier caractère perd sa saisie.
  const overrideSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingOverrides = useRef<Partial<Record<"logement_override" | "animaux_override", string>>>(
    {},
  );

  const flushOverrides = useCallback(async () => {
    if (overrideSaveTimeout.current) {
      clearTimeout(overrideSaveTimeout.current);
      overrideSaveTimeout.current = null;
    }
    const payload = pendingOverrides.current;
    if (Object.keys(payload).length === 0) return;
    pendingOverrides.current = {};
    await supabase.from("sits").update(payload as any).eq("id", sit.id);
  }, [sit.id]);

  const saveOverride = useCallback(
    (field: "logement_override" | "animaux_override", value: string) => {
      pendingOverrides.current[field] = value;
      if (overrideSaveTimeout.current) clearTimeout(overrideSaveTimeout.current);
      overrideSaveTimeout.current = setTimeout(() => {
        void flushOverrides();
      }, 800);
    },
    [flushOverrides],
  );

  // Flush à l'unmount + au beforeunload (fermeture/onglet) pour ne rien perdre.
  useEffect(() => {
    const handleBeforeUnload = () => {
      void flushOverrides();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void flushOverrides();
    };
  }, [flushOverrides]);

  const isDraft = sit.status === "draft";
  // canCancel — propriétaire :
  // - confirmed uniquement : la modale d'annulation génère un avis envers
  //   le gardien accepté ; sans gardien (published) ce flux n'a pas de sens
  //   (utiliser Archiver / Supprimer à la place).
  // - bloqué dès que la date de fin est passée : on n'annule pas une garde
  //   déjà terminée — le lifecycle l'auto-archive ou l'auto-complète.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = sit.end_date ? new Date(sit.end_date) : null;
  const isPast = endDate ? endDate < today : false;
  const canCancel = !isPast && sit.status === "confirmed";
  // canUnpublish — propriétaire d'une annonce publiée sans gardien accepté :
  // on remet simplement en brouillon (pas d'avis, pas de notification gardien).
  const canUnpublish = !isPast && sit.status === "published";

  // Étape 1 : ouvre la modale de confirmation en pré-comptant les candidatures
  // actives qui seront clôturées — l'owner doit voir l'impact avant de cliquer.
  const requestUnpublish = async () => {
    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("sit_id", sit.id)
      .in("status", ["pending", "viewed", "discussing"]);
    setPendingAppsToCancel(count ?? 0);
    setUnpublishConfirmOpen(true);
  };

  // Étape 2 : exécute la dépublication via le RPC sécurisé.
  // Le RPC valide : auth, ownership, status=published, end_date >= today.
  // Côté client on ne fait QUE le mapping des erreurs typées → message FR.
  const handleUnpublish = async () => {
    if (unpublishing) return;
    setUnpublishing(true);

    const { data, error } = await supabase.rpc("unpublish_sit", {
      p_sit_id: sit.id,
    });

    if (error) {
      const raw = error.message || "";
      const code = raw.includes(":") ? raw.split(":")[0] : raw;
      const friendly: Record<string, { title: string; description: string }> = {
        NOT_AUTHENTICATED: {
          title: "Connexion requise",
          description: "Reconnectez-vous pour dépublier cette annonce.",
        },
        SIT_NOT_FOUND: {
          title: "Annonce introuvable",
          description: "Cette annonce n'existe plus ou a déjà été supprimée.",
        },
        FORBIDDEN: {
          title: "Action non autorisée",
          description: "Seul le propriétaire de l'annonce peut la dépublier.",
        },
        INVALID_STATUS: {
          title: "Dépublication impossible",
          description:
            "Cette annonce n'est pas dans un état permettant la dépublication (déjà confirmée, annulée ou en brouillon).",
        },
        SIT_ENDED: {
          title: "Dates passées",
          description:
            "Cette annonce est terminée : utilisez Archiver ou Supprimer plutôt que Dépublier.",
        },
      };
      const mapped = friendly[code] ?? {
        title: "Dépublication impossible",
        description: "Une erreur est survenue. Réessayez ou contactez le support.",
      };
      setUnpublishing(false);
      toast({ variant: "destructive", ...mapped });
      return;
    }

    const count = (data as number | null) ?? 0;
    setSit({ ...sit, status: "draft" });
    setUnpublishConfirmOpen(false);
    setUnpublishing(false);
    toast({
      title: "Annonce dépubliée",
      description:
        count > 0
          ? `Remise en brouillon. ${count} candidature${count > 1 ? "s" : ""} en cours ${count > 1 ? "ont" : "a"} été clôturée${count > 1 ? "s" : ""}.`
          : "Elle est remise en brouillon. Vous pouvez la republier quand vous voulez.",
    });
  };
  // Critères de complétude pour la checklist de publication.
  const description = (sit.specific_expectations || "").trim();
  const checklist = {
    hasTitle: Boolean((sit.title || "").trim()),
    hasDates: Boolean(sit.flexible_dates || (sit.start_date && sit.end_date)),
    hasDescription: description.length >= 50,
    hasPhoto: ownerGallery.length > 0,
    hasPet: Array.isArray(pets) && pets.length > 0,
  };
  const canPublish = Object.values(checklist).every(Boolean);

  // Dérivés partagés (avgRating + formatDate) — voir useSitDerived.
  const { avgRating, formatDate } = useSitDerived({
    reviews,
    context: "owner",
  });

  const handlePublish = async () => {
    if (!isDraft || publishing) return;
    setPublishing(true);
    const { error } = await supabase
      .from("sits")
      .update({ status: "published" as any })
      .eq("id", sit.id)
      .eq("user_id", currentUserId);
    setPublishing(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Publication impossible",
        description: "Le brouillon n'a pas pu être publié.",
      });
      return;
    }
    setSit({ ...sit, status: "published" });
    setJustPublished(true);
    // Scroll vers le bloc d'invitation et l'ouvrir automatiquement
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById("invite-sitters-block");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    });
    toast({
      title: "Annonce publiée",
      description:
        "Place à l'action : proposez votre annonce directement à des gardiens (favoris, recherche, département…).",
      duration: 6000,
    });
  };

  return (
    <>
      {/* Brouillon : checklist de publication (remplace l'ancien bandeau) */}
      {isDraft && (
        <DraftChecklist
          hasTitle={checklist.hasTitle}
          hasDates={checklist.hasDates}
          hasDescription={checklist.hasDescription}
          hasPhoto={checklist.hasPhoto}
          hasPet={checklist.hasPet}
          publishing={publishing}
          onPublish={() => {
            if (canPublish) setPublishConfirmOpen(true);
          }}
        />
      )}

      {/* Confirmation publication — rappel des dates exactes */}
      <AlertDialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la publication</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p>Vérifiez les informations avant que votre annonce ne devienne visible :</p>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm space-y-1.5">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {formatSitPeriod(sit.start_date, sit.end_date) || "Dates non renseignées"}
                    </span>
                  </div>
                  {owner?.city && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{owner.city}</span>
                    </div>
                  )}
                  {sit.flexible_dates && (
                    <p className="text-xs text-muted-foreground italic">Dates flexibles</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Vous pourrez toujours modifier l'annonce après publication.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setPublishConfirmOpen(false);
                await handlePublish();
              }}
            >
              Publier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation dépublication — précise l'impact (candidatures clôturées). */}
      <AlertDialog open={unpublishConfirmOpen} onOpenChange={(o) => !unpublishing && setUnpublishConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dépublier cette annonce ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p>
                  L'annonce repassera en <strong>brouillon</strong> et ne sera plus
                  visible des gardiens. Vous pourrez la republier à tout moment.
                </p>
                {pendingAppsToCancel > 0 && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <p className="text-foreground">
                      <strong>
                        {pendingAppsToCancel} candidature{pendingAppsToCancel > 1 ? "s" : ""} en cours
                      </strong>{" "}
                      {pendingAppsToCancel > 1 ? "seront clôturées" : "sera clôturée"}.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Les gardiens concernés ne pourront plus échanger sur cette annonce.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unpublishing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleUnpublish();
              }}
              disabled={unpublishing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unpublishing ? "Dépublication…" : "Dépublier"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Emergency sitter alert — owner only, published sit starting within 15 days */}
      {sit.status === "published" && owner?.city && (
        <EmergencyAlertBanner
          sitId={sit.id}
          sitCity={owner.city}
          startDate={sit.start_date}
        />
      )}

      {/* Header partagé (compact) — actions Partager / Modifier / Aperçu gardien + statut.
          Le partage est désormais une icône dans le header (plus de gros bloc). */}
      <SitDetailHeader
        sitId={sit.id}
        sitTitle={sit.title}
        sitStatus={sit.status}
        startDate={sit.start_date}
        endDate={sit.end_date}
        flexibleDates={sit.flexible_dates}
        photos={[
          ...(((property as any)?.photos as string[] | undefined) ?? []),
          ...pets
            .map((p: any) => p?.photo_url)
            .filter((u: any): u is string => typeof u === "string" && u.length > 0),
        ]}
        owner={owner}
        isOwner
        isAuthenticatedNonOwner={false}
        reviewCount={reviews.length}
        avgRating={avgRating}
        compact
        ownerCity={owner?.city ?? null}
      />

      {/* Historique des modifications de dates */}
      <SitDateHistory sitId={sit.id} />

      {/* Post-confirmation checklist */}
      {(sit.status === "confirmed" || sit.status === "in_progress") && (
        <div className="mb-8">
          <PostConfirmationChecklist
            sitId={sit.id}
            sitOwnerId={sit.user_id}
            propertyId={sit.property_id}
            startDate={sit.start_date}
            endDate={sit.end_date}
            ownerCity={owner?.city}
            isOwner
          />
        </div>
      )}

      {/* Aperçu de l'annonce — vue identique à celle des gardiens, EN PREMIER pour
          que le propriétaire visualise immédiatement à quoi ressemble son annonce. */}
      <SitImmersiveContent
        sit={sit}
        owner={owner}
        property={property}
        pets={pets}
        ownerProfile={ownerProfile}
      />

      {/* Inviter des gardiens — action proactive avant les candidatures */}
      {sit.status === "published" && (
        <InviteSittersBlock
          sitId={sit.id}
          ownerId={currentUserId}
          sitTitle={sit.title}
          sitCity={owner?.city ?? null}
          ownerPostalCode={owner?.postal_code ?? null}
          startDate={sit.start_date}
          endDate={sit.end_date}
          highlight={justPublished}
        />
      )}

      {/* Candidatures reçues — APRÈS l'aperçu et l'invitation */}
      <section className="mt-8 mb-8 rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Candidatures reçues ({internalAppCount})
          {pendingAppCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          )}
        </h2>
        {!sit.accepting_applications && (
          <div className="mb-4">
            <ReopenApplicationsCard
              sit={sit}
              setSit={setSit}
              internalAppCount={internalAppCount}
            />
          </div>
        )}
        {sit.accepting_applications && sit.max_applications && (
          <p className="text-xs text-muted-foreground mb-3">
            {internalAppCount}/{sit.max_applications} candidature
            {sit.max_applications > 1 ? "s" : ""} reçue{internalAppCount > 1 ? "s" : ""}
          </p>
        )}
        <ApplicationsList
          sitId={sit.id}
          sitTitle={sit.title}
          petNames={pets.map((p: any) => p.name)}
          startDate={formatDate(sit.start_date)}
          endDate={formatDate(sit.end_date)}
          propertyId={sit.property_id}
          sitStatus={sit.status}
        />
      </section>

      {/* Photos & couverture — déplacé en bas dans un Collapsible (gestion ponctuelle) */}
      <Collapsible className="mt-2 mb-8 rounded-2xl border border-border bg-card">
        <CollapsibleTrigger className="group w-full flex items-center justify-between gap-2 p-5 md:p-6 text-left">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" /> Photos & couverture
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gérer la galerie et choisir la photo de couverture de cette annonce.
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-5 md:px-6 pb-5 md:pb-6">
          <SitPhotoManager
            sitId={sit.id}
            ownerId={currentUserId}
            initialCoverPhotoUrl={(sit as any).cover_photo_url ?? null}
            initialGallery={ownerGallery}
            onCoverChange={(url) => {
              setSit({ ...sit, cover_photo_url: url } as any);
            }}
          />
        </CollapsibleContent>
      </Collapsible>

      <Collapsible className="mt-2 mb-8 rounded-2xl border border-border bg-card">
        <CollapsibleTrigger className="group w-full flex items-center justify-between gap-2 p-5 md:p-6 text-left">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" /> Notes spécifiques à cette garde
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Précisions logement / animaux qui ne s'appliquent qu'à cette annonce
              (optionnel).
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-5 md:px-6 pb-5 md:pb-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Le logement et les animaux se gèrent depuis votre profil — les modifications
            s'appliquent à toutes vos annonces.{" "}
            <Link to="/owner-profile" className="text-primary hover:underline">
              Modifier mon profil →
            </Link>
          </p>
          <SitOverridesEditor
            logementOverride={logementOverride}
            setLogementOverride={setLogementOverride}
            animauxOverride={animauxOverride}
            setAnimauxOverride={setAnimauxOverride}
            saveOverride={saveOverride}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Avis */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" /> Avis ({reviews.length})
        </h2>
        <ReviewsTab
          sitId={sit.id}
          sitOwnerId={sit.user_id}
          sitStatus={sit.status}
          currentUserId={currentUserId}
          hasReviewedThisSit={hasReviewedThisSit}
        />
      </section>

      {/* Bloc unifié de gestion */}
      <OwnerSitManagement
        sitId={sit.id}
        propertyId={sit.property_id}
        status={sit.status}
        canCancel={canCancel}
        onCancelClick={() => setCancelOpen(true)}
        canUnpublish={canUnpublish}
        onUnpublishClick={requestUnpublish}
      />

      <SitFooterReassurance />

      <CancelSitModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        sitId={sit.id}
        sitTitle={sit.title}
        sitOwnerId={sit.user_id}
        startDate={formatDate(sit.start_date)}
        endDate={formatDate(sit.end_date)}
        onCancelled={() => {
          setSit({ ...sit, status: "cancelled" });
          setCancelOpen(false);
        }}
      />
    </>
  );
};

export default OwnerSitView;
