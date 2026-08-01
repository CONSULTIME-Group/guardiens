/**
 * Indicateur discret de sauvegarde automatique locale.
 *
 * Trois états : au repos (rien), enregistrement en cours, brouillon enregistré.
 */
import { Check, Loader2 } from "lucide-react";

export type DraftState = "idle" | "saving" | "saved";

interface Props {
  state: DraftState;
  savedAt?: number | null;
  className?: string;
}

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const DraftStatus = ({ state, savedAt, className = "" }: Props) => {
  if (state === "idle") return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}
    >
      {state === "saving" ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Enregistrement du brouillon
        </>
      ) : (
        <>
          <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          Brouillon enregistré{savedAt ? ` à ${formatTime(savedAt)}` : ""}
        </>
      )}
    </p>
  );
};

export default DraftStatus;
