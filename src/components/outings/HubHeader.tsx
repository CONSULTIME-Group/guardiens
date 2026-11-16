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
 * Lot ES1 (16/11/2026) : même règle à l'ordinateur, la phrase longue y définit l'onglet.
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
    <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
      {actions}
      {stat}
    </div>
    {children}
  </header>
);

/**
 * Lot SORT13 : le chiffre de l'onglet. Lot ENT-MOB1 au téléphone puis lot ES1
 * (16/11/2026) à toutes les largeurs : une ligne, le nombre en gras (plus grand
 * à partir de 768 px), le libellé court et le geste second au bout de la ligne
 * (« Proposer mon aide »). Le lieu se lit dans la ligne de réglage.
 */
export const HubStat = ({ value, label, href, to, aside }: {
  value: number;
  label: string;
  href?: string;
  to?: string;
  aside?: ReactNode;
}) => {
  const lineBody = <><b className="font-semibold md:font-heading md:text-xl md:font-bold md:text-primary">{value}</b> {label}</>;
  const lineText = "inline-flex min-h-11 min-w-0 items-center gap-1 text-sm text-foreground no-underline md:text-base";
  return (
    <div className="flex items-center justify-between gap-3 md:justify-start md:gap-6" data-testid="hub-stat-line">
      {to
        ? <Link to={to} className={lineText}><span>{lineBody}</span></Link>
        : href
          ? <a href={href} className={lineText}><span>{lineBody}</span></a>
          : <p className={lineText}><span>{lineBody}</span></p>}
      {aside}
    </div>
  );
};

/**
 * Lot ENT-MOB1 (16/11/2026), étendu à toutes les largeurs par le lot ES1 :
 * les réglages tiennent en une ligne (« Autour de Lyon, 30 km · Changer »),
 * cible de 44 px, 448 px au plus à l'ordinateur.
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
  const shell = "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 text-left text-sm text-foreground no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:max-w-md";
  return to
    ? <Link to={to} className={shell} data-testid="hub-settings-line">{body}</Link>
    : <button type="button" onClick={onClick} aria-expanded={expanded} className={shell} data-testid="hub-settings-line">{body}</button>;
};

/**
 * Lot SORT13 : pourquoi cette rubrique. Le chiffre vient de l'étude citée dans
 * l'article du journal.
 */
export const HubWhy = () => (
  // Lot ES1 (16/11/2026) : une seule fois, sous la liste, à toutes les largeurs (décision 4 du conseil du 16/11).
  <aside className="mt-10 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:gap-4 sm:px-5 md:max-w-3xl" aria-label="Pourquoi cette rubrique" data-testid="hub-why">
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

/**
 * « Une idée pour commencer » : mêmes vignettes dans les trois onglets.
 * Lot ES1 (16/11/2026) : une seule fois dans la page, après la liste au
 * téléphone, dans la colonne de droite à partir de 1 024 px (HubBody), en
 * pastilles sur deux colonnes.
 */
export const HubIdeas = ({ id, ideas, onPick }: {
  id: string;
  ideas: ReadonlyArray<HubIdea>;
  onPick: (idea: HubIdea) => void;
}) => (
  <section aria-labelledby={id} data-testid="hub-ideas">
    <h2 id={id} className="text-sm font-semibold text-foreground lg:font-heading lg:text-lg">Une idée pour commencer</h2>
    <ul className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-2 lg:gap-2">
      {ideas.map((idea) => (
        <li key={idea.key} className="shrink-0 sm:h-full">
          <button
            type="button"
            onClick={() => onPick(idea)}
            className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card py-1 pl-1 pr-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-full sm:w-full sm:flex-col sm:items-start sm:whitespace-normal sm:rounded-lg sm:p-3 lg:flex-row lg:items-center lg:rounded-full lg:py-1 lg:pl-1 lg:pr-3"
          >
            <img
              src={idea.image}
              alt=""
              width={80}
              height={80}
              decoding="async"
              className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-16 sm:w-16 sm:rounded-md lg:h-9 lg:w-9 lg:rounded-full"
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

/**
 * Lot ES1 (16/11/2026) : corps commun des trois onglets, un seul arbre de page.
 * Au téléphone et jusqu'à 1 023 px : « before » (mode d'emploi du visiteur),
 * la liste, puis « after » (idées). À partir de 1 024 px : la liste à gauche,
 * « before » puis « after » dans une colonne de 320 px à droite.
 */
export const HubBody = ({ before, list, after }: { before?: ReactNode; list: ReactNode; after?: ReactNode }) => (
  <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-x-10 lg:gap-y-6" data-testid="hub-body">
    {before ? <div className="min-w-0 lg:col-start-2 lg:row-start-1" data-testid="hub-body-before">{before}</div> : null}
    <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1" data-testid="hub-body-list">{list}</div>
    {after ? <div className="min-w-0 lg:col-start-2 lg:row-start-2" data-testid="hub-body-after">{after}</div> : null}
  </div>
);

/** Enveloppe commune : même largeur et mêmes marges dans les trois onglets (lot ES1 : 1 152 px pour la colonne de droite). */
export const HUB_SHELL = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";
export const HUB_TABS = "mt-3 w-full max-w-md";
