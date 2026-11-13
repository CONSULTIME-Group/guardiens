import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile } from "@/lib/myProfile";
import { useOutingsEnabled } from "@/hooks/useOutingsEnabled";
import { createOuting, fetchOutingBySlug, updateOuting } from "@/lib/outingsData";
import {
  EMPTY_OUTING_DRAFT,
  OUTING_CAPACITY_MAX,
  OUTING_CAPACITY_MIN,
  OUTING_CATEGORIES,
  type OutingCategory,
  OUTING_COPY,
  OUTING_DESCRIPTION_MAX,
  OUTING_PLACE_KINDS,
  OUTING_TITLE_MAX,
  draftFromOuting,
  minCapacityForEdit,
  outingDraftErrors,
  outingInsertFromDraft,
  outingPath,
  outingUpdateFromDraft,
  type OutingDraft,
  type OutingDraftField,
  type PublicOuting,
} from "@/lib/outings";
import { capitalizeFirstName } from "@/lib/displayName";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { useHideBottomNav } from "@/components/layout/ChromeVisibility";

const chip = (on: boolean) =>
  `min-h-11 rounded-full border px-3.5 py-2 text-sm ${on ? "border-primary bg-primary/10 font-semibold text-primary" : "border-input bg-card font-medium text-foreground"}`;

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? <p id={id} role="alert" className="text-sm font-medium text-destructive">{message}</p> : null;

/** Lot SORT1 : « Proposer une sortie ». */
const SortieCreate = () => {
  const { enabled, loading: gateLoading } = useOutingsEnabled();
  const { user } = useAuth();
  const { data: profile } = useMyProfile(user?.id);
  const navigate = useNavigate();
  const [draft, setDraft] = useState<OutingDraft>(EMPTY_OUTING_DRAFT);
  const [errors, setErrors] = useState<Partial<Record<OutingDraftField, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const prefilled = useRef(false);
  const [searchParams] = useSearchParams();
  // Lot SORT2 : ?modifier=<adresse> reprend une sortie pour la corriger,
  // ?depuis=<adresse> la repropose à un nouveau jour.
  const editSlug = searchParams.get("modifier");
  const sourceSlug = editSlug || searchParams.get("depuis");
  const [source, setSource] = useState<PublicOuting | null>(null);
  const [sourceState, setSourceState] = useState<"none" | "loading" | "ready" | "refused">(sourceSlug ? "loading" : "none");
  const editing = !!editSlug && sourceState === "ready" && !!source;
  const seen = useRef(false);
  useHideBottomNav(true);

  useEffect(() => {
    if (!sourceSlug || !user?.id) return;
    let cancelled = false;
    fetchOutingBySlug(sourceSlug).then(({ data }) => {
      if (cancelled) return;
      if (!data || data.organizer_id !== user.id || (editSlug && data.status !== "open")) { setSourceState("refused"); return; }
      prefilled.current = true;
      setSource(data);
      setDraft(draftFromOuting(data, { keepDate: !!editSlug }));
      setSourceState("ready");
    });
    return () => { cancelled = true; };
  }, [sourceSlug, editSlug, user?.id]);

  useEffect(() => {
    if (sourceSlug || prefilled.current || !profile) return;
    prefilled.current = true;
    setDraft((d) => ({ ...d, city: d.city || capitalizeFirstName(profile.city) || "", postalCode: d.postalCode || profile.postal_code || "" }));
  }, [profile]);

  // Lot SORT11 : ?categorie=<valeur> vient des vignettes « Une idée pour commencer ».
  const ideaCategory = searchParams.get("categorie");
  useEffect(() => {
    if (sourceSlug || !ideaCategory) return;
    if (OUTING_CATEGORIES.some((c) => c.value === ideaCategory)) setDraft((d) => (d.category ? d : { ...d, category: ideaCategory as OutingCategory }));
  }, [ideaCategory, sourceSlug]);

  useEffect(() => {
    if (!enabled || seen.current) return;
    seen.current = true;
    trackEvent("outing_form_opened", { metadata: { mode: editSlug ? "edit" : sourceSlug ? "repropose" : "new" } });
  }, [enabled, editSlug, sourceSlug]);

  if (gateLoading) return <div className="mx-auto max-w-2xl p-5"><Skeleton className="h-12 w-full rounded-2xl" /></div>;
  if (!enabled) return <Navigate to="/petites-missions" replace />;
  if (sourceState === "refused") return <Navigate to="/sorties" replace />;
  if (sourceState === "loading") return <div className="mx-auto max-w-2xl p-5" aria-busy="true"><Skeleton className="h-12 w-full rounded-2xl" /></div>;

  const set = <K extends keyof OutingDraft>(key: K, value: OutingDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const openSeats = Math.max(1, draft.capacity - draft.reserved);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !user) return;
    const found = outingDraftErrors(draft);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`outing-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (editing && source) {
      if (draft.capacity < minCapacityForEdit(source, draft.reserved)) {
        setErrors({ capacity: OUTING_COPY.capacityFloor });
        document.getElementById("outing-capacity")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setSubmitting(true);
      const result = await updateOuting(source.id, outingUpdateFromDraft(draft));
      setSubmitting(false);
      if (!result.ok) {
        if (result.error?.includes("OUTING_CAPACITY_BELOW_ATTENDEES")) setErrors({ capacity: OUTING_COPY.capacityFloor });
        else toast.error("L'enregistrement a échoué. Vérifiez votre connexion et réessayez.");
        return;
      }
      trackEvent("outing_updated", { metadata: { outing: source.id } });
      navigate(`${outingPath(source.slug)}?modifiee=1`);
      return;
    }
    setSubmitting(true);
    const { slug, error, hint } = await createOuting(outingInsertFromDraft(draft, user.id));
    setSubmitting(false);
    if (!slug) {
      if (hint === "child_care_in_outing") setErrors({ title: "La garde d'enfants a sa place ailleurs que sur Guardiens. Décrivez un moment partagé entre adultes." });
      else if (error?.includes("OUTING_DATE_PAST")) setErrors({ date: "Choisissez un jour à venir." });
      else toast.error("L'enregistrement a échoué. Vérifiez votre connexion et réessayez.");
      return;
    }
    trackEvent("outing_published", { metadata: { category: draft.category, place_kind: draft.placeKind, capacity: draft.capacity, free: draft.free, reproposed: !!source } });
    navigate(`${outingPath(slug)}?publiee=1`);
  };

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 pb-28 pt-4">
      <PageMeta title="Proposer une sortie" description="Proposez une sortie à places comptées près de chez vous." path="/sorties/proposer" noindex />
      <Link to={source ? outingPath(source.slug) : "/sorties"} className="inline-flex min-h-11 items-center self-start text-[15px] font-medium no-underline">{source ? "← Ma sortie" : "← Sorties"}</Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[28px] font-bold leading-tight">{editing ? OUTING_COPY.editTitle : OUTING_COPY.propose}</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{editing ? OUTING_COPY.editIntro : source ? OUTING_COPY.reproposeIntro : OUTING_COPY.formIntro}</p>
      </div>

      <fieldset id="outing-category" className="flex flex-col gap-2.5">
        <legend className="mb-2 text-base font-semibold">L'activité</legend>
        <div className="flex flex-wrap gap-2">
          {OUTING_CATEGORIES.map((c) => (
            <button key={c.value} type="button" aria-pressed={draft.category === c.value} onClick={() => set("category", c.value)} className={chip(draft.category === c.value)}>
              {c.label}
            </button>
          ))}
        </div>
        <FieldError id="outing-category-error" message={errors.category} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="outing-title" className="text-base font-semibold">Le titre</Label>
        <Input id="outing-title" value={draft.title} maxLength={OUTING_TITLE_MAX} placeholder="Belote à quatre" onChange={(e) => set("title", e.target.value)}
          aria-invalid={!!errors.title} aria-describedby={errors.title ? "outing-title-error" : undefined} className="h-12 text-base" />
        <FieldError id="outing-title-error" message={errors.title} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="outing-description" className="text-base font-semibold">Quelques mots</Label>
        <Textarea id="outing-description" value={draft.description} maxLength={OUTING_DESCRIPTION_MAX} rows={4}
          placeholder="Nous sommes trois, il nous manque un joueur. Débutants bienvenus, je fournis les cartes."
          onChange={(e) => set("description", e.target.value)} className="text-base" />
        <FieldError id="outing-description-error" message={errors.description} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="outing-date" className="text-base font-semibold">Le jour</Label>
          <Input id="outing-date" type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} aria-invalid={!!errors.date} className="h-12 text-base" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="outing-time" className="text-base font-semibold">L'heure</Label>
          <Input id="outing-time" type="time" value={draft.time} onChange={(e) => set("time", e.target.value)} aria-invalid={!!errors.time} className="h-12 text-base" />
        </div>
        <div className="col-span-2"><FieldError id="outing-date-error" message={errors.date || errors.time} /></div>
      </div>

      <fieldset id="outing-placeKind" className="flex flex-col gap-2.5">
        <legend className="mb-2 text-base font-semibold">Où</legend>
        <div className="grid grid-cols-3 gap-2">
          {OUTING_PLACE_KINDS.map((p) => (
            <button key={p.value} type="button" aria-pressed={draft.placeKind === p.value} onClick={() => set("placeKind", p.value)}
              className={`min-h-12 rounded-xl border px-2 text-sm ${draft.placeKind === p.value ? "border-primary bg-primary/10 font-semibold text-primary" : "border-input bg-card font-medium"}`}>
              {p.label}
            </button>
          ))}
        </div>
        {draft.placeKind && <p className="text-sm leading-relaxed text-muted-foreground">{OUTING_PLACE_KINDS.find((p) => p.value === draft.placeKind)?.help}</p>}
        <FieldError id="outing-placeKind-error" message={errors.placeKind} />
        {draft.placeKind && draft.placeKind !== "online" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="outing-placeLabel" className="text-sm font-semibold">{draft.placeKind === "home" ? "Votre quartier" : "Le lieu du rendez-vous"}</Label>
              <Input id="outing-placeLabel" value={draft.placeLabel} maxLength={120} placeholder={draft.placeKind === "home" ? "Lyon 5e, Saint-Just" : "Parc de la Tête d'Or, entrée des Enfants du Rhône"}
                onChange={(e) => set("placeLabel", e.target.value)} className="h-12 text-base" />
              <FieldError id="outing-placeLabel-error" message={errors.placeLabel} />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="outing-city" className="text-sm font-semibold">Commune</Label>
                <Input id="outing-city" value={draft.city} onChange={(e) => set("city", e.target.value)} className="h-12 text-base" autoComplete="address-level2" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="outing-postal" className="text-sm font-semibold">Code postal</Label>
                <Input id="outing-postal" value={draft.postalCode} inputMode="numeric" maxLength={10} onChange={(e) => set("postalCode", e.target.value)} className="h-12 text-base" autoComplete="postal-code" />
              </div>
              <div className="col-span-2"><FieldError id="outing-city-error" message={errors.city} /></div>
            </div>
            <div className="flex gap-2" role="group" aria-label="Cadre">
              {([["indoor", "En intérieur"], ["outdoor", "En extérieur"]] as const).map(([value, label]) => (
                <button key={value} type="button" aria-pressed={draft.setting === value} onClick={() => set("setting", draft.setting === value ? "" : value)} className={chip(draft.setting === value)}>{label}</button>
              ))}
            </div>
          </div>
        )}
      </fieldset>

      <fieldset id="outing-capacity" className="flex flex-col gap-3">
        <legend className="mb-2 text-base font-semibold">Les places</legend>
        {([
          ["capacity", "Nombre de personnes en tout", draft.capacity, OUTING_CAPACITY_MIN, OUTING_CAPACITY_MAX],
          ["reserved", "Déjà de la partie, vous compris", draft.reserved, 1, Math.max(1, draft.capacity - 1)],
        ] as const).map(([key, label, value, min, max]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <span id={`outing-${key}-label`} className="text-[15px]">{label}</span>
            <div className="flex items-center gap-2" role="group" aria-labelledby={`outing-${key}-label`}>
              <button type="button" aria-label="Une de moins" disabled={value <= min} onClick={() => {
                const next = Math.max(min, value - 1);
                setDraft((d) => key === "capacity" ? { ...d, capacity: next, reserved: Math.min(d.reserved, next - 1) } : { ...d, reserved: next });
              }} className="h-11 w-11 rounded-full border border-input bg-card text-xl disabled:opacity-40">−</button>
              <output className="w-8 text-center text-lg font-semibold" aria-live="polite">{value}</output>
              <button type="button" aria-label="Une de plus" disabled={value >= max} onClick={() => setDraft((d) => ({ ...d, [key]: Math.min(max, value + 1) }))}
                className="h-11 w-11 rounded-full border border-input bg-card text-xl disabled:opacity-40">+</button>
            </div>
          </div>
        ))}
        <p className="text-sm font-semibold text-primary" data-testid="outing-open-seats">
          {openSeats} {openSeats > 1 ? "places à prendre" : "place à prendre"} sur {draft.capacity}
        </p>
        <FieldError id="outing-capacity-error" message={errors.capacity} />
      </fieldset>

      <fieldset id="outing-fee" className="flex flex-col gap-2.5">
        <legend className="mb-2 text-base font-semibold">Participation</legend>
        <div className="flex gap-2">
          <button type="button" aria-pressed={draft.free} onClick={() => set("free", true)} className={chip(draft.free)}>Gratuit</button>
          <button type="button" aria-pressed={!draft.free} onClick={() => set("free", false)} className={chip(!draft.free)}>Un montant par personne</button>
        </div>
        {!draft.free && (
          <div className="flex items-center gap-2">
            <Label htmlFor="outing-fee-input" className="sr-only">Montant par personne, en euros</Label>
            <Input id="outing-fee-input" value={draft.fee} inputMode="decimal" placeholder="3" onChange={(e) => set("fee", e.target.value)} className="h-12 w-28 text-base" />
            <span className="text-base">€ par personne</span>
          </div>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground">{OUTING_COPY.feeHelp}</p>
        <FieldError id="outing-fee-error" message={errors.fee} />
      </fieldset>

      <div className="flex flex-col gap-3 rounded-2xl bg-accent/30 p-4">
        <p className="text-sm leading-relaxed">{OUTING_COPY.rules}</p>
        {!editing && (
        <label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed">
          <Checkbox checked={draft.agendaConsent} onCheckedChange={(v) => set("agendaConsent", v === true)} className="mt-0.5 h-6 w-6" />
          <span>{OUTING_COPY.agenda}</span>
        </label>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-5 py-3">
        <Button type="submit" size="lg" disabled={submitting} className="mx-auto flex h-[52px] w-full max-w-2xl rounded-2xl text-base">
          {submitting ? "Enregistrement…" : editing ? "Enregistrer" : "Publier ma sortie"}
        </Button>
      </div>
    </form>
  );
};

export default SortieCreate;
