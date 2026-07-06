import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ChipSelect from "@/components/profile/ChipSelect";
import { Helmet } from "react-helmet-async";
import EnvironmentPills from "@/components/shared/EnvironmentPills";
import { Calendar, Home, PawPrint, ShieldCheck, MessageSquare, Users, ArrowLeft, AlertCircle, Zap, Eye, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { hasMedication } from "@/lib/medication";
import { trackFirstAction, trackEvent } from "@/lib/analytics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES } from "@/lib/countries";
import ImproveListingButton from "@/components/ai/ImproveListingButton";
import { moderateContent } from "@/lib/moderation";
import AnnouncementPreviewDialog from "@/components/sits/owner/AnnouncementPreviewDialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

interface PropertySummary {
  id: string;
  type: string;
  environment: string | null;
  equipments: string[];
  photos: string[];
  description: string | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
}

interface PetSummary {
  name: string;
  species: string;
  breed: string | null;
  photo_url: string | null;
  walk_duration: string | null;
  alone_duration: string | null;
  medication: string | null;
  activity_level: string | null;
}

interface OwnerSummary {
  preferred_sitter_types: string[];
  presence_expected: string | null;
  experience_required: boolean | null;
  visits_allowed: string | null;
  overnight_guest: string | null;
  rules_notes: string | null;
  meeting_preference: string[];
  handover_preference: string | null;
  welcome_notes: string | null;
  news_frequency: string | null;
  news_format: string[];
  communication_notes: string | null;
  environments: string[];
}

const envLabels: Record<string, string> = {
  city_center: "Centre-ville", suburban: "Périurbain", countryside: "Campagne",
  mountain: "Montagne", seaside: "Bord de mer", forest: "Forêt",
};
const typeLabels: Record<string, string> = {
  apartment: "Appartement", house: "Maison", farm: "Ferme", chalet: "Chalet", other: "Autre",
};
const speciesLabels: Record<string, string> = {
  dog: "🐕 Chien", cat: "🐈 Chat", horse: "🐴 Cheval", bird: "🐦 Oiseau",
  rodent: "🐹 Rongeur", fish: "🐠 Poisson", reptile: "🦎 Reptile",
  farm_animal: "🐄 Animal de ferme", nac: "🐾 NAC",
};
const walkLabels: Record<string, string> = { none: "Aucune", "30min": "30 min/jour", "1h": "1h/jour", "2h_plus": "2h+/jour" };
const aloneLabels: Record<string, string> = { never: "Jamais seul", "2h": "2h max", "6h": "6h max", all_day: "Toute la journée" };

const openToOptions = ["Familles", "Solo", "Couples", "Retraités", "Sans préférence"];

const MIN_SITS_OPTIONS = [
  { label: "Aucune exigence", value: 0 },
  { label: "1 garde+", value: 1 },
  { label: "3 gardes+", value: 3 },
  { label: "5 gardes+", value: 5 },
];

const STEPS = [
  { id: "essentiel", label: "L'essentiel" },
  { id: "garde", label: "La garde" },
  { id: "preferences", label: "Préférences" },
];

// Relative time helper
function relativeTime(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "à l'instant";
  if (seconds < 60) return `il y a ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.floor(minutes / 60)} h`;
}

const FirstAnnonceTip = () => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border-l-4 border-amber-400 bg-amber-50/60 p-3 mb-6">
      <div className="flex-1">
        <p className="text-sm text-amber-900">
          Première annonce ? <a href="/actualites/rediger-bonne-annonce-house-sitting" className="text-primary underline font-medium">Lisez nos conseils pour attirer les meilleurs gardiens →</a>
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-500 hover:text-amber-700 text-lg leading-none shrink-0" aria-label="Fermer">×</button>
    </div>
  );
};

// Step progress indicator
const StepperBar = ({ currentStep, onStepClick }: { currentStep: number; onStepClick: (i: number) => void }) => (
  <div className="sticky top-12 md:top-0 z-30 bg-background border-b border-border pt-safe">
    <div className="max-w-3xl mx-auto px-4 py-3">
      <div className="flex items-center justify-between gap-1 mb-2">
        {STEPS.map((step, i) => (
          <button
            key={step.id}
            type="button"
            onClick={() => { if (i < currentStep) onStepClick(i); }}
            className={cn(
              "flex-1 text-center text-xs font-medium transition-colors truncate",
              i === currentStep ? "text-primary" : i < currentStep ? "text-foreground cursor-pointer" : "text-muted-foreground cursor-default"
            )}
          >
            {i < currentStep ? (
              <span className="inline-flex items-center justify-center gap-1">
                <Check className="h-3 w-3 text-primary shrink-0" />
                <span className="hidden sm:inline">{step.label}</span>
              </span>
            ) : (
              <span>{i + 1}. {step.label}</span>
            )}
          </button>
        ))}
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  </div>
);

// Date sheet for mobile
const DateSheet = ({
  open, onOpenChange, label, value, onChange, min
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  label: string; value: string; onChange: (v: string) => void; min?: string;
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
      <SheetHeader>
        <SheetTitle className="text-left">{label}</SheetTitle>
      </SheetHeader>
      <div className="mt-4 pb-4">
        <Input
          type="date"
          value={value}
          min={min}
          onChange={e => onChange(e.target.value)}
          className="h-12 text-base w-full"
          autoFocus
        />
        <Button
          className="w-full mt-4 h-12 text-base"
          onClick={() => onOpenChange(false)}
        >
          Confirmer
        </Button>
      </div>
    </SheetContent>
  </Sheet>
);

const CreateSit = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSitId = searchParams.get("from");
  const draftIdParam = searchParams.get("draftId") || searchParams.get("resume");

  const [currentStep, setCurrentStep] = useState(0);
  const [sitLocation, setSitLocation] = useState<"home" | "away" | null>(null);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [flexibleNotes, setFlexibleNotes] = useState("");
  const [specificExpectations, setSpecificExpectations] = useState("");
  const [openTo, setOpenTo] = useState<string[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [sitEnvironments, setSitEnvironments] = useState<string[]>([]);
  const [minGardienSits, setMinGardienSits] = useState(0);
  const [maxApplications, setMaxApplications] = useState<number | null>(10);
  const [ownerMessage, setOwnerMessage] = useState("");
  const [dailyRoutine, setDailyRoutine] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [sitCity, setSitCity] = useState<string>("");
  const [sitCountry, setSitCountry] = useState<string>("FR");

  // Touched state for blur validation
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  // Date sheets
  const [startSheetOpen, setStartSheetOpen] = useState(false);
  const [endSheetOpen, setEndSheetOpen] = useState(false);

  // Relative time ticker
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const [property, setProperty] = useState<PropertySummary | null>(null);
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<OwnerSummary | null>(null);
  const [ownerPhotos, setOwnerPhotos] = useState<string[]>([]);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [ownerCity, setOwnerCity] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [isRepublish, setIsRepublish] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const hasUserEditedRef = useRef(false);
  const initialLoadedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [propRes, ownerRes, profileRes, galleryRes] = await Promise.all([
        supabase.from("properties").select("*").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("owner_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("profile_completion, city").eq("id", user.id).single(),
        supabase.from("owner_gallery").select("photo_url").eq("user_id", user.id).limit(4),
      ]);

      let sourceSitRes: { data: any } | null = null;
      if (fromSitId) {
        sourceSitRes = await supabase.from("sits").select("title, specific_expectations, open_to, environments, min_gardien_sits, flexible_dates, max_applications, owner_message, daily_routine, city, country").eq("id", fromSitId).single();
      }

      setProfileCompletion(profileRes.data?.profile_completion || 0);
      setOwnerCity(profileRes.data?.city || "");
      setOwnerPhotos((galleryRes.data || []).map((g: any) => g.photo_url));

      if (sourceSitRes?.data) {
        const s = sourceSitRes.data;
        setTitle(s.title || "");
        setSpecificExpectations(s.specific_expectations || "");
        setOpenTo(s.open_to || []);
        setSitEnvironments(s.environments || []);
        setMinGardienSits(s.min_gardien_sits || 0);
        setFlexibleDates(s.flexible_dates || false);
        setMaxApplications(s.max_applications || null);
        setOwnerMessage(s.owner_message || "");
        setDailyRoutine(s.daily_routine || "");
        setSitCity((s as any).city || "");
        setSitCountry((s as any).country || "FR");
        setIsRepublish(true);
      }

      if (!sourceSitRes?.data) {
        let draftRes: { data: any } | null = null;
        if (draftIdParam) {
          draftRes = await supabase.from("sits").select("*").eq("id", draftIdParam).eq("user_id", user.id).eq("status", "draft").maybeSingle();
          if (!draftRes?.data) {
            // ?resume= explicite mais brouillon inexistant ou pas au user : on redirige proprement.
            toast({
              variant: "destructive",
              title: "Brouillon introuvable",
              description: "Ce brouillon n'existe pas ou ne vous appartient pas.",
            });
            navigate("/dashboard");
            return;
          }
        } else {
          draftRes = await supabase.from("sits").select("*").eq("user_id", user.id).eq("status", "draft").order("created_at", { ascending: false }).limit(1).maybeSingle();
        }
        if (draftRes?.data) {
          const d = draftRes.data;
          setDraftId(d.id);
          setTitle(d.title || "");
          setStartDate(d.start_date || "");
          setEndDate(d.end_date || "");
          setFlexibleDates(d.flexible_dates || false);
          setSpecificExpectations(d.specific_expectations || "");
          setOpenTo(d.open_to || []);
          setIsUrgent(d.is_urgent || false);
          setSitEnvironments(d.environments || []);
          setMinGardienSits(d.min_gardien_sits || 0);
          setMaxApplications(d.max_applications ?? 10);
          setOwnerMessage(d.owner_message || "");
          setDailyRoutine(d.daily_routine || "");
          setCoverPhotoUrl(d.cover_photo_url || null);
          setSitCity((d as any).city || "");
          setSitCountry((d as any).country || "FR");
          if (draftIdParam) {
            const days = d.created_at
              ? Math.round((Date.now() - new Date(d.created_at).getTime()) / 86_400_000)
              : null;
            void trackEvent("sit_draft_resumed", {
              source: "create_sit_page",
              metadata: { sit_id: d.id, days_since_created: days },
            });
          }
        }
      }

      if (propRes.data) {
        const p = propRes.data;
        setProperty({
          id: p.id, type: p.type, environment: p.environment,
          equipments: (p as any).equipments || [], photos: (p as any).photos || [],
          description: p.description, rooms_count: p.rooms_count, bedrooms_count: p.bedrooms_count,
        });
        const { data: petsData } = await supabase.from("pets").select("*").eq("property_id", p.id);
        setPets(petsData?.map(a => ({
          name: a.name, species: a.species, breed: a.breed,
          photo_url: a.photo_url, walk_duration: a.walk_duration,
          alone_duration: a.alone_duration, medication: a.medication, activity_level: a.activity_level,
        })) || []);
      }

      if (ownerRes.data) {
        const o = ownerRes.data;
        setOwnerProfile({
          preferred_sitter_types: o.preferred_sitter_types || [],
          presence_expected: o.presence_expected, experience_required: o.experience_required,
          visits_allowed: o.visits_allowed, overnight_guest: o.overnight_guest,
          rules_notes: o.rules_notes, meeting_preference: o.meeting_preference || [],
          handover_preference: o.handover_preference, welcome_notes: o.welcome_notes,
          news_frequency: o.news_frequency, news_format: o.news_format || [],
          communication_notes: o.communication_notes,
          environments: (o as any).environments || [],
        });
        if (!fromSitId && !draftIdParam) {
          setSitEnvironments(prev => (prev.length > 0 ? prev : ((o as any).environments || [])));
        }
      }
      setLoading(false);
      setTimeout(() => { initialLoadedRef.current = true; }, 300);
    };
    load();
  }, [user, fromSitId, draftIdParam]);

  // Auto-save draft (debounced)
  useEffect(() => {
    if (!user || !property || !initialLoadedRef.current) return;
    hasUserEditedRef.current = true;
    const t = setTimeout(async () => {
      await saveDraft({ silent: true });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, startDate, endDate, flexibleDates, flexibleNotes, specificExpectations, openTo, isUrgent, sitEnvironments, minGardienSits, maxApplications, ownerMessage, dailyRoutine, coverPhotoUrl, sitCity, sitCountry]);

  const saveDraft = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!user || !property) return null;
    setSavingDraft(true);
    try {
      let expectations = specificExpectations;
      if (flexibleDates && flexibleNotes) {
        expectations = `${expectations}\n\nDates flexibles : ${flexibleNotes}`.trim();
      }
      const payload: any = {
        user_id: user.id,
        property_id: property.id,
        title: title || "",
        start_date: startDate || null,
        end_date: endDate || null,
        flexible_dates: flexibleDates,
        specific_expectations: expectations,
        open_to: openTo,
        is_urgent: isUrgent,
        environments: sitEnvironments,
        min_gardien_sits: minGardienSits,
        max_applications: maxApplications,
        owner_message: ownerMessage.trim() || null,
        daily_routine: dailyRoutine.trim() || null,
        cover_photo_url: coverPhotoUrl ?? (ownerPhotos.length > 0 ? ownerPhotos[0] : null),
        city: sitCity.trim() || null,
        country: sitCountry.trim() || "FR",
      };
      if (draftId) {
        const { error } = await supabase.from("sits").update(payload).eq("id", draftId).eq("status", "draft");
        if (error) throw error;
        setLastSavedAt(new Date());
        return draftId;
      } else {
        const { data, error } = await supabase.from("sits").insert({ ...payload, status: "draft" as any }).select("id").single();
        if (error) throw error;
        setDraftId(data.id);
        setLastSavedAt(new Date());
        return data.id;
      }
    } catch (e) {
      if (!silent) {
        console.error("[CreateSit] saveDraft failed", e);
        toast({ variant: "destructive", title: "Sauvegarde du brouillon impossible" });
      }
      return null;
    } finally {
      setSavingDraft(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const dateError = startDate && endDate && startDate >= endDate
    ? "La date de fin doit être après la date de début."
    : startDate && startDate < today
    ? "La date de début ne peut pas être dans le passé."
    : null;

  const MIN_DESCRIPTION = 150;
  const descriptionValid = specificExpectations.length >= MIN_DESCRIPTION;
  const hasPhoto = !!coverPhotoUrl || ownerPhotos.length > 0;
  // Seuil de publication abaissé de 60 % à 40 % (owner Pass 2) : débloque
  // les propriétaires en cours d'onboarding sans sacrifier la qualité minimale
  // (photo, description, dates). Un badge non bloquant rappelle la complétion
  // du profil sur l'annonce tant qu'elle est < 80 %.
  const PUBLISH_PROFILE_THRESHOLD = 40;
  const NUDGE_PROFILE_THRESHOLD = 80;
  const canPublish = profileCompletion >= PUBLISH_PROFILE_THRESHOLD && property && title && startDate && endDate && !dateError && descriptionValid && hasPhoto;

  type PublishBlocker = { id: string; label: string; anchor?: string; action?: string };
  const publishBlockers: PublishBlocker[] = [
    profileCompletion < PUBLISH_PROFILE_THRESHOLD ? { id: "profile", label: `Profil complété à ${PUBLISH_PROFILE_THRESHOLD} % minimum (actuellement ${profileCompletion} %)`, action: "/owner-profile" } : null,
    !property ? { id: "property", label: "Logement renseigné", action: "/owner-profile" } : null,
    !title ? { id: "title", label: "Titre de l'annonce", anchor: "title-field" } : null,
    !startDate ? { id: "start", label: "Date de début", anchor: "dates-field" } : null,
    !endDate ? { id: "end", label: "Date de fin", anchor: "dates-field" } : null,
    dateError ? { id: "date-error", label: dateError, anchor: "dates-field" } : null,
    !descriptionValid ? { id: "desc", label: `Description d'au moins ${MIN_DESCRIPTION} caractères (actuellement ${specificExpectations.length})`, anchor: "description-field" } : null,
    !hasPhoto ? { id: "photo", label: "Au moins 1 photo de votre logement ou galerie", action: "/owner-profile" } : null,
  ].filter(Boolean) as PublishBlocker[];


  const onPublishClick = () => {
    if (canPublish) return handlePublish();
    const first = publishBlockers[0];
    if (!first) return;
    if (first.action) {
      toast({ variant: "destructive", title: "Il manque quelque chose pour publier", description: first.label });
      navigate(first.action);
      return;
    }
    if (first.anchor && typeof document !== "undefined") {
      document.getElementById(first.anchor)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    toast({ variant: "destructive", title: "Il manque quelque chose pour publier", description: first.label });
  };

  const nDays = (startDate && endDate && !dateError)
    ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : 0;

  const buildSuggestedTitle = () => {
    if (!startDate || !endDate || dateError) return "";
    const speciesCount: Record<string, number> = {};
    pets.forEach(p => { speciesCount[p.species] = (speciesCount[p.species] || 0) + 1; });
    const labelMap: Record<string, [string, string]> = {
      dog: ["chien", "chiens"], cat: ["chat", "chats"], horse: ["cheval", "chevaux"],
      bird: ["oiseau", "oiseaux"], rodent: ["rongeur", "rongeurs"], fish: ["poisson", "poissons"],
      reptile: ["reptile", "reptiles"], farm_animal: ["animal de ferme", "animaux de ferme"], nac: ["NAC", "NAC"],
    };
    const animalParts = Object.entries(speciesCount).map(([sp, n]) => {
      const [s, p] = labelMap[sp] || [sp, sp];
      return n > 1 ? `${n} ${p}` : `1 ${s}`;
    });
    const animals = animalParts.length > 0 ? animalParts.join(" et ") : "animaux";
    const cityPart = ownerCity ? ` à ${ownerCity}` : "";
    const dayWord = nDays > 1 ? "jours" : "jour";
    return `Garde de ${animals}${cityPart}, ${nDays} ${dayWord}`;
  };

  const showUrgent = flexibleDates || (startDate && new Date(startDate).getTime() - Date.now() < 7 * 86400000);

  const handlePublish = async () => {
    if (!user || !property || !canPublish) return;
    setPublishing(true);
    try {
      const verdict = await moderateContent("sit", `${title}\n\n${specificExpectations}\n\n${ownerMessage}\n\n${dailyRoutine}`);
      if (verdict.status === "block") {
        toast({
          variant: "destructive",
          title: "Publication bloquée par la modération",
          description: verdict.reasons.join(" · ") || "Merci de retirer les coordonnées ou contenus contraires aux CGS.",
        });
        setPublishing(false);
        return;
      }
      if (verdict.status === "warning") {
        toast({ title: "Annonce publiée avec une réserve", description: verdict.reasons.join(" · ") });
      }

      let expectations = specificExpectations;
      if (flexibleDates && flexibleNotes) {
        expectations = `${expectations}\n\nDates flexibles : ${flexibleNotes}`.trim();
      }

      const payload: any = {
        user_id: user.id,
        property_id: property.id,
        title,
        start_date: startDate,
        end_date: endDate,
        flexible_dates: flexibleDates,
        specific_expectations: expectations,
        open_to: openTo,
        is_urgent: isUrgent,
        status: "published",
        environments: sitEnvironments,
        min_gardien_sits: minGardienSits,
        max_applications: maxApplications,
        owner_message: ownerMessage.trim() || null,
        daily_routine: dailyRoutine.trim() || null,
        cover_photo_url: coverPhotoUrl ?? (ownerPhotos.length > 0 ? ownerPhotos[0] : null),
        city: sitCity.trim() || null,
        country: sitCountry.trim() || "FR",
      };

      let sitId = draftId;
      if (draftId) {
        const { error } = await supabase.from("sits").update(payload).eq("id", draftId);
        if (error) throw error;
      } else {
        const { data: sit, error } = await supabase.from("sits").insert(payload).select("id").single();
        if (error) throw error;
        sitId = sit.id;
      }

      try { await trackFirstAction("sit_created", { sit_id: sitId, is_urgent: isUrgent }); } catch {}
      toast({ title: "Annonce publiée", description: "Les gardiens peuvent maintenant postuler." });
      navigate(`/sits/${sitId}`);
    } catch (err: any) {
      console.error("[CreateSit] publish failed", err);
      toast({
        variant: "destructive",
        title: "Impossible de publier l'annonce",
        description: err?.message || "Vérifiez votre connexion et réessayez.",
      });
    } finally {
      setPublishing(false);
    }
  };

  // Validation helpers
  const fieldState = (field: string, invalid: boolean) => {
    if (!touched[field]) return "";
    return invalid ? "border-destructive focus-visible:ring-destructive" : "border-green-500 focus-visible:ring-green-500";
  };

  if (loading) {
    return <div className="p-6 md:p-10 max-w-3xl mx-auto text-muted-foreground">Chargement...</div>;
  }

  // Draft label
  const draftLabel = savingDraft
    ? "Brouillon en cours d'enregistrement…"
    : lastSavedAt
      ? `Brouillon enregistré · ${relativeTime(lastSavedAt)}`
      : draftId ? "Brouillon en cours" : null;

  return (
    <div className="animate-fade-in pb-40">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>

      {/* Stepper sticky */}
      <StepperBar currentStep={currentStep} onStepClick={setCurrentStep} />

      <div className="px-4 pt-5 pb-2 max-w-3xl mx-auto">
        <Link to="/sits" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour à mes gardes
        </Link>

        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-1">
          {isRepublish ? "Republier une garde" : "Publier une garde"}
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          {isRepublish
            ? "Les informations de votre précédente annonce sont pré-remplies. Ajustez les dates et détails si besoin."
            : "Les informations de votre profil sont pré-remplies. Ajoutez les détails spécifiques à cette garde."}
        </p>

        {/* Draft indicator */}
        {draftLabel && (
          <div className={cn(
            "inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 mb-4",
            savingDraft
              ? "bg-muted text-muted-foreground"
              : lastSavedAt ? "bg-green-50 text-green-700 border border-green-200" : "bg-muted text-muted-foreground"
          )}>
            {lastSavedAt && !savingDraft && <Check className="h-3 w-3 shrink-0" />}
            {draftLabel}
          </div>
        )}

        {!isRepublish && <FirstAnnonceTip />}

        {profileCompletion < 60 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-destructive">Profil incomplet ({profileCompletion} %)</p>
              <p className="text-sm text-muted-foreground mt-1">Complétez votre profil à au moins 60 % pour publier une annonce.</p>
              <Link to="/owner-profile" className="text-sm text-primary underline mt-2 inline-block">Compléter mon profil →</Link>
            </div>
          </div>
        )}
      </div>

      {/* ===================== STEP 0 : L'ESSENTIEL ===================== */}
      {currentStep === 0 && (
        <div className="px-4 max-w-3xl mx-auto space-y-6">
          {/* ===== Filtre d'usage bloquant : garde à domicile uniquement ===== */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <p className="font-heading text-base font-semibold text-foreground mb-1">
              Où se déroulera la garde&nbsp;?
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Les annonces de garde concernent uniquement les gardes à votre domicile (le gardien s'installe chez vous).
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSitLocation("home")}
                className={cn(
                  "text-left rounded-lg border p-3 transition-colors",
                  sitLocation === "home"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-input bg-card hover:bg-accent/40"
                )}
              >
                <p className="font-medium text-sm text-foreground">À mon domicile</p>
                <p className="text-xs text-muted-foreground mt-0.5">Le gardien vient chez moi</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSitLocation("away");
                  toast({
                    title: "Redirection vers Coup de main",
                    description: "Visite, balade, pension ou garde chez la personne se publient dans Coup de main.",
                  });
                  setTimeout(() => navigate("/petites-missions/creer"), 1200);
                }}
                className={cn(
                  "text-left rounded-lg border p-3 transition-colors",
                  sitLocation === "away"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-input bg-card hover:bg-accent/40"
                )}
              >
                <p className="font-medium text-sm text-foreground">Ailleurs</p>
                <p className="text-xs text-muted-foreground mt-0.5">Visite, balade, pension, chez la personne…</p>
              </button>
            </div>

            {sitLocation === "away" && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900 mb-1">
                  Redirection en cours vers Coup de main…
                </p>
                <p className="text-sm text-amber-900/80 mb-3">
                  Si rien ne se passe, cliquez ci-dessous.
                </p>
                <Button asChild size="sm">
                  <Link to="/petites-missions/creer">Publier dans Coup de main</Link>
                </Button>
              </div>
            )}
          </div>

          {sitLocation !== "home" ? null : (
          <>


          {/* Titre */}
          <div id="title-field" className="scroll-mt-24">
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="title-input" className="text-sm font-medium">Titre de l'annonce *</Label>
              {nDays > 0 && pets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTitle(buildSuggestedTitle())}
                  className="text-xs text-primary hover:underline"
                >
                  Suggérer un titre
                </button>
              )}
            </div>
            <Input
              id="title-input"
              placeholder={nDays > 0 ? buildSuggestedTitle() : "Ex : Garde de 2 chats à Écully, 10 jours en août"}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => touch("title")}
              className={cn("h-12 text-base", fieldState("title", !title))}
            />
            {touched.title && !title && (
              <p className="text-xs text-destructive mt-1">Le titre est requis pour publier.</p>
            )}
          </div>

          {/* Dates */}
          <div id="dates-field" className="scroll-mt-24">
            <Label className="text-sm font-medium block mb-2">Dates de la garde *</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start-date" className="text-xs text-muted-foreground mb-1 block">Début</Label>
                {/* Native date input, tappable to open sheet on mobile */}
                <button
                  type="button"
                  onClick={() => setStartSheetOpen(true)}
                  className={cn(
                    "w-full h-12 text-base rounded-md border px-3 text-left flex items-center justify-between transition-colors",
                    !startDate ? "text-muted-foreground border-input" : "text-foreground border-input",
                    touched.startDate && !startDate ? "border-destructive" : "",
                  )}
                  onBlur={() => touch("startDate")}
                >
                  <span>{startDate ? new Date(startDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "JJ/MM/AAAA"}</span>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs text-muted-foreground mb-1 block">Fin</Label>
                <button
                  type="button"
                  onClick={() => setEndSheetOpen(true)}
                  className={cn(
                    "w-full h-12 text-base rounded-md border px-3 text-left flex items-center justify-between transition-colors",
                    !endDate ? "text-muted-foreground border-input" : "text-foreground border-input",
                    touched.endDate && !endDate ? "border-destructive" : "",
                  )}
                  onBlur={() => touch("endDate")}
                >
                  <span>{endDate ? new Date(endDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "JJ/MM/AAAA"}</span>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            {dateError ? (
              <p className="text-sm text-destructive flex items-center gap-1.5 mt-2">
                <AlertCircle className="h-3.5 w-3.5" /> {dateError}
              </p>
            ) : nDays > 0 ? (
              <p className="text-xs text-muted-foreground mt-2">
                Durée : <span className="font-medium text-foreground">{nDays} {nDays > 1 ? "jours" : "jour"}</span>
              </p>
            ) : null}
          </div>

          {/* Date sheets */}
          <DateSheet
            open={startSheetOpen}
            onOpenChange={setStartSheetOpen}
            label="Date de début"
            value={startDate}
            onChange={v => { setStartDate(v); touch("startDate"); }}
            min={today}
          />
          <DateSheet
            open={endSheetOpen}
            onOpenChange={setEndSheetOpen}
            label="Date de fin"
            value={endDate}
            onChange={v => { setEndDate(v); touch("endDate"); }}
            min={startDate || today}
          />

          {/* Description */}
          <div id="description-field" className="scroll-mt-24">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <Label htmlFor="description-textarea" className="text-sm font-medium">Description de la garde *</Label>
              <ImproveListingButton
                title={title}
                description={specificExpectations}
                context={{
                  animaux: pets?.map(p => `${p.species}${p.breed ? ` (${p.breed})` : ""}`).join(", "),
                  logement: property?.type,
                  ville: sitCity || ownerCity || undefined,
                  dates: startDate && endDate ? `${startDate} – ${endDate}` : undefined,
                }}
                onApply={(patch) => {
                  if (patch.title) setTitle(patch.title);
                  if (patch.description) setSpecificExpectations(patch.description);
                }}
              />
            </div>
            <Textarea
              id="description-textarea"
              placeholder={`Décrivez ce qui est particulier à cette garde, en plus de ce qui est déjà dans votre profil (min. ${MIN_DESCRIPTION} caractères). Les annonces détaillées reçoivent 3 fois plus de candidatures.`}
              value={specificExpectations}
              onChange={e => setSpecificExpectations(e.target.value)}
              onBlur={() => touch("description")}
              className={cn(
                "text-base min-h-[140px]",
                touched.description && !descriptionValid
                  ? "border-destructive focus-visible:ring-destructive"
                  : touched.description && descriptionValid
                    ? "border-green-500 focus-visible:ring-green-500"
                    : ""
              )}
              rows={5}
            />
            <p className={cn(
              "text-xs mt-1 flex justify-between",
              touched.description && specificExpectations.length > 0 && specificExpectations.length < MIN_DESCRIPTION
                ? "text-destructive"
                : specificExpectations.length >= MIN_DESCRIPTION
                  ? "text-green-600"
                  : "text-muted-foreground"
            )}>
              <span>
                {touched.description && !descriptionValid && specificExpectations.length > 0
                  ? `Encore ${MIN_DESCRIPTION - specificExpectations.length} caractères`
                  : specificExpectations.length >= MIN_DESCRIPTION
                    ? "Longueur suffisante"
                    : `Min. ${MIN_DESCRIPTION} caractères`}
              </span>
              <span>{specificExpectations.length}/{MIN_DESCRIPTION}</span>
            </p>
          </div>

          {/* Journée type */}
          <div>
            <Label htmlFor="daily-routine" className="text-sm font-medium">Une journée type <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
              Décrivez le déroulé d'une journée, matin, midi, soir. Les gardiens adorent ce niveau de détail.
            </p>
            <Textarea
              id="daily-routine"
              placeholder={"Ex :\nMatin, Sortie du chien 30 min, gamelles, ouverture du jardin.\nMidi, Visite rapide, fontaine à recharger.\nSoir, Promenade 30 min, repas, câlins obligatoires 🥰"}
              value={dailyRoutine}
              onChange={e => setDailyRoutine(e.target.value.slice(0, 1500))}
              className="text-base font-mono text-[13px] min-h-[120px]"
              rows={5}
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">{dailyRoutine.length}/1500</p>
          </div>

          {/* Mot de l'hôte */}
          <div>
            <Label htmlFor="owner-message" className="text-sm font-medium">Un mot de vous <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
              Un message personnel aux futurs gardiens, ce qu'ils trouveront en arrivant, ce que vous appréciez, une touche humaine.
            </p>
            <Textarea
              id="owner-message"
              placeholder="Ex : On confie nos animaux à un membre de confiance plutôt qu'à une pension. Vous repartirez sûrement avec des cookies maison et une connaissance fine du quartier !"
              value={ownerMessage}
              onChange={e => setOwnerMessage(e.target.value.slice(0, 800))}
              className="text-base"
              rows={4}
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">{ownerMessage.length}/800</p>
          </div>
          </>
          )}
        </div>
      )}


      {/* ===================== STEP 1 : LA GARDE ===================== */}
      {currentStep === 1 && (
        <div className="px-4 max-w-3xl mx-auto space-y-6">
          {/* Lieu de la garde */}
          <details className="rounded-lg border border-border bg-muted/30 group" open={!!(sitCity) || (sitCountry && sitCountry !== "FR")}>
            <summary className="cursor-pointer list-none p-4 flex items-center justify-between hover:bg-muted/40 transition-colors rounded-lg">
              <div>
                <p className="text-sm font-medium">Lieu de la garde <span className="text-muted-foreground font-normal">(optionnel)</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Par défaut : {ownerCity || "votre ville de profil"}. Personnalisez si besoin (résidence secondaire, étranger…).
                </p>
              </div>
              <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform shrink-0" aria-hidden="true">▾</span>
            </summary>
            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sit_city" className="text-xs text-muted-foreground">Ville de la garde</Label>
                  <Input
                    id="sit_city"
                    value={sitCity}
                    onChange={(e) => setSitCity(e.target.value)}
                    placeholder={ownerCity || "Ex : Bruxelles"}
                    className="mt-1 h-12 text-base"
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor="sit_country" className="text-xs text-muted-foreground">Pays</Label>
                  <Select value={sitCountry || "FR"} onValueChange={(v) => setSitCountry(v)}>
                    <SelectTrigger id="sit_country" className="mt-1 h-12 text-base">
                      <SelectValue placeholder="France" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </details>

          {/* Dates flexibles */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="flexible-dates"
              checked={flexibleDates}
              onCheckedChange={(v) => setFlexibleDates(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <label htmlFor="flexible-dates" className="text-sm font-medium cursor-pointer">
                Dates flexibles
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Les dates saisies restent obligatoires pour les rappels automatiques, mais vous indiquez aux gardiens que vous êtes flexible.
              </p>
            </div>
          </div>
          {flexibleDates && (
            <div>
              <Label htmlFor="flexible-notes" className="text-sm font-medium">Précisez vos dates approximatives</Label>
              <Input
                id="flexible-notes"
                placeholder="Ex : autour du 15 août, flexible d'une semaine"
                value={flexibleNotes}
                onChange={e => setFlexibleNotes(e.target.value)}
                className="mt-1.5 h-12 text-base"
              />
            </div>
          )}

          {/* Environnement */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-1 block">Environnement <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
            <p className="text-xs text-muted-foreground mb-3">Par défaut, on utilise l'environnement de votre profil. Vous pouvez le personnaliser pour cette annonce.</p>
            <EnvironmentPills selected={sitEnvironments} onChange={setSitEnvironments} />
          </div>

          {/* Idéale pour */}
          <div>
            <Label className="text-sm font-medium mb-1 block">Idéale pour <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
            <p className="text-xs text-muted-foreground mb-3">Une indication pour les gardiens, tout le monde peut postuler.</p>
            <ChipSelect options={openToOptions} selected={openTo} onChange={setOpenTo} />
          </div>

          {/* Urgent */}
          {showUrgent && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Checkbox
                checked={isUrgent}
                onCheckedChange={(v) => setIsUrgent(v === true)}
                className="mt-0.5"
              />
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 cursor-pointer text-amber-800" onClick={() => setIsUrgent(!isUrgent)}>
                  <Zap className="h-4 w-4" /> Urgent – garde dans moins de 48 h
                </label>
                <p className="text-xs text-amber-600 mt-0.5">
                  Les gardiens d'urgence seront alertés en priorité.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== STEP 2 : PRÉFÉRENCES ===================== */}
      {currentStep === 2 && (
        <div className="px-4 max-w-3xl mx-auto space-y-6">
          {/* Expérience souhaitée */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-1 block">Expérience souhaitée du gardien</Label>
            <p className="text-xs text-muted-foreground mb-3">Une préférence, les gardiens avec moins d'expérience peuvent aussi postuler.</p>
            <div className="flex flex-wrap gap-2">
              {MIN_SITS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMinGardienSits(opt.value)}
                  className={minGardienSits === opt.value
                    ? "bg-primary text-primary-foreground rounded-full px-3 py-2 text-sm font-medium"
                    : "border border-border rounded-full px-3 py-2 text-sm text-muted-foreground hover:border-primary transition-colors"
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max candidatures */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-1 block">Nombre max de candidatures</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Une fois le maximum atteint, l'annonce cesse d'accepter de nouvelles candidatures.
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0 text-lg"
                onClick={() => setMaxApplications(prev => Math.max(1, (prev ?? 10) - 1))}
                disabled={maxApplications !== null && maxApplications <= 1}
              >
                −
              </Button>
              <Input
                type="number"
                min={1}
                max={50}
                value={maxApplications ?? ""}
                onChange={e => {
                  const v = e.target.value;
                  setMaxApplications(v ? Math.max(1, Math.min(50, parseInt(v))) : null);
                }}
                className="w-24 text-center h-12 text-base"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0 text-lg"
                onClick={() => setMaxApplications(prev => Math.min(50, (prev ?? 10) + 1))}
                disabled={maxApplications !== null && maxApplications >= 50}
              >
                +
              </Button>
            </div>
          </div>

          {/* Profile summaries */}
          <details className="group">
            <summary className="cursor-pointer flex items-center justify-between p-3 rounded-xl border border-border bg-card mb-3 list-none select-none hover:bg-muted/30 transition-colors">
              <span className="font-heading text-sm font-semibold">Résumé depuis votre profil <span className="text-muted-foreground font-normal text-xs">(pré-rempli, modifiable depuis votre profil)</span></span>
              <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
            </summary>
            <div className="space-y-4">
              <SummaryCard icon={Home} title="Le logement" editLink="/profile">
                {property ? (
                  <div className="space-y-2">
                    <p className="text-sm">{typeLabels[property.type] || property.type} · {envLabels[property.environment || ""] || property.environment}</p>
                    {property.rooms_count ? <p className="text-sm text-muted-foreground">{property.rooms_count} pièces · {property.bedrooms_count} chambres</p> : null}
                    {property.equipments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {property.equipments.slice(0, 6).map(eq => (
                          <span key={eq} className="px-2 py-0.5 rounded-full bg-accent text-xs">{eq}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3">
                      <p className="text-sm font-medium text-foreground mb-1">Photos affichées sur l'annonce</p>
                      {ownerPhotos.length > 0 ? (
                        <>
                          <p className="text-xs text-muted-foreground mb-2">
                            Sélectionnez une photo de couverture pour cette annonce.
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {ownerPhotos.slice(0, 8).map((url, i) => {
                              const isCover = coverPhotoUrl === url || (!coverPhotoUrl && i === 0);
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setCoverPhotoUrl(url)}
                                  className={cn(
                                    "relative rounded-lg overflow-hidden h-16 w-full border-2 transition-all",
                                    isCover ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-primary/50"
                                  )}
                                  aria-label={`Définir la photo ${i + 1} comme couverture`}
                                >
                                  <img src={url} alt={`Photo ${i + 1}`} className="object-cover h-full w-full" />
                                  {isCover && (
                                    <span className="absolute bottom-0 inset-x-0 bg-primary text-primary-foreground text-[10px] font-medium py-0.5 text-center">
                                      Couverture
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="bg-muted rounded-xl p-3">
                          <p className="text-xs text-muted-foreground">Aucune photo – les annonces avec photos reçoivent davantage de candidatures.</p>
                        </div>
                      )}
                      <Link to="/owner-profile#galerie" className="text-xs text-primary hover:underline mt-2 inline-block">
                        Gérer mes photos dans mon profil →
                      </Link>
                    </div>
                  </div>
                ) : <p className="text-sm text-muted-foreground italic">Aucun logement renseigné</p>}
              </SummaryCard>

              <SummaryCard icon={PawPrint} title="Les animaux" editLink="/profile">
                {pets.length > 0 ? (
                  <div className="space-y-3">
                    {pets.map((pet, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {pet.photo_url && <img src={pet.photo_url} alt={pet.name} className="w-10 h-10 rounded-full object-cover" />}
                        <div>
                          <p className="text-sm font-medium">{speciesLabels[pet.species]?.split(" ")[0]} {pet.name}{pet.breed ? `, ${pet.breed}` : ""}</p>
                          <p className="text-xs text-muted-foreground">
                            {[
                              pet.walk_duration && pet.walk_duration !== "none" ? walkLabels[pet.walk_duration] + " de balade" : null,
                              pet.alone_duration ? aloneLabels[pet.alone_duration] : null,
                              hasMedication(pet.medication) ? "Médication" : null,
                            ].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground italic">Aucun animal renseigné</p>}
              </SummaryCard>

              <SummaryCard icon={ShieldCheck} title="Règles de la maison" editLink="/profile">
                {ownerProfile ? (
                  <div className="text-sm space-y-1">
                    {ownerProfile.presence_expected && <p>Présence : {ownerProfile.presence_expected}</p>}
                    {ownerProfile.visits_allowed && <p>Visites : {ownerProfile.visits_allowed}</p>}
                    {ownerProfile.overnight_guest && <p>Invités : {ownerProfile.overnight_guest}</p>}
                    {ownerProfile.rules_notes && <p className="text-muted-foreground">{ownerProfile.rules_notes}</p>}
                    {!ownerProfile.presence_expected && !ownerProfile.visits_allowed && (
                      <p className="text-muted-foreground italic">Aucune règle renseignée</p>
                    )}
                  </div>
                ) : <p className="text-sm text-muted-foreground italic">Aucune règle renseignée</p>}
              </SummaryCard>

              <SummaryCard icon={Users} title="Profil gardien souhaité" editLink="/profile">
                {ownerProfile ? (
                  <div className="text-sm space-y-1">
                    {ownerProfile.preferred_sitter_types.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {ownerProfile.preferred_sitter_types.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-accent text-xs">{t}</span>
                        ))}
                      </div>
                    )}
                    {ownerProfile.experience_required && <p>Expérience requise</p>}
                  </div>
                ) : <p className="text-sm text-muted-foreground italic">Non renseigné</p>}
              </SummaryCard>

              <SummaryCard icon={MessageSquare} title="Communication" editLink="/profile">
                {ownerProfile ? (
                  <div className="text-sm space-y-1">
                    {ownerProfile.meeting_preference.length > 0 && <p>Rencontre : {ownerProfile.meeting_preference.join(", ")}</p>}
                    {ownerProfile.handover_preference && <p>Passage de relais : {ownerProfile.handover_preference}</p>}
                    {ownerProfile.news_frequency && <p>Fréquence des nouvelles : {ownerProfile.news_frequency}</p>}
                    {ownerProfile.news_format.length > 0 && <p>Format : {ownerProfile.news_format.join(", ")}</p>}
                  </div>
                ) : <p className="text-sm text-muted-foreground italic">Non renseigné</p>}
              </SummaryCard>
            </div>
          </details>
        </div>
      )}

      {/* ===================== CTA STICKY BOTTOM ===================== */}
      <div className="fixed bottom-16 inset-x-0 bg-card border-t border-border z-40" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <div className="max-w-3xl mx-auto px-4 pt-3 space-y-2">
          {/* Blockers on last step only */}
          {currentStep === 2 && publishBlockers.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <p className="text-xs font-medium text-destructive mb-1">
                Il manque {publishBlockers.length} élément{publishBlockers.length > 1 ? "s" : ""} pour publier :
              </p>
              <ul className="space-y-0.5">
                {publishBlockers.map((b) => (
                  <li key={b.id} className="text-xs text-destructive flex items-start gap-1.5">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{b.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            {/* Back / Save draft */}
            {currentStep === 0 ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 px-4 shrink-0 text-base"
                onClick={async () => {
                  const id = await saveDraft();
                  if (id) {
                    void trackEvent("sit_draft_saved_manually", {
                      source: "create_sit_page",
                      metadata: { sit_id: id },
                    });
                    toast({ title: "Brouillon enregistré", description: "Vous pourrez le reprendre depuis votre dashboard." });
                    navigate("/dashboard");
                  }
                }}
                disabled={savingDraft || !property}
              >
                {savingDraft ? "Sauvegarde…" : <><span className="hidden sm:inline">Enregistrer & quitter</span><span className="sm:hidden">Brouillon</span></>}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-12 px-4 shrink-0 gap-1.5 text-base"
                onClick={() => setCurrentStep(s => s - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Précédent</span>
              </Button>
            )}

            {/* Preview (last step, desktop) */}
            {currentStep === 2 && (
              <Button
                type="button"
                variant="outline"
                className="h-12 px-4 shrink-0 gap-2 hidden sm:inline-flex text-base"
                onClick={() => setPreviewOpen(true)}
                disabled={!canPublish}
              >
                <Eye className="h-4 w-4" />
                Aperçu
              </Button>
            )}

            {/* Next / Publish */}
            {currentStep < 2 ? (
              <Button
                type="button"
                className="flex-1 h-12 text-base font-semibold gap-1.5"
                onClick={() => setCurrentStep(s => s + 1)}
                disabled={currentStep === 0 && sitLocation !== "home"}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>

            ) : (
              <Button
                onClick={() => {
                  if (canPublish) {
                    setPreviewOpen(true);
                  } else {
                    onPublishClick();
                  }
                }}
                disabled={publishing}
                aria-disabled={!canPublish}
                className={cn(
                  "flex-1 h-12 text-base font-semibold",
                  canPublish
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground hover:bg-muted"
                )}
              >
                {publishing ? "Publication en cours…" : canPublish ? "Aperçu & publier" : "Voir ce qui manque"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <AnnouncementPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onConfirmPublish={async () => { await handlePublish(); }}
        publishing={publishing}
        canPublish={!!canPublish}
        title={title}
        startDate={startDate}
        endDate={endDate}
        flexibleDates={flexibleDates}
        city={(sitCity || ownerCity || "").trim()}
        country={sitCountry}
        specificExpectations={
          flexibleDates && flexibleNotes
            ? `${specificExpectations}\n\nDates flexibles : ${flexibleNotes}`.trim()
            : specificExpectations
        }
        ownerMessage={ownerMessage}
        dailyRoutine={dailyRoutine}
        coverPhotoUrl={coverPhotoUrl}
        ownerPhotos={ownerPhotos}
        pets={pets.map(p => ({ name: p.name, species: p.species, photo_url: p.photo_url }))}
        propertyType={property?.type ?? null}
        environments={sitEnvironments.map(e => envLabels[e] || e)}
        isUrgent={isUrgent}
      />
    </div>
  );
};

const SummaryCard = ({ icon: Icon, title, editLink, children }: {
  icon: React.ElementType; title: string; editLink: string; children: React.ReactNode;
}) => (
  <div className="bg-card rounded-lg border border-border p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-heading text-sm font-semibold">{title}</h3>
      </div>
      <Link to={editLink} className="text-xs text-primary hover:underline">Modifier dans mon profil</Link>
    </div>
    {children}
  </div>
);

export default CreateSit;
