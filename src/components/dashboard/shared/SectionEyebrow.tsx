import { cn } from "@/lib/utils";

/**
 * SectionEyebrow, En-tête de section éditorial avec filet coloré à gauche.
 *
 * Sert à donner une identité visuelle légère par section sans alourdir :
 * un filet vertical 3px coloré + eyebrow uppercase + titre serif.
 *
 * Couleurs sémantiques uniquement (primary, secondary, warning, info).
 */

type EyebrowAccent = "primary" | "secondary" | "warning" | "info" | "muted";

const ACCENT_BAR: Record<EyebrowAccent, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  warning: "bg-warning",
  info: "bg-info",
  muted: "bg-muted-foreground/40",
};

const ACCENT_TEXT: Record<EyebrowAccent, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  warning: "text-warning",
  info: "text-info",
  muted: "text-muted-foreground",
};

interface SectionEyebrowProps {
  eyebrow: string;
  title: string;
  description?: string;
  accent?: EyebrowAccent;
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}

const SectionEyebrow = ({
  eyebrow,
  title,
  description,
  accent = "primary",
  as: Heading = "h3",
  id,
  className,
}: SectionEyebrowProps) => {
  return (
    <header className={cn("flex items-start gap-3 mb-3", className)}>
      <span
        aria-hidden="true"
        className={cn("mt-1 block h-8 w-[3px] rounded-full shrink-0", ACCENT_BAR[accent])}
      />
      <div className="min-w-0">
        <p
          className={cn(
            "text-[10px] uppercase tracking-[2px] font-sans font-semibold leading-tight",
            ACCENT_TEXT[accent]
          )}
        >
          {eyebrow}
        </p>
        <Heading
          id={id}
          className="font-heading text-lg sm:text-xl font-bold text-foreground leading-tight"
        >
          {title}
        </Heading>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </header>
  );
};

export default SectionEyebrow;
