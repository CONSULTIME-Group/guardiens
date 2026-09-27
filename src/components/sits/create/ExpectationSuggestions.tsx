/**
 * Suggestions cliquables sous « Qu'attendez-vous du gardien ? » (lot A2).
 * Un clic ajoute la phrase à la suite du texte déjà saisi, sans jamais
 * l'écraser. Boutons natifs, donc accessibles au clavier.
 */
export const EXPECTATION_SUGGESTIONS = [
  "Nourrir et câliner les animaux matin et soir",
  "Arroser les plantes et relever le courrier",
  "Une présence rassurante dans la maison",
] as const;

/** Ajoute une phrase à la suite d'un texte, avec une ponctuation propre. */
export function appendSuggestion(current: string, phrase: string): string {
  const base = (current || "").replace(/\s+$/, "");
  if (!base) return `${phrase}.`;
  if (base.includes(phrase)) return current;
  const sep = /[.!?…]$/.test(base) ? " " : ". ";
  return `${base}${sep}${phrase}.`;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
}

export default function ExpectationSuggestions({ value, onChange }: Props) {
  return (
    <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Suggestions d'attentes">
      {EXPECTATION_SUGGESTIONS.map((phrase) => (
        <button
          key={phrase}
          type="button"
          onClick={() => onChange(appendSuggestion(value, phrase))}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[32px]"
          aria-label={`Ajouter : ${phrase}`}
        >
          + {phrase}
        </button>
      ))}
    </div>
  );
}
