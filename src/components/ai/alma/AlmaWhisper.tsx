/**
 * <AlmaWhisper /> — petite bulle non bloquante émise par la narratrice Alma
 * au fil de la navigation. Slide-in bottom-right desktop, bottom (au-dessus de
 * BottomNav) mobile. Auto-dismiss après 20s.
 *
 * <AlmaWhisperOutlet /> — monté dans AppLayout, s'abonne à AlmaContext et
 * affiche currentWhisper.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { AlmaAvatar } from "./AlmaAvatar";
import { useAlma } from "@/contexts/AlmaContext";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { AlmaWhisper as AlmaWhisperT } from "@/lib/alma/whisper-types";

interface AlmaWhisperCardProps {
  whisper: AlmaWhisperT;
  onDismiss: (reason: "closed_manually" | "timeout" | "action_clicked") => void;
}

function AlmaWhisperCard({ whisper, onDismiss }: AlmaWhisperCardProps) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const delay = whisper.autoDismissMs ?? 20000;
    timerRef.current = window.setTimeout(() => onDismiss("timeout"), delay);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [whisper.id, whisper.autoDismissMs, onDismiss]);

  const handleAction = (
    onClick: () => void,
    actionId: string,
  ) => {
    trackEvent("alma_whisper_action_clicked", {
      metadata: { whisper_type: whisper.type, action_id: actionId },
    });
    onClick();
    onDismiss("action_clicked");
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-whisper-type={whisper.type}
      className={cn(
        "fixed z-50 pointer-events-auto",
        "left-3 right-3 md:left-auto md:right-6",
        "bottom-24 md:bottom-6",
        "md:max-w-sm",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
      )}
    >
      <div className="relative rounded-2xl border border-primary/20 bg-card text-card-foreground shadow-lg p-3">
        <button
          type="button"
          onClick={() => onDismiss("closed_manually")}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
          aria-label="Fermer le message d'Alma"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-start gap-2 pr-10">

          <div className="text-primary shrink-0">
            <AlmaAvatar size={24} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-[13px] leading-snug text-foreground/90">{whisper.message}</p>
            {(whisper.primaryAction || whisper.secondaryAction) && (
              <div className="flex flex-wrap items-center gap-2">
                {whisper.primaryAction && (
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(
                        whisper.primaryAction!.onClick,
                        whisper.primaryAction!.actionId,
                      )
                    }
                    className="rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 hover:bg-primary/90 transition"
                  >
                    {whisper.primaryAction.label}
                  </button>
                )}
                {whisper.secondaryAction && (
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(
                        whisper.secondaryAction!.onClick,
                        whisper.secondaryAction!.actionId,
                      )
                    }
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition"
                  >
                    {whisper.secondaryAction.label}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlmaWhisperOutlet() {
  const { currentWhisper, dismissCurrent } = useAlma();
  if (!currentWhisper) return null;
  return (
    <AlmaWhisperCard
      whisper={currentWhisper}
      onDismiss={(reason) => dismissCurrent(reason)}
    />
  );
}

export default AlmaWhisperOutlet;
