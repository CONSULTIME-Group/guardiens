/**
 * DraftChecklist, état de complétude d'une annonce en brouillon avant publication.
 *
 * Affiché à la place de l'ancien bandeau "Brouillon → Publier".
 * Liste les éléments requis :
 *  - titre
 *  - dates (ou flexibilité activée)
 *  - description (≥ 50 caractères)
 *  - au moins 1 photo (galerie owner)
 *  - au moins 1 animal renseigné dans le profil owner
 *
 * Le bouton "Publier" reste accessible mais grisé tant qu'un item est manquant
 * (on autorise la publication forcée si TOUS les requis sont remplis).
 */
import { Check, Circle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DraftChecklistProps {
  hasTitle: boolean;
  hasDates: boolean;
  hasDescription: boolean;
  hasPhoto: boolean;
  hasPet: boolean;
  publishing: boolean;
  onPublish: () => void;
}

const DraftChecklist = ({
  hasTitle,
  hasDates,
  hasDescription,
  hasPhoto,
  hasPet,
  publishing,
  onPublish,
}: DraftChecklistProps) => {
  const items: { ok: boolean; label: string; href?: string }[] = [
    { ok: hasTitle, label: "Titre de l'annonce", href: "edit" },
    { ok: hasDates, label: "Dates de garde (ou dates flexibles)", href: "edit" },
    { ok: hasDescription, label: "Description (50 caractères minimum)", href: "edit" },
    { ok: hasPhoto, label: "Au moins 1 photo dans votre galerie" },
    { ok: hasPet, label: "Au moins 1 animal renseigné sur votre profil" },
  ];

  const allOk = items.every((i) => i.ok);
  const doneCount = items.filter((i) => i.ok).length;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-accent/40 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-heading text-base font-semibold">
            Brouillon, {doneCount} / {items.length} prêts
          </p>
          <p className="text-sm text-muted-foreground">
            {allOk
              ? "Tout est prêt. Publiez votre annonce pour qu'elle apparaisse dans la recherche."
              : "Complétez les éléments ci-dessous pour publier votre annonce."}
          </p>
        </div>
        <Button
          onClick={onPublish}
          disabled={!allOk || publishing}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {publishing ? "Publication…" : "Publier l'annonce"}
        </Button>
      </div>

      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.label}
            className={cn(
              "flex items-center gap-2 text-sm",
              item.ok ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {item.ok ? (
              <Check className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DraftChecklist;
