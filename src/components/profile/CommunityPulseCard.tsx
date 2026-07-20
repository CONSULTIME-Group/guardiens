/**
 * Rail droit — « Le pouls de la communauté ».
 * Seul bloc sombre du profil (dégradé pin profond vers pin). Max 2 chiffres,
 * uniquement données réelles. Si aucun chiffre → composant retourne null.
 * Si aucune donnée locale mais chiffres globaux dispos, titre élargi.
 */

interface PulseStat {
  /** Nombre exact (déjà chargé, jamais synthétique). */
  value: number;
  /** Libellé sous le chiffre, français, vouvoiement. */
  label: string;
}

interface CommunityPulseCardProps {
  city?: string | null;
  /** Chiffres locaux (préférés). */
  local?: PulseStat[];
  /** Chiffres globaux (fallback si local vide). */
  global?: PulseStat[];
}

const CommunityPulseCard = ({ city, local = [], global = [] }: CommunityPulseCardProps) => {
  const localFiltered = local.filter((s) => s.value > 0).slice(0, 2);
  const globalFiltered = global.filter((s) => s.value > 0).slice(0, 2);
  const useLocal = localFiltered.length > 0;
  const stats = useLocal ? localFiltered : globalFiltered;

  if (stats.length === 0) return null;

  const title = useLocal && city
    ? `Autour de ${city}, ça vit déjà.`
    : "Sur Guardiens, ça vit déjà.";

  return (
    <aside
      className="rounded-2xl p-[22px] text-primary-foreground shadow-[0_8px_24px_hsl(var(--foreground)/0.15)]"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary) / 0.95), hsl(var(--primary)))",
      }}
      aria-label="Le pouls de la communauté"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-foreground/75">
        Le pouls de la communauté
      </p>
      <h3 className="font-heading text-[19px] font-semibold mt-2 leading-tight">
        {title}
      </h3>
      <div className="mt-4 space-y-3">
        {stats.map((s, i) => (
          <div key={i}>
            <p className="font-heading text-[25px] font-semibold leading-none">
              {s.value}
            </p>
            <p className="text-[13px] text-primary-foreground/85 mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default CommunityPulseCard;
