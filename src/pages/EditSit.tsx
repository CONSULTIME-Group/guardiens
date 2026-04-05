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
import ChipSelect from "@/components/profile/ChipSelect";
import { ArrowLeft, AlertCircle, Zap } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

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
  const [ownerPhotos, setOwnerPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const [sitRes, galleryRes] = await Promise.all([
        supabase.from("sits").select("*").eq("id", id).eq("user_id", user.id).single(),
        supabase.from("owner_gallery").select("photo_url").eq("user_id", user.id).limit(4),
      ]);
      const data = sitRes.data;
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
      setOwnerPhotos((galleryRes.data || []).map((g: any) => g.photo_url));
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
    setSaving(true);

    let expectations = specificExpectations;
    if (flexibleDates) {
      const flexNote = [
        flexibleMonths.length > 0 ? `Mois : ${flexibleMonths.join(", ")}` : "",
        flexibleDuration ? `Durée : ${flexibleDuration}` : "",
      ].filter(Boolean).join(" · ");
      if (flexNote && !expectations.includes("📅 Flexibilité")) {
        expectations = `${expectations}\n\n📅 Flexibilité : ${flexNote}`.trim();
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
    toast({ title: "Annonce mise à jour ✓" });
    navigate(`/sits/${id}`);
  };

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-fade-in pb-40">
      <Link to={`/sits/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour à l'annonce
      </Link>

      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">Modifier l'annonce</h1>
      <p className="text-muted-foreground mb-8 text-sm">Modifiez les informations spécifiques à cette garde. Le logement et les animaux se gèrent depuis votre profil.</p>

      <div className="space-y-6 pb-32">
        <div>
          <Label className="text-sm font-medium">Titre de l'annonce</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5" />
        </div>

        {/* CORRECTION 2 — Dates flexibles enrichies */}
        {!flexibleDates ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Date de début</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm font-medium">Date de fin</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || today} className="mt-1.5" />
              </div>
            </div>
            {dateError && (
              <p className="text-sm text-destructive flex items-center gap-1.5 -mt-2">
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
              <p className="text-xs text-muted-foreground mb-2 mt-4">Combien de temps ?</p>
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
              className="text-xs text-muted-foreground mt-3 block cursor-pointer hover:text-primary"
            >
              ← Renseigner des dates précises
            </button>
          </div>
        )}

        <div>
          <Label className="text-sm font-medium">Description de la garde *</Label>
          <Textarea
            placeholder="Ce qui est particulier à cette garde (min. 50 caractères)"
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
              </label>
              <p className="text-xs text-amber-600 mt-0.5">
                Les gardiens d'urgence seront alertés en priorité
              </p>
            </div>
          </div>
        )}

        {/* CORRECTION 5 — Aperçu photos */}
        <div className="bg-card rounded-lg border border-border p-5">
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

      {/* CORRECTION 6 — Save button */}
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
