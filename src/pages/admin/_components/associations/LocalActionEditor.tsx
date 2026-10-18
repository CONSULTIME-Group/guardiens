import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import { localActionDay, type AssociationLocalAction } from "@/lib/localUsefulActions";
import { useRef } from "react";
import { normalizeCityName } from "@/lib/normalizeCity";

/** Une action facultative dans un besoin existant ; aucune confirmation implicite. */
export default function LocalActionEditor({ value, onChange, index }: {
  value?: AssociationLocalAction | null;
  onChange: (value: AssociationLocalAction) => void;
  index: number;
}) {
  const a = value ?? {};
  // La recherche de commune est asynchrone : elle conserve les autres champs édités entre-temps.
  const current = useRef(a);
  current.current = a;
  // Deux rappels synchrones (code postal vidé puis commune vidée) se cumulent au lieu de s'écraser.
  const patch = (next: Partial<AssociationLocalAction>) => {
    const merged = { ...current.current, ...next };
    current.current = merged;
    onChange(merged);
  };
  return (
    <details className="rounded-lg bg-muted/30 p-3">
      <summary className="cursor-pointer text-sm font-medium">Proposer une action sur les tableaux de bord</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-muted-foreground">Après confirmation auprès de l’association, précisez où l’action se déroule et jusqu’à quand le besoin reste ouvert. Ces informations sont publiques.</p>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={a.enabled === true} onCheckedChange={checked => patch({ enabled: checked === true })} />
          Proposer cette action aux membres proches
        </label>
        <label className="block space-y-1 text-sm">
          <span>Action concrète</span>
          <Input value={a.title ?? ""} maxLength={160} placeholder="Aider à la collecte de nourriture samedi" onChange={e => patch({ title: e.target.value })} />
        </label>
        <PostalCodeCityFields
          city={a.city ?? ""} postalCode={a.postal_code ?? ""}
          cityId={`local-action-city-${index}`} postalId={`local-action-postal-${index}`}
          cityLabel="Commune où se déroule l’action" showAbroadToggle={false}
          onChange={next => {
            // Une réponse à un ancien code postal ne doit pas remplacer le lieu courant.
            if (next.latitude !== undefined && next.postal_code !== undefined && next.postal_code !== current.current.postal_code) return;
            const locationChanged = (next.city !== undefined && normalizeCityName(next.city).toLowerCase() !== normalizeCityName(current.current.city ?? "").toLowerCase())
              || (next.postal_code !== undefined && next.postal_code !== current.current.postal_code);
            patch({ ...(locationChanged ? { latitude: null, longitude: null } : {}), ...next });
          }}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm"><span>À partir du</span><Input type="date" value={a.available_from ?? ""} onChange={e => patch({ available_from: e.target.value })} /></label>
          <label className="block space-y-1 text-sm"><span>Besoin ouvert jusqu’au</span><Input type="date" value={a.available_until ?? ""} min={a.available_from} onChange={e => patch({ available_until: e.target.value })} /></label>
          <label className="block space-y-1 text-sm"><span>Horaires ou disponibilité</span><Input value={a.when_label ?? ""} placeholder="Samedi de 9 h à 12 h, à confirmer ensemble" maxLength={160} onChange={e => patch({ when_label: e.target.value })} /></label>
          <label className="block space-y-1 text-sm"><span>Temps à prévoir</span><Input value={a.duration ?? ""} placeholder="Deux heures" maxLength={80} onChange={e => patch({ duration: e.target.value })} /></label>
          <label className="block space-y-1 text-sm"><span>Besoin confirmé le</span><Input type="date" max={localActionDay()} value={a.confirmed_on ?? ""} onChange={e => patch({ confirmed_on: e.target.value })} /></label>
          <label className="block space-y-1 text-sm"><span>Savoir-faire nécessaires, séparés par des virgules</span><Input value={a.required_skills?.join(", ") ?? ""} placeholder="Couture, conduite…" onChange={e => patch({ required_skills: e.target.value.split(",").map(s => s.replace(/^\s+/, "")) })} /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={a.beginner_friendly === true} onCheckedChange={checked => patch({ beginner_friendly: checked === true })} />Les débutants sont bienvenus</label>
        <p className="text-xs text-muted-foreground">La confirmation est à renouveler au bout de 30 jours. Le lien du besoin doit mener à la page de l’organisateur.</p>
      </div>
    </details>
  );
}
