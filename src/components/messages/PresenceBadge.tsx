/**
 * Affiche un statut de présence léger (En ligne / Vu il y a X).
 * Basé sur profiles.last_seen_at qui est mis à jour côté client toutes les 60s.
 * Respecte la pref `show_last_seen` (filtrée côté appelant).
 */

import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  lastSeenAt?: string | null;
  className?: string;
}

const PresenceBadge = ({ lastSeenAt, className = "" }: Props) => {
  if (!lastSeenAt) return null;

  const last = new Date(lastSeenAt).getTime();
  const ageSec = (Date.now() - last) / 1000;

  if (ageSec < 120) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        En ligne
      </span>
    );
  }

  if (ageSec > 7 * 24 * 3600) return null; // au-delà de 7 jours, on n'affiche rien (info peu utile)

  const rel = formatDistanceToNowStrict(new Date(lastSeenAt), { locale: fr, addSuffix: false });
  return (
    <span className={`text-xs text-muted-foreground ${className}`}>
      Vu il y a {rel}
    </span>
  );
};

export default PresenceBadge;
