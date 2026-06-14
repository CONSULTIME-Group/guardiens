/**
 * Affiche un statut de présence léger (En ligne / Vu il y a X).
 * Basé sur profiles.last_seen_at mis à jour côté client toutes les 60s.
 * Respecte la pref `show_last_seen` (filtrée côté appelant).
 */

import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  lastSeenAt?: string | null;
  /** Variante inline (sous le nom dans le header) ou standalone */
  variant?: "inline" | "standalone";
  className?: string;
}

const PresenceBadge = ({ lastSeenAt, variant = "standalone", className = "" }: Props) => {
  if (!lastSeenAt) return null;

  const last = new Date(lastSeenAt).getTime();
  const ageSec = (Date.now() - last) / 1000;

  if (ageSec < 120) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${variant === "inline" ? "text-[11px]" : "text-xs"} text-emerald-600 dark:text-emerald-400 ${className}`}
        aria-label="En ligne"
      >
        <span
          className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-[pulse_2s_ease-in-out_infinite]"
          aria-hidden="true"
        />
        En ligne
      </span>
    );
  }

  // Au-delà de 7 jours : information peu utile, on n'affiche rien
  if (ageSec > 7 * 24 * 3600) return null;

  const rel = formatDistanceToNowStrict(new Date(lastSeenAt), { locale: fr, addSuffix: false });
  return (
    <span
      className={`${variant === "inline" ? "text-[11px]" : "text-xs"} text-muted-foreground ${className}`}
      aria-label={`Vu il y a ${rel}`}
    >
      Vu il y a {rel}
    </span>
  );
};

export default PresenceBadge;
