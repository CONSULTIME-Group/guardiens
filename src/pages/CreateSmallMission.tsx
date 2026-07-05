import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import PageMeta from "@/components/PageMeta";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import MissionPhotoUpload from "@/components/missions/MissionPhotoUpload";
import { geocodeCity } from "@/lib/geocode";
import { trackFirstAction } from "@/lib/analytics";
import { recordMissionCreatedAttribution } from "@/lib/campaignAttribution";
import { templatesFor, MISSION_TEMPLATES, type MissionTemplate } from "@/data/missionTemplates";
import { AlertCircle, ChevronLeft, CalendarIcon } from "lucide-react";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";

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
  const { level: accessLevel, profileCompletion, canApplyMissions, loading: accessLoading } = useAccessLevel();

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
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);

  const applyTemplate = (tpl: MissionTemplate) => {
    setMissionType(tpl.type);
    setCategory(tpl.category);
    setTitle(tpl.title);
    setDescription(tpl.description);
    setExchangeOffer(tpl.exchange);
    setExchangeError("");
    setDuration(tpl.duration);
    setAppliedTemplateId(tpl.id);
  };

  const clearTemplate = () => {
    setAppliedTemplateId(null);
    setTitle(""); setDescription(""); setExchangeOffer(""); setDuration("");
  };

  const visibleTemplates = templatesFor(missionType);

  useEffect(() => {
    const tParam = searchParams.get("type");
    if (tParam === "besoin" || tParam === "offre") setMissionType(tParam);
  }, []);

  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId) return;
    if (title.trim() || description.trim()) return;
    const tpl = MISSION_TEMPLATES.find((x) => x.id === templateId);
    if (tpl) applyTemplate(tpl);
  }, []);

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
    if (step1Valid) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (EURO_REGEX.test(exchangeOffer)) return;
    if (submitting) return;
    if (!title.trim() || !description.trim() || !exchangeOffer.trim() || !city.trim() || !duration) {
      toast({ title: tp("toast_required_title"), description: tp("toast_required_desc"), variant: "destructive" });
      return;
    }
    // Garde-fous côté client : évite d'insérer une annonce trop courte
    // même si l'utilisateur skippe la validation Step 1 (retour arrière + submit).
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
    setSubmitting(true);
    let coords: { lat: number; lng: number } | null = null;
    try { coords = await geocodeCity(city.trim()); } catch { coords = null; }

    // Titre nettoyé (capitalisation, espaces, fautes fréquentes) au save
    // pour normaliser à la source.
    const cleanTitle = sanitizeUserTitle(title) || title.trim();

    const { data: inserted, error } = await supabase.from("small_missions").insert({
      user_id: user.id,
      title: cleanTitle,
      description: description.trim(),
      category: category as any,
      mission_type: missionType,
      exchange_offer: exchangeOffer.trim(),
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
    } as any).select("id").maybeSingle();

    setSubmitting(false);
    if (error) {
      toast({ title: tp("toast_error_title"), description: error.message, variant: "destructive" });
      return;
    }
    try { await trackFirstAction("mission_created", { category, mission_type: missionType }); } catch {}
    if (inserted?.id) { try { await recordMissionCreatedAttribution(inserted.id); } catch {} }
    await queryClient.invalidateQueries({ queryKey: ["small-missions-all"] });
    toast({ title: tp("toast_published_title"), description: tp("toast_published_desc"), duration: 3000 });
    navigate(inserted?.id ? `/petites-missions/${inserted.id}?published=1` : "/petites-missions");
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

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-48 md:pb-36">
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

                {/* Templates */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {missionType === "offre" ? tp("templates_title_offer") : tp("templates_title_need")}
                      </p>
                      <p className="text-xs text-muted-foreground">{tp("templates_subtitle")}</p>
                    </div>
                    {appliedTemplateId && (
                      <button type="button" onClick={clearTemplate} className="text-xs text-primary hover:underline whitespace-nowrap">
                        {tp("templates_reset")}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {visibleTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-colors",
                          appliedTemplateId === tpl.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:border-primary/40"
                        )}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

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
                    onBlur={() => setTitleTouched(true)}
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
                    onBlur={() => setDescTouched(true)}
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
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder={tp("duration_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
        <div className="fixed bottom-16 inset-x-0 bg-card/95 backdrop-blur border-t border-border px-4 py-3 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto">
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
