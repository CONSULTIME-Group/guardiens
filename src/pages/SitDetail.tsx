import { useState, useEffect, useCallback, useRef } from "react";
import AccordDeGarde from "@/components/gardes/AccordDeGarde";
import { useParams, Link, useNavigate, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, Star, ShieldCheck, Home, PawPrint, MessageSquare, CheckCircle2, Send, Pencil, ExternalLink, ChevronDown, Plus, Minus, ClipboardList } from "lucide-react";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import PostConfirmationChecklist from "@/components/sits/PostConfirmationChecklist";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import ApplicationModal from "@/components/sits/ApplicationModal";
import ApplicationsList from "@/components/sits/ApplicationsList";
import ReviewsDisplay from "@/components/reviews/ReviewsDisplay";
import CancelSitModal from "@/components/sits/CancelSitModal";
import BreedProfileCard from "@/components/breeds/BreedProfileCard";
import EmergencyAlertBanner from "@/components/sits/EmergencyAlertBanner";
import ReportButton from "@/components/reports/ReportButton";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import LocationProfileCard from "@/components/location/LocationProfileCard";
import { useToast } from "@/hooks/use-toast";
import { geocodeCity } from "@/lib/geocode";
import { hasMedication } from "@/lib/medication";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ShareButtons from "@/components/sits/ShareButtons";
import SitDateHistory from "@/components/sits/SitDateHistory";
import SitHero from "@/components/sits/shared/SitHero";
import OwnerSitManagement from "@/components/sits/shared/OwnerSitManagement";
import SitDetailSkeleton from "@/components/skeletons/SitDetailSkeleton";
import {
  ENV_LABELS as envLabels,
  TYPE_LABELS as typeLabels,
  SPECIES_EMOJI as speciesEmoji,
  WALK_LABELS as walkLabels,
  ALONE_LABELS as aloneLabels,
  getSitStatusConfig,
} from "@/components/sits/shared/sitConstants";
import { trackEvent } from "@/lib/analytics";
import { formatSitPeriod } from "@/lib/dateRange";
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

interface SitData {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  flexible_dates: boolean | null;
  specific_expectations: string | null;
  open_to: string[] | null;
  status: string;
  user_id: string;
  property_id: string;
  max_applications: number | null;
  accepting_applications: boolean;
}

const SitDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, activeRole } = useAuth();
  const { hasAccess: subHasAccess } = useSubscriptionAccess();
  const { level: accessLevel, profileCompletion, canApplyGuards } = useAccessLevel();
  const [sit, setSit] = useState<SitData | null>(null);
  const [owner, setOwner] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [sitterProfile, setSitterProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [appCount, setAppCount] = useState(0);
  const [pendingAppCount, setPendingAppCount] = useState(0);
  const [breedAccordions, setBreedAccordions] = useState<Record<string, boolean>>({});
  const [logementOverride, setLogementOverride] = useState("");
  const [animauxOverride, setAnimauxOverride] = useState("");
  const overrideSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const [ownerAccordSigned, setOwnerAccordSigned] = useState(false);
  const [sitterAccordSigned, setSitterAccordSigned] = useState<{ accepted_at: string } | null>(null);
  const [accordOpen, setAccordOpen] = useState(false);
  const [accordData, setAccordData] = useState<any>(null);
  const [reopenCount, setReopenCount] = useState(3);
  const [hasReviewedThisSit, setHasReviewedThisSit] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: sitRows } = await supabase.from("sits").select("*").eq("id", id).limit(1);
      const sitData = sitRows?.[0];
      if (!sitData) { setLoading(false); return; }
      setSit(sitData as SitData);
      setLogementOverride((sitData as any).logement_override || "");
      setAnimauxOverride((sitData as any).animaux_override || "");

      const [ownerRes, propRes, ownerProfRes, reviewsRes] = await Promise.all([
        supabase.from("public_profiles").select("*").eq("id", sitData.user_id).limit(1),
        supabase.from("properties").select("*").eq("id", sitData.property_id).limit(1),
        supabase.from("owner_profiles").select("*").eq("user_id", sitData.user_id).limit(1),
        supabase.from("reviews").select("*, reviewer:profiles!reviews_reviewer_id_fkey(first_name, avatar_url)").eq("reviewee_id", sitData.user_id).eq("published", true),
      ]);

      const ownerData = ownerRes.data?.[0] ?? null;
      const propertyData = propRes.data?.[0] ?? null;
      const ownerProfileData = ownerProfRes.data?.[0] ?? null;

      setOwner(ownerData);
      setProperty(propertyData);
      setOwnerProfile(ownerProfileData);
      setReviews(reviewsRes.data || []);

      if (ownerData?.city) {
        geocodeCity(ownerData.city).then((result) => {
          if (result) setCoords({ lat: result.lat, lng: result.lng });
        });
      }

      if (propertyData) {
        const { data: petsData } = await supabase.from("pets").select("*").eq("property_id", propertyData.id);
        setPets(petsData || []);
      }

      const [allAppsRes, pendingAppsRes] = await Promise.all([
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("sit_id", id!).not("status", "in", "(rejected,cancelled)"),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("sit_id", id!).in("status", ["pending", "viewed", "discussing"]),
      ]);
      setAppCount(allAppsRes.count || 0);
      setPendingAppCount(pendingAppsRes.count || 0);

      if (user) {
        const [spRes, appRes, reviewRes] = await Promise.all([
          supabase.from("sitter_profiles").select("*").eq("user_id", user.id).limit(1),
          supabase.from("applications").select("id").eq("sit_id", id!).eq("sitter_id", user.id).limit(1),
          supabase.from("reviews").select("id").eq("sit_id", id!).eq("reviewer_id", user.id).limit(1),
        ]);
        setSitterProfile(spRes.data?.[0] ?? null);
        if (appRes.data?.[0]) setHasApplied(true);
        setHasReviewedThisSit(!!reviewRes.data?.[0]);
      }

      setLoading(false);
    };
    load();
  }, [id, user]);

  // Check accord de garde status for sitter view
  useEffect(() => {
    if (!id || !user || !sit || !owner || !property) return;
    const isSitter = sit.user_id !== user.id;
    const showAccord = ["confirmed", "in_progress", "completed"].includes(sit.status);
    if (!isSitter || !showAccord) return;

    const checkAccord = async () => {
      // Check if owner signed
      const { data: ownerAcc } = await supabase
        .from("garde_accords")
        .select("id")
        .eq("garde_id", id)
        .eq("role", "proprio")
        .eq("accepted", true)
        .maybeSingle();

      if (!ownerAcc) return;
      setOwnerAccordSigned(true);

      // Check if sitter already signed
      const { data: sitterAcc } = await supabase
        .from("garde_accords")
        .select("accepted_at")
        .eq("garde_id", id)
        .eq("user_id", user.id)
        .eq("role", "gardien")
        .eq("accepted", true)
        .maybeSingle();

      if (sitterAcc) setSitterAccordSigned(sitterAcc);

      // Build accord data from owner's signed document
      const { data: ownerDoc } = await supabase
        .from("garde_accords")
        .select("document_content")
        .eq("garde_id", id)
        .eq("role", "proprio")
        .eq("accepted", true)
        .maybeSingle();

      if (ownerDoc?.document_content) {
        setAccordData(ownerDoc.document_content);
      }
    };
    checkAccord();
  }, [id, user, sit, owner, property]);

  const isOwnerCheck = sit?.user_id === user?.id;
  const saveOverride = useCallback((field: "logement_override" | "animaux_override", value: string) => {
    if (!sit || !isOwnerCheck) return;
    if (overrideSaveTimeout.current) clearTimeout(overrideSaveTimeout.current);
    overrideSaveTimeout.current = setTimeout(async () => {
      await supabase.from("sits").update({ [field]: value } as any).eq("id", sit.id);
    }, 800);
  }, [sit, isOwnerCheck]);

  if (loading) return <SitDetailSkeleton />;
  if (!sit) return <div className="p-6 md:p-10"><p>Annonce introuvable.</p></div>;
  if (id?.startsWith("demo-")) return <Navigate to="/search" replace />;

  const photos: string[] = (property as any)?.photos || [];
  const avgRating = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1) : null;
  const isOwner = sit.user_id === user?.id;
  const isDraft = sit.status === "draft";
  const canCancel = isOwner && (sit.status === "published" || sit.status === "confirmed");

  const badges: string[] = [];
  if (sitterProfile && (activeRole === "sitter" || user?.role === "sitter" || user?.role === "both")) {
    const sitterAnimals: string[] = sitterProfile.animal_types || [];
    const petSpecies = pets.map((p: any) => p.species);
    const matchAnimal = petSpecies.some((s: string) => sitterAnimals.includes(s));
    if (matchAnimal) badges.push("Correspond à votre expérience animaux");
    if (sitterProfile.geographic_radius && owner?.city && user?.firstName) badges.push("Proche de chez vous");
  }

  const formatDate = (d: string | null) => d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "";

  const handlePublish = async () => {
    if (!isOwner || !isDraft || publishing) return;
    setPublishing(true);
    const { error } = await supabase
      .from("sits")
      .update({ status: "published" as any })
      .eq("id", sit.id)
      .eq("user_id", user!.id);
    setPublishing(false);
    if (error) {
      toast({ variant: "destructive", title: "Publication impossible", description: "Le brouillon n'a pas pu être publié." });
      return;
    }
    setSit({ ...sit, status: "published" });
    toast({ title: "Annonce publiée", description: "Les gardiens peuvent maintenant candidater." });
  };

  const status = getSitStatusConfig(sit.status);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in pb-44 md:pb-40">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <Link to={isOwner ? "/sits" : "/search"} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> {isOwner ? "Retour à mes annonces" : "Retour à la recherche"}
      </Link>

      {/* Draft banner */}
      {isOwner && isDraft && (
        <div className="mb-6 rounded-xl border border-border bg-accent/50 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-heading text-base font-semibold">Cette annonce est encore en brouillon</p>
              <p className="text-sm text-muted-foreground">Publie-la pour qu'elle apparaisse dans la recherche.</p>
            </div>
            <Button onClick={() => setPublishConfirmOpen(true)} disabled={publishing} className="gap-2 md:self-start">
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
                    <span>{formatSitPeriod(sit.start_date, sit.end_date) || "Dates non renseignées"}</span>
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
      {isOwner && sit.status === "published" && owner?.city && (
        <EmergencyAlertBanner
          sitId={sit.id}
          sitCity={owner.city}
          startDate={sit.start_date}
        />
      )}

      {/* Share buttons — visible to the owner of a published listing so they can broadcast it */}
      {isOwner && sit.status === "published" && (
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

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {badges.map(b => (
            <span key={b} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />{b}
            </span>
          ))}
        </div>
      )}

      {/* Hero: Photos gallery avec lightbox */}
      <SitHero photos={photos} city={owner?.city} priority />

      {/* Title, location, dates, status */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="font-heading text-2xl md:text-3xl font-bold">{sit.title || `Garde à ${owner?.city || "..."}`}</h1>
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && (
            <>
              <Link to={`/sits/${sit.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
              </Link>
              <Link
                to={`/annonces/${sit.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                Voir comme un gardien <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
          {user && sit.user_id !== user.id && <ReportButton targetId={sit.id} targetType="sit" />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
        {owner?.city && (
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{owner.city}</span>
        )}
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {formatDate(sit.start_date)} → {formatDate(sit.end_date)}
          {sit.flexible_dates && <span className="text-xs bg-accent px-2 py-0.5 rounded-full ml-1">Flexible</span>}
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>{status.label}</span>
        {avgRating && (
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-secondary fill-secondary" />{avgRating} ({reviews.length})
          </span>
        )}
      </div>

      {/* Owner card — masquée si on est soi-même le propriétaire (info redondante) */}
      {owner && !isOwner && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-card rounded-xl border border-border">
          <Link to={`/gardiens/${owner.id}`}>
            {owner.avatar_url ? (
              <img src={owner.avatar_url} alt={`Photo de ${owner.first_name}`} loading="lazy" className="w-14 h-14 rounded-full object-cover hover:ring-2 hover:ring-primary/30 transition-all" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center font-heading text-lg font-bold">
                {owner.first_name?.charAt(0) || "?"}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/gardiens/${owner.id}`} className="font-medium flex items-center gap-1.5 hover:underline">
              {owner.first_name}
              {owner.identity_verified && <VerifiedBadge />}
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">
              {owner.bio ? owner.bio.slice(0, 80) + (owner.bio.length > 80 ? "…" : "") : "Propriétaire"}
            </p>
          </div>
          <Link to={`/gardiens/${owner.id}`}>
            <Button variant="outline" size="sm">Voir le profil</Button>
          </Link>
        </div>
      )}

      {/* Historique des modifications de dates — visible au propriétaire */}
      {isOwner && <SitDateHistory sitId={sit.id} />}

      {/* Post-confirmation checklist */}
      {sit && user && (sit.status === "confirmed" || sit.status === "in_progress") && (
        <div className="mb-8">
          <PostConfirmationChecklist
            sitId={sit.id}
            sitOwnerId={sit.user_id}
            propertyId={sit.property_id}
            startDate={sit.start_date}
            endDate={sit.end_date}
            ownerCity={owner?.city}
            isOwner={isOwner}
            
          />
        </div>
      )}

      {/* Tabbed content */}
      <Tabs defaultValue={isOwner ? "candidatures" : "animals"} className="mt-2">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0 gap-0 overflow-x-auto">
          {isOwner && (
            <TabsTrigger value="candidatures" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
              Candidatures ({appCount})
              {pendingAppCount > 0 && <span className="w-2 h-2 rounded-full bg-primary inline-block ml-1 mb-0.5" />}
            </TabsTrigger>
          )}
          <TabsTrigger value="animals" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
          <TabsTrigger value="animals" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5">
            <PawPrint className="h-3.5 w-3.5" /> Animaux
          </TabsTrigger>
          <TabsTrigger value="housing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5">
            <Home className="h-3.5 w-3.5" /> Logement
          </TabsTrigger>
          <TabsTrigger value="expectations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Attentes
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm gap-1.5">
            <Star className="h-3.5 w-3.5" /> Avis ({reviews.length})
          </TabsTrigger>
        </TabsList>

        {/* Candidatures tab (owner only) */}
        {isOwner && (
          <TabsContent value="candidatures" className="mt-6 space-y-4">
            {/* Max applications status banner */}
            {!sit.accepting_applications && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Candidatures closes</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sit.max_applications
                      ? `Le maximum de ${sit.max_applications} candidature${sit.max_applications > 1 ? "s" : ""} a été atteint.`
                      : "Vous avez fermé les candidatures."}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button" variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => setReopenCount(c => Math.max(1, c - 1))}
                      disabled={reopenCount <= 1}
                    ><Minus className="h-3.5 w-3.5" /></Button>
                    <span className="w-8 text-center text-sm font-medium">{reopenCount}</span>
                    <Button
                      type="button" variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => setReopenCount(c => Math.min(20, c + 1))}
                      disabled={reopenCount >= 20}
                    ><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      const newMax = (sit.max_applications || appCount) + reopenCount;
                      await supabase.from("sits").update({ accepting_applications: true, max_applications: newMax } as any).eq("id", sit.id);
                      setSit({ ...sit, accepting_applications: true, max_applications: newMax });
                      toast({ title: "Candidatures rouvertes", description: `${reopenCount} place${reopenCount > 1 ? "s" : ""} supplémentaire${reopenCount > 1 ? "s" : ""} ouverte${reopenCount > 1 ? "s" : ""}.` });
                    }}
                  >
                    Ouvrir {reopenCount} candidature{reopenCount > 1 ? "s" : ""} de plus
                  </Button>
                </div>
              </div>
            )}
            {sit.accepting_applications && sit.max_applications && (
              <p className="text-xs text-muted-foreground">
                {appCount}/{sit.max_applications} candidature{sit.max_applications > 1 ? "s" : ""} reçue{appCount > 1 ? "s" : ""}
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
        )}

        {/* Animals tab */}
        <TabsContent value="animals" className="mt-6">
          {pets.length > 0 ? (
            <div className="space-y-4">
              {pets.map((pet: any) => (
                <div key={pet.id}>
                  <div className="flex gap-3 p-4 bg-card rounded-xl border border-border">
                    {pet.photo_url ? (
                      <img src={pet.photo_url} alt={pet.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center text-3xl shrink-0">
                        {speciesEmoji[pet.species] || "🐾"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-semibold">{speciesEmoji[pet.species]} {pet.name}{pet.breed ? ` — ${pet.breed}` : ""}{pet.age ? ` · ${pet.age} ans` : ""}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pet.walk_duration && pet.walk_duration !== "none" && (
                          <span className="px-2 py-0.5 rounded-full bg-accent text-xs">🚶 {walkLabels[pet.walk_duration]}</span>
                        )}
                        {pet.alone_duration && (
                          <span className="px-2 py-0.5 rounded-full bg-accent text-xs">🕐 {aloneLabels[pet.alone_duration]}</span>
                        )}
                        {hasMedication(pet.medication) && (
                          <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs">💊 Médication</span>
                        )}
                      </div>
                      {pet.character && <p className="text-sm text-muted-foreground mt-2">{pet.character}</p>}
                    </div>
                  </div>
                  {pet.breed && (
                    <div className="mt-2">
                      <button
                        onClick={() => setBreedAccordions(prev => ({ ...prev, [pet.id]: !prev[pet.id] }))}
                        className="text-sm text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        En savoir plus sur le {pet.breed}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${breedAccordions[pet.id] ? "rotate-180" : ""}`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ${breedAccordions[pet.id] ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
                        <div className="pt-4">
                          <BreedProfileCard
                            species={pet.species}
                            breed={pet.breed}
                            ownerNote={pet.owner_breed_note}
                            ownerFirstName={owner?.first_name}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic py-8 text-center">Aucun animal renseigné pour cette garde.</p>
          )}
        </TabsContent>

        {/* Housing tab */}
        <TabsContent value="housing" className="mt-6 space-y-6">
          {isOwner && (
            <div className="bg-muted/30 rounded-xl p-4 mb-4 border border-border">
              <p className="text-sm text-muted-foreground mb-3">
                Le logement et les animaux se gèrent depuis votre profil. Les modifications s'appliquent à toutes vos annonces.
              </p>
              <Link
                to="/owner-profile"
                className="border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary transition-colors inline-block"
              >
                Modifier mon profil →
              </Link>
            </div>
          )}

          {isOwner && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-medium text-foreground mb-1">Spécifique à cette garde (optionnel)</h3>
              <p className="text-xs text-muted-foreground mb-3">Ces informations s'appliquent uniquement à cette garde et complètent votre profil.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Précisions sur le logement</label>
                  <textarea
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Ex : La chambre d'amis sera fermée, accès jardin uniquement le matin..."
                    value={logementOverride}
                    onChange={e => { setLogementOverride(e.target.value); saveOverride("logement_override", e.target.value); }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Précisions sur les animaux</label>
                  <textarea
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Ex : Rex aura besoin d'une promenade supplémentaire le soir pendant cette période..."
                    value={animauxOverride}
                    onChange={e => { setAnimauxOverride(e.target.value); saveOverride("animaux_override", e.target.value); }}
                  />
                </div>
              </div>
            </div>
          )}
          {property && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <Home className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-semibold">Le logement</h3>
              </div>
              <p className="text-sm font-medium">{typeLabels[property.type] || property.type} · {envLabels[property.environment] || property.environment}</p>
              {property.rooms_count ? <p className="text-sm text-muted-foreground mt-1">{property.rooms_count} pièces · {property.bedrooms_count} chambres</p> : null}
              {property.description && <p className="text-sm text-muted-foreground mt-2">{property.description}</p>}
              {property.equipments?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {property.equipments.map((eq: string) => (
                    <span key={eq} className="px-2.5 py-1 rounded-full bg-accent text-xs">{eq}</span>
                  ))}
                </div>
              )}
              {property.region_highlights && <p className="text-sm text-muted-foreground mt-3">🌿 {property.region_highlights}</p>}
            </div>
          )}

          {coords && owner?.city && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-semibold">Emplacement</h3>
              </div>
              <div className="rounded-lg overflow-hidden border border-border h-52">
                <iframe
                  title="Carte"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.05},${coords.lat - 0.03},${coords.lng + 0.05},${coords.lat + 0.03}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">📍 {owner.city} — emplacement approximatif</p>
            </div>
          )}

          {owner?.city && owner?.postal_code && (
            <LocationProfileCard city={owner.city} postalCode={owner.postal_code} />
          )}
        </TabsContent>

        {/* Expectations tab */}
        <TabsContent value="expectations" className="mt-6 space-y-6">
          {(ownerProfile || sit.specific_expectations) && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-semibold">Ce qu'on attend</h3>
              </div>
              <div className="text-sm space-y-2">
                {ownerProfile?.preferred_sitter_types?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ownerProfile.preferred_sitter_types.map((t: string) => (
                      <span key={t} className="px-2.5 py-1 rounded-full bg-accent text-xs">{t}</span>
                    ))}
                  </div>
                )}
                {ownerProfile?.presence_expected && <p>Présence attendue : {ownerProfile.presence_expected}</p>}
                {ownerProfile?.visits_allowed && <p>Visites : {ownerProfile.visits_allowed}</p>}
                {ownerProfile?.overnight_guest && <p>Invités : {ownerProfile.overnight_guest}</p>}
                {ownerProfile?.rules_notes && <p className="text-muted-foreground">{ownerProfile.rules_notes}</p>}
                {sit.specific_expectations && <p className="mt-2 p-3 bg-accent/50 rounded-lg">{sit.specific_expectations}</p>}
              </div>
            </div>
          )}

          {ownerProfile && (ownerProfile.meeting_preference?.length > 0 || ownerProfile.news_frequency) && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-semibold">L'accueil</h3>
              </div>
              <div className="text-sm space-y-1">
                {ownerProfile.meeting_preference?.length > 0 && <p>Rencontre : {ownerProfile.meeting_preference.join(", ")}</p>}
                {ownerProfile.handover_preference && <p>Passage de relais : {ownerProfile.handover_preference}</p>}
                {ownerProfile.welcome_notes && <p className="text-muted-foreground">{ownerProfile.welcome_notes}</p>}
                {ownerProfile.news_frequency && <p>Nouvelles : {ownerProfile.news_frequency}</p>}
                {ownerProfile.news_format?.length > 0 && <p>Format : {ownerProfile.news_format.join(", ")}</p>}
              </div>
            </div>
          )}

          {sit.open_to && sit.open_to.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-heading font-semibold text-sm mb-2">Ouvert à</h3>
              <div className="flex flex-wrap gap-1.5">
                {sit.open_to.map((t: string) => (
                  <span key={t} className="px-2.5 py-1 rounded-full bg-accent text-xs">{t}</span>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Reviews tab */}
        <TabsContent value="reviews" className="mt-6">
          <ReviewsDisplay userId={sit.user_id} showAnimalCare={false} />
          {sit.status === "completed" && user && !hasReviewedThisSit && (
            <div className="mt-4">
              <Link to={`/review/${sit.id}`}>
                <Button variant="outline" className="w-full gap-2">
                  <Star className="h-4 w-4" /> {sit.user_id === user.id ? "Laisser un avis sur le gardien" : "Laisser un avis sur le propriétaire"}
                </Button>
              </Link>
            </div>
          )}
          {sit.status === "completed" && hasReviewedThisSit && (
            <p className="text-sm text-muted-foreground mt-4 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Vous avez déjà laissé votre avis pour cette garde.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Guide de la maison (owner only) */}
      {isOwner && (
        <div className="mt-8 p-4 bg-accent/50 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">📋 Guide de la maison</p>
              <p className="text-xs text-muted-foreground">Adresse, codes, contacts véto — partagé après confirmation</p>
            </div>
            <Link to={`/house-guide/${sit.property_id}`}>
              <Button variant="outline" size="sm">Modifier</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Accord de garde — sitter view */}
      {!isOwner && ownerAccordSigned && ["confirmed", "in_progress", "completed"].includes(sit.status) && (
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
                    ? format(new Date(sitterAccordSigned.accepted_at), "d MMMM yyyy", { locale: fr })
                    : "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <p className="font-heading font-semibold text-sm">📋 Notre accord de garde</p>
              <p className="text-sm text-muted-foreground">
                Le propriétaire a validé cet accord. Lisez-le et confirmez votre acceptation pour finaliser la garde.
              </p>
              <Button onClick={() => setAccordOpen(true)} className="gap-2">
                Voir et signer l'accord
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Cancel button */}
      {sit && user && (sit.status === "confirmed" || sit.status === "published") && (
        (isOwner || (hasApplied && sit.status === "confirmed")) && (
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
              onClick={() => setCancelOpen(true)}
            >
              <XCircle className="h-4 w-4 mr-1" /> Annuler cette garde
            </Button>
          </div>
        )
      )}

      <div className="mt-8 bg-primary/5 border border-primary/10 rounded-xl p-5 text-center">
        <p className="font-heading text-sm font-semibold text-primary">Vous partez l'esprit léger — et si un imprévu survient, votre réseau local de gardiens prend le relais.</p>
        <p className="text-xs text-muted-foreground mt-1">Profils vérifiés · Avis croisés · Gardiens d'urgence mobilisables</p>
      </div>

      {/* Sitter apply bar - sticky bottom action bar (full-width on mobile, offset by sidebar on desktop) */}
      {activeRole === "sitter" && !isOwner && sit.status === "published" && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-4px_16px_-4px_hsl(var(--foreground)/0.08)] pb-20 md:pb-0 supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),5rem)] md:supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="max-w-4xl mx-auto px-4 py-3">
            {!sit.accepting_applications ? (
              <Button className="w-full h-12 text-base font-semibold" disabled>
                Candidatures en cours d'analyse
              </Button>
            ) : accessLevel === 1 ? (
              <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="guard" />
            ) : hasApplied ? (
              <Button className="w-full h-12 text-base font-semibold" disabled>
                <CheckCircle2 className="h-5 w-5 mr-2" /> Candidature envoyée ✓
              </Button>
            ) : !canApplyGuards ? (
              // Sitter sans abonnement (3A) — gardes verrouillées par l'abonnement, pas par l'ID
              <AccessGateBanner level="3A" profileCompletion={profileCompletion} context="guard" />
            ) : (
              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={() => {
                  trackEvent("sit_apply_clicked", { source: "sit_detail", metadata: { sit_id: sit.id } });
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
              await supabase.from("sits").update({ accepting_applications: false } as any).eq("id", sit.id);
              setSit({ ...sit, accepting_applications: false });
            }
          }
        }}
      />

      {sit && (
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
      )}
    </div>
  );
};

export default SitDetail;