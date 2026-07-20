/**
 * Bandeau « Tuiles histoire » du profil public gardien.
 * 3 tuiles maximum, phrases construites depuis les données réelles.
 * RÈGLE : aucune donnée absente n'affiche « Non renseigné » ; une tuile sans
 * donnée disparaît. Si moins de 2 tuiles ont du contenu, la grille entière
 * est masquée.
 */
import { PawPrint, Car, CalendarClock, type LucideIcon } from "lucide-react";

export interface StoryTileInput {
  key: string;
  Icon: LucideIcon;
  title: string;
  detail?: string | null;
}

interface StoryTilesProps {
  tiles: StoryTileInput[];
}

const StoryTiles = ({ tiles }: StoryTilesProps) => {
  const visible = tiles.filter((t) => t.title && t.title.trim().length > 0);
  if (visible.length < 2) return null;

  return (
    <section aria-label="Aperçu du gardien" className="grid grid-cols-1 sm:grid-cols-3 gap-[14px]">
      {visible.slice(0, 3).map((t) => {
        const Icon = t.Icon;
        return (
          <article
            key={t.key}
            className="bg-card border border-border rounded-2xl p-[18px] shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_8px_24px_hsl(var(--foreground)/0.05)]"
          >
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center text-secondary"
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: "hsl(var(--secondary) / 0.14)",
              }}
            >
              <Icon size={16} strokeWidth={2} />
            </span>
            <p className="font-heading font-semibold text-foreground text-[17px] mt-[10px] leading-snug">
              {t.title}
            </p>
            {t.detail && (
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                {t.detail}
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
};

export { PawPrint, Car, CalendarClock };
export default StoryTiles;
