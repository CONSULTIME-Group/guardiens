/**
 * PetPhoto — affiche la photo d'un animal avec un fallback neutre
 * (pas d'emoji décoratif, pas d'icône Lucide visible : conforme à la règle
 * "no-icons-in-content"). Gère aussi le cas où l'URL est cassée à l'exécution.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PetPhotoProps {
  src?: string | null;
  name?: string | null;
  className?: string;
}

export function PetPhoto({ src, name, className }: PetPhotoProps) {
  const [broken, setBroken] = useState(false);
  const showImage = !!src && !broken;

  const initial = (name?.trim()?.[0] || "?").toUpperCase();
  const alt = name ? `Photo de ${name}` : "Photo de l'animal";

  return (
    <div className="shrink-0">
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          onError={() => setBroken(true)}
          className={cn(
            "object-cover border border-border bg-muted",
            className,
          )}
        />
      ) : (
        <div
          aria-label={name ? `Pas de photo pour ${name}` : "Pas de photo"}
          className={cn(
            "bg-muted border border-border flex items-center justify-center text-muted-foreground/70 text-2xl font-serif",
            className,
          )}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
