import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import {
  ArrowLeft,
  AlertCircle,
  Zap,
  ArrowRight,
  Eye,
  Lock,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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

/** Carte de section pour grouper visuellement les champs d'édition. */
const SectionCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
    <div className="mb-4">
      <h2 className="font-heading font-semibold text-base">{title}</h2>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
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
const MIN_DESC_LENGTH = 50;
const MAX_TITLE_LENGTH = 120;
const MAX_DESC_LENGTH = 2000;

const FLEX_REGEX = /\n*Flexibilité\s*:\s*(.+?)(?=\n\n|$)/i;
function parseFlexibility(text: string): { months: string[]; duration: string; clean: string } {
  const match = text.match(FLEX_REGEX);
  if (!match) return { months: [], duration: "", clean: text };
  const payload = match[1] || "";
  const monthsMatch = payload.match(/Mois\s*:\s*([^·]+)/i);
  const durationMatch = payload.match(/Durée\s*:\s*(.+)/i);
  const months = monthsMatch
    ? monthsMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const duration = durationMatch ? durationMatch[1].trim() : "";
  const clean = text.replace(FLEX_REGEX, "").trim();
  return { months, duration, clean };
}

const LOCKED_STATUSES = new Set(["archived", "cancelled", "expired", "completed"]);

const EditSit = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datesTouched, setDatesTouched] = useState(false);
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [flexibleMonths, setFlexibleMonths] = useState<string[]>([]);
  const [flexibleDuration, setFlexibleDuration] = useState("");
  const [specificExpectations, setSpecificExpectations] = useState("");
  const [descTouched, setDescTouched] = useState(false);
  const [openTo, setOpenTo] = useState<string[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [minGardienSits, setMinGardienSits] = useState(0);
  const [sitStatus, setSitStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDatesOpen, setConfirmDatesOpen] = useState(false);

  const initialSnapshot = useRef<string>("");

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from("sits")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoadError("Impossible de charger l'annonce. Vérifiez votre connexion et réessayez.");
        setLoading(false);
        return;
      }
      if (!data) {
        navigate("/sits");
        return;
      }
      const rawExp = data.specific_expectations || "";
      const { months, duration, clean } = parseFlexibility(rawExp);
      setTitle(data.title || "");
      setStartDate(data.start_date || "");
      setEndDate(data.end_date || "");
      setFlexibleDates(data.flexible_dates || false);
      setFlexibleMonths(months);
      setFlexibleDuration(duration);
      setSpecificExpectations(clean);
      setOpenTo((data.open_to as string[]) || []);
      setIsUrgent(data.is_urgent || false);
      setMinGardienSits((data as any).min_gardien_sits || 0);
      setSitStatus(data.status || "");
      initialSnapshot.current = JSON.stringify({
        title: data.title || "",
        startDate: data.start_date || "",
        endDate: data.end_date || "",
        flexibleDates: data.flexible_dates || false,
        flexibleMonths: months,
        flexibleDuration: duration,
        specificExpectations: clean,
        openTo: (data.open_to as string[]) || [],
        isUrgent: data.is_urgent || false,
        minGardienSits: (data as any).min_gardien_sits || 0,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user, navigate]);

  const dateError = !flexibleDates && startDate && endDate && startDate >= endDate
    ? "La date de fin doit être après la date de début." : null;

  const trimmedTitle = title.trim();
  const trimmedDesc = specificExpectations.trim();

  const hasDatesOrFlexible = flexibleDates
    ? flexibleMonths.length > 0
    : !!(startDate && endDate && !dateError);

  const titleValid = trimmedTitle.length >= 3 && trimmedTitle.length <= MAX_TITLE_LENGTH;
  const descValid = trimmedDesc.length === 0 || trimmedDesc.length >= MIN_DESC_LENGTH;
  const isLocked = LOCKED_STATUSES.has(sitStatus);

  const FORBIDDEN_REGEX = /\b(voisin(?:e|s|es)?|voisinage|AURA|Auvergne[\s-]Rh[oô]ne[\s-]Alpes)\b/i;
  const forbiddenInTitle = FORBIDDEN_REGEX.test(title);
  const forbiddenInDesc = FORBIDDEN_REGEX.test(specificExpectations);
  const hasForbidden = forbiddenInTitle || forbiddenInDesc;

  const canSave = !isLocked && titleValid && hasDatesOrFlexible && !dateError && descValid && !hasForbidden;

  const isConfirmed = sitStatus === "confirmed" || sitStatus === "in_progress";

  const showUrgent =
    !isConfirmed &&
    (flexibleDates ||
      (startDate && new Date(startDate).getTime() - Date.now() < 2 * 86400000));

  useEffect(() => {
    if (!showUrgent && isUrgent) setIsUrgent(false);
  }, [showUrgent, isUrgent]);

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        title, startDate, endDate, flexibleDates, flexibleMonths,
        flexibleDuration, specificExpectations, openTo, isUrgent, minGardienSits,
      }),
    [title, startDate, endDate, flexibleDates, flexibleMonths, flexibleDuration,
      specificExpectations, openTo, isUrgent, minGardienSits],
  );
  const isDirty = !loading && currentSnapshot !== initialSnapshot.current;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const persist = useCallback(async () => {
    if (!user || !id || !canSave) return;
    setSaving(true);

    const cleanDesc = trimmedDesc.replace(FLEX_REGEX, "").trim();
    let expectations = cleanDesc;
    if (flexibleDates) {
      const flexNote = [
        flexibleMonths.length > 0 ? `Mois : ${flexibleMonths.join(", ")}` : "",
        flexibleDuration ? `Durée : ${flexibleDuration}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      if (flexNote) {
        expectations = cleanDesc
          ? `${cleanDesc}\n\nFlexibilité : ${flexNote}`
          : `Flexibilité : ${flexNote}`;
      }
    }

    const { error } = await supabase
      .from("sits")
      .update({
        title: trimmedTitle,
        start_date: flexibleDates ? null : startDate,
        end_date: flexibleDates ? null : endDate,
        flexible_dates: flexibleDates,
        specific_expectations: expectations,
        open_to: openTo,
        is_urgent: isUrgent,
        min_gardien_sits: minGardienSits,
      } as any)
      .eq("id", id)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder." });
      return;
    }
    initialSnapshot.current = currentSnapshot;
    toast({ title: "Annonce mise à jour" });
    navigate(`/sits/${id}`);
  }, [
    user, id, canSave, trimmedDesc, trimmedTitle, startDate, endDate,
    flexibleDates, flexibleMonths, flexibleDuration, openTo, isUrgent,
    minGardienSits, currentSnapshot, navigate, toast,
  ]);

  const handleSave = () => {
    if (!canSave) return;
    if (isConfirmed && !flexibleDates && (startDate || endDate)) {
      setConfirmDatesOpen(true);
      return;
    }
    persist();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canSave && !saving) handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, saving, isConfirmed, flexibleDates, startDate, endDate]);

  if (loading) {
    return <div className="p-6 md:p-10 text-muted-foreground">Chargement…</div>;
  }
  if (loadError) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive font-medium mb-3">{loadError}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  /* Bloquants affichables inline */
  const saveBlockerMsg = isLocked
    ? "Annonce verrouillée"
    : !isDirty
      ? "Aucune modification à enregistrer"
      : !titleValid
        ? "Titre trop court (3 caractères minimum)"
        : !hasDatesOrFlexible
          ? "Renseignez des dates ou un mois flexible"
          : !descValid
            ? `Description : ${MIN_DESC_LENGTH} caractères minimum`
            : hasForbidden
              ? "Vocabulaire non autorisé dans le titre ou la description"
              : null;

  return (
    <div className="px-4 md:px-10 py-6 max-w-3xl mx-auto animate-fade-in pb-36">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Modifier mon annonce</title>
      </Helmet>

      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={() => {
            if (isDirty && !confirm("Vous avez des modifications non sauvegardées. Quitter sans enregistrer ?")) return;
            navigate(`/sits/${id}`);
          }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l'annonce
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => {
            if (isDirty && !confirm("Vous avez des modifications non sauvegardées. Quitter sans enregistrer ?")) return;
            navigate(`/sits/${id}`);
          }}
        >
          <Eye className="h-3.5 w-3.5" /> Aperçu public
        </Button>
      </div>

      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">Modifier l'annonce</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Modifiez les informations spécifiques à cette garde. Le logement et les animaux se gèrent
        depuis votre profil.
      </p>

      {isLocked && (
        <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4 flex items-start gap-3">
          <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Annonce verrouillée</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Cette annonce est {sitStatus === "archived" ? "archivée" : sitStatus === "cancelled" ? "annulée" : sitStatus === "expired" ? "expirée" : "terminée"} et ne peut plus être modifiée.
            </p>
          </div>
        </div>
      )}

      {isConfirmed && !isLocked && (
        <div className="mb-6 rounded-xl border border-warning-border bg-warning-soft p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-warning-foreground">
              Garde {sitStatus === "in_progress" ? "en cours" : "confirmée"}
            </p>
            <p className="text-warning-foreground/80 text-xs mt-0.5">
              Toute modification (dates, attentes, etc.) n'enverra pas de notification automatique
              au gardien. Pensez à le prévenir via la messagerie.
            </p>
          </div>
        </div>
      )}

      <fieldset disabled={isLocked} className="contents">
        <div className="space-y-5">
          {/* SECTION 1 : L'essentiel */}
          <SectionCard
            title="L'essentiel"
            description="Le titre et les dates de votre garde."
          >
            <div>
              <Label htmlFor="sit-title" className="text-sm font-medium">
                Titre de l'annonce
              </Label>
              <Input
                id="sit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                onBlur={() => setTitleTouched(true)}
                className="mt-1.5 h-12 text-base"
                maxLength={MAX_TITLE_LENGTH}
              />
              {titleTouched && !titleValid && trimmedTitle.length > 0 && (
                <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> Le titre doit contenir au moins 3 caractères.
                </p>
              )}
              {forbiddenInTitle && (
                <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> Mot non autorisé. Préférez « gardien » ou « personne de confiance ».
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {trimmedTitle.length}/{MAX_TITLE_LENGTH}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Dates de la garde
              </Label>
              {!flexibleDates ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sit-start" className="text-xs text-muted-foreground">
                        Date de début
                      </Label>
                      <Input
                        id="sit-start"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        onBlur={() => setDatesTouched(true)}
                        min={new Date().toISOString().slice(0, 10)}
                        className="mt-1.5 h-12 text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sit-end" className="text-xs text-muted-foreground">
                        Date de fin
                      </Label>
                      <Input
                        id="sit-end"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        onBlur={() => setDatesTouched(true)}
                        min={startDate || undefined}
                        className="mt-1.5 h-12 text-base"
                      />
                    </div>
                  </div>
                  {datesTouched && dateError && (
                    <p className="text-sm text-destructive flex items-center gap-1.5 mt-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {dateError}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setFlexibleDates(true)}
                    className="px-0 mt-2 h-auto gap-1"
                  >
                    Mes dates sont flexibles <ArrowRight className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Quel mois ?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {FLEXIBLE_MONTHS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() =>
                            setFlexibleMonths((prev) =>
                              prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
                            )
                          }
                          className={
                            flexibleMonths.includes(m)
                              ? "bg-primary text-primary-foreground rounded-full px-3 py-2 text-sm font-medium"
                              : "border border-border rounded-full px-3 py-2 text-sm text-muted-foreground hover:border-primary transition-colors"
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
                      {FLEXIBLE_DURATIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setFlexibleDuration((prev) => (prev === d ? "" : d))
                          }
                          className={
                            flexibleDuration === d
                              ? "bg-primary text-primary-foreground rounded-full px-3 py-2 text-sm font-medium"
                              : "border border-border rounded-full px-3 py-2 text-sm text-muted-foreground hover:border-primary transition-colors"
                          }
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setFlexibleDates(false)}
                    className="px-0 h-auto text-muted-foreground"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" /> Renseigner des dates précises
                  </Button>
                </div>
              )}
            </div>
          </SectionCard>

          {/* SECTION 2 : Description */}
          <SectionCard
            title="Description de la garde"
            description="Ce qui rend cette garde unique (champ optionnel)."
          >
            <div>
              <Textarea
                placeholder="Décrivez ce qui est particulier à cette garde…"
                value={specificExpectations}
                onChange={(e) =>
                  setSpecificExpectations(e.target.value.slice(0, MAX_DESC_LENGTH))
                }
                onBlur={() => setDescTouched(true)}
                rows={5}
                maxLength={MAX_DESC_LENGTH}
                className="text-base resize-none"
              />
              <p
                className={cn(
                  "text-xs mt-1.5",
                  descTouched && trimmedDesc.length > 0 && trimmedDesc.length < MIN_DESC_LENGTH
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {trimmedDesc.length === 0
                  ? `Optionnel. Si renseigné, ${MIN_DESC_LENGTH} caractères minimum.`
                  : `${trimmedDesc.length} / ${MIN_DESC_LENGTH} min`}
              </p>
              {forbiddenInDesc && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> Mot non autorisé. Préférez « gardien » ou « personne de confiance ».
                </p>
              )}
            </div>
          </SectionCard>

          {/* SECTION 3 : Profil de gardien souhaité */}
          <SectionCard
            title="Gardien recherché"
            description="Préférences indicatives, tous les profils peuvent postuler."
          >
            <div>
              <Label className="text-sm font-medium mb-2 block">Idéale pour</Label>
              <ChipSelect
                options={openToOptions}
                selected={openTo}
                onChange={(next) => {
                  const SP = "Sans préférence";
                  const justAddedSP = next.includes(SP) && !openTo.includes(SP);
                  if (justAddedSP) return setOpenTo([SP]);
                  if (next.length > 1 && next.includes(SP)) return setOpenTo(next.filter((o) => o !== SP));
                  setOpenTo(next);
                }}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Expérience souhaitée</Label>
              <div className="flex flex-wrap gap-2">
                {MIN_SITS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMinGardienSits(opt.value)}
                    className={
                      minGardienSits === opt.value
                        ? "bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium"
                        : "border border-border rounded-full px-4 py-2 text-sm text-muted-foreground hover:border-primary transition-colors"
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {showUrgent && (
              <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-soft p-4">
                <Checkbox
                  id="sit-urgent"
                  checked={isUrgent}
                  onCheckedChange={(v) => setIsUrgent(v === true)}
                  className="mt-0.5"
                />
                <div>
                  <Label
                    htmlFor="sit-urgent"
                    className="text-sm font-medium flex items-center gap-1.5 cursor-pointer text-warning-foreground"
                  >
                    <Zap className="h-4 w-4" /> Urgent
                  </Label>
                  <p className="text-xs text-warning-foreground/80 mt-0.5">
                    Les gardiens disponibles rapidement seront alertés en priorité.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>

          {/* SECTION 4 : Photos */}
          <SectionCard
            title="Photos et couverture"
            description="Les photos du logement sont communes à toutes vos annonces."
          >
            <Link to="/owner-profile">
              <Button variant="outline" size="sm" className="gap-1.5">
                Gérer ma galerie sur le profil <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </SectionCard>
        </div>
      </fieldset>

      {/* CTA barre sticky au-dessus de la BottomNav */}
      <div className="fixed bottom-16 inset-x-0 bg-card/95 backdrop-blur border-t border-border p-3 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto space-y-2">
          {saveBlockerMsg && isDirty && (
            <p className="text-xs text-destructive text-center">{saveBlockerMsg}</p>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-12 flex-1 text-sm"
              onClick={() => {
                if (isDirty && !confirm("Vous avez des modifications non sauvegardées. Quitter sans enregistrer ?")) return;
                navigate(`/sits/${id}`);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !canSave || !isDirty}
              className="h-12 flex-1 text-sm font-semibold"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation : modification de dates sur garde confirmée */}
      <AlertDialog open={confirmDatesOpen} onOpenChange={setConfirmDatesOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifier les dates d'une garde confirmée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette garde est confirmée. La modification des dates n'enverra <strong>pas</strong> de
              notification automatique au gardien. Pensez à le prévenir via la messagerie après
              avoir enregistré.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDatesOpen(false);
                persist();
              }}
            >
              Continuer et enregistrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditSit;
