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
  writeSitPrefill,
} from "@/lib/missionContentGuards";
import { AlertCircle, ChevronLeft, CalendarIcon } from "lucide-react";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { stripEmojis } from "@/lib/stripEmojis";

import IdentityRecommendedHint from "@/components/missions/IdentityRecommendedHint";

/** Longueurs minimales pour éviter les annonces vides ou illisibles. */
const MIN_TITLE_LEN = 15;
const MIN_DESC_LEN = 60;

const EURO_REGEX = /\d+\s*[€]|[€]\s*\d+|\d+\s*euro/i;

/* ── Stepper progress bar ── */
const StepperBar = ({ current, total }: { current: number; total: number }) => (
  <div className="sticky top-12 md:top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Étape {current} / {total}
        </span>
        <span className="text-xs text-muted-foreground">
          {current === 1 ? "Votre annonce" : "Lieu et date"}
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
  

  const CATEGORIES = useMemo(() => [
    { value: "animals", label: tp("cat_animals") },
    { value: "garden", label: tp("cat_garden") },
    { value: "house", label: tp("cat_house") },
    { value: "skills", label: tp("cat_skills") },
  ], [t]);

  const DURATIONS = useMemo(() => [
    { value: "1-2h", label: tp("dur_1_2h") },
    { value: "half_day", label: tp("dur_half_day") },
    { value: "several", label: tp("dur_several") },
    { value: "weekend", label: tp("dur_weekend") },
  ], [t]);

  const typeParam = searchParams.get("type");
  const [step, setStep] = useState(1);
  const [missionType, setMissionType] = useState<"besoin" | "offre">(typeParam === "offre" ? "offre" : "besoin");
  const [category, setCategory] = useState("animals");
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
    setExchangeError(EURO_REGEX.test(val) ? tp("exchange_error_euros") : "");
  };

  /* Step 1 validation */
  const step1Valid =
    title.trim().length >= MIN_TITLE_LEN &&
    description.trim().length >= MIN_DESC_LEN &&
    exchangeOffer.trim().length >= 2 &&
    !exchangeError;

  const handleNextStep = () => {
    setTitleTouched(true);
    setDescTouched(true);
    setExchangeTouched(true);
    if (step1Valid) {
      setStep(2);
      try { trackEvent("mission_composer_step1_completed"); } catch {}
    }
  };

  /**
   * Garde-fous éditoriaux, recalculés à chaque frappe :
   * une mission qui ressemble à une garde d'animaux est invitée vers
   * /sits/create (canal dédié), une cession ou adoption d'animaux est
   * signalée à la modération. Jamais bloquant.
   */
  const sitLike = useMemo(() => sitLikeSignals(title, description), [title, description]);
  const rehoming = useMemo(() => rehomingSignals(title, description), [title, description]);

  // Volume d'audience : combien de personnes seront prévenues à la publication.
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  useEffect(() => {
    if (step !== 2 || !city.trim()) {
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
          p_radius_km: 30,
        });
        if (!cancelled) setAudienceCount(typeof data === "number" ? data : null);
      } catch {
        if (!cancelled) setAudienceCount(null);
      }
    }, 600);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [step, city]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (EURO_REGEX.test(exchangeOffer)) return;
    if (submitting) return;
    const missing: string[] = [];
    if (!title.trim()) missing.push("Titre");
    if (!description.trim()) missing.push("Description");
    if (!exchangeOffer.trim()) missing.push("Contrepartie");
    if (!city.trim()) missing.push("Ville");
    if (!postalCode.trim()) missing.push("Code postal");
    if (!duration) missing.push("Durée estimée");
    if (missing.length > 0) {
      const stepOneMissing = missing.some((m) => ["Titre", "Description", "Contrepartie"].includes(m));
      toast({
        title: missing.length > 1 ? "Champs manquants" : "Champ manquant",
        description: `À compléter : ${missing.join(", ")}.`,
        variant: "destructive",
      });
      setStep(stepOneMissing ? 1 : 2);
      if (stepOneMissing) {
        setTitleTouched(true);
        setDescTouched(true);
        setExchangeTouched(true);
      }
      setPlaceTouched(true);
      return;
    }
    if (title.trim().length < MIN_TITLE_LEN || description.trim().length < MIN_DESC_LEN) {
      toast({
        title: "Annonce trop courte",
        description: `Titre ≥ ${MIN_TITLE_LEN} caractères, description ≥ ${MIN_DESC_LEN} caractères.`,
        variant: "destructive",
      });
      setStep(1);
      setTitleTouched(true);
      setDescTouched(true);
      return;
    }
    await performSubmit();
  };

  const performSubmit = async () => {
    if (!user) return;

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
      setStep(1);
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
      if (hint === "account_not_active" || msg.includes("account_not_active")) {
        toast({ title: "Compte non actif", description: "Contactez le support pour rétablir l'accès à l'entraide.", variant: "destructive" });
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
        <StepperBar current={step} total={2} />
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
          onClick={() => step === 1 ? navigate("/petites-missions") : setStep(1)}
          className="flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground transition-colors -ml-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 1 ? tp("back") : "Étape précédente"}
        </button>

        {!accessLoading && !canApplyMissions && (
          <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
        )}

        {(accessLoading || canApplyMissions) && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── ÉTAPE 1 : Votre annonce ── */}
            {step === 1 && (
              <>
                <div className="rounded-xl p-4 border border-primary/20 bg-primary/5 space-y-1">
                  <h2 className="font-heading font-bold text-foreground text-base">
                    {tp("encouragement_title")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {missionType === "offre" ? tp("encouragement_offer") : tp("encouragement_need")}
                  </p>
                  <p className="inline-block text-xs font-medium bg-badge-success text-badge-success-foreground px-3 py-1 rounded-full mt-1">
                    {tp("free_badge")}
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
                <p className="text-xs text-muted-foreground">
                  Une simple question à poser ?{" "}
                  <Link to="/questions/nouvelle" className="text-primary hover:underline font-medium">
                    Posez-la à la communauté
                  </Link>
                </p>

                {/* Catégorie */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{tp("category_label")}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Titre */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{tp("title_label")}</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    placeholder={missionType === "offre" ? tp("title_ph_offer") : tp("title_ph_need")}
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

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {missionType === "offre" ? tp("desc_label_offer") : tp("desc_label_need")}
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescBlur}
                    placeholder={
                      missionType === "offre"
                        ? tp("desc_ph_offer")
                        : "Précisez l'animal (espèce, taille, âge), les dates approximatives et ce que vous attendez concrètement (promenade, gamelle, jeu…). Plus c'est clair, plus vite vous aurez des propositions."
                    }
                    rows={5}
                    className="text-base resize-none"
                  />
                  <div className="flex items-center justify-between text-xs">
                    {descTouched && description.trim().length < MIN_DESC_LEN ? (
                      <p className="text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        Description trop courte, décrivez le contexte pour rassurer.
                      </p>
                    ) : (
                      <span className="text-muted-foreground">Minimum {MIN_DESC_LEN} caractères.</span>
                    )}
                    <span className={cn("tabular-nums", descTouched && description.trim().length < MIN_DESC_LEN ? "text-destructive" : "text-muted-foreground")}>
                      {description.trim().length}/{MIN_DESC_LEN}
                    </span>
                  </div>
                </div>

                {/* Échange proposé */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {missionType === "offre" ? tp("exchange_label_offer") : tp("exchange_label_need")}
                  </Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Un coup de main = un échange. Pas d'euros. Restez simple et sincère.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(missionType === "offre"
                      ? [
                          "Un coup de main en retour quand vous voulez",
                          "Un moment partagé autour d'un café",
                          "Rien, ça me fait plaisir",
                        ]
                      : [
                          "Un café et des biscuits maison",
                          "Des œufs de la semaine",
                          "Un coup de main en retour quand vous voulez",
                        ]
                    ).map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => handleExchangeChange(ex)}
                        className="rounded-full border border-border bg-background text-foreground/80 hover:border-primary/40 hover:text-foreground px-3 py-1 text-[11px] transition-colors"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                  <Input
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
              </>
            )}

            {/* ── ÉTAPE 2 : Lieu et date ── */}
            {step === 2 && (
              <>
                <h2 className="font-heading font-semibold text-lg">Où et quand ?</h2>

                <PostalCodeCityFields
                  city={city}
                  postalCode={postalCode}
                  onChange={(partial) => {
                    if (partial.city !== undefined) setCity(partial.city);
                    if (partial.postal_code !== undefined) setPostalCode(partial.postal_code);
                  }}
                  required
                  inputClassName="h-12 text-base"
                />

                {/* Date — Drawer full-screen mobile */}
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
                      <p className="text-sm font-semibold mb-0.5">L'animal concerné</p>
                      <p className="text-xs text-muted-foreground">Aide les gens à savoir s'ils peuvent proposer leur aide.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Espèce</Label>
                      <Select value={petSpecies} onValueChange={setPetSpecies}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Chien, chat…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chien">Chien</SelectItem>
                          <SelectItem value="chat">Chat</SelectItem>
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

                {/* Durée */}
                <div className="space-y-2">
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
                </div>

                {/* Champs de lieu manquants, nommés explicitement */}
                {placeTouched && (!city.trim() || !postalCode.trim()) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    À compléter : {[!city.trim() ? "Ville" : null, !postalCode.trim() ? "Code postal" : null].filter(Boolean).join(", ")}.
                  </p>
                )}


                {/* Photos */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{tp("photos_label")}</Label>
                  <MissionPhotoUpload userId={user!.id} photos={photos} onChange={setPhotos} />
                </div>
              </>
            )}
          </form>
        )}
      </div>

      {/* CTA sticky au-dessus de la BottomNav */}
      {(accessLoading || canApplyMissions) && (
        <div ref={actionBarRef} className="fixed bottom-[var(--bottom-nav-h,0px)] inset-x-0 bg-card/95 backdrop-blur border-t border-border px-4 py-3 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto space-y-2">
            {step === 2 && identityRecommended && <IdentityRecommendedHint compact />}
            {step === 2 && audienceCount !== null && audienceCount > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Votre demande sera proposée à {audienceCount} personne{audienceCount > 1 ? "s" : ""} autour de {city.trim()}.
              </p>
            )}
            {step === 1 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="w-full h-12 text-base font-semibold"
              >
                Continuer
              </Button>
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
