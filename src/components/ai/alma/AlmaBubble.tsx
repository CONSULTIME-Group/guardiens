/**
 * <AlmaBubble /> — composant réutilisable pour incarner Alma, la narratrice IA.
 *
 * Règle éditoriale : vouvoiement pour audience "owner", tutoiement pour audience "sitter".
 * Le prop `audience` est obligatoire pour que les intégrations passent explicitement
 * le bon registre. Aucun mot proscrit, aucun tiret cadratin, jamais "IA" ni "Assistant"
 * dans la signature visible.
 */
import { ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlmaAvatarLottie } from "./AlmaAvatarLottie";

export type AlmaVariant = "default" | "dashboard" | "inline" | "sticky-footer";
export type AlmaAudience = "owner" | "sitter";

export interface AlmaBubbleProps {
  audience: AlmaAudience;
  variant?: AlmaVariant;
  title?: string;
  loading?: boolean;
  success?: boolean;
  children: ReactNode;
  actions?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_STYLES: Record<AlmaVariant, string> = {
  default: "p-4 md:p-5",
  dashboard: "p-5 md:p-6",
  inline: "p-3 md:p-4",
  "sticky-footer": "p-3 md:p-4 shadow-lg",
};

const AVATAR_SIZE: Record<AlmaVariant, 24 | 32 | 40> = {
  default: 32,
  dashboard: 40,
  inline: 24,
  "sticky-footer": 32,
};

export function AlmaBubble({
  audience,
  variant = "default",
  title,
  loading = false,
  success = false,
  children,
  actions,
  onDismiss,
  className,
}: AlmaBubbleProps) {
  const loadingLabel = audience === "sitter" ? "Alma prépare…" : "Alma prépare…";
  const lottieState = loading ? "thinking" : success ? "success" : "idle";

  return (
    <div
      data-audience={audience}
      data-variant={variant}
      className={cn(
        "relative rounded-2xl border border-primary/20 bg-card text-card-foreground",
        VARIANT_STYLES[variant],
        className,
      )}
      role="group"
      aria-label="Message d'Alma"
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
          aria-label="Masquer Alma"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <div className={cn("flex items-start gap-3", onDismiss && "pr-10")}>
        <div className="flex flex-col items-center gap-1 shrink-0 text-primary">
          <AlmaAvatarLottie size={AVATAR_SIZE[variant]} state={lottieState} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
            Alma
          </span>
        </div>


        <div className="flex-1 min-w-0 space-y-2">
          {title && (
            <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{loadingLabel}</span>
            </div>
          ) : (
            <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
          )}

          {actions && !loading && (
            <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlmaBubble;
