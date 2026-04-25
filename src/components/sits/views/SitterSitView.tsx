/**
 * Vue gardien de l'annonce (`/sits/:id` quand on n'est PAS l'owner — sitter, both, ou autre rôle).
 *
 * Comportements préservés depuis l'ancien `SitDetail.tsx` :
 * - Badges de matching (animaux compatibles, proximité)
 * - PostConfirmationChecklist côté gardien
 * - Onglets : Animaux, Logement, Attentes, Avis (PAS de Candidatures)
 * - Accord de garde (lecture, signature) une fois la garde confirmée
 * - Sticky apply bar + ApplicationModal
 * - Bouton "Annuler ma participation" si gardien candidat sur garde confirmée
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Star, PawPrint, Home, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { useAccessLevel } from "@/hooks/useAccessLevel";

import AccordDeGarde from "@/components/gardes/AccordDeGarde";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import ApplicationModal from "@/components/sits/ApplicationModal";
import PostConfirmationChecklist from "@/components/sits/PostConfirmationChecklist";
import CancelSitModal from "@/components/sits/CancelSitModal";

import SitDetailHeader from "./SitDetailHeader";
import AnimalsTab from "./tabs/AnimalsTab";
import HousingTab from "./tabs/HousingTab";
import ExpectationsTab from "./tabs/ExpectationsTab";
import ReviewsTab from "./tabs/ReviewsTab";
import type { SitData } from "./types";

interface SitterSitViewProps {
  sit: SitData;
  setSit: (sit: SitData) => void;
  owner: any;
  property: any;
  pets: any[];
  ownerProfile: any;
  reviews: any[];
  coords: { lat: number; lng: number } | null;
  appCount: number;
  setAppCount: (n: number) => void;
  hasApplied: boolean;
  setHasApplied: (b: boolean) => void;
  hasReviewedThisSit: boolean;
  sitterProfile: any;
  currentUserId: string;
  activeRole: string | null | undefined;
  userRole?: string | null;
  userFirstName?: string | null;
}

const formatDate = (d: string | null) =>
  d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "";

const SitterSitView = ({
  sit,
  setSit,
  owner,
  property,
  pets,
  ownerProfile,
  reviews,
  coords,
  appCount,
  setAppCount,
  hasApplied,
  setHasApplied,
  hasReviewedThisSit,
  sitterProfile,
  currentUserId,
  activeRole,
  userRole,
  userFirstName,
}: SitterSitViewProps) => {
  const { level: accessLevel, profileCompletion, canApplyGuards } = useAccessLevel();

  const [applyOpen, setApplyOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [ownerAccordSigned, setOwnerAccordSigned] = useState(false);
  const [sitterAccordSigned, setSitterAccordSigned] = useState<{ accepted_at: string } | null>(
    null,
  );
  const [accordOpen, setAccordOpen] = useState(false);
  const [accordData, setAccordData] = useState<any>(null);

  // Check accord de garde status
  useEffect(() => {
    if (!owner || !property) return;
    const showAccord = ["confirmed", "in_progress", "completed"].includes(sit.status);
    if (!showAccord) return;

    const checkAccord = async () => {
      // Check if owner signed
      const { data: ownerAcc } = await supabase
        .from("garde_accords")
        .select("id")
        .eq("garde_id", sit.id)
        .eq("role", "proprio")
        .eq("accepted", true)
        .maybeSingle();

      if (!ownerAcc) return;
      setOwnerAccordSigned(true);

      // Check if sitter already signed
      const { data: sitterAcc } = await supabase
        .from("garde_accords")
        .select("accepted_at")
        .eq("garde_id", sit.id)
        .eq("user_id", currentUserId)
        .eq("role", "gardien")
        .eq("accepted", true)
        .maybeSingle();

      if (sitterAcc) setSitterAccordSigned(sitterAcc);

      // Build accord data from owner's signed document
      const { data: ownerDoc } = await supabase
        .from("garde_accords")
        .select("document_content")
        .eq("garde_id", sit.id)
        .eq("role", "proprio")
        .eq("accepted", true)
        .maybeSingle();

      if (ownerDoc?.document_content) {
        setAccordData(ownerDoc.document_content);
      }
    };
    checkAccord();
  }, [sit.id, sit.status, currentUserId, owner, property]);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1)
      : null;

  // Badges de matching
  const badges: string[] = [];
  if (sitterProfile && (activeRole === "sitter" || userRole === "sitter" || userRole === "both")) {
    const sitterAnimals: string[] = sitterProfile.animal_types || [];
    const petSpecies = pets.map((p: any) => p.species);
    const matchAnimal = petSpecies.some((s: string) => sitterAnimals.includes(s));
    if (matchAnimal) badges.push("Correspond à votre expérience animaux");
    if (sitterProfile.geographic_radius && owner?.city && userFirstName)
      badges.push("Proche de chez vous");
  }

  return (
    <>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {badges.map((b) => (
            <span
              key={b}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
            >
              <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              {b}
            </span>
          ))}
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
        isOwner={false}
        isAuthenticatedNonOwner={!!currentUserId}
        reviewCount={reviews.length}
        avgRating={avgRating}
      />

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
            isOwner={false}
          />
        </div>
      )}

      {/* Tabbed content */}
      <Tabs defaultValue="animals" className="mt-2">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0 gap-0 overflow-x-auto">
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

        <TabsContent value="animals" className="mt-6">
          <AnimalsTab pets={pets} ownerFirstName={owner?.first_name} />
        </TabsContent>

        <TabsContent value="housing" className="mt-6 space-y-6">
          <HousingTab property={property} owner={owner} coords={coords} />
        </TabsContent>

        <TabsContent value="expectations" className="mt-6 space-y-6">
          <ExpectationsTab
            ownerProfile={ownerProfile}
            specificExpectations={sit.specific_expectations}
            openTo={sit.open_to}
          />
        </TabsContent>

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

      {/* Accord de garde — sitter view */}
      {ownerAccordSigned && ["confirmed", "in_progress", "completed"].includes(sit.status) && (
        <div className="mt-8">
          {accordOpen && accordData ? (
            <AccordDeGarde
              garde={{ ...accordData, gardeId: sit.id }}
              role="gardien"
              onClose={() => setAccordOpen(false)}
            />
          ) : sitterAccordSigned ? (
            <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Accord de garde accepté ✓</p>
                <p className="text-xs text-muted-foreground">
                  Signé le{" "}
                  {sitterAccordSigned.accepted_at
                    ? format(new Date(sitterAccordSigned.accepted_at), "d MMMM yyyy", {
                        locale: fr,
                      })
                    : "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <p className="font-heading font-semibold text-sm">Notre accord de garde</p>
              <p className="text-sm text-muted-foreground">
                Le propriétaire a validé cet accord. Lisez-le et confirmez votre acceptation pour
                finaliser la garde.
              </p>
              <Button onClick={() => setAccordOpen(true)} className="gap-2">
                Voir et signer l'accord
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bouton Annuler — gardien candidat uniquement */}
      {hasApplied && sit.status === "confirmed" && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={() => setCancelOpen(true)}
          >
            Annuler ma participation à cette garde
          </Button>
        </div>
      )}

      <div className="mt-8 bg-primary/5 border border-primary/10 rounded-xl p-5 text-center">
        <p className="font-heading text-sm font-semibold text-primary">
          Vous partez l'esprit léger — et si un imprévu survient, votre réseau local de gardiens
          prend le relais.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Profils vérifiés · Avis croisés · Gardiens d'urgence mobilisables
        </p>
      </div>

      {/* Sitter apply bar — sticky bottom action bar */}
      {activeRole === "sitter" && sit.status === "published" && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-4px_16px_-4px_hsl(var(--foreground)/0.08)] pb-20 md:pb-0 supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),5rem)] md:supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="max-w-4xl mx-auto px-4 py-3">
            {!sit.accepting_applications ? (
              <Button className="w-full h-12 text-base font-semibold" disabled>
                Candidatures en cours d'analyse
              </Button>
            ) : accessLevel === 1 ? (
              <AccessGateBanner
                level={accessLevel}
                profileCompletion={profileCompletion}
                context="guard"
              />
            ) : hasApplied ? (
              <Button className="w-full h-12 text-base font-semibold" disabled>
                <CheckCircle2 className="h-5 w-5 mr-2" /> Candidature envoyée ✓
              </Button>
            ) : !canApplyGuards ? (
              <AccessGateBanner
                level="3A"
                profileCompletion={profileCompletion}
                context="guard"
              />
            ) : (
              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={() => {
                  trackEvent("sit_apply_clicked", {
                    source: "sit_detail",
                    metadata: { sit_id: sit.id },
                  });
                  setApplyOpen(true);
                }}
              >
                Postuler pour cette garde
              </Button>
            )}
          </div>
        </div>
      )}

      <ApplicationModal
        open={applyOpen}
        onOpenChange={setApplyOpen}
        sitId={sit.id}
        ownerId={sit.user_id}
        ownerFirstName={owner?.first_name || ""}
        petNames={pets.map((p: any) => p.name)}
        city={owner?.city || ""}
        startDate={formatDate(sit.start_date)}
        endDate={formatDate(sit.end_date)}
        onSuccess={async () => {
          setHasApplied(true);
          // Auto-close if max_applications reached
          if (sit.max_applications) {
            const newCount = appCount + 1;
            setAppCount(newCount);
            if (newCount >= sit.max_applications) {
              await supabase
                .from("sits")
                .update({ accepting_applications: false } as any)
                .eq("id", sit.id);
              setSit({ ...sit, accepting_applications: false });
            }
          }
        }}
      />

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

export default SitterSitView;
