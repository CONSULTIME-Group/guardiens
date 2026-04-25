/**
 * Éditeur des champs spécifiques à la garde (logement_override / animaux_override),
 * affiché en tête de l'onglet Logement côté propriétaire.
 *
 * La logique de debounce et de flush est gérée par le parent (OwnerSitView)
 * via la prop `saveOverride` — voir le hook flushOverrides associé.
 */
import { useId } from "react";

interface SitOverridesEditorProps {
  logementOverride: string;
  setLogementOverride: (v: string) => void;
  animauxOverride: string;
  setAnimauxOverride: (v: string) => void;
  saveOverride: (
    field: "logement_override" | "animaux_override",
    value: string,
  ) => void;
}

const SitOverridesEditor = ({
  logementOverride,
  setLogementOverride,
  animauxOverride,
  setAnimauxOverride,
  saveOverride,
}: SitOverridesEditorProps) => {
  const logementId = useId();
  const animauxId = useId();

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h2 className="text-sm font-medium text-foreground mb-1">
        Spécifique à cette garde (optionnel)
      </h2>
      <p className="text-xs text-muted-foreground mb-3">
        Ces informations s'appliquent uniquement à cette garde et complètent votre
        profil.
      </p>
      <div className="space-y-4">
        <div>
          <label
            htmlFor={logementId}
            className="text-sm font-medium text-foreground block mb-1"
          >
            Précisions sur le logement
          </label>
          <textarea
            id={logementId}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Ex : La chambre d'amis sera fermée, accès jardin uniquement le matin..."
            value={logementOverride}
            onChange={(e) => {
              setLogementOverride(e.target.value);
              saveOverride("logement_override", e.target.value);
            }}
          />
        </div>
        <div>
          <label
            htmlFor={animauxId}
            className="text-sm font-medium text-foreground block mb-1"
          >
            Précisions sur les animaux
          </label>
          <textarea
            id={animauxId}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Ex : Rex aura besoin d'une promenade supplémentaire le soir pendant cette période..."
            value={animauxOverride}
            onChange={(e) => {
              setAnimauxOverride(e.target.value);
              saveOverride("animaux_override", e.target.value);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SitOverridesEditor;
