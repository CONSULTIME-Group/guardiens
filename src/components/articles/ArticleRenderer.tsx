import { Link } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Search, TreePine, Users, CheckCircle2, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { interpolatePlaceholders, type PlaceholderValue } from "@/lib/contentPlaceholders";

// ── Supabase Storage base URL ──────────────────────────────
const SB = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/articles-inline";


const ARTICLE_IMAGES: Record<string, string> = {
  // ── LOT 1, migrated to Supabase Storage ──────────────────
  "/images/parc-tete-dor-chiens-lyon.jpg": `${SB}/parc-tete-dor-chiens-lyon.webp`,
  "/images/golden-retriever-tete-dor-lyon.jpg": `${SB}/golden-retriever-tete-dor-lyon.webp`,
  "/images/parc-parilly-labrador-lyon.jpg": `${SB}/parc-parilly-labrador-lyon.webp`,
  "/images/grenoble-confiance-cafe.jpg": `${SB}/grenoble-confiance-cafe.webp`,
  "/images/border-collie-feyssine-lyon.jpg": `${SB}/border-collie-feyssine-lyon.webp`,
  "/images/lyon-confiance-cafe.jpg": `${SB}/lyon-confiance-cafe.webp`,
  "/images/boom-petsitting-confluence-lyon.jpg": `${SB}/boom-petsitting-confluence-lyon.webp`,
  "/images/golden-retriever-interieur-vieux-lyon.jpg": `${SB}/golden-retriever-interieur-vieux-lyon.webp`,
  "/images/villa-ouest-lyonnais-vide.jpg": `${SB}/villa-ouest-lyonnais-vide.webp`,
  "/images/berger-australien-feyssine-lyon.jpg": `${SB}/berger-australien-feyssine-lyon.webp`,
  "/images/saint-etienne-confiance-cafe.jpg": `${SB}/saint-etienne-confiance-cafe.webp`,
  "/images/garde-animaux-croix-rousse-lyon.jpg": `${SB}/garde-animaux-croix-rousse-lyon.webp`,

  // ── LOT 2, migrated to Supabase Storage ──────────────────
  "/images/lyon-hero-quais.jpg": `${SB}/lyon-hero-quais.webp`,
  "/images/lyon-chat-fenetre.jpg": `${SB}/lyon-chat-fenetre.webp`,
  "/images/venissieux-parilly-chat.jpg": `${SB}/venissieux-parilly-chat.webp`,
  "/images/chambery-elephants-chien.jpg": `${SB}/chambery-elephants-chien.webp`,
  "/images/saint-etienne-parc-chien.jpg": `${SB}/saint-etienne-parc-chien.webp`,
  "/images/golden-retriever-quais-lyon.jpg": `${SB}/golden-retriever-quais-lyon.webp`,
  "/images/valence-chat-drome.jpg": `${SB}/valence-chat-drome.webp`,
  "/images/garde-animaux-appartement-lyon.jpg": `${SB}/garde-animaux-appartement-lyon.webp`,
  "/images/valence-confiance-cafe.jpg": `${SB}/valence-confiance-cafe.webp`,
  "/images/berger-australien-interieur-lyon.jpg": `${SB}/berger-australien-interieur-lyon.webp`,
  "/images/gardien-bellecour-lyon.jpg": `${SB}/gardien-bellecour-lyon.webp`,
  "/images/clermont-jaude-chien.jpg": `${SB}/clermont-jaude-chien.webp`,
  "/images/boom-petsitting-homeoffice-lyon.jpg": `${SB}/boom-petsitting-homeoffice-lyon.webp`,
  "/images/valence-parc-chien.jpg": `${SB}/valence-parc-chien.webp`,
  "/images/villeurbanne-gratteciel-chien.jpg": `${SB}/villeurbanne-gratteciel-chien.webp`,

  // ── LOT 3, migrated to Supabase Storage ──────────────────
  "/images/grenoble-bastille-chien.jpg": `${SB}/grenoble-bastille-chien.webp`,
  "/images/grenoble-chat-chartreuse.jpg": `${SB}/grenoble-chat-chartreuse.webp`,
  "/images/saint-etienne-chat-forez.jpg": `${SB}/saint-etienne-chat-forez.webp`,
  "/images/chambery-chat-bauges.jpg": `${SB}/chambery-chat-bauges.webp`,
  "/images/chambery-confiance-rue.jpg": `${SB}/chambery-confiance-rue.webp`,
  "/images/aix-les-bains-villa-lac.jpg": `${SB}/aix-les-bains-villa-lac.webp`,
  "/images/border-collie-interieur-croix-rousse.jpg": `${SB}/border-collie-interieur-croix-rousse.webp`,
  "/images/bouledogue-francais-vieux-lyon.jpg": `${SB}/bouledogue-francais-vieux-lyon.webp`,
  "/images/bouledogue-francais-interieur-lyon6.jpg": `${SB}/bouledogue-francais-interieur-lyon6.webp`,
  "/images/fondateurs-guardiens-quais-lyon.jpg": `${SB}/fondateurs-guardiens-quais-lyon.webp`,
  "/images/profil-gardien-laptop-lyon.jpg": `${SB}/profil-gardien-laptop-lyon.webp`,
  "/images/gardien-teletravail-ouest-lyon.jpg": `${SB}/gardien-teletravail-ouest-lyon.webp`,
  "/images/pension-chien-alternatives-cover.jpg": `${SB}/pension-chien-alternatives-cover.webp`,
  "/images/garde-animal-hospitalisation-cover.jpg": `${SB}/garde-animal-hospitalisation-cover.webp`,
  "/images/garde-chat-domicile-lyon.jpg": `${SB}/garde-chat-domicile-lyon.webp`,
  "/images/garde-chat-presquile-lyon.jpg": `${SB}/garde-chat-presquile-lyon.webp`,
  "/images/s-absenter-animal-guide-cover.jpg": `${SB}/s-absenter-animal-guide-cover.webp`,
};

export function resolveImagePath(path: string): string {
  return ARTICLE_IMAGES[path] || path;
}

function resolveArticleImages(html: string): string {
  return html.replace(/src="(\/images\/[^"]+)"/g, (match, path) => {
    const resolved = ARTICLE_IMAGES[path];
    if (!resolved) return match;
    // Apply Supabase Image Transformations if it's a Supabase URL
    const optimized = getOptimizedImageUrl(resolved, 800, 75);
    return `src="${optimized}"`;
  });
}

/**
 * Surcharge des blocs d'appel à l'action, par slug d'article.
 *
 * Par défaut tous les articles reçoivent les blocs orientés garde d'animaux.
 * Certains articles portent un autre sujet, et un bloc hors sujet y coûte
 * plus qu'il ne rapporte. Ajouter une entrée ici suffit à les réorienter.
 */
type CtaCopy = {
  midText: string;
  midPrimary: { label: string; href: string; role: string };
  midSecondary: { label: string; href: string; role: string };
  endHeading: string;
  endText: string;
  endPrimary: { label: string; href: string; role: string };
  endSecondary: { label: string; href: string; role: string };
};

const CTA_DEFAUT: CtaCopy = {
  midText: "Vous êtes propriétaire d'animaux ou vous aimez les animaux ?",
  midPrimary: { label: "Rejoindre la communauté", href: "/inscription?role=owner", role: "owner" },
  midSecondary: { label: "Devenir gardien", href: "/inscription?role=sitter", role: "sitter" },
  endHeading: "Prêt à rejoindre la communauté ?",
  endText: "Créez votre profil et rejoignez les gardiens de votre secteur.",
  endPrimary: { label: "Créer mon profil propriétaire", href: "/inscription?role=owner", role: "owner" },
  endSecondary: { label: "Devenir gardien", href: "/inscription?role=sitter", role: "sitter" },
};

/**
 * Le rôle "projet" est volontairement hors de la liste traitée par
 * adaptEndCTAsForRole : ces libellés survivent tels quels, y compris pour
 * une personne connectée, parce qu'ils portent le sujet de l'article.
 */
const CTA_PAR_SLUG: Record<string, CtaCopy> = {
  "chantier-participatif-projet-collectif-cadre-legal": {
    midText: "Vous avez un projet collectif qui demande des bras ?",
    midPrimary: { label: "Partager mon projet", href: "/petites-missions", role: "projet" },
    midSecondary: { label: "Aider une association", href: "/associations", role: "projet" },
    endHeading: "Un projet à monter, ou des bras à offrir ?",
    endText: "Publiez votre projet pour trouver des bénévoles, ou rejoignez une association qui cherche de l'aide près de chez vous.",
    endPrimary: { label: "Partager mon projet et trouver des bénévoles", href: "/petites-missions", role: "projet" },
    endSecondary: { label: "Aider une association", href: "/associations", role: "projet" },
  },
};

function ctaCopyPour(slug?: string): CtaCopy {
  return (slug && CTA_PAR_SLUG[slug]) || CTA_DEFAUT;
}

/** Inject mid-article CTA after the 2nd <h2> */
function injectCTA(html: string, slug?: string): string {
  let h2Count = 0;
  const slugAttr = slug ? ` data-article-slug="${slug}"` : "";
  const copy = ctaCopyPour(slug);
  return html.replace(/<h2/g, (match) => {
    h2Count++;
    if (h2Count === 3) {
      // `data-cta-block="mid"` permet de masquer le bloc côté CSS pour les
      // utilisateurs logués (cf. .article-rich-content [data-cta-block="mid"]).
      return `<div class="article-cta-block" data-cta-block="mid"><div class="article-cta-inner"><p class="article-cta-text">${copy.midText}</p><div class="article-cta-buttons"><a href="${copy.midPrimary.href}" class="article-cta-btn article-cta-btn-primary" data-article-cta="true" data-cta-position="mid" data-cta-role="${copy.midPrimary.role}"${slugAttr}>${copy.midPrimary.label}</a><a href="${copy.midSecondary.href}" class="article-cta-btn article-cta-btn-secondary" data-article-cta="true" data-cta-position="mid" data-cta-role="${copy.midSecondary.role}"${slugAttr}>${copy.midSecondary.label}</a></div></div></div>\n${match}`;
    }
    return match;
  });
}

/** Transform :::saviez-vous ... ::: blocks */
function transformFactBoxes(content: string): string {
  return content.replace(
    /:::saviez-vous\s*\n([\s\S]*?):::/g,
    (_, inner) => `<div class="fact-box"><div class="fact-box-icon">💡</div><div class="fact-box-content"><p class="fact-box-label">Le saviez-vous ?</p>${marked.parse(inner.trim(), { async: false })}</div></div>`
  );
}

/** Transform :::faq ... ::: blocks into visual Q/A HTML */
function transformFaqBlocks(content: string): string {
  return content.replace(
    /:::faq\s*\n([\s\S]*?):::/g,
    (_, inner: string) => {
      const lines = inner.split("\n");
      let html = '<div class="article-faq-block"><h2 class="article-faq-heading">Foire aux questions</h2>';
      let currentQ = "";
      let currentA: string[] = [];

      const flush = () => {
        if (currentQ && currentA.length) {
          const answer = marked.parse(currentA.join("\n").trim(), { async: false }) as string;
          html += `<div class="article-faq-item"><h3 class="article-faq-question">${currentQ}</h3><div class="article-faq-answer">${answer}</div></div>`;
        }
        currentQ = "";
        currentA = [];
      };

      for (const line of lines) {
        const qMatch = line.trim().match(/^(?:\*\*(.+?)\*\*|#{2,4}\s+(.+?))\s*$/);
        if (qMatch) {
          flush();
          currentQ = (qMatch[1] ?? qMatch[2]).trim();
        } else if (currentQ) {
          currentA.push(line);
        }
      }
      flush();
      html += '</div>';
      return html;
    }
  );
}

/** Add banded backgrounds to H2 sections */
function addBandedSections(html: string): string {
  const parts = html.split(/(?=<h2)/);
  return parts.map((part, i) => {
    if (i > 0 && i % 2 === 0 && part.startsWith('<h2')) {
      return `<div class="article-banded-section">${part}</div>`;
    }
    return part;
  }).join('');
}

/** Add end-of-article CTA */
function addEndCTA(html: string, slug?: string): string {
  const slugAttr = slug ? ` data-article-slug="${slug}"` : "";
  const copy = ctaCopyPour(slug);
  return html + `<div class="article-cta-block article-cta-end"><div class="article-cta-inner"><p class="article-cta-heading">${copy.endHeading}</p><p class="article-cta-text">${copy.endText}</p><div class="article-cta-buttons"><a href="${copy.endPrimary.href}" class="article-cta-btn article-cta-btn-primary" data-article-cta="true" data-cta-position="end" data-cta-role="${copy.endPrimary.role}"${slugAttr}>${copy.endPrimary.label}</a><a href="${copy.endSecondary.href}" class="article-cta-btn article-cta-btn-secondary" data-article-cta="true" data-cta-position="end" data-cta-role="${copy.endSecondary.role}"${slugAttr}>${copy.endSecondary.label}</a></div></div></div>`;
}

interface ArticleRendererProps {
  content: string;
  userRole?: "owner" | "sitter" | "both";
  /** Slug de l'article, utilisé pour instrumenter les CTAs (data-article-slug). */
  slug?: string;
  /**
   * Valeurs des variables dynamiques (placeholders {{...}}), issues de
   * useContentStats. Sans la prop, le rendu est identique à ceci près que
   * d'éventuelles accolades résiduelles sont retirées plutôt qu'affichées.
   */
  placeholderValues?: Record<string, PlaceholderValue>;
}

/**
 * Adapte UNIQUEMENT les CTAs end-article (data-cta-position="end") au rôle.
 *
 * Les liens éditoriaux placés à la main dans le markdown
 * (ex. `[s'inscrire](/inscription?role=owner)` dans un paragraphe pédagogique)
 * ne sont JAMAIS touchés, ils n'ont pas l'attribut `data-cta-position="end"`.
 *
 * Le CTA mid-article n'est pas réécrit non plus : il est masqué en CSS pour
 * les utilisateurs logués via le sélecteur `[data-cta-block="mid"]`.
 */
function adaptEndCTAsForRole(html: string, role?: "owner" | "sitter" | "both"): string {
  if (!role) return html;

  // Capture une balise <a ... data-cta-position="end" ...> avec son inner text,
  // en ignorant les balises sans cet attribut. Le DOTALL ([\s\S]) couvre les
  // attributs sur plusieurs lignes par sécurité.
  return html.replace(
    /<a\b([^>]*?\bdata-cta-position="end"[^>]*?)>([^<]*)<\/a>/g,
    (full, attrs: string, _inner: string) => {
      const dataRole =
        attrs.match(/\bdata-cta-role="([^"]+)"/)?.[1] || null;

      // owner logué → tous les CTAs end pointent vers une action proprio utile
      if (role === "owner" || role === "both") {
        if (dataRole === "owner") {
          const newAttrs = attrs.replace(/href="[^"]*"/, 'href="/sits/create"');
          return `<a${newAttrs}>Publier une annonce →</a>`;
        }
        if (dataRole === "sitter") {
          const newAttrs = attrs.replace(/href="[^"]*"/, 'href="/search"');
          return `<a${newAttrs}>Trouver une garde près de chez vous →</a>`;
        }
      }
      // sitter logué → tous les CTAs end pointent vers la recherche de gardes
      if (role === "sitter") {
        if (dataRole === "sitter" || dataRole === "owner") {
          const newAttrs = attrs.replace(/href="[^"]*"/, 'href="/search"');
          return `<a${newAttrs}>Trouver une garde près de chez vous →</a>`;
        }
      }
      return full;
    }
  );
}

/** Strip leading H1 from content to avoid double-H1 */
function stripLeadingH1(md: string): string {
  return md.replace(/^#\s+.+\n+/, "");
}

/**
 * Enveloppe chaque tableau dans un conteneur à défilement horizontal.
 * Sans cela, un tableau comparatif déborde du viewport sur mobile et casse
 * la mise en page de la page entière.
 */
function wrapTables(html: string): string {
  return html.replace(
    /<table[\s\S]*?<\/table>/g,
    (table) => `<div class="article-table-scroll" role="region" tabindex="0">${table}</div>`,
  );
}


export default function ArticleRenderer({ content, userRole, slug, placeholderValues }: ArticleRendererProps) {
  // Substitution des variables dynamiques AVANT toute autre transformation,
  // donc avant marked.parse.
  const interpolated = interpolatePlaceholders(content, placeholderValues ?? {});
  const withoutH1 = stripLeadingH1(interpolated);
  const preprocessed = transformFaqBlocks(transformFactBoxes(withoutH1));
  let html = marked.parse(preprocessed, { async: false }) as string;

  html = resolveArticleImages(html);
  html = injectCTA(html, slug);
  html = addBandedSections(html);
  html = addEndCTA(html, slug);
  html = adaptEndCTAsForRole(html, userRole);
  html = wrapTables(html);


  // Sanitize against XSS (e.g. <script>, onerror=) before injection.
  const safeHtml = DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel", "data-user-logged-in", "loading", "decoding"],
  });

  // `data-user-logged-in` permet de masquer le CTA mid en CSS pour les
  // utilisateurs connectés (cf. règle dans index.css).
  return (
    <div
      className="article-rich-content"
      data-user-logged-in={userRole ? "true" : "false"}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

