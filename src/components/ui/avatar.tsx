import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";
import { storageImageUrl } from "@/lib/storageImage";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

/**
 * Image d'avatar. Toute URL publique du bucket storage est servie via
 * l'endpoint de transformation (cadrage carré cover) : les fichiers sources
 * peuvent peser plusieurs Mo pour un rendu de quelques dizaines de pixels
 * (cas mesuré en production : 8,8 Mo pour 34 px).
 *
 * `displaySize` = taille réelle du cadre en px CSS. Défaut 96 : le plus
 * grand cadre AvatarImage du projet est h-16 (64 px), couvert à 1,5x sans
 * devoir reprendre chaque appelant. Les URLs non storage (blob de
 * prévisualisation, assets locaux) passent telles quelles.
 */
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & { displaySize?: number }
>(({ className, src, displaySize = 96, ...props }, ref) => {
  const optimized =
    typeof src === "string" && src
      ? storageImageUrl(src, { width: displaySize, height: displaySize })
      : src;
  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={optimized}
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
