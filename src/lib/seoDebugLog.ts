// In-memory ring buffer that records per-page SEO snapshots.
// Used by /admin/seo-debug to verify alignment between the data fed to
// PageMeta (article.canonical_url / article.noindex) and what Helmet
// actually emitted into <head>.

export interface SeoDebugEntry {
  ts: string;
  path: string;
  source: "PageMeta" | "ArticleDetail" | "manual";
  // Inputs (props) — what the component was asked to render
  input: {
    title?: string;
    description?: string;
    canonical?: string | null;
    noindex?: boolean;
    type?: string;
  };
  // Article-level DB context (only present when source === "ArticleDetail")
  article?: {
    id?: string;
    slug?: string;
    canonical_url?: string | null;
    noindex?: boolean | null;
    meta_title?: string | null;
    meta_description?: string | null;
  };
  // Actual rendered <head> snapshot taken right after upsert
  rendered: {
    title?: string;
    robots?: string | null;
    canonical?: string | null;
    description?: string | null;
    ogTitle?: string | null;
    ogUrl?: string | null;
  };
  // Discrepancies the logger detected automatically
  warnings: string[];
}

const BUFFER_LIMIT = 50;
const KEY = "__seoDebugLog__";

interface GlobalShape {
  [KEY]?: SeoDebugEntry[];
}

const getBuffer = (): SeoDebugEntry[] => {
  if (typeof window === "undefined") return [];
  const g = window as unknown as GlobalShape;
  if (!g[KEY]) g[KEY] = [];
  return g[KEY]!;
};

const readHead = () => {
  if (typeof document === "undefined") return {};
  const get = (sel: string, attr = "content") =>
    document.head.querySelector(sel)?.getAttribute(attr) ?? null;
  return {
    title: document.title,
    robots: get('meta[name="robots"]'),
    canonical: get('link[rel="canonical"]', "href"),
    description: get('meta[name="description"]'),
    ogTitle: get('meta[property="og:title"]'),
    ogUrl: get('meta[property="og:url"]'),
  };
};

const detectWarnings = (entry: Omit<SeoDebugEntry, "warnings">): string[] => {
  const w: string[] = [];
  const { input, article, rendered } = entry;

  // 1. noindex propagation
  const expectedRobots = input.noindex ? "noindex, follow" : "index, follow";
  if (rendered.robots && rendered.robots !== expectedRobots) {
    w.push(`robots mismatch: rendered "${rendered.robots}", expected "${expectedRobots}"`);
  }

  // 2. canonical propagation
  if (input.canonical && rendered.canonical && !rendered.canonical.endsWith(stripTrailing(input.canonical))) {
    // best-effort substring check (canonical is normalized at render time)
    const normalizedInput = input.canonical.trim().replace(/\/+$/g, "");
    if (rendered.canonical !== normalizedInput) {
      w.push(`canonical mismatch: rendered "${rendered.canonical}", input "${input.canonical}"`);
    }
  }

  // 3. article DB → input drift
  if (article) {
    if (article.canonical_url && article.canonical_url !== input.canonical) {
      w.push(
        `article.canonical_url ("${article.canonical_url}") not forwarded to PageMeta (got "${input.canonical ?? "∅"}")`,
      );
    }
    if (article.noindex === true && input.noindex !== true) {
      w.push(`article.noindex=true but PageMeta received noindex=${String(input.noindex)}`);
    }
  }

  // 4. duplicates
  if (typeof document !== "undefined") {
    const robotsCount = document.head.querySelectorAll('meta[name="robots"]').length;
    const canonicalCount = document.head.querySelectorAll('link[rel="canonical"]').length;
    if (robotsCount > 1) w.push(`duplicate <meta name="robots"> (${robotsCount})`);
    if (canonicalCount > 1) w.push(`duplicate <link rel="canonical"> (${canonicalCount})`);
  }

  return w;
};

const stripTrailing = (s: string) => s.trim().replace(/\/+$/g, "");

export const logSeoSnapshot = (
  partial: Omit<SeoDebugEntry, "ts" | "rendered" | "warnings">,
) => {
  if (typeof window === "undefined") return;
  // Defer one tick so Helmet has had a chance to flush its tags.
  setTimeout(() => {
    const rendered = readHead();
    const base = { ...partial, ts: new Date().toISOString(), rendered };
    const entry: SeoDebugEntry = { ...base, warnings: detectWarnings(base) };
    const buf = getBuffer();
    buf.unshift(entry);
    if (buf.length > BUFFER_LIMIT) buf.length = BUFFER_LIMIT;

    if (entry.warnings.length > 0) {
      // Surface warnings in the dev console so QA notices them without
      // having to open /admin/seo-debug.
      // eslint-disable-next-line no-console
      console.warn(`[seo-debug] ${entry.path}`, entry.warnings, entry);
    }
  }, 0);
};

export const readSeoDebugLog = (): SeoDebugEntry[] => [...getBuffer()];

export const clearSeoDebugLog = () => {
  const buf = getBuffer();
  buf.length = 0;
};
