import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera } from "lucide-react";
import HintBubble from "../profile/HintBubble";
import AiSuggestButton from "../profile/AiSuggestButton";
import PostalCodeCityFields from "../profile/PostalCodeCityFields";
import ChipSelect from "../profile/ChipSelect";
import {
  LANGUAGE_OPTIONS,
  INTEREST_OPTIONS,
  LIFE_PACE_OPTIONS,
  HOUSEHOLD_COMPOSITION_OPTIONS,
} from "@/lib/profileMatchingOptions";
import type { OwnerProfileData } from "@/hooks/useOwnerProfile";
import { trackEvent } from "@/lib/analytics";

/**
 * Indicateur de progression centres d'intérêt côté propriétaire.
 * Symétrique au gardien : 3 intérêts minimum pour un matching d'affinité utile.
 */
const INTERESTS_TARGET = 3;
const OwnerInterestsProgress = ({ count }: { count: number }) => {
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
    trackEvent("interests_focus_click", { source: "indicator", metadata: { count, status, role: "owner" } });
    const el = document.getElementById("owner-interests-chips");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.querySelector<HTMLElement>("button, [role='button']")?.focus();
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
      <span className={`text-[11px] font-medium rounded-full border px-2 py-0.5 ${tone}`}>{label}</span>
    </button>
  );
};

interface Props {
  data: OwnerProfileData;
  onChange: (partial: Partial<OwnerProfileData>) => void;
  onUploadPhoto: (file: File, bucket: string) => Promise<string | null>;
}

const OwnerStepIdentity = ({ data, onChange, onUploadPhoto }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUploadPhoto(file, "avatars");
    } finally {
      input.value = "";
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Identité & vérification</h2>

      <div className="flex flex-col items-center gap-3">
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-28 h-28 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-colors">
          {data.avatar_url ? <img src={data.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-muted-foreground" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
        <span className="text-sm text-muted-foreground">{uploading ? "Envoi..." : data.avatar_url ? "Cliquez pour changer la photo" : "Cliquez pour ajouter une photo"}</span>
        <HintBubble>Les propriétaires avec une photo inspirent davantage confiance aux gardiens.</HintBubble>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="o_first">Prénom</Label>
          <Input id="o_first" value={data.first_name} onChange={e => onChange({ first_name: e.target.value })} className="rounded-lg h-12" maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="o_last">Nom</Label>
          <Input id="o_last" value={data.last_name} onChange={e => onChange({ last_name: e.target.value })} className="rounded-lg h-12" maxLength={100} />
        </div>
      </div>

      <PostalCodeCityFields
        city={data.city}
        postalCode={data.postal_code}
        country={data.country}
        onChange={onChange}
        cityId="o_city"
        postalId="o_postal"
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="o_bio">Bio</Label>
          <AiSuggestButton field="bio" currentValue={data.bio} context={{ first_name: data.first_name, city: data.city }} onSuggestion={text => onChange({ bio: text })} />
        </div>
        <Textarea id="o_bio" value={data.bio} onChange={e => onChange({ bio: e.target.value })}
          placeholder="Parlez de vous, de votre famille, de ce qui fait votre quotidien..."
          className="rounded-lg min-h-[120px]" maxLength={2000} />
        <HintBubble>Racontez votre quotidien : les gardiens veulent savoir dans quel univers ils vont s'installer.</HintBubble>
      </div>

      <h3 className="font-heading text-lg font-semibold mt-6">À propos de vous</h3>
      <p className="text-sm text-muted-foreground -mt-3">
        Aide les gardiens à voir s'ils matchent avec votre univers.
      </p>

      <div className="space-y-2">
        <Label>Rythme de vie</Label>
        <Select value={data.life_pace} onValueChange={v => onChange({ life_pace: v })}>
          <SelectTrigger className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
          <SelectContent>
            {LIFE_PACE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label} · {o.description}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Composition du foyer</Label>
        <ChipSelect
          options={HOUSEHOLD_COMPOSITION_OPTIONS}
          selected={data.household_composition}
          onChange={v => onChange({ household_composition: v })}
        />
      </div>

      <div className="space-y-2">
        <Label>Langues parlées</Label>
        <ChipSelect
          options={LANGUAGE_OPTIONS}
          selected={data.languages}
          onChange={v => onChange({ languages: v })}
        />
      </div>

      <div className="space-y-2 scroll-mt-24" data-field="interests">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Label htmlFor="owner-interests-chips">Centres d'intérêt</Label>
          <OwnerInterestsProgress count={data.interests?.length ?? 0} />
        </div>
        <div id="owner-interests-chips">
          <ChipSelect
            options={INTEREST_OPTIONS}
            selected={data.interests}
            onChange={v => onChange({ interests: v })}
          />
        </div>
      </div>
    </div>
  );
};

export default OwnerStepIdentity;
