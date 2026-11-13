import { useState, type ReactNode } from "react";
import { MapPin } from "lucide-react";

/**
 * Lot SORT11 : en-tête commun aux trois onglets de la rubrique
 * « Entraide & sorties » (Entraide, Sorties, Chantiers).
 * Titre court, une phrase, les boutons, une ligne de chiffre, puis les
 * réglages repliés sur une ligne.
 */
export const HubHeader = ({ title, phrase, actions, pulse, children }: {
  title: string;
  phrase: ReactNode;
  actions: ReactNode;
  pulse?: ReactNode;
  children?: ReactNode;
}) => (
  <header className="flex flex-col gap-3 pt-4" data-testid="hub-header">
    <h1 className="font-heading text-2xl font-bold leading-tight text-foreground [text-wrap:balance] sm:text-4xl">{title}</h1>
    <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">{phrase}</p>
    <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{actions}</div>
    {pulse ? <p className="text-sm leading-snug text-muted-foreground" data-testid="hub-pulse">{pulse}</p> : null}
    {children}
  </header>
);

/**
 * Les réglages de l'onglet sur une ligne : le résumé, puis « Modifier »
 * qui déplie le détail (lieu, rayon, savoir-faire).
 */
export const HubSettingsLine = ({ summary, defaultOpen = false, children }: {
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="max-w-xl rounded-xl border border-border bg-card" data-testid="hub-settings">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="hub-settings-panel"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3.5 text-left text-[15px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MapPin aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        <span className="shrink-0 font-semibold text-primary underline underline-offset-4">{open ? "Fermer" : "Modifier"}</span>
      </button>
      <div id="hub-settings-panel" hidden={!open} className="space-y-2 border-t border-border px-3.5 py-3 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
};

export interface HubIdea {
  key: string;
  label: string;
  image: string;
}

/** « Une idée pour commencer » : mêmes vignettes dans les trois onglets. */
export const HubIdeas = ({ id, ideas, onPick }: {
  id: string;
  ideas: ReadonlyArray<HubIdea>;
  onPick: (idea: HubIdea) => void;
}) => (
  <section className="mt-5" aria-labelledby={id} data-testid="hub-ideas">
    <h2 id={id} className="text-sm font-semibold text-foreground">Une idée pour commencer</h2>
    <ul className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
      {ideas.map((idea) => (
        <li key={idea.key} className="shrink-0 sm:h-full">
          <button
            type="button"
            onClick={() => onPick(idea)}
            className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card py-1 pl-1 pr-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-full sm:w-full sm:flex-col sm:items-start sm:whitespace-normal sm:rounded-lg sm:p-3"
          >
            <img
              src={idea.image}
              alt=""
              width={80}
              height={80}
              decoding="async"
              className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-16 sm:w-16 sm:rounded-md"
            />
            <span className="leading-snug">{idea.label}</span>
          </button>
        </li>
      ))}
    </ul>
  </section>
);

/** Enveloppe commune : même largeur et mêmes marges dans les trois onglets. */
export const HUB_SHELL = "mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8";
export const HUB_TABS = "mt-3 w-full max-w-md";
