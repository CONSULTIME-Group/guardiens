/**
 * Lot ALMA2 (10/11/2026, arène « Alma vivante », lot L2) : écrire avec Alma.
 *
 * Encart sous le champ principal : le membre dit son besoin en une phrase,
 * Alma met en forme, le texte arrive dans le formulaire et le membre le relit.
 * Mesure : alma_cowrite_shown à l'affichage, alma_cowrite_used au brouillon
 * reçu (src/lib/alma/cowrite.ts). L'envoi est mesuré par l'écran parent.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackCowrite, type CowriteMoment } from "@/lib/alma/cowrite";

export interface AlmaCoWriteProps {
  moment: CowriteMoment;
  /** Phrase d'Alma, au-dessus du champ. */
  intro: string;
  placeholder: string;
  /** Appelée avec la phrase du membre ; renvoie true quand le brouillon est posé. */
  onDraft: (phrase: string) => Promise<boolean>;
  minLength?: number;
}

export function AlmaCoWrite({ moment, intro, placeholder, onDraft, minLength = 10 }: AlmaCoWriteProps) {
  const [phrase, setPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    trackCowrite("shown", moment);
  }, [moment]);

  const ready = phrase.trim().length >= minLength && !loading;

  const submit = async () => {
    if (!ready) return;
    setLoading(true);
    try {
      const ok = await onDraft(phrase.trim());
      if (ok) {
        trackCowrite("used", moment, { phrase_length: phrase.trim().length });
        setDone(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-card border border-dashed border-border bg-card p-3 space-y-2"
      data-testid="alma-cowrite"
      data-moment={moment}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 h-8 w-8 shrink-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, hsl(var(--hero-paper)) 0%, hsl(var(--primary) / 0.18) 100%)",
          }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-tight text-primary">
            Alma <span className="font-normal text-muted-foreground">· Compagne IA de Guardiens</span>
          </p>
          <p className="mt-0.5 text-sm text-foreground/90">
            {done ? "C'est dans le formulaire. Relisez, ajustez, c'est votre texte." : intro}
          </p>
        </div>
      </div>
      {!done && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={placeholder}
            maxLength={800}
            className="h-11 text-base"
            aria-label="Votre besoin en une phrase"
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0"
            disabled={!ready}
            onClick={() => void submit()}
          >
            {loading ? "Alma écrit…" : "Écrire avec Alma"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default AlmaCoWrite;
