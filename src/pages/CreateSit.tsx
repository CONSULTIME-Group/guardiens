import { useState, useEffect } from "react";
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
import { Calendar, Home, PawPrint, ShieldCheck, MessageSquare, Users, ArrowLeft, AlertCircle, Zap } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { hasMedication } from "@/lib/medication";
import { trackFirstAction } from "@/lib/analytics";

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

const FirstAnnonceTip = () => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border-l-4 border-amber-400 bg-amber-50/60 p-3 mb-8">
      <div className="flex-1">
        <p className="text-sm text-amber-900">
          Première annonce ? <a href="/actualites/rediger-bonne-annonce-house-sitting" className="text-primary underline font-medium">Lisez nos conseils pour attirer les meilleurs gardiens →</a>
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-500 hover:text-amber-700 text-lg leading-none shrink-0">×</button>
    </div>
  );
};

const CreateSit = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromSitId = searchParams.get("from");

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

  const [property, setProperty] = useState<PropertySummary | null>(null);
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<OwnerSummary | null>(null);
  const [ownerPhotos, setOwnerPhotos] = useState<string[]>([]);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [isRepublish, setIsRepublish] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [propRes, ownerRes, profileRes, galleryRes] = await Promise.all([
        supabase.from("properties").select("*").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("owner_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("profile_completion").eq("id", user.id).single(),
        supabase.from("owner_gallery").select("photo_url").eq("user_id", user.id).limit(4),
      ]);

      // If republishing, fetch the source sit in parallel
      let sourceSitRes: { data: any } | null = null;
      if (fromSitId) {
        sourceSitRes = await supabase.from("sits").select("title, specific_expectations, open_to, environments, min_gardien_sits, flexible_dates, max_applications").eq("id", fromSitId).single();
      }

      setProfileCompletion(profileRes.data?.profile_completion || 0);
      setOwnerPhotos((galleryRes.data || []).map((g: any) => g.photo_url));

      // Pre-fill from previous sit if republishing
      if (sourceSitRes?.data) {
        const s = sourceSitRes.data;
        setTitle(s.title || "");
        setSpecificExpectations(s.specific_expectations || "");
        setOpenTo(s.open_to || []);
        setSitEnvironments(s.environments || []);
        setMinGardienSits(s.min_gardien_sits || 0);
        setFlexibleDates(s.flexible_dates || false);
        setMaxApplications(s.max_applications || null);
        setIsRepublish(true);
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
        // Only set environments from owner profile if NOT republishing (source sit takes priority)
        if (!fromSitId) {
          setSitEnvironments((o as any).environments || []);
        }
      }
      setLoading(false);
    };
    load();
  }, [user, fromSitId]);

  const today = new Date().toISOString().split("T")[0];
  const dateError = startDate && endDate && startDate >= endDate
    ? "La date de fin doit être après la date de début."
    : startDate && startDate < today
    ? "La date de début ne peut pas être dans le passé."
    : null;

  const descriptionValid = specificExpectations.length >= 50;
  const canPublish = profileCompletion >= 60 && property && title && startDate && endDate && !dateError && descriptionValid;

  // Show urgent option: not confirmed, start < 7 days or flexible
  const showUrgent = flexibleDates || (startDate && new Date(startDate).getTime() - Date.now() < 7 * 86400000);

  const handlePublish = async () => {
    if (!user || !property || !canPublish) return;
    setPublishing(true);
    try {
      let expectations = specificExpectations;
      if (flexibleDates && flexibleNotes) {
        expectations = `${expectations}\n\nDates flexibles : ${flexibleNotes}`.trim();
      }

      const { data: sit, error } = await supabase.from("sits").insert({
        user_id: user.id,
        property_id: property.id,
        title,
        start_date: startDate,
        end_date: endDate,
        flexible_dates: flexibleDates,
        specific_expectations: expectations,
        open_to: openTo,
        is_urgent: isUrgent,
        status: "published" as any,
        environments: sitEnvironments,
        min_gardien_sits: minGardienSits,
        max_applications: maxApplications,
      } as any).select("id").single();

      if (error) throw error;
      try { await trackFirstAction("sit_created", { sit_id: sit.id, is_urgent: isUrgent }); } catch {}
      toast({ title: "Annonce publiée ! 🎉", description: "Les gardiens peuvent maintenant postuler." });
      navigate(`/sits/${sit.id}`);
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de publier l'annonce." });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <div className="p-6 md:p-10 max-w-3xl mx-auto text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in pb-40">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <Link to="/sits" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour à mes gardes
      </Link>

      <h1 className="font-heading text-3xl font-bold mb-2">
        {isRepublish ? "Republier une garde" : "Publier une garde"}
      </h1>
      <p className="text-muted-foreground mb-4">
        {isRepublish
          ? "Les informations de votre précédente annonce sont pré-remplies. Ajustez les dates et détails si besoin."
          : "Les informations de votre profil sont pré-remplies. Ajoutez les détails spécifiques à cette garde."}
      </p>

      {!isRepublish && <FirstAnnonceTip />}

      {profileCompletion < 60 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-destructive">Profil incomplet ({profileCompletion}%)</p>
            <p className="text-sm text-muted-foreground mt-1">Complétez votre profil à au moins 60% pour publier une annonce.</p>
            <Link to="/owner-profile" className="text-sm text-primary underline mt-2 inline-block">Compléter mon profil →</Link>
          </div>
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-6">
        <div>
          <Label className="text-sm font-medium">Titre de l'annonce *</Label>
          <Input
            placeholder="Ex : Garde de 2 chats à Écully — 10 jours en août"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="mt-1.5"
          />
        </div>

        {/* Dates obligatoires */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Date de début *</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Date de fin *</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || today} className="mt-1.5" />
          </div>
        </div>
        {dateError && (
          <p className="text-sm text-destructive flex items-center gap-1.5 -mt-2">
            <AlertCircle className="h-3.5 w-3.5" /> {dateError}
          </p>
        )}

        {/* Option dates flexibles */}
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
              Les dates ci-dessus restent obligatoires pour les rappels automatiques, mais vous indiquez aux gardiens que vous êtes flexible.
            </p>
          </div>
        </div>
        {flexibleDates && (
          <div className="-mt-2">
            <Label className="text-sm font-medium">Précisez vos dates approximatives</Label>
            <Input
              placeholder="Ex : autour du 15 juillet, flexible d'une semaine"
              value={flexibleNotes}
              onChange={e => setFlexibleNotes(e.target.value)}
              className="mt-1.5"
            />
          </div>
        )}

        <div>
          <Label className="text-sm font-medium">Description de la garde *</Label>
          <Textarea
            placeholder="Décrivez ce qui est particulier à cette garde, en plus de ce qui est déjà dans votre profil (min. 50 caractères)"
            value={specificExpectations}
            onChange={e => setSpecificExpectations(e.target.value)}
            className="mt-1.5"
            rows={4}
          />
          <p className={cn(
            "text-xs mt-1",
            specificExpectations.length > 0 && specificExpectations.length < 50
              ? "text-destructive"
              : "text-muted-foreground"
          )}>
            {specificExpectations.length}/50 caractères minimum
          </p>
        </div>

        {/* CORRECTION 1 — "Idéale pour" */}
        <div>
          <Label className="text-sm font-medium mb-1 block">Idéale pour (optionnel)</Label>
          <p className="text-xs text-muted-foreground mb-3">Une indication pour les gardiens — tout le monde peut postuler.</p>
          <ChipSelect options={openToOptions} selected={openTo} onChange={setOpenTo} />
        </div>

        {/* CORRECTION 4 — Gardes minimum gardien souhaité */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-1 block">Expérience souhaitée du gardien</Label>
          <p className="text-xs text-muted-foreground mb-3">Une préférence — les gardiens avec moins d'expérience peuvent aussi postuler.</p>
          <div className="flex flex-wrap gap-2">
            {MIN_SITS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMinGardienSits(opt.value)}
                className={minGardienSits === opt.value
                  ? "bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-medium"
                  : "border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:border-primary transition-colors"
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
            Une fois le max atteint, l'annonce cesse d'accepter de nouvelles candidatures.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
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
              className="w-20 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setMaxApplications(prev => Math.min(50, (prev ?? 10) + 1))}
              disabled={maxApplications !== null && maxApplications >= 50}
            >
              +
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-1 block">Environnement (optionnel)</Label>
          <p className="text-xs text-muted-foreground mb-3">Par défaut, on utilise l'environnement de votre profil. Vous pouvez le personnaliser pour cette annonce.</p>
          <EnvironmentPills selected={sitEnvironments} onChange={setSitEnvironments} />
        </div>

        {/* CORRECTION 3 — Urgent */}
        {showUrgent && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Checkbox
              checked={isUrgent}
              onCheckedChange={(v) => setIsUrgent(v === true)}
              className="mt-0.5"
            />
            <div>
              <label className="text-sm font-medium flex items-center gap-1.5 cursor-pointer text-amber-800" onClick={() => setIsUrgent(!isUrgent)}>
                <Zap className="h-4 w-4" /> Urgent — garde dans moins de 48h
              </label>
              <p className="text-xs text-amber-600 mt-0.5">
                Les gardiens d'urgence seront alertés en priorité
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pre-filled summaries */}
      <div className="mt-10 space-y-6 pb-32">
        <h2 className="font-heading text-xl font-semibold">Résumé depuis votre profil</h2>

        {/* Housing */}
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

              {/* CORRECTION 5 — Aperçu photos */}
              <div className="mt-3">
                <p className="text-sm font-medium text-foreground mb-2">Photos affichées sur l'annonce</p>
                {ownerPhotos.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {ownerPhotos.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt={`Photo ${i + 1}`} className="rounded-lg object-cover h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Aucune photo — les annonces avec photos reçoivent 3× plus de candidatures</p>
                  </div>
                )}
                <Link to="/owner-profile#galerie" className="text-xs text-primary hover:underline mt-2 inline-block">
                  Gérer mes photos dans mon profil →
                </Link>
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground italic">Aucun logement renseigné</p>}
        </SummaryCard>

        {/* Animals */}
        <SummaryCard icon={PawPrint} title="Les animaux" editLink="/profile">
          {pets.length > 0 ? (
            <div className="space-y-3">
              {pets.map((pet, i) => (
                <div key={i} className="flex items-center gap-3">
                  {pet.photo_url && <img src={pet.photo_url} alt={pet.name} className="w-10 h-10 rounded-full object-cover" />}
                  <div>
                    <p className="text-sm font-medium">{speciesLabels[pet.species]?.split(" ")[0]} {pet.name}{pet.breed ? ` — ${pet.breed}` : ""}</p>
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

        {/* Rules */}
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

        {/* Sitter profile wanted */}
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

        {/* Communication */}
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

      {/* CORRECTION 6 — Publish button */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    onClick={handlePublish}
                    disabled={!canPublish || publishing}
                    className={`w-full h-12 text-base font-semibold ${canPublish ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                  >
                    {publishing ? "Publication en cours..." : "Publier l'annonce"}
                  </Button>
                </div>
              </TooltipTrigger>
              {!canPublish && (
                <TooltipContent>
                  <p>Complétez le titre et les dates pour publier</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
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
