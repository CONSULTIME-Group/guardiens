import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import MissionPhotoUpload from "@/components/missions/MissionPhotoUpload";
import { geocodeCity } from "@/lib/geocode";
import { detectContactDetails, contactDetailsMessage } from "@/lib/contactDetails";
import { hasMoneyMention, sitLikeSignals } from "@/lib/missionContentGuards";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { stripEmojis } from "@/lib/stripEmojis";
import {
  PROJET_NATURE_LABELS,
  PROJET_DURATION_LABELS,
  HEBERGEMENT_LABELS,
  PROJET_SAVOIR_FAIRE,
  PROJET_OFFRE_LABELS,
} from "@/lib/projets";
import { trackEvent } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import { ChevronLeft } from "lucide-react";

/** Longueurs minimales, elles tiennent le sérieux d'une annonce de chantier. */
const MIN_TITLE_LEN = 10;
const MIN_DESC_LEN = 150;
const MAX_PHOTOS = 6;

/** Durées retenues pour un projet, toutes acceptées côté base. */
const PROJET_DURATIONS = ["day", "weekend", "few_days", "several", "week", "two_weeks", "month_plus"];

const HEBERGEMENTS = ["chambre", "dortoir", "camping", "aucun"];

const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** Les cinq déclarations, dans l'ordre où elles sont affichées et stockées. */
const DECLARATIONS: Array<{ key: string; label: string }> = [
  {
    key: "destinataire",
    label: "Ce projet se déroule chez moi ou sur un lieu dont je suis responsable, et j'en suis le destinataire",
  },
  {
    key: "non_commercial",
    label: "Ce lieu n'est pas destiné à la location ni à une activité commerciale",
  },
  {
    key: "presence",
    label: "Je serai présent pendant toute la durée du projet",
  },
  {
    key: "sans_argent",
    label: "Aucune somme d'argent ne sera échangée, dans un sens comme dans l'autre",
  },
  {
    key: "assurance",
    label: "J'ai vérifié auprès de mon assureur que ma couverture inclut les personnes qui viendront participer",
  },
];

const STEP_LABELS = ["Le projet", "Le cadre", "Ce qui se passe sur place"];

/** Clés de champ suivies pour l'abandon, dans l'ordre du formulaire. */
type ProjetField =
  | "title" | "description" | "photos" | "nature"
  | "city" | "months" | "fixed_date" | "duration" | "places"
  | "savoir_faire_attendus" | "savoir_faire_transmis" | "hebergement" | "repas" | "offre"
  | "free_text" | "declarations";

/**
 * Les douze mois à venir, en clair, pour cocher une période d'accueil sans
 * bloquer sur une date ferme.
 */
function nextTwelveMonths(): Array<{ value: string; label: string }> {
  const now = new Date();
  const out: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return out;
}

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Dates déduites des mois cochés. `validate_small_mission` refuse une date de
 * début passée : on retient donc le plus tardif entre le premier jour du mois
 * le plus tôt et aujourd'hui.
 */
export function projetDatesFromMonths(
  months: string[],
  today: Date = new Date(),
): { dateNeeded: string | null; endDate: string | null } {
  if (months.length === 0) return { dateNeeded: null, endDate: null };
  const sorted = [...months].sort();
  const [y1, m1] = sorted[0].split("-").map(Number);
  const [y2, m2] = sorted[sorted.length - 1].split("-").map(Number);
  const first = new Date(y1, m1 - 1, 1);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = first.getTime() < todayStart.getTime() ? todayStart : first;
  const end = new Date(y2, m2, 0);
  return { dateNeeded: isoDay(start), endDate: isoDay(end) };
}

const CreateProjet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Étape 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [nature, setNature] = useState("");

  // Étape 2
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [months, setMonths] = useState<string[]>([]);
  const [fixedDate, setFixedDate] = useState("");
  const [duration, setDuration] = useState("");
  const [places, setPlaces] = useState("6");

  // Étape 3
  const [attendus, setAttendus] = useState<string[]>([]);
  const [transmis, setTransmis] = useState<string[]>([]);
  const [hebergement, setHebergement] = useState("");
  const [repas, setRepas] = useState(false);
  const [offre, setOffre] = useState<string[]>([]);
  const [apprentissage, setApprentissage] = useState("");
  const [declarations, setDeclarations] = useState<Record<string, string>>({});

  const monthOptions = useMemo(() => nextTwelveMonths(), []);
  const allDeclared = DECLARATIONS.every((d) => Boolean(declarations[d.key]));

  const step1Ready =
    title.trim().length >= MIN_TITLE_LEN &&
    description.trim().length >= MIN_DESC_LEN &&
    photos.length >= 1 &&
    Boolean(nature);

  const step2Ready =
    city.trim().length > 0 &&
    postalCode.trim().length > 0 &&
    months.length > 0 &&
    Boolean(duration) &&
    Number(places) >= 1;

  const step3Ready = Boolean(hebergement) && transmis.length >= 1 && allDeclared;

  // ─── Instrumentation, mêmes règles que le composeur d'entraide ───
  // Miroirs par ref : l'abandon lit l'état réel au moment du départ, jamais
  // les valeurs capturées au montage.
  const submittedRef = useRef(false);
  const abandonSentRef = useRef(false);
  const stepRef = useRef(step);
  stepRef.current = step;
  const titleLenRef = useRef(title.trim().length);
  titleLenRef.current = title.trim().length;
  const lastFieldRef = useRef<ProjetField | null>(null);
  const touchField = (field: ProjetField) => { lastFieldRef.current = field; };

  const userIdRef = useRef<string | null>(user?.id ?? null);
  userIdRef.current = user?.id ?? null;

  useEffect(() => {
    try { trackEvent("projet_composer_opened"); } catch { /* ignore */ }
    const emitAbandon = (viaBeacon: boolean) => {
      if (submittedRef.current || abandonSentRef.current) return;
      abandonSentRef.current = true;
      const titleLen = titleLenRef.current;
      try {
        trackEvent("projet_composer_abandoned", {
          // Sur pagehide, la page meurt avant la lecture de session et
          // l'insertion : seul un envoi par balise passe, d'où l'identifiant
          // transmis en métadonnée.
          transport: viaBeacon ? "beacon" : undefined,
          metadata: {
            last_step: stepRef.current,
            last_field: lastFieldRef.current,
            has_title: titleLen > 0,
            title_len: titleLen,
            ...(viaBeacon ? { user_id_hint: userIdRef.current } : {}),
          },
        });
      } catch { /* ignore */ }
    };
    // Fermeture d'onglet ou passage en arrière-plan sur mobile : le démontage
    // n'a pas lieu, pagehide prend le relais. Le garde évite le doublon.
    const onPageHide = () => emitAbandon(true);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      emitAbandon(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTitleBlur = () => {
    const len = title.trim().length;
    if (len > 0 && len < MIN_TITLE_LEN) {
      try { trackEvent("projet_composer_field_abandoned", { metadata: { field: "title", length: len } }); } catch { /* ignore */ }
    }
  };
  const handleDescBlur = () => {
    const len = description.trim().length;
    if (len > 0 && len < MIN_DESC_LEN) {
      try { trackEvent("projet_composer_field_abandoned", { metadata: { field: "description", length: len } }); } catch { /* ignore */ }
    }
  };

  const goStep2 = () => {
    setStep(2);
    try { trackEvent("projet_composer_step1_completed"); } catch { /* ignore */ }
  };
  const goStep3 = () => {
    setStep(3);
    try { trackEvent("projet_composer_step2_completed"); } catch { /* ignore */ }
  };

  const toggleMonth = (value: string) => {
    touchField("months");
    setMonths((prev) => (prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value]));
  };

  const toggleDeclaration = (key: string, checked: boolean) => {
    touchField("declarations");
    setDeclarations((prev) => {
      const next = { ...prev };
      if (checked) next[key] = new Date().toISOString();
      else delete next[key];
      return next;
    });
  };

  /** Cocher un savoir-faire attendu décoche « Rien », décocher revient à « Rien ». */
  const toggleAttendu = (key: string) => {
    touchField("savoir_faire_attendus");
    setAttendus((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const toggleTransmis = (key: string) => {
    touchField("savoir_faire_transmis");
    setTransmis((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const toggleOffre = (key: string) => {
    touchField("offre");
    setOffre((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSubmit = async () => {
    if (!user || submitting) return;
    if (!step1Ready || !step2Ready || !step3Ready) return;

    // Le garde-fou monétaire reste actif sur un projet : les échanges se font
    // en temps et en savoir-faire.
    if (hasMoneyMention(title, description, apprentissage)) {
      toast({
        title: "Ici, les échanges se font en temps",
        description:
          "Votre texte mentionne de l'argent. Un projet participatif se mène en donnant de son temps et en transmettant un savoir-faire.",
        variant: "destructive",
      });
      setStep(1);
      return;
    }

    const contactKinds = detectContactDetails(`${title}\n${description}\n${apprentissage}`);
    if (contactKinds.length > 0) {
      // Signal non bloquant, en tâche de fond : l'essentiel reste le refus.
      void supabase
        .rpc("report_contact_details_attempt" as any, {
          _context: "projet_create",
          _kinds: contactKinds,
          _excerpt: `${title}\n${description}\n${apprentissage}`.slice(0, 500),
        })
        .then(undefined, () => { /* ignore */ });
      toast({ title: "Coordonnées détectées", description: contactDetailsMessage(contactKinds), variant: "destructive" });
      setStep(1);
      return;
    }

    // Règle « garde d'animaux déguisée » neutralisée ici : un abri pour les
    // poules est un chantier, la bascule vers une annonce de garde n'a pas
    // lieu d'être. L'entraide garde la règle active.
    void sitLikeSignals(title, description, { disabled: true });

    setSubmitting(true);
    let coords: { lat: number; lng: number } | null = null;
    try { coords = await geocodeCity(city.trim()); } catch { coords = null; }

    const derived = projetDatesFromMonths(months);
    const dateNeeded = fixedDate || derived.dateNeeded;

    const { data: inserted, error } = await supabase
      .from("small_missions")
      .insert({
        user_id: user.id,
        title: stripEmojis(sanitizeUserTitle(title) || title.trim()),
        description: stripEmojis(description),
        category: "projet" as any,
        // L'enum mission_type n'a que deux valeurs, un projet passe par la catégorie.
        mission_type: "besoin" as any,
        nature_projet: nature,
        city: city.trim(),
        postal_code: postalCode.trim(),
        date_needed: dateNeeded,
        end_date: derived.endDate,
        mois_accueil: [...months].sort(),
        duration_estimate: duration,
        max_participants: Number(places),
        accepting_applications: true,
        hebergement,
        repas,
        offre,
        savoir_faire_attendus: attendus,
        savoir_faire_transmis: transmis,
        ce_que_vous_apprendrez: stripEmojis(apprentissage),
        declarations,
        photos,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      } as any)
      .select("id, slug")
      .maybeSingle();

    setSubmitting(false);

    if (error) {
      const hint = (error as any)?.hint || "";
      const msg = String(error.message || "");
      if (hint === "account_not_active" || msg.includes("account_not_active")) {
        toast({ title: "Compte non actif", description: "Contactez le support pour rétablir la publication.", variant: "destructive" });
        return;
      }
      logger.error("[CreateProjet.handleSubmit]", { message: msg, hint });
      toast({ title: "Publication impossible", description: error.message, variant: "destructive" });
      return;
    }

    submittedRef.current = true;
    const row = inserted as any;
    try {
      trackEvent("projet_composer_submitted", {
        metadata: {
          mission_id: row?.id ?? null,
          nature_projet: nature,
          nb_transmis: transmis.length,
          nb_attendus: attendus.length,
          has_free_text: apprentissage.trim().length > 0,
        },
      });
    } catch { /* ignore */ }

    toast({ title: "Votre projet est en ligne", description: "Les personnes du secteur peuvent désormais le découvrir." });
    navigate(row?.id ? `/projets/${row.slug || row.id}` : "/projets");
  };

  /** Cases de savoir-faire, groupées par famille, lisibles sur un téléphone. */
  const renderSavoirFaire = (
    selected: string[],
    onToggle: (key: string) => void,
    idPrefix: string,
  ) => (
    <div className="space-y-4">
      {PROJET_SAVOIR_FAIRE.map((group) => (
        <div key={group.family} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.family}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.items.map((item) => (
              <label
                key={item.key}
                htmlFor={`${idPrefix}-${item.key}`}
                className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm min-h-[44px] cursor-pointer"
              >
                <Checkbox
                  id={`${idPrefix}-${item.key}`}
                  checked={selected.includes(item.key)}
                  onCheckedChange={() => onToggle(item.key)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <PageMeta
        title="Publier un projet participatif"
        description="Décrivez votre chantier, la période d'accueil et ce que vous transmettrez aux personnes qui viendront participer."
      />

      <main id="main-content">
        <div className="sticky top-12 md:top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
              Publier un projet participatif
            </h1>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Étape {step} / 3</span>
              <span className="text-xs text-muted-foreground">{STEP_LABELS[step - 1]}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
            </div>
          </div>
        </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24">
        <button
          type="button"
          onClick={() => (step === 1 ? navigate("/projets") : setStep(step - 1))}
          className="flex items-center gap-1 min-h-[44px] text-sm text-foreground/60 hover:text-foreground transition-colors -ml-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 1 ? "Retour aux projets" : "Étape précédente"}
        </button>

        {step === 1 && (
          <section className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="projet-title">Titre du projet</Label>
              <Input
                id="projet-title"
                value={title}
                onFocus={() => touchField("title")}
                onChange={(e) => { touchField("title"); setTitle(e.target.value); }}
                onBlur={handleTitleBlur}
                placeholder="Monter un mur en pierre sèche dans le jardin"
              />
              <p className="text-xs text-muted-foreground">{title.trim().length} caractères, {MIN_TITLE_LEN} au minimum.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projet-description">Le projet</Label>
              <Textarea
                id="projet-description"
                value={description}
                onFocus={() => touchField("description")}
                onChange={(e) => { touchField("description"); setDescription(e.target.value); }}
                onBlur={handleDescBlur}
                rows={8}
                placeholder="Racontez le chantier, son état d'avancement, les gestes qui seront faits et l'ambiance sur place."
              />
              <p className="text-xs text-muted-foreground">{description.trim().length} caractères, {MIN_DESC_LEN} au minimum.</p>
            </div>

            <div className="space-y-2">
              <Label>Photos du lieu</Label>
              {user && (
                <MissionPhotoUpload
                  userId={user.id}
                  photos={photos}
                  onChange={(next: string[]) => { touchField("photos"); setPhotos(next); }}
                  maxPhotos={MAX_PHOTOS}
                />
              )}
              <p className="text-xs text-muted-foreground">Une photo au minimum, six au maximum.</p>
            </div>

            <div className="space-y-2">
              <Label>Nature du projet</Label>
              <Select value={nature} onValueChange={(v) => { touchField("nature"); setNature(v); }}>
                <SelectTrigger><SelectValue placeholder="Choisissez la nature du chantier" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJET_NATURE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="button" className="w-full rounded-full" disabled={!step1Ready} onClick={goStep2}>
              Continuer
            </Button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-5">
            <PostalCodeCityFields
              city={city}
              postalCode={postalCode}
              onChange={(partial: any) => {
                touchField("city");
                if (partial.city !== undefined) setCity(partial.city);
                if (partial.postal_code !== undefined) setPostalCode(partial.postal_code);
              }}
              required
              showRequiredMark={false}
            />

            <div className="space-y-2">
              <Label>Mois d'accueil</Label>
              <div className="grid grid-cols-2 gap-2">
                {monthOptions.map((m) => (
                  <label key={m.value} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm min-h-[44px]">
                    <Checkbox checked={months.includes(m.value)} onCheckedChange={() => toggleMonth(m.value)} />
                    <span className="capitalize">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projet-date">Date ferme, si vous en avez une</Label>
              <Input
                id="projet-date"
                type="date"
                value={fixedDate}
                onFocus={() => touchField("fixed_date")}
                onChange={(e) => { touchField("fixed_date"); setFixedDate(e.target.value); }}
              />
            </div>

            <div className="space-y-2">
              <Label>Durée du chantier</Label>
              <Select value={duration} onValueChange={(v) => { touchField("duration"); setDuration(v); }}>
                <SelectTrigger><SelectValue placeholder="Choisissez une durée" /></SelectTrigger>
                <SelectContent>
                  {PROJET_DURATIONS.map((value) => (
                    <SelectItem key={value} value={value}>{PROJET_DURATION_LABELS[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projet-places">Nombre de personnes accueillies</Label>
              <Input
                id="projet-places"
                type="number"
                min={1}
                max={30}
                value={places}
                onFocus={() => touchField("places")}
                onChange={(e) => { touchField("places"); setPlaces(e.target.value); }}
              />
            </div>

            <Button type="button" className="w-full rounded-full" disabled={!step2Ready} onClick={goStep3}>
              Continuer
            </Button>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-8">
            <div className="space-y-3">
              <Label>Ce qu'il faut savoir faire</Label>
              <label
                htmlFor="projet-attendus-rien"
                className="flex items-center gap-3 rounded-xl border border-border px-3 py-3 text-sm min-h-[44px] cursor-pointer"
              >
                <Checkbox
                  id="projet-attendus-rien"
                  checked={attendus.length === 0}
                  onCheckedChange={() => { touchField("savoir_faire_attendus"); setAttendus([]); }}
                />
                <span>Rien, tout s'apprend sur place</span>
              </label>
              {renderSavoirFaire(attendus, toggleAttendu, "projet-attendus")}
            </div>

            <div className="space-y-3">
              <Label>Ce que vous transmettez</Label>
              <p className="text-xs text-muted-foreground">Choisissez au moins un savoir-faire.</p>
              {renderSavoirFaire(transmis, toggleTransmis, "projet-transmis")}
            </div>

            <div className="space-y-3">
              <Label>Ce que vous offrez</Label>
              <div className="space-y-2">
                {HEBERGEMENTS.map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm min-h-[44px] cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="projet-hebergement"
                      value={value}
                      checked={hebergement === value}
                      onChange={() => { touchField("hebergement"); setHebergement(value); }}
                      className="h-4 w-4 accent-primary"
                    />
                    <span>{HEBERGEMENT_LABELS[value]}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  htmlFor="projet-repas"
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm min-h-[44px] cursor-pointer"
                >
                  <Checkbox
                    id="projet-repas"
                    checked={repas}
                    onCheckedChange={(v) => { touchField("repas"); setRepas(v === true); }}
                  />
                  <span>Les repas sont partagés sur place</span>
                </label>
                {Object.entries(PROJET_OFFRE_LABELS).map(([value, label]) => (
                  <label
                    key={value}
                    htmlFor={`projet-offre-${value}`}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm min-h-[44px] cursor-pointer"
                  >
                    <Checkbox
                      id={`projet-offre-${value}`}
                      checked={offre.includes(value)}
                      onCheckedChange={() => toggleOffre(value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projet-apprentissage">En quelques mots</Label>
              <Textarea
                id="projet-apprentissage"
                value={apprentissage}
                onFocus={() => touchField("free_text")}
                onChange={(e) => { touchField("free_text"); setApprentissage(e.target.value); }}
                rows={6}
                placeholder="Ce que vous voulez ajouter sur l'ambiance, le rythme, ce que l'on apprend en faisant."
              />
            </div>

            <div className="rounded-[1.5rem] border border-border bg-muted/40 p-5 space-y-4">
              <h2 className="font-heading text-lg font-bold text-foreground">Vos déclarations</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ces cinq points définissent le cadre de votre accueil. Ils sont tous requis pour publier.
              </p>
              {DECLARATIONS.map((d) => (
                <label key={d.key} className="flex items-start gap-3 text-sm leading-relaxed">
                  <Checkbox
                    className="mt-0.5"
                    checked={Boolean(declarations[d.key])}
                    onCheckedChange={(v) => toggleDeclaration(d.key, v === true)}
                  />
                  <span>{d.label}</span>
                </label>
              ))}
            </div>

            <Button
              type="button"
              className="w-full rounded-full py-6 font-bold"
              disabled={!step3Ready || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Publication en cours" : "Publier mon projet"}
            </Button>
          </section>
        )}
      </div>
    </main>
  </>
  );
};

export default CreateProjet;
