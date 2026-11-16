import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { storageImageUrl } from "@/lib/storageImage";
import type { HubArticle } from "@/lib/hubArticles";

/**
 * Lot SORT11 : en-tête commun aux trois onglets de la rubrique
 * « Entraide & sorties » (Entraide, Sorties, Chantiers).
 * Titre court, une phrase, le bouton et le chiffre côte à côte, puis les
 * réglages nommés un par un.
 * Lot ENT-MOB1 (16/11/2026) : sous 768 px, une phrase courte (phraseShort),
 * un seul bouton, le chiffre en une ligne et les réglages en une ligne.
 */
export const HubHeader = ({ title, phrase, phraseShort, actions, stat, children }: {
  title: string;
  phrase: ReactNode;
  phraseShort?: ReactNode;
  actions: ReactNode;
  stat?: ReactNode;
  children?: ReactNode;
}) => (
  <header className="flex flex-col gap-3 pt-4" data-testid="hub-header">
    <h1 className="font-heading text-2xl font-bold leading-tight text-foreground [text-wrap:balance] sm:text-4xl">{title}</h1>
    <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
      {phraseShort ? (
        <>
          <span className="md:hidden" data-testid="hub-phrase-short">{phraseShort}</span>
          <span className="hidden md:inline">{phrase}</span>
        </>
      ) : phrase}
    </p>
    <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
      {actions}
      {stat}
    </div>
    {children}
  </header>
);

/**
 * Lot SORT13 : le chiffre de l'onglet, en bloc visible à côté du bouton
 * (« 86 personnes prêtes à aider autour de Lyon »). Le bloc entier est le lien.
 */
export const HubStat = ({ value, label, mobileLabel, href, to, action, avatars = [], aside }: {
  value: number;
  label: string;
  /** Lot ENT-MOB1 : libellé de la ligne courte du téléphone (le lieu se lit dans la ligne de réglage). */
  mobileLabel?: string;
  href?: string;
  to?: string;
  action?: string;
  avatars?: ReadonlyArray<string>;
  /** Lot ENT-MOB1 : geste second posé au bout de la ligne du téléphone (« Proposer mon aide »). */
  aside?: ReactNode;
}) => {
  const body = (
    <>
      <span className="font-heading text-3xl font-bold leading-none text-primary">{value}</span>
      <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{label}</span>
      {avatars.length > 0 && (
        <span aria-hidden="true" className="hidden shrink-0 -space-x-2 sm:flex">
          {avatars.slice(0, 3).map((src) => (
            <img key={src} src={src} alt="" width={32} height={32} loading="lazy" decoding="async" className="h-8 w-8 rounded-full border-2 border-card object-cover" />
          ))}
        </span>
      )}
      {action && <span className="shrink-0 text-sm font-semibold text-primary underline underline-offset-4">{action}</span>}
    </>
  );
  const shell = "hidden min-h-[52px] items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-2 no-underline sm:min-h-12 md:flex";
  const block = to
    ? <Link to={to} className={shell} data-testid="hub-stat">{body}</Link>
    : href
      ? <a href={href} className={shell} data-testid="hub-stat">{body}</a>
      : <p className={shell} data-testid="hub-stat">{body}</p>;
  // Sous 768 px : une ligne de texte, le nombre en gras, sans bloc ni avatars.
  const lineBody = <><b className="font-semibold">{value}</b> {mobileLabel ?? label}</>;
  const lineText = "inline-flex min-h-11 min-w-0 items-center gap-1 text-sm text-foreground no-underline";
  const line = (
    <div className="flex items-center justify-between gap-3 md:hidden" data-testid="hub-stat-line">
      {to
        ? <Link to={to} className={lineText}><span>{lineBody}</span></Link>
        : href
          ? <a href={href} className={lineText}><span>{lineBody}</span></a>
          : <p className={lineText}><span>{lineBody}</span></p>}
      {aside}
    </div>
  );
  return <>{block}{line}</>;
};

/**
 * Lot SORT13 : les réglages de l'onglet, un par ligne courte, chacun avec
 * son nom, sa valeur et son geste (« Ville : Lyon · Changer »).
 */
export const HubSetting = ({ label, value, action, to, onClick, expanded }: {
  label: string;
  value: string;
  action: string;
  to?: string;
  onClick?: () => void;
  expanded?: boolean;
}) => {
  const body = (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
      <span className="font-semibold text-primary underline underline-offset-4">{action}</span>
    </>
  );
  const shell = "inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return to
    ? <Link to={to} className={shell} data-testid="hub-setting">{body}</Link>
    : <button type="button" onClick={onClick} aria-expanded={expanded} className={shell} data-testid="hub-setting">{body}</button>;
};

export const HubSettings = ({ children }: { children: ReactNode }) => (
  <div className="hidden flex-wrap items-center gap-2 md:flex" data-testid="hub-settings">{children}</div>
);

/**
 * Lot ENT-MOB1 (16/11/2026) : sous 768 px, les réglages tiennent en une
 * ligne (« Autour de Lyon, 30 km · Changer »), cible de 44 px.
 */
export const HubSettingsLine = ({ summary, action, to, onClick, expanded }: {
  summary: ReactNode;
  action: string;
  to?: string;
  onClick?: () => void;
  expanded?: boolean;
}) => {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">{summary}</span>
      </span>
      <span className="shrink-0 font-semibold text-primary">{action}</span>
    </>
  );
  const shell = "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 text-left text-sm text-foreground no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden";
  return to
    ? <Link to={to} className={shell} data-testid="hub-settings-line">{body}</Link>
    : <button type="button" onClick={onClick} aria-expanded={expanded} className={shell} data-testid="hub-settings-line">{body}</button>;
};

/**
 * Lot SORT13 : pourquoi cette rubrique, en tête des trois onglets. Les deux
 * chiffres viennent de l'étude citée dans l'article du journal.
 */
export const HubWhy = ({ placement = "top" }: { placement?: "top" | "end" }) => (
  // Lot ENT-MOB1 : en tête à partir de 768 px ; sous 768 px, en fin de page (placement « end »).
  <aside className={`${placement === "end" ? "mt-10 flex md:hidden" : "mt-4 hidden md:flex"} items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:gap-4 sm:px-5`} aria-label="Pourquoi cette rubrique" data-testid="hub-why">
    <span className="shrink-0 font-heading text-2xl font-bold leading-none text-primary sm:text-4xl">24&nbsp;%</span>
    <p className="min-w-0 text-[13px] leading-snug text-foreground sm:text-sm sm:leading-relaxed">
      des personnes en France se sentent seules souvent ou presque tous les jours (CRÉDOC, étude Solitudes 2025). Un coup de main, une sortie, un chantier : trois raisons simples de se parler entre gens du coin.{" "}
      <Link to="/actualites/technologie-recreer-lien-pres-de-chez-soi" className="font-semibold text-primary underline underline-offset-4">Lire l'article</Link>
    </p>
  </aside>
);

export interface HubIdea {
  key: string;
  label: string;
  image: string;
}

/** « Une idée pour commencer » : mêmes vignettes dans les trois onglets. */
export const HubIdeas = ({ id, ideas, onPick, placement = "top" }: {
  id: string;
  ideas: ReadonlyArray<HubIdea>;
  onPick: (idea: HubIdea) => void;
  /** Lot ENT-MOB1 : « top » avant la liste à partir de 768 px, « end » après la liste sous 768 px. */
  placement?: "top" | "end";
}) => (
  <section className={placement === "end" ? "mt-8 md:hidden" : "mt-5 hidden md:block"} aria-labelledby={id} data-testid="hub-ideas">
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

/**
 * Lot SORT13 : « Pour aller plus loin », les articles du journal propres à
 * l'onglet, chacun avec sa photo de couverture.
 */
export const HubArticles = ({ articles }: { articles: ReadonlyArray<HubArticle> }) => (
  <section className="mt-14" aria-labelledby="hub-articles-title" data-testid="hub-articles">
    <h2 id="hub-articles-title" className="font-heading text-xl font-semibold text-foreground sm:text-2xl">Pour aller plus loin</h2>
    <ul className="mt-5 grid gap-4 sm:grid-cols-3">
      {articles.map((article) => (
        <li key={article.slug}>
          <Link to={`/actualites/${article.slug}`} className="group flex h-full flex-row gap-3 overflow-hidden rounded-2xl border border-border bg-card no-underline sm:flex-col sm:gap-0">
            <img
              src={storageImageUrl(article.cover, { width: 480, height: 300 })}
              alt=""
              width={480}
              height={300}
              loading="lazy"
              decoding="async"
              className="h-24 w-28 shrink-0 object-cover sm:h-40 sm:w-full"
            />
            <span className="flex min-w-0 items-center py-2 pr-3 font-body text-[15px] font-semibold leading-snug text-foreground group-hover:underline sm:p-4">{article.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

/** Enveloppe commune : même largeur et mêmes marges dans les trois onglets. */
export const HUB_SHELL = "mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8";
export const HUB_TABS = "mt-3 w-full max-w-md";
