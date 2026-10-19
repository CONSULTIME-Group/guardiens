/**
 * Ligne « comparaison tarifaire » de la checklist des pages légales admin
 * (lot SEO1, 19/10/2026). Elle se calcule sur les articles publiés, jamais en
 * dur. Un article compte quand il cite un prix en euros ET un lien externe
 * (registre de l'arène du 19/10/2026, fait 13a : 10 articles comparatifs
 * nomment des prestataires locaux et leurs prix).
 */
export const PRICE_COMPARISON_RULE = {
  /** Motif LIKE : un prix en euros dans le texte. */
  price: "%€%",
  /** Motif LIKE : un lien Markdown vers un site externe. */
  externalLink: "%](http%",
} as const;

export interface PriceComparisonCheck {
  state: "loading" | "error" | "ok" | "alert";
  label: string;
  slugs: string[];
}

export function priceComparisonCheck(q: {
  isLoading: boolean;
  isError: boolean;
  data?: string[] | null;
}): PriceComparisonCheck {
  if (q.isLoading) {
    return { state: "loading", label: "Comparaison tarifaire dans les articles : lecture en cours", slugs: [] };
  }
  if (q.isError || !Array.isArray(q.data)) {
    return { state: "error", label: "Comparaison tarifaire dans les articles : lecture impossible, contrôle à refaire", slugs: [] };
  }
  const n = q.data.length;
  if (n === 0) {
    return { state: "ok", label: "Comparaison tarifaire : 0 article publié cite des prix avec des liens externes", slugs: [] };
  }
  const plural = n > 1;
  return {
    state: "alert",
    label: `Comparaison tarifaire : ${n} article${plural ? "s" : ""} publié${plural ? "s" : ""} cite${plural ? "nt" : ""} des prix avec des liens externes, à revoir`,
    slugs: q.data,
  };
}
