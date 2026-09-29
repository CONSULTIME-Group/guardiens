import { Button } from "@/components/ui/button";

interface Props {
  label: string;
  notFound: boolean;
  notFoundText: string;
  onClear: () => void;
}

/**
 * Bandeau des filtres passés dans l'URL (?user=, ?sit=, ?id=...).
 * Un identifiant qui ne correspond à rien produit un message clair,
 * jamais une liste vide silencieuse. « Retirer le filtre » nettoie l'URL.
 */
export function UrlFilterNotice({ label, notFound, notFoundText, onClear }: Props) {
  return (
    <div
      role="status"
      className={
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm " +
        (notFound ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-border bg-muted/40 text-foreground")
      }
    >
      <span>{notFound ? notFoundText : label}</span>
      <Button variant="outline" size="sm" onClick={onClear}>
        Retirer le filtre
      </Button>
    </div>
  );
}
