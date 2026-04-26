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
import { CheckCircle2, Star, PawPrint, Home, ClipboardList, XCircle, MapPin, CalendarDays, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { useAccessLevel } from "@/hooks/useAccessLevel";

import AccordDeGarde from "@/components/gardes/AccordDeGarde";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import ApplicationModal from "@/components/sits/ApplicationModal";
import PostConfirmationChecklist from "@/components/sits/PostConfirmationChecklist";
import CancelSitModal from "@/components/sits/CancelSitModal";

import SitDetailHeader from "./SitDetailHeader";
import SitFooterReassurance from "./SitFooterReassurance";
import SitterStatusBanner from "./SitterStatusBanner";
import { useSitDerived } from "./useSitDerived";
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
  activeRole: "owner" | "sitter";
}

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
}: SitterSitViewProps) => {
  // Lecture directe du profil — supprime les props `userRole`/`userFirstName`
  // qui dupliquaient l'info disponible via useAuth.
  const { user } = useAuth();
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

  // Dérivés partagés (avgRating + formatDate + badges de matching).
  const { avgRating, formatDate, matchingBadges: badges } = useSitDerived({
    reviews,
    pets,
    sitterProfile,
    owner,
    context: "sitter",
    activeRole,
    userRole: user?.role ?? null,
    userFirstName: user?.firstName ?? null,
  });
  return (
    <>
      {/* Bandeau d'état terminal — affiché en premier pour que le gardien
          comprenne immédiatement que l'annonce n'est pas/plus actionnable. */}
      <SitterStatusBanner status={sit.status} />

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
        photos={[
          ...(((property as any)?.photos as string[] | undefined) ?? []),
          ...pets
            .map((p: any) => p?.photo_url)
            .filter((u: any): u is string => typeof u === "string" && u.length > 0),
        ]}
        owner={owner}
        isOwner={false}
        isAuthenticatedNonOwner={!!currentUserId}
        reviewCount={reviews.length}
        avgRating={avgRating}
      />

      {/* Apply bar — affichée tout en haut, juste sous le header,
          pour que le CTA "Postuler" soit visible immédiatement sans scroll. */}
      {activeRole === "sitter" && sit.status === "published" && (() => {
        const days =
          sit.start_date && sit.end_date
            ? Math.max(
                1,
                Math.round(
                  (new Date(sit.end_date).getTime() -
                    new Date(sit.start_date).getTime()) /
                    86_400_000,
                ) + 1,
              )
            : 0;
        const showRecap =
          accessLevel !== 1 &&
          canApplyGuards &&
          !hasApplied &&
          sit.accepting_applications;

        return (
          <aside
            aria-label="Action de candidature"
            className="mt-4 mb-6 rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6">
              {showRecap ? (
                <div className="flex items-center gap-x-5 gap-y-1 text-xs md:text-sm text-muted-foreground flex-wrap min-w-0">
                  {owner?.city && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
                      <span className="truncate max-w-[12rem]">{owner.city}</span>
                    </span>
                  )}
                  {days > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
                      {days} {days === 1 ? "jour" : "jours"}
                    </span>
                  )}
                  {pets.length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <PawPrint className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
                      {pets.length} {pets.length === 1 ? "animal" : "animaux"}
                    </span>
                  )}
                  {sit.max_applications && (
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
                      {appCount} / {sit.max_applications} candidature{sit.max_applications > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              ) : (
                <div aria-hidden="true" />
              )}

              <div className="w-full md:w-auto md:shrink-0">
                {!sit.accepting_applications ? (
                  <Button className="w-full md:w-auto md:min-w-[16rem] h-11 md:h-12 px-6 text-base font-semibold" disabled>
                    Candidatures en cours d'analyse
                  </Button>
                ) : accessLevel === 1 ? (
                  <AccessGateBanner
                    level={accessLevel}
                    profileCompletion={profileCompletion}
                    context="guard"
                  />
                ) : hasApplied ? (
                  <Button className="w-full md:w-auto md:min-w-[16rem] h-11 md:h-12 px-6 text-base font-semibold" disabled>
                    <CheckCircle2 className="h-5 w-5 mr-2" aria-hidden="true" /> Candidature envoyée
                  </Button>
                ) : !canApplyGuards ? (
                  <AccessGateBanner
                    level="3A"
                    profileCompletion={profileCompletion}
                    context="guard"
                  />
                ) : (
                  <Button
                    className="w-full md:w-auto md:min-w-[16rem] h-11 md:h-12 px-8 text-base font-semibold shadow-sm"
                    onClick={() => {
                      trackEvent("sit_apply_clicked", {
                        source: "sit_detail_top",
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
          </aside>
        );
      })()}
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
        <TabsList aria-label="Sections de l'annonce" className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0 gap-0 overflow-x-auto">
          <TabsTrigger
            value="animals"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5"
          >
            <PawPrint className="h-3.5 w-3.5" /> Animaux
          </TabsTrigger>
          <TabsTrigger
            value="expectations"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5"
          >
            <ClipboardList className="h-3.5 w-3.5" /> Attentes
          </TabsTrigger>
          <TabsTrigger
            value="housing"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5"
          >
            <Home className="h-3.5 w-3.5" /> Logement
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
            dailyRoutine={(sit as any).daily_routine}
            ownerMessage={(sit as any).owner_message}
            ownerFirstName={owner?.first_name}
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

      {/* Bloc "Annuler ma participation" — gardien confirmé uniquement.
          Conditions :
          - Le gardien a candidaté ET est l'attribué (status confirmed/in_progress)
          - La garde n'est ni terminée, ni annulée, ni en brouillon
          Le modal CancelSitModal détecte automatiquement le rôle via user.id ≠ sitOwnerId. */}
      {(() => {
        const canSitterCancel =
          hasApplied && (sit.status === "confirmed" || sit.status === "in_progress");
        if (!canSitterCancel) return null;
        return (
          <section
            className="mt-10 mb-6 rounded-xl border border-destructive/20 bg-destructive/5 p-5 md:p-6"
            aria-labelledby="sitter-cancel-title"
          >
            <div className="flex items-start gap-3">
              <XCircle
                className="h-5 w-5 text-destructive shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <h2
                  id="sitter-cancel-title"
                  className="font-heading font-semibold text-base text-foreground"
                >
                  Annuler ma participation
                </h2>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  {sit.status === "in_progress"
                    ? "La garde est en cours. Une annulation maintenant peut mettre le propriétaire en difficulté — contactez-le d'abord si possible."
                    : "Le propriétaire sera notifié immédiatement. Pensez à le prévenir directement avant si possible."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/40 hover:border-destructive/60"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Annuler ma participation
                </Button>
              </div>
            </div>
          </section>
        );
      })()}

      <SitFooterReassurance />

      {/* Note: la barre d'action "Postuler" est désormais affichée tout en haut,
          juste sous le header (cf. ApplyBar plus haut dans ce composant). */}

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
