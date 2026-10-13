/**
 * Réglage du nombre de candidatures qu'un propriétaire souhaite recevoir
 * (lot Y1), partagé par la création (CreateSit) et la modification (EditSit).
 *
 * Une fois ce nombre atteint, l'annonce reste publiée et visible ; seules les
 * nouvelles candidatures sont refusées côté serveur. Le propriétaire peut le
 * relever à tout moment.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_MAX_APPLICATIONS,
  MAX_MAX_APPLICATIONS,
  MIN_MAX_APPLICATIONS,
  clampMaxApplications,
} from "@/lib/applicationCap";

export const MAX_APPLICATIONS_LABEL = "Nombre de candidatures que vous souhaitez recevoir";
export const MAX_APPLICATIONS_HELP =
  "Une fois ce nombre atteint, votre annonce reste visible et vous pouvez le relever à tout moment.";

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  /** Candidatures déjà reçues, affichées pour situer le réglage (modification). */
  liveApplications?: number | null;
  id?: string;
}

const MaxApplicationsField = ({ value, onChange, disabled = false, liveApplications = null, id = "max-applications" }: Props) => {
  const current = value ?? DEFAULT_MAX_APPLICATIONS;
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground mb-1 block">
        {MAX_APPLICATIONS_LABEL}
      </Label>
      <p className="text-xs text-muted-foreground mb-3">{MAX_APPLICATIONS_HELP}</p>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 text-lg"
          aria-label="Diminuer"
          onClick={() => onChange(clampMaxApplications(current - 1))}
          disabled={disabled || (value !== null && value <= MIN_MAX_APPLICATIONS)}
        >
          −
        </Button>
        <Input
          id={id}
          type="number"
          min={MIN_MAX_APPLICATIONS}
          max={MAX_MAX_APPLICATIONS}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v ? clampMaxApplications(parseInt(v, 10)) : null);
          }}
          className="w-24 text-center h-12 text-base"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 text-lg"
          aria-label="Augmenter"
          onClick={() => onChange(clampMaxApplications(current + 1))}
          disabled={disabled || (value !== null && value >= MAX_MAX_APPLICATIONS)}
        >
          +
        </Button>
      </div>
      {typeof liveApplications === "number" && liveApplications > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {liveApplications} candidature{liveApplications > 1 ? "s" : ""} déjà reçue{liveApplications > 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );
};

export default MaxApplicationsField;
