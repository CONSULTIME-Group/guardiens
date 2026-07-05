import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { getPasswordStrength } from "@/lib/passwordStrength";
import { trackEvent } from "@/lib/analytics";

interface Props {
  password: string;
  isCommon?: boolean;
}

const LABELS: Record<number, { text: string; color: string; bar: string }> = {
  0: { text: "Trop court, il vous faut au moins 8 caractères.", color: "text-destructive", bar: "bg-strength-weak" },
  1: { text: "Ajoutez un chiffre ou une majuscule.", color: "text-warning-foreground", bar: "bg-strength-weak" },
  2: { text: "Correct, vous pouvez continuer.", color: "text-warning-foreground", bar: "bg-strength-medium" },
  3: { text: "Bon mot de passe.", color: "text-success", bar: "bg-strength-good" },
  4: { text: "Excellent.", color: "text-success", bar: "bg-strength-strong" },
};

/**
 * Live password strength meter with 4 segments and dynamic micro-copy.
 * Never blocks submission itself; parent decides. Fires `signup_password_meter_seen` once.
 */
export const PasswordStrengthMeter = ({ password, isCommon }: Props) => {
  const { score } = getPasswordStrength(password);

  useEffect(() => {
    if (!password) return;
    try {
      trackEvent("signup_password_meter_seen" as any, {
        source: "/inscription",
        metadata: { score },
      });
    } catch {}
    // fire once when meter becomes visible
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password.length > 0]);

  if (!password) return null;

  const meta = LABELS[score] ?? LABELS[0];
  const barColor = isCommon && score >= 2 ? "bg-strength-medium" : meta.bar;

  return (
    <div className="space-y-1.5 animate-in fade-in-0 duration-200">
      <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-muted">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-all duration-300",
              i <= score ? barColor : "bg-transparent"
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs leading-snug", meta.color)}>{meta.text}</p>
      {isCommon && (
        <p className="text-xs text-warning-foreground">
          Ce mot de passe apparaît dans les listes des plus utilisés. Ajoutez au moins un caractère pour le rendre unique.
        </p>
      )}
    </div>
  );
};
