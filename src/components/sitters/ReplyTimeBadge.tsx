/**
 * Affiche le délai médian de première réponse d'un gardien (30 derniers jours).
 * Calculé en SQL via refresh_sitter_reply_stats() et stocké sur
 * sitter_profiles.reply_median_minutes.
 *
 * Trois paliers, jamais de signal négatif (au-delà de 24 h on n'affiche rien).
 */

interface Props {
  minutes?: number | null;
  className?: string;
}

const ReplyTimeBadge = ({ minutes, className = "" }: Props) => {
  if (minutes == null || minutes < 0) return null;

  let label: string;
  let tone: string;

  if (minutes < 60) {
    label = "Répond en moins d'1 h";
    tone = "bg-success-soft text-success border border-success-border";
  } else if (minutes < 360) {
    label = "Répond sous 6 h";
    tone = "bg-info-soft text-info border border-info-border";
  } else if (minutes < 1440) {
    label = "Répond sous 24 h";
    tone = "bg-muted text-muted-foreground border border-border";
  } else {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium rounded-full px-2 py-0.5 ${tone} ${className}`}
      title="Délai médian de première réponse sur les 30 derniers jours"
    >
      {label}
    </span>
  );
};

export default ReplyTimeBadge;
