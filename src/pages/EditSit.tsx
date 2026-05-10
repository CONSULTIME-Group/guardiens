import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Helmet } from "react-helmet-async";
import ChipSelect from "@/components/profile/ChipSelect";
import { ArrowLeft, AlertCircle, Zap, FileText, CalendarDays, Users, Sparkles, ImageIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

/** Carte de section pour grouper visuellement les champs d'édition. */
const SectionCard = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
    <div className="flex items-start gap-3 mb-4">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <h2 className="font-heading font-semibold text-base">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
    <div className="space-y-5">{children}</div>
  </section>
);

const openToOptions = ["Familles", "Solo", "Couples", "Retraités", "Sans préférence"];
const FLEXIBLE_MONTHS = ["Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre"];
const FLEXIBLE_DURATIONS = ["Week-end", "1 semaine", "2 semaines", "1 mois+"];
const MIN_SITS_OPTIONS = [
  { label: "Aucune exigence", value: 0 },
  { label: "1 garde+", value: 1 },
  { label: "3 gardes+", value: 3 },
  { label: "5 gardes+", value: 5 },
];

const EditSit = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [flexibleMonths, setFlexibleMonths] = useState<string[]>([]);
  const [flexibleDuration, setFlexibleDuration] = useState("");
  const [specificExpectations, setSpecificExpectations] = useState("");
  const [openTo, setOpenTo] = useState<string[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [minGardienSits, setMinGardienSits] = useState(0);
  const [sitStatus, setSitStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("sits")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (!data) { navigate("/sits"); return; }
      setTitle(data.title || "");
      setStartDate(data.start_date || "");
      setEndDate(data.end_date || "");
      setFlexibleDates(data.flexible_dates || false);
      setSpecificExpectations(data.specific_expectations || "");
      setOpenTo((data.open_to as string[]) || []);
      setIsUrgent(data.is_urgent || false);
      setMinGardienSits((data as any).min_gardien_sits || 0);
      setSitStatus(data.status || "");
      setLoading(false);
    };
    load();
  }, [id, user, navigate]);

  const today = new Date().toISOString().split("T")[0];
  const dateError = !flexibleDates && startDate && endDate && startDate >= endDate
    ? "La date de fin doit être après la date de début." : null;

  const hasDatesOrFlexible = flexibleDates
    ? flexibleMonths.length > 0
    : !!(startDate && endDate && !dateError);

  const canSave = title && hasDatesOrFlexible && !dateError;

  // Show urgent: not confirmed, start < 7 days or flexible
  const showUrgent = sitStatus !== "confirmed" && (flexibleDates || (startDate && new Date(startDate).getTime() - Date.now() < 7 * 86400000));

  const handleSave = async () => {
    if (!user || !id || !canSave) return;

    // Garde-fou : si la garde est confirmée et qu'on modifie les dates, prévenir
    if (sitStatus === "confirmed") {
      const datesChanged = !flexibleDates && (startDate || endDate);
      if (datesChanged) {
        const ok = window.confirm(
          "Cette garde est confirmée. Modifier les dates n'enverra PAS de notification automatique au gardien — pensez à le prévenir via la messagerie. Continuer ?"
        );
        if (!ok) return;
      }
    }

    setSaving(true);

    let expectations = specificExpectations;
    if (flexibleDates) {
      const flexNote = [
        flexibleMonths.length > 0 ? `Mois : ${flexibleMonths.join(", ")}` : "",
        flexibleDuration ? `Durée : ${flexibleDuration}` : "",
      ].filter(Boolean).join(" · ");
      if (flexNote && !expectations.includes("Flexibilité :")) {
        expectations = `${expectations}\n\nFlexibilité : ${flexNote}`.trim();
      }
    }

    const { error } = await supabase.from("sits").update({
      title,
      start_date: flexibleDates ? null : startDate,
      end_date: flexibleDates ? null : endDate,
      flexible_dates: flexibleDates,
      specific_expectations: expectations,
      open_to: openTo,
      is_urgent: isUrgent,
      min_gardien_sits: minGardienSits,
    } as any).eq("id", id).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder." });
      return;
    }
    toast({ title: "Annonce mise à jour" });
    navigate(`/sits/${id}`);
  };

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in pb-40">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <Link to={`/sits/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour à l'annonce
      </Link>

      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">Modifier l'annonce</h1>
      <p className="text-muted-foreground mb-8 text-sm">Modifiez les informations spécifiques à cette garde. Le logement et les animaux se gèrent depuis votre profil.</p>

      <div className="space-y-5 pb-32">
        {/* SECTION 1 — Essentiel : titre + dates */}
        <SectionCard
          icon={FileText}
          title="L'essentiel"
          description="Le titre et les dates de votre garde."
        >
          <div>
            <Label className="text-sm font-medium">Titre de l'annonce</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5" />
          </div>

          <div className="pt-1">
            <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              Dates de la garde
            </Label>
            {!flexibleDates ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Date de début</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today} className="mt-1.5" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date de fin</Label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || today} className="mt-1.5" />
                  </div>
                </div>
                {dateError && (
                  <p className="text-sm text-destructive flex items-center gap-1.5 mt-2">
                    <AlertCircle className="h-3.5 w-3.5" /> {dateError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setFlexibleDates(true)}
                  className="text-xs text-primary cursor-pointer mt-2 block hover:underline"
                >
                  Mes dates sont flexibles →
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Quel mois ?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {FLEXIBLE_MONTHS.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFlexibleMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                        className={flexibleMonths.includes(m)
                          ? "bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs"
                          : "border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:border-primary transition-colors"
                        }
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Combien de temps ?</p>
                  <div className="flex flex-wrap gap-2">
                    {FLEXIBLE_DURATIONS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setFlexibleDuration(prev => prev === d ? "" : d)}
                        className={flexibleDuration === d
                          ? "bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs"
                          : "border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:border-primary transition-colors"
                        }
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFlexibleDates(false)}
                  className="text-xs text-muted-foreground block cursor-pointer hover:text-primary"
                >
                  ← Renseigner des dates précises
                </button>
              </div>
            )}
          </div>
        </SectionCard>

        {/* SECTION 2 — Description */}
        <SectionCard
          icon={Sparkles}
          title="Description de la garde"
          description="Ce qui rend cette garde unique (50 caractères minimum)."
        >
          <div>
            <Textarea
              placeholder="Décrivez ce qui est particulier à cette garde…"
              value={specificExpectations}
              onChange={e => setSpecificExpectations(e.target.value)}
              rows={5}
            />
            <p className={cn(
              "text-xs mt-1.5",
              specificExpectations.length > 0 && specificExpectations.length < 50
                ? "text-destructive"
                : "text-muted-foreground"
            )}>
              {specificExpectations.length}/50 caractères minimum
            </p>
          </div>
        </SectionCard>

        {/* SECTION 3 — Profil de gardien souhaité */}
        <SectionCard
          icon={Users}
          title="Gardien recherché"
          description="Préférences indicatives — tous les profils peuvent postuler."
        >
          <div>
            <Label className="text-sm font-medium mb-2 block">Idéale pour</Label>
            <ChipSelect options={openToOptions} selected={openTo} onChange={setOpenTo} />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Expérience souhaitée</Label>
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
        </SectionCard>

        {/* SECTION 4 — Photos (renvoi vers la fiche) */}
        <SectionCard
          icon={ImageIcon}
          title="Photos & couverture"
          description="La gestion des photos se fait directement sur la fiche."
        >
          <Link
            to={`/sits/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Gérer les photos sur la fiche annonce →
          </Link>
        </SectionCard>
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t border-border p-4 z-40">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate(`/sits/${id}`)}>
            Annuler
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Button
                    className={`w-full ${canSave ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                    onClick={handleSave}
                    disabled={saving || !canSave}
                  >
                    {saving ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </TooltipTrigger>
              {!canSave && (
                <TooltipContent>
                  <p>Complétez le titre et les dates pour enregistrer</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default EditSit;
