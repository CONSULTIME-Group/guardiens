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
import { Calendar, MapPin, Send, Star, PawPrint, Home, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatSitPeriod } from "@/lib/dateRange";

import EmergencyAlertBanner from "@/components/sits/EmergencyAlertBanner";
import ShareButtons from "@/components/sits/ShareButtons";
import SitDateHistory from "@/components/sits/SitDateHistory";
import ApplicationsList from "@/components/sits/ApplicationsList";
import PostConfirmationChecklist from "@/components/sits/PostConfirmationChecklist";
import CancelSitModal from "@/components/sits/CancelSitModal";
import OwnerSitManagement from "@/components/sits/shared/OwnerSitManagement";

import SitDetailHeader from "./SitDetailHeader";
import SitFooterReassurance from "./SitFooterReassurance";
import ReopenApplicationsCard from "./ReopenApplicationsCard";
import SitOverridesEditor from "./SitOverridesEditor";
import { useSitDerived } from "./useSitDerived";
import AnimalsTab from "./tabs/AnimalsTab";
import HousingTab from "./tabs/HousingTab";
import ExpectationsTab from "./tabs/ExpectationsTab";
import ReviewsTab from "./tabs/ReviewsTab";
import type { SitData } from "./types";

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
  currentUserId,
}: OwnerSitViewProps) => {
  const { toast } = useToast();
  const [publishing, setPublishing] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [logementOverride, setLogementOverride] = useState(initialLogementOverride);
  const [animauxOverride, setAnimauxOverride] = useState(initialAnimauxOverride);
  const [internalAppCount, setInternalAppCount] = useState(appCount);

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
  // - published : annule l'annonce avant qu'elle parte
  // - confirmed : annule la garde avant son démarrage (notifie le gardien)
  // - in_progress : possible mais on force le contact direct ; non géré ici (cf. message d'aide modal)
  // - draft / completed / cancelled / expired : pas d'annulation pertinente
  const canCancel = sit.status === "published" || sit.status === "confirmed";

  // Tab par défaut intelligent :
  // - draft : pas de candidatures possibles → on ouvre directement sur "Logement"
  //   (la zone que l'owner remplit le plus souvent avant publication).
  // - autres statuts : on garde "Candidatures" comme accueil naturel.
  const defaultTab = isDraft ? "housing" : "candidatures";

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
    toast({
      title: "Annonce publiée",
      description: "Les gardiens peuvent maintenant candidater.",
    });
  };

  return (
    <>
      {/* Draft banner */}
      {isDraft && (
        <div className="mb-6 rounded-xl border border-border bg-accent/50 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-heading text-base font-semibold">
                Cette annonce est encore en brouillon
              </p>
              <p className="text-sm text-muted-foreground">
                Publie-la pour qu'elle apparaisse dans la recherche.
              </p>
            </div>
            <Button
              onClick={() => setPublishConfirmOpen(true)}
              disabled={publishing}
              className="gap-2 md:self-start"
            >
              <Send className="h-4 w-4" />
              {publishing ? "Publication..." : "Publier l'annonce"}
            </Button>
          </div>
        </div>
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

      {/* Emergency sitter alert — owner only, published sit starting within 15 days */}
      {sit.status === "published" && owner?.city && (
        <EmergencyAlertBanner
          sitId={sit.id}
          sitCity={owner.city}
          startDate={sit.start_date}
        />
      )}

      {/* Share buttons — visible to the owner of a published listing so they can broadcast it */}
      {sit.status === "published" && (
        <div className="mb-6">
          <ShareButtons
            sitId={sit.id}
            title={sit.title || `Garde à ${owner?.city || "France"}`}
            city={owner?.city}
            startDate={sit.start_date}
            endDate={sit.end_date}
            source="owner_sit_detail"
          />
        </div>
      )}

      {/* Header partagé */}
      <SitDetailHeader
        sitId={sit.id}
        sitTitle={sit.title}
        sitStatus={sit.status}
        startDate={sit.start_date}
        endDate={sit.end_date}
        flexibleDates={sit.flexible_dates}
        photos={(property as any)?.photos || []}
        owner={owner}
        isOwner
        isAuthenticatedNonOwner={false}
        reviewCount={reviews.length}
        avgRating={avgRating}
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

      {/* Tabbed content */}
      <Tabs defaultValue={defaultTab} className="mt-2">
        <TabsList aria-label="Sections de l'annonce" className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0 gap-0 overflow-x-auto">
          <TabsTrigger
            value="candidatures"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
          >
            Candidatures ({internalAppCount})
            {pendingAppCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-primary inline-block ml-1 mb-0.5" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="animals"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5"
          >
            <PawPrint className="h-3.5 w-3.5" /> Animaux
          </TabsTrigger>
          <TabsTrigger
            value="housing"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5"
          >
            <Home className="h-3.5 w-3.5" /> Logement
          </TabsTrigger>
          <TabsTrigger
            value="expectations"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5"
          >
            <ClipboardList className="h-3.5 w-3.5" /> Attentes
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5"
          >
            <Star className="h-3.5 w-3.5" /> Avis ({reviews.length})
          </TabsTrigger>
        </TabsList>

        {/* Candidatures tab (owner only) */}
        <TabsContent value="candidatures" className="mt-6 space-y-4">
          {!sit.accepting_applications && (
            <ReopenApplicationsCard
              sit={sit}
              setSit={setSit}
              internalAppCount={internalAppCount}
            />
          )}
          {sit.accepting_applications && sit.max_applications && (
            <p className="text-xs text-muted-foreground">
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
        </TabsContent>

        {/* Animals tab */}
        <TabsContent value="animals" className="mt-6">
          <AnimalsTab pets={pets} ownerFirstName={owner?.first_name} />
        </TabsContent>

        {/* Housing tab — avec blocs spécifiques propriétaire en tête */}
        <TabsContent value="housing" className="mt-6 space-y-6">
          <div className="bg-muted/30 rounded-xl p-4 mb-4 border border-border">
            <p className="text-sm text-muted-foreground mb-3">
              Le logement et les animaux se gèrent depuis votre profil. Les modifications
              s'appliquent à toutes vos annonces.
            </p>
            <Link
              to="/owner-profile"
              className="border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary transition-colors inline-block"
            >
              Modifier mon profil →
            </Link>
          </div>

          <SitOverridesEditor
            logementOverride={logementOverride}
            setLogementOverride={setLogementOverride}
            animauxOverride={animauxOverride}
            setAnimauxOverride={setAnimauxOverride}
            saveOverride={saveOverride}
          />

          <HousingTab property={property} owner={owner} coords={coords} />
        </TabsContent>

        {/* Expectations tab */}
        <TabsContent value="expectations" className="mt-6 space-y-6">
          <ExpectationsTab
            ownerProfile={ownerProfile}
            specificExpectations={sit.specific_expectations}
            openTo={sit.open_to}
          />
        </TabsContent>

        {/* Reviews tab */}
        <TabsContent value="reviews" className="mt-6">
          <ReviewsTab
            sitId={sit.id}
            sitOwnerId={sit.user_id}
            sitStatus={sit.status}
            currentUserId={currentUserId}
            hasReviewedThisSit={hasReviewedThisSit}
          />
        </TabsContent>
      </Tabs>

      {/* Bloc unifié de gestion */}
      <OwnerSitManagement
        sitId={sit.id}
        propertyId={sit.property_id}
        status={sit.status}
        canCancel={canCancel}
        onCancelClick={() => setCancelOpen(true)}
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
