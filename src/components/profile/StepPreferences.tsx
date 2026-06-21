import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChipSelect from "./ChipSelect";
import type { SitterProfileData } from "@/hooks/useSitterProfile";
import { trackEvent } from "@/lib/analytics";
import {
  LANGUAGE_OPTIONS,
  INTEREST_OPTIONS,
  LIFE_PACE_OPTIONS,
  HOUSEHOLD_COMPOSITION_OPTIONS,
  SPECIAL_ANIMAL_SKILLS_OPTIONS,
  WORK_DURING_SIT_OPTIONS,
  SENSITIVITIES_OPTIONS,
} from "@/lib/profileMatchingOptions";
import MatchingExplainer from "@/components/matching/MatchingExplainer";

const MEETING_OPTIONS = [
  "Dîner/apéro avant", "Visite la veille", "Passage le jour même",
  "Visio avant", "Échange messagerie suffit", "S'adapte au propriétaire"
];
const HANDOVER_OPTIONS = ["La veille avec nuit commune", "Le jour du départ", "À distance OK", "S'adapte"];
const SKILL_OPTIONS = ["Jardinage", "Bricolage", "Ménage", "Cuisine", "Premiers secours animaux"];

/**
 * Indicateur de progression pour les centres d'intérêt.
 * 0 = vide (rouge doux), 1-2 = en cours (ambre), >=3 = complet (success).
 * Cible : 3 centres d'intérêt minimum pour un matching d'affinité utile.
 */
const INTERESTS_TARGET = 3;
const InterestsProgress = ({ count }: { count: number }) => {
  const pct = Math.min(100, Math.round((count / INTERESTS_TARGET) * 100));
  const status = count >= INTERESTS_TARGET ? "complete" : count > 0 ? "partial" : "empty";
  const tone = status === "complete"
    ? "text-success border-success/30 bg-success/10"
    : status === "partial"
    ? "text-warning border-warning/30 bg-warning/10"
    : "text-muted-foreground border-border bg-muted/40";
  const label = status === "complete"
    ? `Complet · ${count}/${INTERESTS_TARGET}+`
    : status === "partial"
    ? `${count}/${INTERESTS_TARGET} pour un bon matching`
    : `Aucun · visez ${INTERESTS_TARGET}+`;
  const handleClick = () => {
    trackEvent("interests_focus_click", { source: "indicator", metadata: { count, status } });
    const el = document.getElementById("interests-chips");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstChip = el.querySelector<HTMLElement>("button, [role='button']");
      firstChip?.focus();
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Centres d'intérêt : ${label}. Cliquez pour modifier.`}
      className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:opacity-80 transition-opacity"
    >
      <div
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={INTERESTS_TARGET}
        className="hidden sm:block h-1.5 w-20 rounded-full bg-muted overflow-hidden"
      >
        <div
          className={`h-full transition-[width] duration-300 ${
            status === "complete" ? "bg-success" : status === "partial" ? "bg-warning" : "bg-muted-foreground/30"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[11px] font-medium rounded-full border px-2 py-0.5 ${tone}`}>
        {label}
      </span>
    </button>
  );
};

interface Props {
  data: SitterProfileData;
  onChange: (partial: Partial<SitterProfileData>) => void;
}

const StepPreferences = ({ data, onChange }: Props) => (
  <div className="space-y-6">

    <h3 className="font-heading text-lg font-semibold mt-2">Préférences de garde</h3>

    <MatchingExplainer role="sitter" variant="inline" />


    <div className="flex items-center justify-between py-2">
      <Label className="flex-1 pr-4">J'accepte les maisons où les visites et invités ne sont pas autorisés</Label>
      <Switch checked={data.strict_rules_ok} onCheckedChange={v => onChange({ strict_rules_ok: v })} />
    </div>

    <div className="flex items-center justify-between py-2">
      <Label className="flex-1 pr-4">Je préfère les propriétaires qui autorisent les visites</Label>
      <Switch checked={data.prefer_visitors} onCheckedChange={v => onChange({ prefer_visitors: v })} />
    </div>

    <div className="flex items-center justify-between py-2">
      <Label className="flex-1 pr-4">J'accepte les gardes avec beaucoup d'animaux ou animaux de ferme</Label>
      <Switch checked={data.farm_animals_ok} onCheckedChange={v => onChange({ farm_animals_ok: v })} />
    </div>

    <div className="space-y-2">
      <Label>Précisions</Label>
      <Textarea
        value={data.preferences_notes}
        onChange={e => onChange({ preferences_notes: e.target.value })}
        placeholder="Précisez vos préférences..."
        className="rounded-lg min-h-[80px]"
        maxLength={1000}
      />
    </div>

    <h3 className="font-heading text-lg font-semibold mt-4">Comment j'aime arriver</h3>

    <div className="space-y-2">
      <Label>Rencontre souhaitée</Label>
      <ChipSelect options={MEETING_OPTIONS} selected={data.meeting_preference} onChange={v => onChange({ meeting_preference: v })} />
    </div>

    <div className="space-y-2">
      <Label>Passage de relais préféré</Label>
      <Select value={data.handover_preference} onValueChange={v => onChange({ handover_preference: v })}>
        <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent>
          {HANDOVER_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>

    <h3 className="font-heading text-lg font-semibold mt-4">À propos de moi</h3>
    <p className="text-sm text-muted-foreground -mt-3">
      Aide les propriétaires à voir si vous matchez avec eux et leurs animaux.
    </p>

    <div className="space-y-2">
      <Label>Rythme de vie</Label>
      <Select value={data.life_pace} onValueChange={v => onChange({ life_pace: v })}>
        <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent>
          {LIFE_PACE_OPTIONS.map(o => (
            <SelectItem key={o.value} value={o.value}>
              {o.label} · {o.description}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label>Composition du foyer pendant la garde</Label>
      <ChipSelect
        options={HOUSEHOLD_COMPOSITION_OPTIONS}
        selected={data.household_composition}
        onChange={v => onChange({ household_composition: v })}
      />
    </div>

    <div className="space-y-2">
      <Label>Langues parlées</Label>
      <ChipSelect options={LANGUAGE_OPTIONS} selected={data.languages} onChange={v => onChange({ languages: v })} />
    </div>

    <div className="space-y-2 scroll-mt-24 p-2 -m-2 transition-shadow" data-field="interests">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Label htmlFor="interests-chips">Centres d'intérêt</Label>
        <InterestsProgress count={data.interests?.length ?? 0} />
      </div>
      <div id="interests-chips">
        <ChipSelect options={INTEREST_OPTIONS} selected={data.interests} onChange={v => onChange({ interests: v })} />
      </div>
    </div>

    <div className="space-y-2">
      <Label>Compétences bonus</Label>
      <ChipSelect options={SKILL_OPTIONS} selected={data.bonus_skills} onChange={v => onChange({ bonus_skills: v })} />
    </div>

    <h3 className="font-heading text-lg font-semibold mt-4">Compétences pointues & disponibilité</h3>
    <p className="text-sm text-muted-foreground -mt-3">
      Optionnel. Aide à matcher avec des animaux à besoins particuliers et rassure les propriétaires les plus exigeants.
    </p>

    <div className="space-y-2">
      <Label>Compétences spéciales animaux</Label>
      <ChipSelect
        options={SPECIAL_ANIMAL_SKILLS_OPTIONS}
        selected={data.special_animal_skills}
        onChange={v => onChange({ special_animal_skills: v })}
      />
    </div>

    <div className="space-y-2">
      <Label>Présence pendant la garde</Label>
      <Select value={data.work_during_sit} onValueChange={v => onChange({ work_during_sit: v })}>
        <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
        <SelectContent>
          {WORK_DURING_SIT_OPTIONS.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label>Sensibilités ou gardes que je n'accepte pas</Label>
      <ChipSelect
        options={SENSITIVITIES_OPTIONS}
        selected={data.sensitivities}
        onChange={v => onChange({ sensitivities: v })}
      />
    </div>
  </div>
);

export default StepPreferences;
