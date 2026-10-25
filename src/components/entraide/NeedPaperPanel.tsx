/**
 * Lot E21 (25/10/2026, maquette Claude Design validée par Jérémie) : image
 * d'un besoin sans photo. Panneau papier (token --hero-paper de la charte),
 * gouache de la catégorie au centre (missionSpotKey, images 480 px), ville en
 * pastille en bas à gauche. Remplace la règle du 14/10/2026 « aucune image
 * sans photo réelle sur la fiche ». En vignette (cartes liées), la gouache
 * 160 px sur le même papier, sans pastille.
 */
import { missionSpotKey } from "@/lib/missionSpot";
import { MISSION_SPOT_LARGE, MISSION_SPOT_SMALL } from "@/components/entraide/missionSpotImages";
import { cn } from "@/lib/utils";

interface Props {
  category?: string | null;
  title?: string | null;
  description?: string | null;
  city?: string | null;
  variant?: "hero" | "thumb";
  className?: string;
}

const NeedPaperPanel = ({ category, title, description, city, variant = "hero", className }: Props) => {
  const key = missionSpotKey(category, title, description);
  if (variant === "thumb") {
    return (
      <span
        className={cn("flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-field border border-border bg-hero-paper", className)}
        data-testid="need-paper-thumb"
        data-spot={key}
      >
        <img src={MISSION_SPOT_SMALL[key]} alt="" width={56} height={56} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <div
      className={cn("relative flex h-[200px] items-center justify-center overflow-hidden rounded-card border border-border bg-hero-paper md:h-[260px]", className)}
      data-testid="need-paper-panel"
      data-spot={key}
    >
      <img
        src={MISSION_SPOT_LARGE[key]}
        alt=""
        width={240}
        height={240}
        decoding="async"
        className="h-[168px] w-auto object-contain md:h-[220px]"
      />
      {city && (
        <span className="absolute bottom-3 left-3 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground">
          {city}
        </span>
      )}
    </div>
  );
};

export default NeedPaperPanel;
