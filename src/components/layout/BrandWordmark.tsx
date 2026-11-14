import { useState, type ReactNode } from "react";
import { currentSeason, NOEL_WORDMARK } from "@/lib/seasonalBrand";

/**
 * Logotype « guardiens » des en-têtes. Hors saison : le texte de toujours
 * (g vert, reste à l'encre). À Noël (lot NOEL1) : l'image de saison en thème
 * clair, le texte en thème sombre. Le nom accessible reste porté par le lien
 * parent (« Guardiens, accueil »).
 */
export function BrandWordmark({
  heightClass,
  text,
}: {
  /** Hauteur de l'image de saison, classe Tailwind (ex. « h-10 »). */
  heightClass: string;
  /** Rendu texte habituel, gardé tel quel. */
  text: ReactNode;
}) {
  const [season] = useState(currentSeason);
  if (season !== "noel") return <>{text}</>;
  return (
    <>
      <img
        src={NOEL_WORDMARK.src}
        srcSet={NOEL_WORDMARK.srcSet}
        alt=""
        aria-hidden="true"
        data-season="noel"
        decoding="async"
        width={Math.round(80 * NOEL_WORDMARK.ratio)}
        height={80}
        className={`${heightClass} w-auto max-w-none select-none dark:hidden`}
        draggable={false}
      />
      <span className="hidden dark:inline">{text}</span>
    </>
  );
}

export default BrandWordmark;
