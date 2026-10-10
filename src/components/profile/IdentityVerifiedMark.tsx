/**
 * Marque « Identité vérifiée » du hero de profil (lot L5).
 *
 * Icône seule, cible 44 px, posée près du prénom. Survol et focus : infobulle
 * courte. Clic ou toucher : explication précise du contrôle réel (analyse
 * automatique, dossier revu par l'équipe si l'analyse ne conclut pas),
 * jamais un simple défilement vers un parcours d'inscription.
 */
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const IDENTITY_TOOLTIP = "Identité vérifiée à partir d'une pièce officielle";

export const IDENTITY_EXPLANATION = [
  "Une pièce d'identité officielle a été transmise à Guardiens.",
  "Elle est d'abord analysée automatiquement. Si l'analyse ne permet pas de conclure, une personne de l'équipe revoit le dossier.",
  "La pièce n'est jamais affichée sur le profil.",
  "C'est un signal de confiance parmi d'autres : il ne garantit pas la fiabilité. Vos échanges et votre rencontre le complètent.",
];

const IdentityVerifiedMark = ({ firstName }: { firstName: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider delayDuration={150}>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                data-identity-mark
                aria-label="Identité vérifiée"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              >
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          {!open && (
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {IDENTITY_TOOLTIP}
            </TooltipContent>
          )}
        </Tooltip>
        <PopoverContent side="bottom" align="start" className="w-80 text-sm leading-relaxed" data-identity-explanation>
          <p className="font-semibold text-foreground">Identité de {firstName} vérifiée</p>
          {IDENTITY_EXPLANATION.map((line) => (
            <p key={line} className="mt-2 text-muted-foreground">{line}</p>
          ))}
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};

export default IdentityVerifiedMark;
