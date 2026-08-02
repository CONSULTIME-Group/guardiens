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
import { Calendar, Home, PawPrint, ShieldCheck, MessageSquare, Users, ArrowLeft, AlertCircle, Zap, Eye, ChevronRight, ChevronLeft, Check, Image as ImageIcon, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { hasMedication } from "@/lib/medication";
import { trackFirstAction, trackEvent } from "@/lib/analytics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { COUNTRIES } from "@/lib/countries";
import ImproveListingButton from "@/components/ai/ImproveListingButton";
import { moderateContent } from "@/lib/moderation";
import AnnouncementPreviewDialog from "@/components/sits/owner/AnnouncementPreviewDialog";
import { AlmaBubble } from "@/components/ai/alma/AlmaBubble";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
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
import PetsEditor from "@/components/pets/PetsEditor";
import { pickSmartCover } from "@/lib/pickSmartCover";
import { sortForCover, withoutAnimalPhotos } from "@/lib/coverPriority";
import { normalizeCityTyping, normalizeCityName } from "@/lib/normalizeCity";
import { readFormDraft, writeFormDraft, clearFormDraft, getFormDraftSavedAt } from "@/lib/formDraft";
import { makePlainTextPasteHandler } from "@/lib/pastePlainText";
import { DEFAULT_MAX_APPLICATIONS } from "@/lib/applicationCap";
import {
  getSitPublishBlockers,
  buildSitPublishInput,
  joinExpectations,
  MIN_SUB_DESCRIPTION,
  type PublishBlocker,
} from "@/lib/sitPublishRules";

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
  const republishMode = (searchParams.get("mode") as "copy" | "adapt" | null) || null;
  const republishPrompt = searchParams.get("prompt") || "";
  const draftIdParam = searchParams.get("draftId") || searchParams.get("resume");

  const [currentStep, setCurrentStep] = useState(0);
  const [sitLocation, setSitLocation] = useState<"home" | "away" | null>(null);
  const stepStartedAtRef = useRef<number>(Date.now());
  const publishedRef = useRef(false);
  const lastStepRef = useRef<number>(0);

  // Analytics : step_started + step_completed sur transition de step
  useEffect(() => {
    stepStartedAtRef.current = Date.now();
    void trackEvent("sits_create_step_started", { metadata: { step: currentStep } });
    const prev = lastStepRef.current;
    lastStepRef.current = currentStep;
    return () => {
      // Envoie step_completed pour l'étape qui vient d'être quittée
      const duration = Date.now() - stepStartedAtRef.current;
      void trackEvent("sits_create_step_completed", { metadata: { step: prev, duration_ms: duration } });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Analytics : abandon si unmount sans publication
  useEffect(() => {
    return () => {
      if (!publishedRef.current) {
        void trackEvent("sits_create_abandoned", {
          metadata: { step: lastStepRef.current, has_draft: !!draftIdParam },
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [flexibleNotes, setFlexibleNotes] = useState("");
  // La description de la garde est saisie en deux micro-questions courtes,
  // puis concaténée dans `specificExpectations` (colonne specific_expectations).
  const [specificExpectations, setSpecificExpectations] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [sitterExpectations, setSitterExpectations] = useState("");
  // Séparateur et recomposition : source unique, voir src/lib/sitPublishRules.ts.

  // Un texte existant reste intégralement dans la première question. Son sens
  // ne peut pas être déduit de sa mise en forme, même avec un double saut de ligne.
  const applyExpectations = useCallback((raw: string | null | undefined) => {
    const text = raw || "";
    setAbsenceReason(text);
    setSitterExpectations("");
    setSpecificExpectations(text);
    if (text.trim()) {
      toast({
        title: "Description à compléter",
        description:
          "Votre texte a été placé dans la première question. Répartissez-le si nécessaire, puis complétez vos attentes envers le gardien.",
      });
    }
  }, [toast]);

  const updateAbsenceReason = (v: string) => {
    setAbsenceReason(v);
    setSpecificExpectations(joinExpectations(v, sitterExpectations));
  };
  const updateSitterExpectations = (v: string) => {
    setSitterExpectations(v);
    setSpecificExpectations(joinExpectations(absenceReason, v));
  };
  const [openTo, setOpenTo] = useState<string[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [sitEnvironments, setSitEnvironments] = useState<string[]>([]);
  const [minGardienSits, setMinGardienSits] = useState(0);
  const [maxApplications, setMaxApplications] = useState<number | null>(DEFAULT_MAX_APPLICATIONS);
  const [ownerMessage, setOwnerMessage] = useState("");
  const [dailyRoutine, setDailyRoutine] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [smartCover, setSmartCover] = useState<string | null>(null);
  const smartCoverAttemptedRef = useRef<string>("");

  const [sitCity, setSitCity] = useState<string>("");
  const [sitCountry, setSitCountry] = useState<string>("FR");
  const [acceptsSitterPets, setAcceptsSitterPets] = useState<"yes" | "no" | "discuss">("discuss");
  const [acceptsSitterChildren, setAcceptsSitterChildren] = useState<"yes" | "no" | "discuss">("discuss");

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
  // Galerie sans photo d'animal, seule éligible au scoring IA de couverture.
  const [ownerPlacePhotos, setOwnerPlacePhotos] = useState<string[]>([]);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [ownerCity, setOwnerCity] = useState<string>("");
  const [ownerBio, setOwnerBio] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [isRepublish, setIsRepublish] = useState(false);
  const [sourceSitTitle, setSourceSitTitle] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // Fiabilité de la sauvegarde distante : un échec silencieux ne doit plus
  // laisser croire que tout est enregistré.
  const [remoteSaveFailed, setRemoteSaveFailed] = useState(false);
  const [unsavedRemote, setUnsavedRemote] = useState(false);
  const saveFailCountRef = useRef(0);
  const saveFailToastShownRef = useRef(false);
  const [adaptingWithAlma, setAdaptingWithAlma] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [incompleteNudgeOpen, setIncompleteNudgeOpen] = useState(false);
  const incompleteNudgeSeenRef = useRef(false);
  const hasUserEditedRef = useRef(false);
  const initialLoadedRef = useRef(false);

  // Chantier 3 — Concierge IA sur /sits/create : bulle Alma proposant de
  // décrire l'absence en une phrase plutôt que de remplir manuellement.
  // Ne s'affiche que sur formulaire vierge et hors reprise de brouillon.
  const [almaBubbleDismissed, setAlmaBubbleDismissed] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined"
        && localStorage.getItem("sits_create_alma_dismissed") === "1";
    } catch {
      return false;
    }
  });
  const almaBubbleSeenRef = useRef(false);
  const isFormEmpty =
    !title && !startDate && !endDate && !ownerMessage && !dailyRoutine
    && !coverPhotoUrl && !specificExpectations && openTo.length === 0
    && sitEnvironments.length === 0 && !isUrgent && !flexibleDates
    && !flexibleNotes;
  const showAlmaCreateBubble =
    !almaBubbleDismissed
    && !draftIdParam
    && !fromSitId
    && !republishMode
    && !hasUserEditedRef.current
    && isFormEmpty
    && currentStep === 0;

  useEffect(() => {
    if (!showAlmaCreateBubble || almaBubbleSeenRef.current) return;
    almaBubbleSeenRef.current = true;
    try {
      void trackEvent("sits_create_alma_bubble_seen", { source: "/sits/create" });
    } catch { /* silent */ }
  }, [showAlmaCreateBubble]);

  const handleAlmaCreateIntent = useCallback(() => {
    try {
      void trackEvent("sits_create_alma_intent_clicked", { source: "/sits/create" });
    } catch { /* silent */ }
    navigate("/dashboard?intent=draft_from_prompt");
  }, [navigate]);

  const handleAlmaCreateDismiss = useCallback(() => {
    try {
      localStorage.setItem("sits_create_alma_dismissed", "1");
      void trackEvent("sits_create_alma_dismissed", { source: "/sits/create" });
    } catch { /* silent */ }
    setAlmaBubbleDismissed(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Filet de sécurité local du brouillon d'annonce.
  //
  // Le brouillon distant part avec un délai de 1500 ms. Une fermeture d'onglet,
  // un plantage du navigateur ou une coupure réseau pendant cette fenêtre faisait
  // perdre la saisie. On duplique donc l'état du formulaire dans le stockage
  // local toutes les 300 ms, et on le restaure au chargement s'il est plus récent
  // que le brouillon distant.
  // ---------------------------------------------------------------------------
  type SitLocalDraft = {
    title: string;
    startDate: string;
    endDate: string;
    flexibleDates: boolean;
    flexibleNotes: string;
    absenceReason: string;
    sitterExpectations: string;
    openTo: string[];
    isUrgent: boolean;
    sitEnvironments: string[];
    minGardienSits: number;
    maxApplications: number | null;
    ownerMessage: string;
    dailyRoutine: string;
    coverPhotoUrl: string | null;
    sitCity: string;
    sitCountry: string;
    acceptsSitterPets: "yes" | "no" | "discuss";
    acceptsSitterChildren: "yes" | "no" | "discuss";
    sitLocation?: "home" | "away" | null;
    currentStep?: number;
    /** Identifiant du brouillon auquel appartient cette copie locale. */
    draftId?: string | null;
  };
  const localDraftKey = user ? `sit-create:${user.id}:${draftIdParam ?? fromSitId ?? "current"}` : null;
  // Clé historique posée lors d'une première visite sans paramètre d'URL. Au
  // retour via le dashboard, l'identifiant du brouillon change la clé, la copie
  // locale doit donc être récupérée puis migrée, mais uniquement si elle
  // n'appartient à aucun autre brouillon.
  const legacyLocalDraftKey = user ? `sit-create:${user.id}:current` : null;
  const applyLocalDraft = useCallback((d: SitLocalDraft) => {
    setTitle(d.title ?? "");
    setStartDate(d.startDate ?? "");
    setEndDate(d.endDate ?? "");
    setFlexibleDates(!!d.flexibleDates);
    setFlexibleNotes(d.flexibleNotes ?? "");
    setAbsenceReason(d.absenceReason ?? "");
    setSitterExpectations(d.sitterExpectations ?? "");
    setSpecificExpectations(joinExpectations(d.absenceReason ?? "", d.sitterExpectations ?? ""));
    setOpenTo(Array.isArray(d.openTo) ? d.openTo : []);
    setIsUrgent(!!d.isUrgent);
    setSitEnvironments(Array.isArray(d.sitEnvironments) ? d.sitEnvironments : []);
    setMinGardienSits(d.minGardienSits ?? 0);
    setMaxApplications(d.maxApplications ?? DEFAULT_MAX_APPLICATIONS);
    setOwnerMessage(d.ownerMessage ?? "");
    setDailyRoutine(d.dailyRoutine ?? "");
    if (d.coverPhotoUrl) setCoverPhotoUrl(d.coverPhotoUrl);
    setSitCity(d.sitCity ?? "");
    setSitCountry(d.sitCountry ?? "FR");
    setAcceptsSitterPets(d.acceptsSitterPets ?? "discuss");
    setAcceptsSitterChildren(d.acceptsSitterChildren ?? "discuss");
    if (d.sitLocation) setSitLocation(d.sitLocation);
    if (typeof d.currentStep === "number" && d.currentStep > 0) {
      setCurrentStep(prev => Math.max(prev, Math.min(d.currentStep as number, STEPS.length - 1)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [localDraftRestored, setLocalDraftRestored] = useState(false);
  const [remoteDraftResumed, setRemoteDraftResumed] = useState(false);
  // Restaure la copie locale si elle est postérieure au brouillon distant.
  const restoreLocalDraftIfFresher = useCallback((remoteUpdatedAt: string | null, remoteDraftId?: string | null) => {
    if (!localDraftKey) return;
    // Identité du brouillon réellement ouvert, paramètre d'URL ou brouillon
    // distant chargé à défaut de paramètre.
    const currentIdentity = draftIdParam ?? fromSitId ?? remoteDraftId ?? null;
    // Contamination croisée : une copie locale n'est adoptée que si elle porte
    // le même identifiant, ou aucun identifiant alors qu'aucun brouillon
    // distant n'a été chargé. La règle vaut pour toutes les provenances.
    const isAdoptable = (d: SitLocalDraft | null): d is SitLocalDraft => {
      if (!d) return false;
      if (d.draftId) return d.draftId === currentIdentity;
      return !remoteDraftId;
    };
    let stored = readFormDraft<SitLocalDraft>(localDraftKey);
    let savedAt = getFormDraftSavedAt(localDraftKey) ?? 0;
    if (!isAdoptable(stored)) stored = null;
    if (!stored && legacyLocalDraftKey && legacyLocalDraftKey !== localDraftKey) {
      const legacy = readFormDraft<SitLocalDraft>(legacyLocalDraftKey);
      if (isAdoptable(legacy)) {
        stored = legacy;
        savedAt = getFormDraftSavedAt(legacyLocalDraftKey) ?? 0;
        writeFormDraft<SitLocalDraft>(localDraftKey, legacy);
        clearFormDraft(legacyLocalDraftKey);
      }
    }
    if (!stored) return;
    const remote = remoteUpdatedAt ? new Date(remoteUpdatedAt).getTime() : 0;
    if (remote && savedAt <= remote) {
      // Le distant est plus frais, mais l'étape atteinte n'y est pas stockée.
      if (typeof stored.currentStep === "number" && stored.currentStep > 0) {
        setCurrentStep(prev => Math.max(prev, Math.min(stored!.currentStep as number, STEPS.length - 1)));
      }
      return;
    }
    applyLocalDraft(stored);
    setLocalDraftRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDraftKey, legacyLocalDraftKey, applyLocalDraft, draftIdParam, fromSitId]);



  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [propRes, ownerRes, profileRes, galleryRes] = await Promise.all([
        supabase.from("properties").select("*").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("owner_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("profile_completion, city, bio").eq("id", user.id).single(),
        supabase.from("owner_gallery").select("photo_url, category").eq("user_id", user.id).order("position", { ascending: true }).limit(30),
      ]);

      let sourceSitRes: { data: any } | null = null;
      if (fromSitId) {
        sourceSitRes = await supabase.from("sits").select("title, specific_expectations, open_to, environments, min_gardien_sits, flexible_dates, max_applications, owner_message, daily_routine, city, country, accepts_sitter_pets, accepts_sitter_children").eq("id", fromSitId).single();
      }

      setProfileCompletion(profileRes.data?.profile_completion || 0);
      setOwnerCity(profileRes.data?.city || "");
      setOwnerBio((profileRes.data as any)?.bio || "");
      // Couverture = le lieu, jamais un animal : la galerie est réordonnée
      // selon la priorité produit (logement, jardin, puis quartier, etc.).
      setOwnerPhotos(sortForCover((galleryRes.data || []) as any[]).map((g: any) => g.photo_url));
      setOwnerPlacePhotos(sortForCover(withoutAnimalPhotos((galleryRes.data || []) as any[])).map((g: any) => g.photo_url));

      if (sourceSitRes?.data) {
        const s = sourceSitRes.data;
        setTitle(s.title || "");
        setSourceSitTitle(s.title || null);
        applyExpectations(s.specific_expectations || "");
        setOpenTo(s.open_to || []);
        setSitEnvironments(s.environments || []);
        setMinGardienSits(s.min_gardien_sits || 0);
        setFlexibleDates(s.flexible_dates || false);
        setMaxApplications(s.max_applications || null);
        setOwnerMessage(s.owner_message || "");
        setDailyRoutine(s.daily_routine || "");
        setSitCity((s as any).city || "");
        setSitCountry((s as any).country || "FR");
        setAcceptsSitterPets(((s as any).accepts_sitter_pets as any) || "discuss");
        setAcceptsSitterChildren(((s as any).accepts_sitter_children as any) || "discuss");
        setIsRepublish(true);
        // Le lieu de garde n'est pas persisté en base et seule la garde à
        // domicile est supportée : sans cela, l'étape 1 d'une republication
        // reste vide alors que le contenu a bien été copié.
        setSitLocation("home");
        try {
          trackEvent("alma_republish_bubble_seen", {
            source: "create_sit_page",
            metadata: { source_sit_id: fromSitId, mode: republishMode || "copy" },
          });
        } catch {}

        // Mode "adapt" : appelle l'edge function pour réécrire les champs texte
        // à partir du prompt utilisateur. Le formulaire reste éditable pendant l'appel.
        if (republishMode === "adapt" && republishPrompt.trim().length >= 10 && fromSitId) {
          setAdaptingWithAlma(true);
          try {
            const { data: adapted, error: adaptErr } = await supabase.functions.invoke(
              "adapt-sit-with-alma",
              { body: { sourceSitId: fromSitId, prompt: republishPrompt.trim() } },
            );
            if (adaptErr || !adapted || (adapted as any).error) {
              const msg = (adapted as any)?.error || adaptErr?.message || "Adaptation impossible pour le moment.";
              toast({
                variant: "destructive",
                title: "Adaptation Alma indisponible",
                description: msg + " Vous pouvez éditer manuellement.",
              });
            } else {
              const a = adapted as any;
              if (typeof a.title === "string" && a.title.length > 0) setTitle(a.title);
              if (typeof a.specific_expectations === "string") applyExpectations(a.specific_expectations);
              if (typeof a.daily_routine === "string") setDailyRoutine(a.daily_routine);
              if (typeof a.owner_message === "string") setOwnerMessage(a.owner_message);
              if (Array.isArray(a.open_to)) setOpenTo(a.open_to);
              if (Array.isArray(a.environments)) setSitEnvironments(a.environments);
              try {
                trackEvent("alma_republish_adapted", {
                  source: "create_sit_page",
                  metadata: { source_sit_id: fromSitId },
                });
              } catch {}
              toast({
                title: "Brouillon adapté",
                description: "Alma a réécrit les champs à partir de vos ajustements. Relisez avant de publier.",
              });
            }
          } catch (e) {
            toast({
              variant: "destructive",
              title: "Adaptation Alma indisponible",
              description: e instanceof Error ? e.message : "Réessayez dans un instant.",
            });
          } finally {
            setAdaptingWithAlma(false);
          }
        }
      }

      let remoteDraftUpdatedAt: string | null = null;
      let remoteDraftId: string | null = null;
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
          remoteDraftUpdatedAt = (d as any).updated_at || (d as any).created_at || null;
          remoteDraftId = d.id;
          const today = new Date().toISOString().slice(0, 10);
          const rawStart: string | null = d.start_date || null;
          const rawEnd: string | null = d.end_date || null;
          const cleanStart = rawStart && rawStart >= today ? rawStart : "";
          const cleanEnd = rawEnd && rawEnd >= today && (!cleanStart || rawEnd >= cleanStart) ? rawEnd : "";
          const datesWerePast = (!!rawStart && !cleanStart) || (!!rawEnd && !cleanEnd);
          setDraftId(d.id);
          setTitle(d.title || "");
          setStartDate(cleanStart);
          setEndDate(cleanEnd);
          setFlexibleDates(d.flexible_dates || !!(d as any).flexibility_notes);
          setFlexibleNotes((d as any).flexibility_notes || "");
          applyExpectations(d.specific_expectations || "");
          setOpenTo(d.open_to || []);
          setIsUrgent(d.is_urgent || false);
          setSitEnvironments(d.environments || []);
          setMinGardienSits(d.min_gardien_sits || 0);
          setMaxApplications(d.max_applications ?? DEFAULT_MAX_APPLICATIONS);
          setOwnerMessage(d.owner_message || "");
          setDailyRoutine(d.daily_routine || "");
          setCoverPhotoUrl(d.cover_photo_url || null);
          setSitCity((d as any).city || "");
          setSitCountry((d as any).country || "FR");
          setAcceptsSitterPets(((d as any).accepts_sitter_pets as any) || "discuss");
          setAcceptsSitterChildren(((d as any).accepts_sitter_children as any) || "discuss");
          // Le lieu de garde n'est pas persisté en base et seul le domicile est
          // réellement supporté par le formulaire : tout brouillon existant est
          // donc un brouillon à domicile. Sans cela, l'étape 1 paraît vide.
          const rawExpectations = d.specific_expectations || "";
          const hasContent = !!(d.title || rawExpectations || cleanStart || d.daily_routine || d.owner_message);
          if (hasContent) setSitLocation("home");
          // L'étape atteinte n'est pas stockée en base, on la recalcule à partir
          // du contenu pour ne pas refaire franchir l'étape 1.
          // Une description historique ne peut pas être répartie de façon fiable.
          // Le second champ reste donc à compléter avant de poursuivre.
          const step0Complete = false;
          if (step0Complete) setCurrentStep(prev => Math.max(prev, 1));
          if (hasContent) setRemoteDraftResumed(true);
          if (datesWerePast) {
            toast({
              title: "Dates à redéfinir",
              description: "La date du brouillon était dépassée, à redéfinir.",
            });
          }
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
      restoreLocalDraftIfFresher(remoteDraftUpdatedAt, remoteDraftId);
      setLoading(false);
      setTimeout(() => { initialLoadedRef.current = true; }, 300);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, fromSitId, draftIdParam]);

  // Auto-save draft (debounced)
  useEffect(() => {
    if (!user || !property || !initialLoadedRef.current) return;
    hasUserEditedRef.current = true;
    setUnsavedRemote(true);
    const t = setTimeout(async () => {
      await saveDraft({ silent: true });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, startDate, endDate, flexibleDates, flexibleNotes, specificExpectations, openTo, isUrgent, sitEnvironments, minGardienSits, maxApplications, ownerMessage, dailyRoutine, coverPhotoUrl, sitCity, sitCountry, acceptsSitterPets, acceptsSitterChildren]);

  // Copie locale immédiate (300 ms), indépendante du réseau et du brouillon distant.
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<number | null>(null);
  useEffect(() => {
    if (!localDraftKey || loading) return;
    const t = setTimeout(() => {
      writeFormDraft<SitLocalDraft>(localDraftKey, {
        title, startDate, endDate, flexibleDates, flexibleNotes,
        absenceReason, sitterExpectations, openTo, isUrgent, sitEnvironments,
        minGardienSits, maxApplications, ownerMessage, dailyRoutine,
        coverPhotoUrl, sitCity, sitCountry, acceptsSitterPets, acceptsSitterChildren,
        sitLocation, currentStep,
        draftId: draftIdParam ?? fromSitId ?? draftId ?? null,
      });
      setLocalDraftSavedAt(Date.now());
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDraftKey, loading, title, startDate, endDate, flexibleDates, flexibleNotes, absenceReason, sitterExpectations, openTo, isUrgent, sitEnvironments, minGardienSits, maxApplications, ownerMessage, dailyRoutine, coverPhotoUrl, sitCity, sitCountry, acceptsSitterPets, acceptsSitterChildren, sitLocation, currentStep, draftId, draftIdParam, fromSitId]);


  // Smart cover picker : scoring IA de la galerie, silencieux si quota/rate-limit.
  // Se déclenche à l'arrivée sur l'étape Préférences si le propriétaire n'a rien
  // choisi explicitement et si la galerie n'a pas déjà été scorée.
  useEffect(() => {
    if (currentStep !== 2) return;
    if (coverPhotoUrl) return;
    if (ownerPlacePhotos.length < 2) return;
    const sig = ownerPlacePhotos.slice().sort().join("|");
    if (smartCoverAttemptedRef.current === sig) return;
    smartCoverAttemptedRef.current = sig;
    const fallback = ownerPlacePhotos[0] ?? null;
    pickSmartCover(ownerPlacePhotos, fallback).then((best) => {
      if (best) setSmartCover(best);
    });
  }, [currentStep, ownerPlacePhotos, coverPhotoUrl]);

  // Garde-fou de sortie : tant qu'une modification n'est pas enregistrée à
  // distance, on prévient avant la fermeture de l'onglet.
  useUnsavedChanges(unsavedRemote);

  const handleSaveAndExit = async () => {
    const id = await saveDraft();
    if (id) {
      void trackEvent("sit_draft_saved_manually", {
        source: "create_sit_page",
        metadata: { sit_id: id },
      });
      toast({ title: "Brouillon enregistré", description: "Vous pourrez le reprendre depuis votre dashboard." });
      navigate("/dashboard");
    }
  };



  const saveDraft = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!user || !property) return null;
    // Anti-brouillon fantôme : ne pas créer de brouillon vide en base.
    // Si aucun draft existant ET aucun champ utilisateur rempli, on n'écrit rien.
    const today = new Date().toISOString().slice(0, 10);
    const safeStart = startDate && startDate >= today ? startDate : null;
    const safeEnd = endDate && endDate >= today && (!safeStart || endDate >= safeStart) ? endDate : null;
    const hasAnyContent = !!(
      title.trim() || safeStart || safeEnd || flexibleDates || flexibleNotes.trim()
      || specificExpectations.trim() || openTo.length > 0 || isUrgent
      || sitEnvironments.length > 0 || minGardienSits > 0
      || ownerMessage.trim() || dailyRoutine.trim() || coverPhotoUrl
      || sitCity.trim()
    );
    if (!draftId && !hasAnyContent) return null;
    setSavingDraft(true);
    try {
      const expectations = specificExpectations;
      const payload: any = {
        user_id: user.id,
        property_id: property.id,
        title: title || "",
        start_date: safeStart,
        end_date: safeEnd,
        flexible_dates: flexibleDates,
        specific_expectations: expectations,
        flexibility_notes: flexibleDates && flexibleNotes.trim() ? flexibleNotes.trim() : null,
        open_to: openTo,
        is_urgent: isUrgent,
        environments: sitEnvironments,
        min_gardien_sits: minGardienSits,
        max_applications: maxApplications,
        owner_message: ownerMessage.trim() || null,
        daily_routine: dailyRoutine.trim() || null,
        cover_photo_url: coverPhotoUrl ?? smartCover ?? (ownerPhotos[0] || null) ?? null,

        city: sitCity.trim() || null,
        country: sitCountry.trim() || "FR",
        accepts_sitter_pets: acceptsSitterPets,
        accepts_sitter_children: acceptsSitterChildren,
      };
      const markSaved = () => {
        saveFailCountRef.current = 0;
        saveFailToastShownRef.current = false;
        setRemoteSaveFailed(false);
        setUnsavedRemote(false);
        setLastSavedAt(new Date());
      };
      if (draftId) {
        const { error } = await supabase.from("sits").update(payload).eq("id", draftId).eq("status", "draft");
        if (error) throw error;
        markSaved();
        return draftId;
      } else {
        const { data, error } = await supabase.from("sits").insert({ ...payload, status: "draft" as any }).select("id").single();
        if (error) throw error;
        setDraftId(data.id);
        markSaved();
        return data.id;
      }
    } catch (e) {
      // Même en mode silencieux, l'échec doit être visible : le badge passe en
      // état d'alerte et l'événement analytique part systématiquement.
      console.error("[CreateSit] saveDraft failed", e);
      saveFailCountRef.current += 1;
      setRemoteSaveFailed(true);
      setUnsavedRemote(true);
      try {
        void trackEvent("sit_draft_autosave_failed", {
          source: "create_sit_page",
          metadata: {
            sit_id: draftId,
            step: currentStep + 1,
            attempts: saveFailCountRef.current,
            error_message: e instanceof Error ? e.message : String((e as any)?.message ?? e),
          },
        });
      } catch { /* l'analytique ne doit jamais bloquer la saisie */ }
      if (!silent) {
        toast({ variant: "destructive", title: "Sauvegarde du brouillon impossible" });
      } else if (saveFailCountRef.current >= 3 && !saveFailToastShownRef.current) {
        saveFailToastShownRef.current = true;
        toast({
          variant: "destructive",
          title: "Enregistrement impossible",
          description: "Votre saisie n'est conservée que sur cet appareil. Ne fermez pas cet onglet avant que la sauvegarde reparte.",
        });
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

  const reasonValid = absenceReason.trim().length >= MIN_SUB_DESCRIPTION;
  const expectationsValid = sitterExpectations.trim().length >= MIN_SUB_DESCRIPTION;
  const descriptionValid = reasonValid && expectationsValid;
  const NUDGE_PROFILE_THRESHOLD = 80;

  // Règles de publication : source unique, voir src/lib/sitPublishRules.ts.
  const publishBlockers: PublishBlocker[] = getSitPublishBlockers(
    buildSitPublishInput({
      sit: {
        title,
        start_date: startDate,
        end_date: endDate,
        flexible_dates: flexibleDates,
        cover_photo_url: coverPhotoUrl,
      },
      property: property as any,
      dateError,
      twoFields: { absenceReason, sitterExpectations },
      overrides: {
        galleryPhotoCount: ownerPhotos.length,
        petCount: pets.length,
      },
    }),
  );

  const canPublish = publishBlockers.length === 0;
  const hasPhoto = !publishBlockers.some((b) => b.id === "photo");




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
    // Dates au format FR long, ex : "du 14 août au 18 août 2026"
    const monthsFR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const sameYear = start.getFullYear() === end.getFullYear();
    const startLabel = `${start.getDate()} ${monthsFR[start.getMonth()]}${sameYear ? "" : ` ${start.getFullYear()}`}`;
    const endLabel = `${end.getDate()} ${monthsFR[end.getMonth()]} ${end.getFullYear()}`;
    return `Garde${cityPart ? " de maison" : ""} ${animals !== "animaux" ? `pour ${animals}` : ""}${cityPart}, du ${startLabel} au ${endLabel}`.replace(/\s+/g, " ").trim();
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

      const expectations = specificExpectations;

      // Filet de sécurité : si l'utilisateur n'a rien choisi et qu'aucun smart
      // cover n'a été calculé (étape survolée), on tente une dernière analyse IA.
      // Soft-fail garanti par pickSmartCover : ne bloque jamais la publication.
      let resolvedCover = coverPhotoUrl ?? smartCover;
      if (!resolvedCover && ownerPlacePhotos.length > 1) {
        resolvedCover = await pickSmartCover(ownerPlacePhotos, ownerPlacePhotos[0] ?? null);
      }
      const finalCover = resolvedCover
        ?? (ownerPhotos[0] || null)
        ?? null;

      const payload: any = {
        user_id: user.id,
        property_id: property.id,
        title,
        start_date: startDate,
        end_date: endDate,
        flexible_dates: flexibleDates,
        specific_expectations: expectations,
        flexibility_notes: flexibleDates && flexibleNotes.trim() ? flexibleNotes.trim() : null,
        open_to: openTo,
        is_urgent: isUrgent,
        status: "published",
        environments: sitEnvironments,
        min_gardien_sits: minGardienSits,
        max_applications: maxApplications,
        owner_message: ownerMessage.trim() || null,
        daily_routine: dailyRoutine.trim() || null,
        cover_photo_url: finalCover,

        city: sitCity.trim() || null,
        country: sitCountry.trim() || "FR",
        accepts_sitter_pets: acceptsSitterPets,
        accepts_sitter_children: acceptsSitterChildren,
      };

      let sitId = draftId;
      if (draftId) {
        const { error } = await supabase.from("sits").update(payload).eq("id", draftId).eq("status", "draft");
        if (error) throw error;
      } else {
        const { data: sit, error } = await supabase.from("sits").insert(payload).select("id").single();
        if (error) throw error;
        sitId = sit.id;
      }

      try { await trackFirstAction("sit_created", { sit_id: sitId, is_urgent: isUrgent }); } catch {}
      if (searchParams.get("source") === "ai_prompt") {
        try {
          await trackEvent("owner_draft_from_prompt_published", {
            metadata: { sit_id: sitId, draft_id: draftId ?? null },
          });
        } catch {}
      }
      if (isRepublish && fromSitId && sitId) {
        try {
          await trackEvent("alma_republish_published", {
            source: "create_sit_page",
            metadata: { original_sit_id: fromSitId, new_sit_id: sitId, mode: republishMode || "copy" },
          });
        } catch {}
      }
      publishedRef.current = true;
      if (localDraftKey) clearFormDraft(localDraftKey);
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

  // Validation "au clic" pour le bouton Suivant : on marque tous les champs
  // requis de l'étape en cours comme touched pour afficher les erreurs,
  // on scrolle vers le premier champ en erreur et on bloque l'avancement.
  // Le bouton reste visuellement actif (feedback au clic, pas de disabled).
  const validateCurrentStep = (): boolean => {
    if (currentStep === 0) {
      // Le lieu de garde conditionne tout le reste de l'étape : au lieu d'un
      // bouton inerte, on renvoie au sélecteur avec un message explicite.
      if (sitLocation !== "home") {
        if (typeof document !== "undefined") {
          document.getElementById("sit-location-field")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        toast({
          variant: "destructive",
          title: "Commencez par nous dire où se déroulera la garde.",
          description: "Choisissez le lieu de la garde pour continuer.",
        });
        return false;
      }
      const errors: Array<{ field: string; anchor: string }> = [];
      if (!title.trim()) errors.push({ field: "title", anchor: "title-field" });
      if (!startDate) errors.push({ field: "startDate", anchor: "dates-field" });
      if (!endDate) errors.push({ field: "endDate", anchor: "dates-field" });
      if (dateError) errors.push({ field: "endDate", anchor: "dates-field" });
      if (!reasonValid) errors.push({ field: "descriptionReason", anchor: "description-field" });
      if (!expectationsValid) errors.push({ field: "descriptionExpectations", anchor: "description-field" });
      if (errors.length > 0) {
        setTouched(prev => {
          const next = { ...prev };
          errors.forEach(e => { next[e.field] = true; });
          return next;
        });
        const first = errors[0];
        if (typeof document !== "undefined") {
          document.getElementById(first.anchor)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return false;
      }
    }
    // Les étapes 1 et 2 n'ont pas de champs obligatoires côté UI (tous optionnels)
    // dans la version actuelle. Rien à valider ici.
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep(s => s + 1);
  };

  // Prérequis vérifiés à l'entrée du flow, pas en cours de route : inutile de
  // faire remplir l'étape 0 à quelqu'un qui ne pourra pas publier au bout.
  const preflightMissing: Array<{ id: string; label: string; anchor: string }> = [
    !property ? { id: "property", label: "Votre logement", anchor: "housing" } : null,
    pets.length === 0 ? { id: "pets", label: "Au moins un animal à faire garder", anchor: "animals" } : null,
    !hasPhoto ? { id: "photo", label: "Au moins une photo de votre logement", anchor: "gallery" } : null,
  ].filter(Boolean) as Array<{ id: string; label: string; anchor: string }>;
  const preflightBlocked = !loading && preflightMissing.length > 0;
  const preflightSignature = preflightMissing.map(m => m.id).join(",");
  const preflightTrackedRef = useRef<string>("");

  useEffect(() => {
    if (!preflightBlocked) return;
    if (preflightTrackedRef.current === preflightSignature) return;
    preflightTrackedRef.current = preflightSignature;
    void trackEvent("sits_create_preflight_blocked", {
      source: "/sits/create",
      metadata: {
        missing: preflightSignature.split(","),
        profile_completion: profileCompletion,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preflightBlocked, preflightSignature]);


  if (loading) {
    return <div className="p-6 md:p-10 max-w-3xl mx-auto text-muted-foreground">Chargement...</div>;
  }

  if (preflightBlocked) {
    const anchored = preflightMissing.find(m => m.anchor);
    const target = anchored?.anchor ? `/owner-profile?section=${anchored.anchor}` : "/owner-profile";
    return (
      <div className="animate-fade-in px-4 py-8 max-w-3xl mx-auto">
        <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
        <Link to="/sits" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour à mes annonces
        </Link>
        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
          Complétez votre profil avant de publier
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Les gardiens choisissent une maison et des animaux, pas seulement des dates. Il manque quelques éléments à votre profil, quelques minutes suffisent, puis vous publiez votre annonce d'une traite.
        </p>
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <p className="text-sm font-medium mb-3">Ce qu'il reste à renseigner :</p>
          <ul className="space-y-2">
            {preflightMissing.map(m => (
              <li key={m.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span>{m.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate(target)}>Compléter mon profil</Button>
          <Button variant="ghost" onClick={() => navigate("/sits")}>Plus tard</Button>
        </div>
      </div>
    );
  }



  // Draft label
  const draftLabel = savingDraft
    ? "Brouillon en cours d'enregistrement…"
    : remoteSaveFailed
      ? "Enregistrement impossible, votre saisie n'est conservée que sur cet appareil"
      : lastSavedAt
        ? `Brouillon enregistré · ${relativeTime(lastSavedAt)}`
        : localDraftSavedAt
          ? "Brouillon enregistré sur cet appareil"
          : draftId ? "Brouillon en cours" : null;

  return (
    <div className="animate-fade-in pb-40">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>

      {/* Stepper sticky */}
      <StepperBar currentStep={currentStep} onStepClick={setCurrentStep} />

      <div className="px-4 pt-5 pb-2 max-w-3xl mx-auto">
        <Link
          to="/sits"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          onClick={(e) => {
            if (!unsavedRemote) return;
            const ok = window.confirm("Des modifications ne sont pas encore enregistrées. Quitter cette page maintenant ?");
            if (!ok) e.preventDefault();
          }}
        >
          <ArrowLeft className="h-4 w-4" /> Retour à mes annonces
        </Link>

        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-1">
          {isRepublish ? "Republier une annonce" : "Publier une annonce"}
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          {isRepublish
            ? "Les informations de votre précédente annonce sont pré-remplies. Ajustez les dates et détails si besoin."
            : "Les informations de votre profil sont pré-remplies. Ajoutez les détails spécifiques à cette garde."}
        </p>

        {isRepublish && (
          <div className="mb-4">
            <AlmaBubble audience="owner" variant="inline">
              {republishMode === "adapt" ? (
                <>
                  Je pars de votre annonce
                  {sourceSitTitle ? <> « <strong>{sourceSitTitle}</strong> »</> : null}
                  .{" "}
                  {adaptingWithAlma
                    ? <>Je réécris le brouillon à partir de vos ajustements, un instant…</>
                    : <>J'ai retenu ce que vous vouliez ajuster : <em className="text-muted-foreground">« {republishPrompt.slice(0, 240) || "à préciser ci-dessous"} »</em>. Reprenez la main, corrigez ce qui doit l'être, vous relisez avant de publier.</>}
                </>
              ) : (
                <>
                  Je repars de votre annonce
                  {sourceSitTitle ? <> « <strong>{sourceSitTitle}</strong> »</> : null}
                  . Ajustez uniquement les nouvelles dates et ce qui a changé, je m'occupe du reste.
                </>
              )}
            </AlmaBubble>
          </div>
        )}

        {/* Draft indicator */}
        {draftLabel && (
          <div className={cn(
            "inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 mb-4",
            savingDraft
              ? "bg-muted text-muted-foreground"
              : remoteSaveFailed
                ? "bg-destructive/10 text-destructive border border-destructive/30"
                : lastSavedAt ? "bg-green-50 text-green-700 border border-green-200" : "bg-muted text-muted-foreground"
          )}
            role="status"
          >
            {remoteSaveFailed && !savingDraft && <AlertCircle className="h-3 w-3 shrink-0" />}
            {lastSavedAt && !remoteSaveFailed && !savingDraft && <Check className="h-3 w-3 shrink-0" />}
            {draftLabel}
          </div>
        )}

        {localDraftRestored && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-4" role="status">
            Nous avons retrouvé votre saisie en cours sur cet appareil et l'avons restaurée. Pensez à publier ou à enregistrer.
          </p>
        )}

        {remoteDraftResumed && !localDraftRestored && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-4" role="status">
            Nous avons retrouvé votre annonce en cours, vous reprenez là où vous vous étiez arrêté.
          </p>
        )}



        {showAlmaCreateBubble && (
          <div className="mb-4">
            <AlmaBubble
              audience="owner"
              variant="inline"
              title="Décrivez votre absence, je remplis le formulaire"
              onDismiss={handleAlmaCreateDismiss}
              actions={
                <>
                  <Button size="sm" onClick={handleAlmaCreateIntent}>
                    Décrire en une phrase
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleAlmaCreateDismiss}>
                    Non merci, je remplis manuellement
                  </Button>
                </>
              }
            >
              Vous préférez décrire votre besoin en une phrase et laisser Alma préparer le brouillon ? Je remplis les champs pour vous, vous relisez et publiez.
            </AlmaBubble>
          </div>
        )}

        {!isRepublish && <FirstAnnonceTip />}

      </div>

      {/* ===================== STEP 0 : L'ESSENTIEL ===================== */}
      {currentStep === 0 && (
        <div className="px-4 max-w-3xl mx-auto space-y-6">
          {/* ===== Filtre d'usage bloquant : garde à domicile uniquement ===== */}
          <div id="sit-location-field" className="scroll-mt-24 rounded-xl border border-primary/30 bg-primary/5 p-5">
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
                <p className="text-xs text-muted-foreground mt-0.5">Le gardien s'installe chez vous pendant votre absence</p>
              </button>
              <button
                type="button"
                onClick={() => setSitLocation("away")}
                className={cn(
                  "text-left rounded-lg border p-3 transition-colors",
                  sitLocation === "away"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-input bg-card hover:bg-accent/40"
                )}
              >
                <p className="font-medium text-sm text-foreground">Visite, balade ou pension</p>
                <p className="text-xs text-muted-foreground mt-0.5">Le gardien ne reste pas chez vous : passages, promenades, ou garde chez lui</p>
              </button>
            </div>

            {sitLocation === "away" && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900 mb-1">
                  Publier dans Coup de main
                </p>
                <p className="text-sm text-amber-900/80 mb-3">
                  Les visites, balades et pensions se publient dans notre espace Coup de main. Vous pouvez y aller quand vous le souhaitez.
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
              onPaste={makePlainTextPasteHandler(setTitle)}
              onBlur={() => touch("title")}
              className={cn("h-12 text-base", fieldState("title", !title))}
            />
            {touched.title && !title.trim() && (
              <p className="text-sm text-destructive flex items-center gap-1.5 mt-1"><AlertCircle className="h-3.5 w-3.5" /> Ajoutez un titre.</p>
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
                  id="start-date"
                  type="button"
                  onClick={() => setStartSheetOpen(true)}
                  aria-label={startDate ? `Date de début : ${new Date(startDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}` : "Date de début, non renseignée"}
                  className={cn(
                    "w-full h-12 text-base rounded-md border px-3 text-left flex items-center justify-between transition-colors",
                    !startDate ? "text-muted-foreground border-input" : "text-foreground border-input",
                    touched.startDate && !startDate ? "border-destructive" : "",
                  )}
                  onBlur={() => touch("startDate")}
                >
                  <span>{startDate ? new Date(startDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "JJ/MM/AAAA"}</span>
                  <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs text-muted-foreground mb-1 block">Fin</Label>
                <button
                  id="end-date"
                  type="button"
                  onClick={() => setEndSheetOpen(true)}
                  aria-label={endDate ? `Date de fin : ${new Date(endDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}` : "Date de fin, non renseignée"}
                  className={cn(
                    "w-full h-12 text-base rounded-md border px-3 text-left flex items-center justify-between transition-colors",
                    !endDate ? "text-muted-foreground border-input" : "text-foreground border-input",
                    touched.endDate && !endDate ? "border-destructive" : "",
                  )}
                  onBlur={() => touch("endDate")}
                >
                  <span>{endDate ? new Date(endDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "JJ/MM/AAAA"}</span>
                  <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
            </div>
            {dateError ? (
              <p className="text-sm text-destructive flex items-center gap-1.5 mt-2">
                <AlertCircle className="h-3.5 w-3.5" /> {dateError}
              </p>
            ) : (touched.startDate || touched.endDate) && (!startDate || !endDate) ? (
              <p className="text-sm text-destructive flex items-center gap-1.5 mt-2">
                <AlertCircle className="h-3.5 w-3.5" /> Choisissez les dates de la garde.
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
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <p className="text-sm font-medium">Description de la garde *</p>
              <div className="flex items-center gap-2">
                {(() => {
                  const parts: string[] = [];
                  if (ownerProfile?.rules_notes) parts.push(`Règles de la maison : ${ownerProfile.rules_notes}`);
                  if (ownerProfile?.presence_expected) parts.push(`Présence prévue : ${ownerProfile.presence_expected}`);
                  if (ownerProfile?.visits_allowed) parts.push(`Visites pendant la garde : ${ownerProfile.visits_allowed}`);
                  const seed = parts.join("\n\n");
                  if (!seed) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (specificExpectations.trim() && !window.confirm("Remplacer le texte actuel par les éléments de votre profil ?")) return;
                        applyExpectations(seed);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Reprendre depuis mon profil
                    </button>
                  );
                })()}
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
                    if (patch.description) applyExpectations(patch.description);
                  }}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="description-textarea" className="text-sm font-medium">
                  Pourquoi avez-vous besoin d'un gardien pour cette période ?
                </Label>
                <Textarea
                  id="description-textarea"
                  placeholder="Voyage, événement familial…"
                  value={absenceReason}
                  onChange={e => updateAbsenceReason(e.target.value)}
                  onPaste={makePlainTextPasteHandler(updateAbsenceReason)}
                  onBlur={() => touch("descriptionReason")}
                  className={cn(
                    "text-base min-h-[90px] mt-1.5",
                    touched.descriptionReason && !reasonValid
                      ? "border-destructive focus-visible:ring-destructive"
                      : touched.descriptionReason && reasonValid
                        ? "border-green-500 focus-visible:ring-green-500"
                        : ""
                  )}
                  rows={3}
                />
                <p className={cn(
                  "text-xs mt-1 flex justify-between",
                  touched.descriptionReason && !reasonValid
                    ? "text-destructive"
                    : reasonValid
                      ? "text-green-600"
                      : "text-muted-foreground"
                )}>
                  <span>
                    {reasonValid
                      ? "Longueur suffisante"
                      : touched.descriptionReason && absenceReason.trim().length > 0
                        ? `Encore ${MIN_SUB_DESCRIPTION - absenceReason.trim().length} caractères`
                        : `En quelques mots (${MIN_SUB_DESCRIPTION} caractères minimum)`}
                  </span>
                  <span>{absenceReason.trim().length} / {MIN_SUB_DESCRIPTION} min.</span>
                </p>
              </div>

              <div>
                <Label htmlFor="expectations-textarea" className="text-sm font-medium">
                  Qu'attendez-vous du gardien pendant votre absence ?
                </Label>
                <Textarea
                  id="expectations-textarea"
                  placeholder="Présence rassurante, sorties avec l'animal…"
                  value={sitterExpectations}
                  onChange={e => updateSitterExpectations(e.target.value)}
                  onPaste={makePlainTextPasteHandler(updateSitterExpectations)}
                  onBlur={() => touch("descriptionExpectations")}
                  className={cn(
                    "text-base min-h-[90px] mt-1.5",
                    touched.descriptionExpectations && !expectationsValid
                      ? "border-destructive focus-visible:ring-destructive"
                      : touched.descriptionExpectations && expectationsValid
                        ? "border-green-500 focus-visible:ring-green-500"
                        : ""
                  )}
                  rows={3}
                />
                <p className={cn(
                  "text-xs mt-1 flex justify-between",
                  touched.descriptionExpectations && !expectationsValid
                    ? "text-destructive"
                    : expectationsValid
                      ? "text-green-600"
                      : "text-muted-foreground"
                )}>
                  <span>
                    {expectationsValid
                      ? "Longueur suffisante"
                      : touched.descriptionExpectations && sitterExpectations.trim().length > 0
                        ? `Encore ${MIN_SUB_DESCRIPTION - sitterExpectations.trim().length} caractères`
                        : `En quelques mots (${MIN_SUB_DESCRIPTION} caractères minimum)`}
                  </span>
                  <span>{sitterExpectations.trim().length} / {MIN_SUB_DESCRIPTION} min.</span>
                </p>
              </div>
            </div>
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
              onPaste={makePlainTextPasteHandler(setDailyRoutine, { maxLength: 1500 })}
              className="text-base min-h-[120px]"
              rows={5}
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">{dailyRoutine.length}/1500</p>
          </div>

          {/* Mot de l'hôte */}
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label htmlFor="owner-message" className="text-sm font-medium">Un mot de vous <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
              {(() => {
                const parts: string[] = [];
                if (ownerBio) parts.push(ownerBio);
                if (ownerProfile?.welcome_notes) parts.push(ownerProfile.welcome_notes);
                const seed = parts.join("\n\n");
                if (!seed) return null;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (ownerMessage.trim() && !window.confirm("Remplacer le texte actuel par les éléments de votre profil ?")) return;
                      setOwnerMessage(seed.slice(0, 800));
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Reprendre depuis mon profil
                  </button>
                );
              })()}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
              Un message personnel aux futurs gardiens, ce qu'ils trouveront en arrivant, ce que vous appréciez, une touche humaine.
            </p>
            <Textarea
              id="owner-message"
              placeholder="Ex : On confie nos animaux à un membre de confiance plutôt qu'à une pension. Vous repartirez sûrement avec des cookies maison et une connaissance fine du quartier !"
              value={ownerMessage}
              onChange={e => setOwnerMessage(e.target.value.slice(0, 800))}
              onPaste={makePlainTextPasteHandler(setOwnerMessage, { maxLength: 800 })}
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
                    onChange={(e) => setSitCity(normalizeCityTyping(e.target.value))}
                    onBlur={(e) => setSitCity(normalizeCityName(e.target.value))}
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
              onCheckedChange={(v) => {
                const next = v === true;
                if (!next && flexibleNotes.trim() && !window.confirm("Désactiver les dates flexibles supprimera vos précisions. Continuer ?")) return;
                setFlexibleDates(next);
              }}
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
                onPaste={makePlainTextPasteHandler(setFlexibleNotes)}
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
          {/* Photo de couverture (étape explicite avant publication) */}
          {(() => {
            const suggestedCover = coverPhotoUrl
              ?? smartCover
              ?? (ownerPhotos[0] || null)
              ?? null;

            if (!suggestedCover && ownerPhotos.length === 0) {
              return (
                <section aria-labelledby="cover-picker-title" className="rounded-2xl border border-border bg-card p-4 md:p-5">
                  <h2 id="cover-picker-title" className="text-base font-semibold flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" /> Photo de couverture
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ajoutez d'abord des photos à votre galerie pour choisir la couverture qui donnera le plus envie.
                  </p>
                  <Link to="/owner-profile#galerie" className="text-sm text-primary hover:underline mt-2 inline-block">
                    Gérer mes photos dans mon profil →
                  </Link>
                </section>
              );
            }
            return (
              <section aria-labelledby="cover-picker-title" className="rounded-2xl border border-border bg-card p-4 md:p-5">
                <div className="mb-3">
                  <h2 id="cover-picker-title" className="text-base font-semibold flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" /> Photo de couverture
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choisissez celle qui donne le plus envie. Une suggestion est déjà pré-sélectionnée, cliquez une autre photo pour changer.
                  </p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {ownerPhotos.map((url, i) => {
                    const isCover = suggestedCover === url;
                    return (
                      <button
                        key={`${url}-${i}`}
                        type="button"
                        onClick={() => setCoverPhotoUrl(url)}
                        aria-label={isCover ? "Photo de couverture actuelle" : "Définir comme photo de couverture"}
                        aria-pressed={isCover}
                        className={cn(
                          "group relative aspect-[4/3] w-full overflow-hidden rounded-lg border-2 transition-all",
                          isCover ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-primary/50",
                        )}
                      >
                        <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                        {isCover && (
                          <span className="absolute bottom-0 inset-x-0 bg-primary text-primary-foreground text-[10px] font-medium py-0.5 px-1 flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 fill-current" /> Couverture
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <Link to="/owner-profile#galerie" className="text-xs text-primary hover:underline mt-3 inline-block">
                  Ajouter ou gérer mes photos dans mon profil →
                </Link>
              </section>
            );
          })()}


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

          {/* Accompagnants du gardien */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div>
              <Label className="text-sm font-medium text-foreground mb-1 block">Accompagnants du gardien</Label>
              <p className="text-xs text-muted-foreground">Ces informations aident les gardiens à mieux préparer leur candidature.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Acceptez-vous que le gardien vienne avec ses animaux ?</Label>
              <ToggleGroup
                type="single"
                value={acceptsSitterPets}
                onValueChange={(v) => { if (v === "yes" || v === "no" || v === "discuss") setAcceptsSitterPets(v); }}
                className="justify-start flex-wrap gap-2"
              >
                <ToggleGroupItem value="yes" className="rounded-full border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 h-9">Oui, autorisés</ToggleGroupItem>
                <ToggleGroupItem value="no" className="rounded-full border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 h-9">Non</ToggleGroupItem>
                <ToggleGroupItem value="discuss" className="rounded-full border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 h-9">À discuter selon les cas</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Acceptez-vous que le gardien vienne avec ses enfants ?</Label>
              <ToggleGroup
                type="single"
                value={acceptsSitterChildren}
                onValueChange={(v) => { if (v === "yes" || v === "no" || v === "discuss") setAcceptsSitterChildren(v); }}
                className="justify-start flex-wrap gap-2"
              >
                <ToggleGroupItem value="yes" className="rounded-full border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 h-9">Oui, autorisés</ToggleGroupItem>
                <ToggleGroupItem value="no" className="rounded-full border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 h-9">Non</ToggleGroupItem>
                <ToggleGroupItem value="discuss" className="rounded-full border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 h-9">À discuter selon les cas</ToggleGroupItem>
              </ToggleGroup>
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
                onClick={() => setMaxApplications(prev => Math.max(1, (prev ?? DEFAULT_MAX_APPLICATIONS) - 1))}
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
                onClick={() => setMaxApplications(prev => Math.min(50, (prev ?? DEFAULT_MAX_APPLICATIONS) + 1))}
                disabled={maxApplications !== null && maxApplications >= 50}
              >
                +
              </Button>
            </div>
          </div>

          {/* Animaux : sorti du bloc replié, c'est le point de blocage numéro un
              des annonces non publiées. */}
          <div
            id="pets-field"
            className={cn(
              "scroll-mt-24 rounded-lg border p-5",
              pets.length === 0 ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <PawPrint className={cn("h-4 w-4", pets.length === 0 ? "text-destructive" : "text-primary")} />
              <h3 className="font-heading text-sm font-semibold">Les animaux à faire garder</h3>
            </div>
            {pets.length === 0 && (
              <p className="text-sm text-destructive mb-3">
                Votre annonce ne peut pas être publiée sans au moins un animal. Ajoutez-le ici, cela prend une minute.
              </p>
            )}
            {property ? (
              <PetsEditor
                propertyId={property.id}
                onChange={(list) => {
                  setPets(list.map((a) => ({
                    name: a.name, species: a.species, breed: a.breed,
                    photo_url: a.photo_url, walk_duration: (a as any).walk_duration ?? null,
                    alone_duration: (a as any).alone_duration ?? null,
                    medication: (a as any).medication ?? null,
                    activity_level: (a as any).activity_level ?? null,
                  })));
                  hasUserEditedRef.current = true;
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic">Renseignez d'abord votre logement pour ajouter des animaux.</p>
            )}
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
                      <p className="text-xs text-muted-foreground">
                        Photo de couverture, à choisir dans le bloc en haut de cette étape.
                      </p>
                      <Link to="/owner-profile#galerie" className="text-xs text-primary hover:underline mt-1 inline-block">
                        Gérer mes photos dans mon profil →
                      </Link>
                    </div>

                  </div>
                ) : <p className="text-sm text-muted-foreground italic">Aucun logement renseigné</p>}
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
                onClick={handleSaveAndExit}
                disabled={savingDraft || !property}
              >
                {savingDraft ? "Sauvegarde…" : <><span className="hidden sm:inline">Enregistrer & quitter</span><span className="sm:hidden">Brouillon</span></>}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-4 shrink-0 gap-1.5 text-base"
                  onClick={() => setCurrentStep(s => s - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Précédent</span>
                </Button>
                {/* Sauvegarder et partir reste accessible à toutes les étapes. */}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-12 px-3 shrink-0 text-sm"
                  onClick={handleSaveAndExit}
                  disabled={savingDraft || !property}
                >
                  {savingDraft ? "Sauvegarde…" : "Enregistrer & quitter"}
                </Button>
              </>
            )}


            {/* Preview (last step, desktop) : toujours accessible, la modale
                gère elle-même le blocage de la publication. */}
            {currentStep === 2 && (
              <Button
                type="button"
                variant="outline"
                className="h-12 px-4 shrink-0 gap-2 inline-flex text-base"
                onClick={() => setPreviewOpen(true)}
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
                onClick={handleNext}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>

            ) : (
              <Button
                onClick={() => {
                  // Nudge non bloquant si profil < 80 % : on ouvre une modale
                  // qui laisse le choix "Publier maintenant" ou "Compléter d'abord".
                  if (canPublish && profileCompletion < NUDGE_PROFILE_THRESHOLD) {
                    if (!incompleteNudgeSeenRef.current) {
                      incompleteNudgeSeenRef.current = true;
                      trackEvent("owner_publish_with_incomplete_profile_modal_seen", {
                        metadata: { profile_completion: profileCompletion },
                      });
                    }
                    setIncompleteNudgeOpen(true);
                    return;
                  }
                  setPreviewOpen(true);
                }}
                disabled={publishing}
                className="flex-1 h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {publishing ? "Publication en cours…" : canPublish ? "Aperçu & publier" : "Aperçu"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modale nudge non bloquante : profil complété entre 40 % et 80 %.
          Le clic "Publier maintenant" enchaîne sur l'aperçu classique. */}
      <AlertDialog open={incompleteNudgeOpen} onOpenChange={setIncompleteNudgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Vous pouvez publier maintenant, votre profil sera complété plus tard
            </AlertDialogTitle>
            <AlertDialogDescription>
              Votre profil est complété à {profileCompletion} %. Vous pouvez remplir les
              informations manquantes après avoir publié. Les gardiens verront votre annonce
              et pourront candidater.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIncompleteNudgeOpen(false);
                navigate("/profile");
              }}
            >
              Compléter d'abord mon profil
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                trackEvent("owner_publish_with_incomplete_profile_confirmed", {
                  metadata: { profile_completion: profileCompletion },
                });
                setIncompleteNudgeOpen(false);
                setPreviewOpen(true);
              }}
            >
              Publier maintenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnnouncementPreviewDialog
        blockers={publishBlockers}
        onResolveBlocker={(b) => {
          setPreviewOpen(false);
          if (b.action) {
            navigate(b.action);
            return;
          }
          if (b.anchor && typeof document !== "undefined") {
            setTimeout(() => {
              document.getElementById(b.anchor as string)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 150);
          }
        }}
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
        specificExpectations={specificExpectations}
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
  icon: React.ElementType; title: string; editLink?: string; children: React.ReactNode;
}) => (
  <div className="bg-card rounded-lg border border-border p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-heading text-sm font-semibold">{title}</h3>
      </div>
      {editLink ? <Link to={editLink} className="text-xs text-primary hover:underline">Modifier dans mon profil</Link> : null}
    </div>
    {children}

  </div>
);

export default CreateSit;
