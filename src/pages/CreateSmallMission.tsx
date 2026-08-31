import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { detectContactDetails, contactDetailsMessage } from "@/lib/contactDetails";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import PageMeta from "@/components/PageMeta";
import { useAccessLevel, MIN_COMPLETION_TO_APPLY } from "@/hooks/useAccessLevel";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import MissionPhotoUpload from "@/components/missions/MissionPhotoUpload";
import { geocodeCity } from "@/lib/geocode";
import { trackFirstAction, trackEvent } from "@/lib/analytics";
import { recordMissionCreatedAttribution } from "@/lib/campaignAttribution";
import {
  sitLikeSignals,
  rehomingSignals,
  moneyWordingSignals,
  hasMoneyMention,
  writeSitPrefill,
} from "@/lib/missionContentGuards";
import { AlertCircle, ChevronLeft, CalendarIcon } from "lucide-react";
import { isPhotoRequiredByRule } from "@/lib/missionPhotoRule";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { stripEmojis } from "@/lib/stripEmojis";
import { avatarImageUrl } from "@/lib/storageImage";

import IdentityRecommendedHint from "@/components/missions/IdentityRecommendedHint";
import { MISSION_CATEGORIES } from "@/lib/missionCategories";
import {
  categoryDescHelp,
  categoryExchangeHint,
  categoryTitleExample,

} from "@/lib/missionCategoryCopy";
import { durationMismatch, DURATION_LABEL } from "@/lib/missionDurationCoherence";

/** Longueurs minimales pour éviter les annonces vides ou illisibles. */
const MIN_TITLE_LEN = 15;
const MIN_DESC_LEN = 60;

/* ── Stepper progress bar ── */
const STEP_LABELS = ["Votre annonce", "Le détail", "Où et quand"];

const StepperBar = ({ current, total }: { current: number; total: number }) => (
  <div className="sticky top-12 md:top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Étape {current} / {total}
        </span>
        <span className="text-xs text-muted-foreground">
          {STEP_LABELS[current - 1]}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  </div>
);


const CreateSmallMission = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const tp = (k: string, opts?: any) => t(`create_mission_page.${k}`, opts) as string;
  const { level: accessLevel, profileCompletion, identityRecommended, loading: accessLoading } = useAccessLevel();
  // Chantier 1 EntraideHub Pass 1 : plus de gate 40 %, tout profil connecté peut publier.
  // L'ID vérification devient un soft-nudge (badge auteur uniquement) sur SitDetail.
  const canApplyMissions = true;
  

  // Les huit catégories viennent de la source unique : un seul libellé partout.
  const CATEGORIES = MISSION_CATEGORIES;

  const DURATIONS = useMemo(() => [
    { value: "1-2h", label: tp("dur_1_2h") },
    { value: "half_day", label: tp("dur_half_day") },
    { value: "several", label: tp("dur_several") },
    { value: "weekend", label: tp("dur_weekend") },
  ], [t]);

  const typeParam = searchParams.get("type");
  const [step, setStep] = useState(1);
  const [missionType, setMissionType] = useState<"besoin" | "offre">(typeParam === "offre" ? "offre" : "besoin");
  // Aucune catégorie présélectionnée : la personne choisit, le formulaire suit.
  const [category, setCategory] = useState("");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [photoTouched, setPhotoTouched] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  // Échappatoire après un échec d'envoi : la photo reste une exigence forte,
  // jamais un cul-de-sac qui rendrait une offre impubliable.
  const [photoWaived, setPhotoWaived] = useState(false);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [descTouched, setDescTouched] = useState(false);
  const [exchangeOffer, setExchangeOffer] = useState("");
  const [exchangeTouched, setExchangeTouched] = useState(false);
  const [placeTouched, setPlaceTouched] = useState(false);
  const [exchangeError, setExchangeError] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [dateNeeded, setDateNeeded] = useState("");
  const [endDate, setEndDate] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [duration, setDuration] = useState("");
  const [petSpecies, setPetSpecies] = useState("");
  const [petSize, setPetSize] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  // Le titre et la description partent toujours vides : aucune intention
  // pré-remplie, le membre écrit sa propre demande ou offre.

  // Hauteur réelle de la barre d'action fixe, exposée en variable CSS pour que
  // le conteneur défilant réserve exactement l'espace des couches fixes
  // (barre d'action plus barre de navigation basse). Sans cela, les derniers
  // contrôles du formulaire restent sous la barre en fin de défilement.
  const actionBarRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = actionBarRef.current;
    if (!el || typeof window === "undefined") return;
    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--mission-action-bar-h", `${h}px`);
    };
    apply();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(apply);
      ro.observe(el);
    }
    window.addEventListener("resize", apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", apply);
      document.documentElement.style.removeProperty("--mission-action-bar-h");
    };
  });

  // Le titre reçoit le focus à l'ouverture, sauf sur mobile où le clavier
  // masquerait aussitôt la question posée.
  const titleRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia?.("(min-width: 768px)")?.matches;
    if (isDesktop) titleRef.current?.focus();
  }, []);


  useEffect(() => {
    const tParam = searchParams.get("type");
    if (tParam === "besoin" || tParam === "offre") setMissionType(tParam);
  }, []);

  // Attrition composer : 5 events (opened / step1_completed / field_abandoned / submitted / abandoned)
  const submittedRef = useRef(false);
  useEffect(() => {
    try { trackEvent("mission_composer_opened", { metadata: { type: missionType } }); } catch {}
    return () => {
      if (!submittedRef.current) {
        try { trackEvent("mission_composer_abandoned", { metadata: { last_step: step, has_title: title.trim().length > 0 } }); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTitleBlur = () => {
    setTitleTouched(true);
    if (title.trim().length > 0 && title.trim().length < MIN_TITLE_LEN) {
      try { trackEvent("mission_composer_field_abandoned", { metadata: { field: "title", length: title.trim().length } }); } catch {}
    }
  };
  const handleDescBlur = () => {
    setDescTouched(true);
    if (description.trim().length > 0 && description.trim().length < MIN_DESC_LEN) {
      try { trackEvent("mission_composer_field_abandoned", { metadata: { field: "description", length: description.trim().length } }); } catch {}
    }
  };

  const handleExchangeChange = (val: string) => {
    setExchangeOffer(val);
    setExchangeError(hasMoneyMention(val) ? tp("exchange_error_euros") : "");
  };

  /**
   * Photo jamais exigée sur une offre (la photo de profil illustre déjà),
   * attendue seulement sur une demande dont l'objet se montre.
   */
  const photoRequiredByRule = isPhotoRequiredByRule(missionType, category);
  const photoRequired = photoRequiredByRule && !photoWaived;

  /** Étape 1 : une seule question, le titre. */
  const step1Valid = title.trim().length >= MIN_TITLE_LEN;

  /** Étape 2 : le détail, description, contrepartie, puis catégorie. */
  const step2Valid =
    description.trim().length >= MIN_DESC_LEN &&
    exchangeOffer.trim().length >= 2 &&
    !exchangeError &&
    !!category;

  /**
   * Champs obligatoires, avec l'étape qui les porte. Source unique du toast,
   * du défilement et du renvoi vers la bonne des trois étapes.
   */
  const requiredFields = (): { id: string; label: string; step: number; invalid: boolean }[] => [
    { id: "mission-field-title", label: "Titre", step: 1, invalid: title.trim().length < MIN_TITLE_LEN },
    { id: "mission-field-description", label: "Description", step: 2, invalid: description.trim().length < MIN_DESC_LEN },
    { id: "mission-field-exchange", label: "Contrepartie", step: 2, invalid: exchangeOffer.trim().length < 2 || !!exchangeError },
    { id: "mission-field-category", label: "Catégorie", step: 2, invalid: !category },
    { id: "mission-field-photo", label: "Photo", step: 3, invalid: photoRequired && photos.length === 0 },
    { id: "mission-field-place", label: "Ville", step: 3, invalid: !city.trim() },
    { id: "mission-field-place", label: "Code postal", step: 3, invalid: !postalCode.trim() },
    { id: "mission-field-duration", label: "Durée estimée", step: 3, invalid: !duration },
  ];

  const touchStep = (s: number) => {
    if (s === 1) setTitleTouched(true);
    if (s === 2) { setDescTouched(true); setExchangeTouched(true); setCategoryTouched(true); }
    if (s === 3) { setPhotoTouched(true); setPlaceTouched(true); }
  };

  /**
   * Signale les champs manquants : même toast nommant les champs, même
   * défilement vers le premier champ en défaut, et renvoi vers son étape.
   */
  const reportMissing = (missing: { id: string; label: string; step: number }[]) => {
    if (missing.length === 0) return;
    toast({
      title: missing.length > 1 ? "Champs manquants" : "Champ manquant",
      description: `À compléter : ${missing.map((f) => f.label).join(", ")}.`,
      variant: "destructive",
    });
    const first = missing[0];
    touchStep(first.step);
    setStep(first.step);
    if (typeof document !== "undefined") {
      window.setTimeout(() => {
        document.getElementById(first.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  };

  const handleNextStep = () => {
    touchStep(step);
    if (step === 1) {
      if (step1Valid) {
        setStep(2);
        try { trackEvent("mission_composer_step1_completed"); } catch {}
        return;
      }
      reportMissing(requiredFields().filter((f) => f.step === 1 && f.invalid));
      return;
    }
    if (photoUploading) {
      toast({ title: tp("photo_uploading") });
      return;
    }
    if (step2Valid) {
      setStep(3);
      try { trackEvent("mission_composer_step2_completed"); } catch {}
      return;
    }
    reportMissing(requiredFields().filter((f) => f.step === 2 && f.invalid));
  };


  /**
   * Garde-fous éditoriaux, recalculés à chaque frappe :
   * une mission qui ressemble à une garde d'animaux est invitée vers
   * /sits/create (canal dédié), une cession ou adoption d'animaux est
   * signalée à la modération. Jamais bloquant.
   */
  const sitLike = useMemo(() => sitLikeSignals(title, description), [title, description]);
  const rehoming = useMemo(() => rehomingSignals(title, description), [title, description]);
  const moneyWording = useMemo(
    () => moneyWordingSignals(title, description, exchangeOffer),
    [title, description, exchangeOffer],
  );

  /**
   * Cohérence période / durée déclarée. Explicite, jamais bloquant : on
   * propose la durée cohérente, la personne décide.
   */
  const durationIssue = useMemo(
    () => durationMismatch(duration, dateNeeded, endDate),
    [duration, dateNeeded, endDate],
  );

  // Volume d'audience : combien de personnes seront prévenues à la publication.
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  useEffect(() => {
    if (step !== 3 || !city.trim()) {
      setAudienceCount(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const coords = await geocodeCity(city.trim());
        if (cancelled || !coords) return;
        const { data } = await supabase.rpc("count_mission_notification_audience" as any, {
          p_lat: coords.lat,
          p_lng: coords.lng,
          // p_radius_km est conservé pour la signature mais ignoré en base :
          // le rayon retenu est celui déclaré par chaque membre.
          p_radius_km: 30,
          p_category: category,
        });
        if (!cancelled) setAudienceCount(typeof data === "number" ? data : null);
      } catch {
        if (!cancelled) setAudienceCount(null);
      }
    }, 600);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [step, city, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (hasMoneyMention(exchangeOffer)) return;
    if (submitting) return;
    const missing = requiredFields().filter((f) => f.invalid);
    if (missing.length > 0) {
      reportMissing(missing);
      return;
    }

    await performSubmit();
  };

  const performSubmit = async () => {
    if (!user) return;

    // L'entraide s'échange service contre service : aucune mention d'argent,
    // sur aucun des trois champs libres. Miroir du trigger base.
    if (hasMoneyMention(title, description, exchangeOffer)) {
      toast({
        title: "Ici, on s'échange des services",
        description:
          "Votre annonce mentionne de l'argent. Sur l'entraide, on propose un service en retour, jamais un paiement. Reformulez votre contrepartie.",
        variant: "destructive",
      });
      setStep(2);
      setExchangeTouched(true);
      return;
    }

    // Une annonce d'entraide est une page publique indexable : les coordonnées
    // personnelles y sont bloquantes, contrairement à la messagerie privée.
    const contactKinds = detectContactDetails(`${title}\n${description}\n${exchangeOffer}`);
    if (contactKinds.length > 0) {
      toast({
        title: "Coordonnées détectées",
        description: contactDetailsMessage(contactKinds),
        variant: "destructive",
      });
      try {
        await supabase.rpc("report_contact_details_attempt" as any, {
          _context: "small_mission_create",
          _kinds: contactKinds,
          _excerpt: `${title}\n${description}`.slice(0, 500),
        });
      } catch {
        // Signal non bloquant : l'essentiel est le refus de publication.
      }
      setStep(2);
      setDescTouched(true);
      return;
    }

    setSubmitting(true);
    let coords: { lat: number; lng: number } | null = null;
    try { coords = await geocodeCity(city.trim()); } catch { coords = null; }

    const cleanTitle = stripEmojis(sanitizeUserTitle(title) || title.trim());
    const cleanDescription = stripEmojis(description);
    const cleanExchange = stripEmojis(exchangeOffer);

    const { data: inserted, error } = await supabase.from("small_missions").insert({
      user_id: user.id,
      title: cleanTitle,
      description: cleanDescription,
      category: category as any,
      mission_type: missionType,
      exchange_offer: cleanExchange,
      city: city.trim(),
      postal_code: postalCode.trim(),
      date_needed: dateNeeded || null,
      end_date: endDate || null,
      duration_estimate: duration,
      pet_species: category === "animals" ? (petSpecies || null) : null,
      pet_size: category === "animals" ? (petSize || null) : null,
      photos,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    } as any).select("id, slug").maybeSingle();

    setSubmitting(false);
    if (error) {
      const hint = (error as any)?.hint || "";
      const msg = String(error.message || "");
      if (hint === "money_in_mutual_aid" || msg.includes("money_in_mutual_aid")) {
        toast({
          title: "Ici, on s'échange des services",
          description: error.message,
          variant: "destructive",
        });
        setStep(2);
        return;
      }
      if (hint === "account_not_active" || msg.includes("account_not_active")) {
        toast({ title: "Compte non actif", description: "Contactez le support pour rétablir l'accès à l'entraide.", variant: "destructive" });
        return;
      }
      if (hint === "duplicate_small_mission" || msg.includes("duplicate_small_mission")) {
        toast({
          title: "Vous avez déjà cette annonce en ligne",
          description: error.message,
          variant: "destructive",
        });
        setStep(1);
        setTitleTouched(true);
        return;
      }

      toast({ title: tp("toast_error_title"), description: error.message, variant: "destructive" });
      return;
    }
    try { await trackFirstAction("mission_created", { category, mission_type: missionType }); } catch {}
    if (typeof profileCompletion === "number" && profileCompletion < MIN_COMPLETION_TO_APPLY) {
      try { await trackEvent("mission_created_incomplete_profile", { metadata: { profile_completion: profileCompletion, mission_id: inserted?.id ?? null } }); } catch {}
    }
    if (inserted?.id) { try { await recordMissionCreatedAttribution(inserted.id); } catch {} }
    // Signaux admin éditoriaux : non bloquants, idempotents côté base.
    if (inserted?.id && (sitLike || rehoming)) {
      const mid = inserted.id;
      const metaBase = { title: cleanTitle, city: city.trim() };
      const rpc = (supabase.rpc as any).bind(supabase);
      if (sitLike) {
        rpc("report_mission_content_signal", {
          _mission_id: mid,
          _signal_type: "sit_like_mission",
          _metadata: { ...metaBase, reason: sitLike.matched.join(" + ") },
        }).then(({ error }: any) => { if (error) console.warn("signal sit_like_mission", error); });
      }
      if (rehoming) {
        rpc("report_mission_content_signal", {
          _mission_id: mid,
          _signal_type: "animal_rehoming_listing",
          _metadata: { ...metaBase, reason: rehoming.matched.join(" + ") },
        }).then(({ error }: any) => { if (error) console.warn("signal animal_rehoming_listing", error); });
        toast({
          title: "Mission transmise pour relecture",
          description: "La cession ou l'adoption d'animaux n'est pas proposée sur Guardiens. Notre équipe va relire votre publication.",
        });
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["small-missions-all"] });
    submittedRef.current = true;
    try { trackEvent("mission_composer_submitted", { metadata: { mission_id: inserted?.id, category, mission_type: missionType } }); } catch {}
    toast({ title: tp("toast_published_title"), description: tp("toast_published_desc"), duration: 3000 });
    const insertedAny = inserted as any;
    navigate(insertedAny?.id ? `/petites-missions/${insertedAny.slug || insertedAny.id}?published=1` : "/petites-missions");
  };

  return (
    <>
      <PageMeta
        title={missionType === "offre" ? tp("meta_title_offer") : tp("meta_title_need")}
        description={tp("meta_description")}
      />

      {(accessLoading || canApplyMissions) && (
        <StepperBar current={step} total={3} />
      )}

      <div
        className="max-w-2xl mx-auto px-4 py-6 space-y-5 md:pb-36"
        style={{
          // Réserve la hauteur cumulée des couches fixes, plus une marge de
          // confort, pour qu'aucun contrôle ne finisse sous la barre d'action.
          paddingBottom:
            "calc(var(--mission-action-bar-h, 4.5rem) + var(--bottom-nav-h, 4rem) + 2rem)",
        }}
      >
        <button
          type="button"
          onClick={() => (step === 1 ? navigate("/petites-missions") : setStep(step - 1))}
          className="flex items-center gap-1 min-h-[44px] text-sm text-foreground/60 hover:text-foreground transition-colors -ml-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 1 ? tp("back") : "Étape précédente"}
        </button>


        {!accessLoading && !canApplyMissions && (
          <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
        )}

        {(accessLoading || canApplyMissions) && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── ÉTAPE 1 : une seule question ── */}
            {step === 1 && (
              <>
                <div className="rounded-xl p-4 border border-primary/20 bg-primary/5 space-y-1">
                  {/* Le titre suit le mode choisi : une personne qui propose son
                      aide ne doit pas lire un titre qui parle de demander. */}
                  <h2 className="font-heading font-bold text-foreground text-base">
                    {missionType === "offre"
                      ? tp("encouragement_title_offer")
                      : tp("encouragement_title_need")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {missionType === "offre" ? tp("encouragement_offer") : tp("encouragement_need")}
                  </p>
                </div>

                {/* Type besoin / offre */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{tp("publishing_label")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMissionType("besoin")}
                      className={cn(
                        "h-12 rounded-xl border text-sm font-medium transition-colors",
                        missionType === "besoin"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:border-primary/40"
                      )}
                    >
                      {tp("type_need")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMissionType("offre")}
                      className={cn(
                        "h-12 rounded-xl border text-sm font-medium transition-colors",
                        missionType === "offre"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:border-primary/40"
                      )}
                    >
                      {tp("type_offer")}
                    </button>
                  </div>
                </div>

                {/* La seule question de l'étape 1 */}
                <div id="mission-field-title" className="space-y-2">
                  <Label htmlFor="mission-title-input" className="text-base font-medium">
                    {missionType === "offre" ? tp("title_question_offer") : tp("title_question_need")}
                  </Label>
                  <Input
                    id="mission-title-input"
                    ref={titleRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    placeholder={categoryTitleExample(category, missionType)}
                    maxLength={120}
                    className="h-12 text-base"
                  />
                  {titleTouched && title.trim().length < MIN_TITLE_LEN && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Titre trop court ({title.trim().length}/{MIN_TITLE_LEN} caractères). Ex&nbsp;: « Garder mon chien pendant le week-end ».
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── ÉTAPE 2 : le détail ── */}
            {step === 2 && (
              <>
                <h2 className="font-heading font-semibold text-lg">Le détail</h2>

                {/* Garde-fous éditoriaux, non bloquants */}
                {sitLike && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2" role="note">
                    <p className="text-sm font-semibold text-foreground">
                      Ça ressemble à une garde d'animaux
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Les gardes ont un espace dédié, plus visible et mieux suivi, avec dates et consignes structurées. Votre texte est repris tel quel.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          writeSitPrefill({ title, description });
                          try { void trackEvent("mission_to_sit_redirect", { metadata: { signals: sitLike.matched } }); } catch {}
                          navigate("/sits/create");
                        }}
                      >
                        Créer une annonce de garde
                      </Button>
                      <span className="text-[11px] text-muted-foreground">Ou continuez votre mission, rien ne bloque.</span>
                    </div>
                  </div>
                )}
                {moneyWording && (
                  <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 space-y-1" role="note">
                    <p className="text-sm font-semibold text-foreground">
                      Ici, on s'échange des services
                    </p>
                    <p className="text-xs text-muted-foreground">
                      L'entraide fonctionne sans argent : ni paiement, ni tarif, ni remboursement. Proposez plutôt un service en retour. Rien ne bloque, c'est une simple relecture.
                    </p>
                  </div>
                )}
                {rehoming && (
                  <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 space-y-1" role="note">
                    <p className="text-sm font-semibold text-foreground">
                      La cession ou l'adoption d'animaux n'a pas sa place dans l'entraide
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Guardiens ne publie pas d'annonces de vente, don ou adoption d'animaux. Si vous publiez, votre mission sera transmise à notre équipe pour relecture.
                    </p>
                  </div>
                )}

                {/* Description */}
                <div id="mission-field-description" className="space-y-2">
                  <Label htmlFor="mission-description-input" className="text-sm font-medium">
                    {missionType === "offre" ? tp("desc_label_offer") : tp("desc_label_need")}
                  </Label>
                  <Textarea
                    id="mission-description-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescBlur}
                    placeholder={categoryDescHelp(category, missionType)}
                    rows={5}
                    className="text-base resize-none"
                  />
                  {/* Le compteur n'apparaît qu'à la première frappe : un « 0/60 »
                      à vide ressemble à une sanction avant même d'écrire. */}
                  <div className="flex items-center justify-between text-xs">
                    {descTouched && description.trim().length < MIN_DESC_LEN ? (
                      <p className="text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        Description trop courte, décrivez le contexte pour rassurer.
                      </p>
                    ) : (
                      <span className="text-muted-foreground">Minimum {MIN_DESC_LEN} caractères.</span>
                    )}
                    {description.length > 0 && (
                      <span className={cn("tabular-nums", descTouched && description.trim().length < MIN_DESC_LEN ? "text-destructive" : "text-muted-foreground")}>
                        {description.trim().length}/{MIN_DESC_LEN}
                      </span>
                    )}
                  </div>
                </div>

                {/* Échange proposé */}
                <div id="mission-field-exchange" className="space-y-2">
                  <Label htmlFor="mission-exchange-input" className="text-sm font-medium">
                    {missionType === "offre" ? tp("exchange_label_offer") : tp("exchange_label_need")}
                  </Label>
                  <p className="text-xs text-muted-foreground -mt-1 leading-relaxed">
                    Un coup de main, c'est un échange, jamais d'argent. {categoryExchangeHint(category, missionType)}
                  </p>

                  <Input
                    id="mission-exchange-input"
                    value={exchangeOffer}
                    onChange={(e) => handleExchangeChange(e.target.value)}
                    onBlur={() => setExchangeTouched(true)}
                    placeholder={missionType === "offre" ? tp("exchange_ph_offer") : tp("exchange_ph_need")}
                    className="h-12 text-base"
                  />
                  {exchangeError && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                      {exchangeError}
                    </p>
                  )}
                  {exchangeTouched && !exchangeError && exchangeOffer.trim().length < 2 && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> Précisez votre contrepartie.
                    </p>
                  )}
                </div>

                {/* Catégorie, après la description : on écrit d'abord, on classe ensuite. */}
                <div id="mission-field-category" className="space-y-2">
                  <Label className="text-sm font-medium">{tp("category_label")}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className={cn("h-12 text-base", categoryTouched && !category && "border-destructive")}>
                      <SelectValue placeholder="Choisissez une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categoryTouched && !category && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> Choisissez une catégorie.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── ÉTAPE 3 : où et quand ── */}
            {step === 3 && (
              <>
                <h2 className="font-heading font-semibold text-lg">Où et quand ?</h2>

                {/* Photo, ou photo de profil sur une offre */}
                <div id="mission-field-photo" className="space-y-2">
                  <Label className="text-sm font-medium">
                    {photoRequired ? tp("photo_label") : tp("photo_label_optional")}
                  </Label>
                  {missionType === "offre" && user?.avatarUrl && (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                      <img
                        src={avatarImageUrl(user.avatarUrl, 48)}
                        alt="Votre photo de profil"
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <p className="text-xs text-muted-foreground">{tp("photo_profile_note")}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {missionType === "offre" && !user?.avatarUrl
                      ? tp("photo_profile_missing")
                      : photoRequired
                        ? tp("photo_help_required")
                        : tp("photo_help_optional")}
                  </p>
                  <MissionPhotoUpload
                    userId={user!.id}
                    photos={photos}
                    onChange={setPhotos}
                    onUploadingChange={setPhotoUploading}
                    onUploadError={() => setPhotoFailed(true)}
                  />
                  {photoUploading && (
                    <p className="text-xs text-muted-foreground">{tp("photo_uploading")}</p>
                  )}
                  {!photoUploading && photoTouched && photoRequired && photos.length === 0 && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {tp("photo_error_required")}
                    </p>
                  )}
                  {!photoUploading && photoFailed && photoRequiredByRule && photos.length === 0 && (
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 space-y-2">
                      <p className="text-xs text-muted-foreground">{tp("photo_failed_hint")}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPhotoWaived(true)}
                        disabled={photoWaived}
                      >
                        {photoWaived ? tp("photo_waived") : tp("photo_skip")}
                      </Button>
                    </div>
                  )}
                </div>

                <div id="mission-field-place" className="space-y-2">
                  <PostalCodeCityFields
                    city={city}
                    postalCode={postalCode}
                    onChange={(partial) => {
                      if (partial.city !== undefined) setCity(partial.city);
                      if (partial.postal_code !== undefined) setPostalCode(partial.postal_code);
                    }}
                    required
                    showRequiredMark={false}
                    inputClassName="h-12 text-base"
                  />
                </div>



                {/* Date, Drawer full-screen mobile */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{tp("date_label")}</Label>
                  <Drawer open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <DrawerTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "w-full h-12 flex items-center gap-3 px-4 rounded-xl border border-border bg-background text-left text-base transition-colors hover:border-primary/40",
                          !dateNeeded && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {dateNeeded
                          ? format(parseISO(dateNeeded), "EEEE d MMMM yyyy", { locale: fr })
                          : tp("date_placeholder")}
                      </button>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[85vh]">
                      <DrawerHeader>
                        <DrawerTitle>{tp("date_label")}</DrawerTitle>
                      </DrawerHeader>
                      <div className="flex flex-col items-center pb-6 px-4 gap-4">
                        <Calendar
                          mode="single"
                          locale={fr}
                          selected={dateNeeded ? parseISO(dateNeeded) : undefined}
                          onSelect={(d) => {
                            setDateNeeded(d ? format(d, "yyyy-MM-dd") : "");
                            setCalendarOpen(false);
                          }}
                          disabled={(d) => d < startOfDay(new Date())}
                          initialFocus
                          className="pointer-events-auto"
                        />
                        {dateNeeded && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => { setDateNeeded(""); setCalendarOpen(false); }}
                          >
                            {tp("date_clear")}
                          </Button>
                        )}
                        <DrawerClose asChild>
                          <Button variant="outline" className="w-full h-12">Fermer</Button>
                        </DrawerClose>
                      </div>
                    </DrawerContent>
                  </Drawer>
                  <p className="text-xs text-muted-foreground">Optionnel si la date n'est pas encore fixée.</p>
                </div>

                {/* Date de fin (optionnelle) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date de fin (optionnel)</Label>
                  <Drawer open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                    <DrawerTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "w-full h-12 flex items-center gap-3 px-4 rounded-xl border border-border bg-background text-left text-base transition-colors hover:border-primary/40",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {endDate
                          ? format(parseISO(endDate), "EEEE d MMMM yyyy", { locale: fr })
                          : "Jusqu'à quelle date ?"}
                      </button>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[85vh]">
                      <DrawerHeader><DrawerTitle>Date de fin</DrawerTitle></DrawerHeader>
                      <div className="flex flex-col items-center pb-6 px-4 gap-4">
                        <Calendar
                          mode="single"
                          locale={fr}
                          selected={endDate ? parseISO(endDate) : undefined}
                          onSelect={(d) => {
                            setEndDate(d ? format(d, "yyyy-MM-dd") : "");
                            setEndCalendarOpen(false);
                          }}
                          disabled={(d) => d < startOfDay(dateNeeded ? parseISO(dateNeeded) : new Date())}
                          initialFocus
                          className="pointer-events-auto"
                        />
                        {endDate && (
                          <Button type="button" variant="ghost" size="sm" className="w-full"
                            onClick={() => { setEndDate(""); setEndCalendarOpen(false); }}>
                            Effacer
                          </Button>
                        )}
                        <DrawerClose asChild>
                          <Button variant="outline" className="w-full h-12">Fermer</Button>
                        </DrawerClose>
                      </div>
                    </DrawerContent>
                  </Drawer>
                </div>

                {/* Profil animal, uniquement si catégorie animaux */}
                {category === "animals" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-border p-4 bg-muted/30">
                    <div className="sm:col-span-2">
                      <p className="text-sm font-semibold mb-0.5">
                        {missionType === "offre" ? "Les animaux que vous savez garder" : "L'animal concerné"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {missionType === "offre"
                          ? "Précisez avec quels animaux vous êtes à l'aise."
                          : "Aide les gens à savoir s'ils peuvent proposer leur aide."}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        {missionType === "offre" ? "Espèces" : "Espèce"}
                      </Label>
                      <Select value={petSpecies} onValueChange={setPetSpecies}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Chien, chat…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chien">Chien</SelectItem>
                          <SelectItem value="chat">Chat</SelectItem>
                          <SelectItem value="cheval">Cheval</SelectItem>
                          <SelectItem value="rongeur">Rongeur</SelectItem>
                          <SelectItem value="oiseau">Oiseau</SelectItem>
                          <SelectItem value="poisson">Poisson</SelectItem>
                          <SelectItem value="reptile">Reptile</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Taille</Label>
                      <Select value={petSize} onValueChange={setPetSize}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Petit, moyen…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="petit">Petit</SelectItem>
                          <SelectItem value="moyen">Moyen</SelectItem>
                          <SelectItem value="grand">Grand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div id="mission-field-duration" className="space-y-2">

                  <Label className="text-sm font-medium">{tp("duration_label")}</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className={cn("h-12 text-base", placeTouched && !duration && "border-destructive")}>
                      <SelectValue placeholder={tp("duration_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {placeTouched && !duration && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> Indiquez une durée estimée.
                    </p>
                  )}
                  {durationIssue && (
                    <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 space-y-2" role="note">
                      <p className="text-xs text-muted-foreground">{durationIssue.message}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDuration(durationIssue.suggested)}
                      >
                        Utiliser « {DURATION_LABEL[durationIssue.suggested]} »
                      </Button>
                    </div>
                  )}
                </div>

                {/* Champs de lieu manquants, nommés explicitement */}
                {placeTouched && (!city.trim() || !postalCode.trim()) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    À compléter : {[!city.trim() ? "Ville" : null, !postalCode.trim() ? "Code postal" : null].filter(Boolean).join(", ")}.
                  </p>
                )}
              </>
            )}
          </form>
        )}
      </div>

      {/* CTA sticky au-dessus de la BottomNav */}
      {(accessLoading || canApplyMissions) && (
        <div ref={actionBarRef} className="fixed bottom-[var(--bottom-nav-h,0px)] inset-x-0 bg-card/95 backdrop-blur border-t border-border px-4 py-3 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto space-y-2">
            {step === 3 && identityRecommended && <IdentityRecommendedHint compact />}
            {step === 3 && audienceCount !== null && (
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">
                  {audienceCount === 0
                    ? "Personne n'est encore disponible dans votre secteur pour cette catégorie. Publiez quand même, votre annonce reste visible et les nouveaux membres la verront."
                    : audienceCount === 1
                      ? "1 personne de votre secteur, disponible pour ce type de coup de main, sera prévenue."
                      : `${audienceCount} personnes de votre secteur, disponibles pour ce type de coup de main, seront prévenues.`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sont prévenues les personnes du secteur dont les compétences renseignées correspondent à votre catégorie.
                </p>
              </div>
            )}
            {step < 3 ? (
              <>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={photoUploading}
                  className="w-full h-12 text-base font-semibold"
                >
                  {photoUploading ? tp("photo_uploading") : "Continuer"}
                </Button>
                {step === 1 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Une simple question à poser ?{" "}
                    <Link to="/questions/nouvelle" className="hover:underline font-medium">
                      Posez-la à la communauté
                    </Link>
                  </p>
                )}
              </>
            ) : (

              <Button
                type="submit"
                form=""
                onClick={handleSubmit as any}
                disabled={submitting || !!exchangeError}
                className="w-full h-12 text-base font-semibold"
              >
                {submitting
                  ? tp("submit_publishing")
                  : missionType === "offre" ? tp("submit_offer") : tp("submit_need")}
              </Button>
            )}
          </div>
        </div>
      )}

    </>
  );
};

export default CreateSmallMission;
