/**
 * Vue gardien de l'annonce (`/sits/:id` quand on n'est PAS l'owner, sitter, both, ou autre rôle).
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
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, PawPrint, MapPin, CalendarDays, Users, ArrowLeft } from "lucide-react";
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
import SitMobileStickyApply from "@/components/sits/SitMobileStickyApply";

import SitDetailHeader from "./SitDetailHeader";
import SitFooterReassurance from "./SitFooterReassurance";
import SitterStatusBanner from "./SitterStatusBanner";
import { useSitDerived } from "./useSitDerived";
import ReviewsTab from "./tabs/ReviewsTab";
import SitImmersiveHero from "./SitImmersiveHero";
import SitImmersiveBody from "./SitImmersiveBody";
import SitterAffinitySection from "./SitterAffinitySection";
import { AlmaPopularSitWhisper } from "@/components/ai/alma/wiring/AlmaPopularSitWhisper";
import { AlmaReactiveOwnerWhisper } from "@/components/ai/alma/wiring/AlmaReactiveOwnerWhisper";
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
  // Lecture directe du profil, supprime les props `userRole`/`userFirstName`
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
  // Bandeau "Retour à l'aperçu public" : visible uniquement si l'utilisateur
  // est arrivé via le toggle côté propriétaire (compte both connecté avec
  // ?view=sitter dans l'URL). Pour tout autre cas (anonyme, gardien pur,
  // sitter only, lien partagé recopié), le bandeau n'a pas de sens et
  // pointerait vers un aperçu non pertinent, on le masque.
  const [searchParams] = useSearchParams();
  const fromOwnerToggle =
    searchParams.get("view") === "sitter" &&
    !!user &&
    (user as any).role === "both";

  return (
    <>
      {fromOwnerToggle && (
        <div className="mb-4 rounded-xl border border-border bg-secondary/30 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs md:text-sm text-foreground/80">
            Vous consultez cette annonce <span className="font-medium text-foreground">comme gardien</span>.
          </p>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link to={`/annonces/${sit.slug || sit.id}`} className="inline-flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Retour à l'aperçu public
            </Link>
          </Button>
        </div>
      )}

      {/* Bandeau d'état terminal, affiché en premier pour que le gardien
          comprenne immédiatement que l'annonce n'est pas/plus actionnable. */}
      <SitterStatusBanner
        status={sit.status}
        unpublishedAt={(sit as any).unpublished_at ?? null}
        unpublishedReason={(sit as any).last_unpublished_reason ?? null}
        city={owner?.city ?? null}
        startDate={sit.start_date}
        endDate={sit.end_date}
      />

      {/* Header partagé (compact : back link + actions uniquement) */}
      <SitDetailHeader
        sitId={sit.id}
        sitSlug={sit.slug}
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
        compact
      />

      {/* Hero photos + ville + titre : accueil/émotion en premier */}
      <SitImmersiveHero
        sit={sit}
        owner={owner}
        property={property}
        pets={pets}
      />

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 mb-4">
          {badges.map((b) => (
            <span
              key={b}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
            >
              <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" aria-hidden="true" />
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Barre de candidature en pilule signature (vague 21).
          data-dashboard-star="sitter" : le sticky mobile ci-dessous utilise
          useStarVisibilityGate("sitter") pour ne s'afficher que lorsque cette
          barre est hors écran. */}
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

        const Fact = ({ icon: Icon, label }: { icon: any; label: React.ReactNode }) => (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: "13px" }}>
            <Icon className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
            <span className="text-foreground" style={{ fontWeight: 600 }}>{label}</span>
          </span>
        );

        return (
          <aside
            aria-label="Action de candidature"
            data-dashboard-star="sitter"
            className="mt-4 mb-6 bg-card border border-border"
            style={{
              borderRadius: "20px",
              boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
            }}
          >
            <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6">
              {showRecap ? (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 min-w-0">
                  {owner?.city && <Fact icon={MapPin} label={owner.city} />}
                  {days > 0 && (
                    <Fact
                      icon={CalendarDays}
                      label={`${days} ${days === 1 ? "jour" : "jours"}`}
                    />
                  )}
                  {pets.length > 0 && (
                    <Fact
                      icon={PawPrint}
                      label={`${pets.length} ${pets.length === 1 ? "animal" : "animaux"}`}
                    />
                  )}
                  {appCount > 0 && (
                    <Fact
                      icon={Users}
                      label={`${appCount} candidature${appCount > 1 ? "s" : ""} déjà reçue${appCount > 1 ? "s" : ""}`}
                    />
                  )}
                </div>
              ) : (
                <div aria-hidden="true" />
              )}

              <div className="w-full md:w-auto md:shrink-0">
                {!sit.accepting_applications ? (
                  <Button className="w-full md:w-auto md:min-w-[16rem] h-11 md:h-12 px-6 rounded-full text-base font-semibold" disabled>
                    Candidatures fermées
                  </Button>
                ) : accessLevel === 1 ? (
                  <AccessGateBanner
                    level={accessLevel}
                    profileCompletion={profileCompletion}
                    context="guard"
                  />
                ) : hasApplied ? (
                  <Button className="w-full md:w-auto md:min-w-[16rem] h-11 md:h-12 px-6 rounded-full text-base font-semibold" disabled>
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
                    className="w-full md:w-auto md:min-w-[16rem] h-11 md:h-12 px-8 rounded-full text-base font-semibold"
                    style={{ boxShadow: "0 6px 14px rgba(44,109,80,0.24)" }}
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

      {/* Rencontre — grammaire du ring partagé (vague 21), après l'action */}
      <SitterAffinitySection
        sitterProfile={sitterProfile}
        ownerProfile={ownerProfile}
        pets={pets}
        ownerFirstName={owner?.first_name}
        targetId={sit.id}
      />

      {/* Whispers Alma — surfacés uniquement si données réelles */}
      {activeRole === "sitter" && sit.status === "published" && !!currentUserId && (
        <>
          <AlmaPopularSitWhisper
            sitId={sit.id}
            applicationsCount={appCount}
            ownerProfile={ownerProfile}
            sitterProfile={sitterProfile}
            pets={pets}
            onApply={() => setApplyOpen(true)}
          />
          {owner?.id && <AlmaReactiveOwnerWhisper ownerId={owner.id} />}
        </>
      )}

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

      {/* Contenu immersif (quick facts, animaux+fiches race, journée type, mot de l'hôte, sidebar) */}
      <SitImmersiveBody
        sit={sit}
        owner={owner}
        property={property}
        pets={pets}
        ownerProfile={ownerProfile}
      />

      {/* Avis sur l'hôte — trio d'en-tête signature (vague 21) */}
      <section className="mt-10">
        <header className="mb-[22px]">
          <div className="flex items-center gap-[8px]">
            <span
              aria-hidden="true"
              className="inline-block bg-secondary"
              style={{ width: "20px", height: "2px" }}
            />
            <p
              className="text-secondary uppercase"
              style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em" }}
            >
              Ce que les gardiens en disent
            </p>
          </div>
          <h2
            className="font-heading text-foreground mt-[8px]"
            style={{ fontSize: "20px", fontWeight: 600, lineHeight: 1.25 }}
          >
            Une maison déjà racontée.
          </h2>
        </header>
        <ReviewsTab
          sitId={sit.id}
          sitOwnerId={sit.user_id}
          sitStatus={sit.status}
          currentUserId={currentUserId}
          hasReviewedThisSit={hasReviewedThisSit}
        />
      </section>

      {/* Accord de garde — registre carnet (vague 21) */}
      {ownerAccordSigned && ["confirmed", "in_progress", "completed"].includes(sit.status) && (
        <div className="mt-8">
          {accordOpen && accordData ? (
            <AccordDeGarde
              garde={{ ...accordData, gardeId: sit.id }}
              role="gardien"
              onClose={() => setAccordOpen(false)}
            />
          ) : (
            <article
              className="border"
              style={{
                background: "hsl(var(--hero-paper))",
                borderColor: "hsl(var(--border))",
                borderRadius: "16px",
                padding: "20px",
              }}
            >
              <h3
                className="font-heading text-foreground"
                style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3 }}
              >
                Notre accord de garde
              </h3>
              <p
                className="text-muted-foreground mt-[8px]"
                style={{ fontSize: "13px", lineHeight: 1.5 }}
              >
                {sitterAccordSigned
                  ? `Vous l'avez signé${
                      sitterAccordSigned.accepted_at
                        ? " le " +
                          format(new Date(sitterAccordSigned.accepted_at), "d MMMM yyyy", { locale: fr })
                        : ""
                    }. Vous pouvez le relire à tout moment.`
                  : "Le propriétaire a validé cet accord. Lisez-le et confirmez votre acceptation pour finaliser la garde."}
              </p>
              <div className="mt-[14px]">
                <Button
                  variant="outline"
                  onClick={() => setAccordOpen(true)}
                  className="rounded-full bg-card border-border"
                >
                  {sitterAccordSigned ? "Voir l'accord" : "Voir et signer l'accord"}
                </Button>
              </div>
            </article>
          )}
        </div>
      )}

      {/* Annulation adoucie (vague 21) — carte pointillée, seul rouge sur la page */}
      {(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = sit.end_date ? new Date(sit.end_date) : null;
        const isPast = endDate ? endDate < today : false;
        const canSitterCancel =
          !isPast &&
          hasApplied &&
          (sit.status === "confirmed" || sit.status === "in_progress");
        if (!canSitterCancel) return null;
        return (
          <section
            className="mt-10 mb-6 bg-card"
            style={{
              borderRadius: "16px",
              border: "1px dashed hsl(var(--border))",
              padding: "18px 20px",
            }}
            aria-labelledby="sitter-cancel-title"
          >
            <h2
              id="sitter-cancel-title"
              className="font-heading text-foreground"
              style={{ fontSize: "15px", fontWeight: 600, lineHeight: 1.3 }}
            >
              Besoin d'annuler votre participation ?
            </h2>
            <p
              className="text-muted-foreground mt-[6px]"
              style={{ fontSize: "12.5px", lineHeight: 1.5 }}
            >
              {sit.status === "in_progress"
                ? "La garde est en cours. Prévenez d'abord l'hôte si possible : une annulation le met en difficulté."
                : "Prévenez d'abord l'hôte directement si possible, puis confirmez ici. Il sera notifié immédiatement."}
            </p>
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="text-destructive hover:underline underline-offset-4 mt-[12px]"
              style={{ fontSize: "12.5px", fontWeight: 700 }}
            >
              Annuler ma participation
            </button>
          </section>
        );
      })()}

      <SitFooterReassurance />

      {/* Note: la barre d'action "Postuler" est désormais affichée tout en haut,
          juste sous le header (cf. ApplyBar plus haut dans ce composant). */}

      {/* Spacer pour éviter que la sticky mobile masque le contenu */}
      <div className="md:hidden h-20" aria-hidden="true" />

      {/* Sticky mobile : favoris + CTA principal, padding bottom géré côté layout via safe-area */}
      <SitMobileStickyApply
        sitId={sit.id}
        state={
          !sit.accepting_applications
            ? "closed"
            : hasApplied
              ? "applied"
              : accessLevel === 1 || !canApplyGuards
                ? "blocked"
                : "apply"
        }
        onApply={() => setApplyOpen(true)}
      />

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
