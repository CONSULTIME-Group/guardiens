/**
 * DraftChecklist, état de complétude d'une annonce en brouillon avant publication.
 *
 * Les règles ne sont plus portées ici : elles viennent de la source unique
 * `src/lib/sitPublishRules.ts`, partagée avec le formulaire de création,
 * la vue propriétaire et le bandeau d'accès.
 *
 * Le bouton "Publier" reste grisé tant qu'un élément manque.
 */
import { Check, Circle, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublishBlocker } from "@/lib/sitPublishRules";

interface DraftChecklistProps {
  /** Éléments manquants, calculés par `getSitPublishBlockers`. */
  blockers: PublishBlocker[];
  /** Libellés de tous les prérequis, dans l'ordre, pour l'affichage coché. */
  requirements: { id: string; label: string }[];
  publishing: boolean;
  onPublish: () => void;
  /** Lien d'édition de l'annonce, pour les éléments qui se corrigent dans le formulaire. */
  editHref?: string;
}

const DraftChecklist = ({
  blockers,
  requirements,
  publishing,
  onPublish,
  editHref,
}: DraftChecklistProps) => {
  const missingIds = new Set(blockers.map((b) => b.id));
  const items = requirements.map((r) => ({
    ...r,
    ok: !missingIds.has(r.id),
    fix: blockers.find((b) => b.id === r.id)?.action,
  }));

  const allOk = blockers.length === 0;
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
        <Button onClick={onPublish} disabled={!allOk || publishing} className="gap-2">
          <Send className="h-4 w-4" />
          {publishing ? "Publication…" : "Publier l'annonce"}
        </Button>
      </div>

      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
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
            {!item.ok && (item.fix || editHref) && (
              <Link
                to={(item.fix || editHref) as string}
                className="text-primary underline underline-offset-2 shrink-0"
              >
                Compléter
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DraftChecklist;
