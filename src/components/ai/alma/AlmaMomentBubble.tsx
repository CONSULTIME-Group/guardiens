/**
 * <AlmaMomentBubble />, lot A7 : bulle courte au-dessus du dock replié pour
 * un moment réel ou un passage de stade. Elle ne déplie jamais le panneau :
 * un bouton utile, une croix pour la fermer.
 */
import { X } from "lucide-react";
import type { Celebration } from "@/lib/alma/bond";

interface Props {
  celebration: Celebration;
  onAction: () => void;
  onDismiss: () => void;
}

export function AlmaMomentBubble({ celebration, onAction, onDismiss }: Props) {
  return (
    <div
      role="status"
      data-testid="alma-moment-bubble"
      data-rule-key={celebration.ruleKey}
      className="pointer-events-auto relative mb-2 w-full max-w-[19rem] rounded-2xl border border-border bg-card/95 px-4 py-3 pr-10 text-left shadow-md backdrop-blur"
    >
      <p className="text-[10.5px] font-bold uppercase text-terra [letter-spacing:.16em]">Notre carnet</p>
      <p className="mt-1 text-sm leading-snug text-foreground">{celebration.text}</p>
      <button
        type="button"
        data-testid="alma-moment-action"
        onClick={onAction}
        className="mt-2 inline-flex min-h-11 items-center text-[13px] font-bold text-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {celebration.action.label}
      </button>
      <button
        type="button"
        aria-label="Fermer"
        onClick={onDismiss}
        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
