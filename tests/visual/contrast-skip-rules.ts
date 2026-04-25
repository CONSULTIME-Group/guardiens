/**
 * Règles d'exclusion pour les vérifications de contraste WCAG AA.
 *
 * Objectif : réduire les faux positifs dans les scans automatiques de contraste
 * en ignorant les éléments qui ne sont pas réellement perçus par l'utilisateur
 * comme du texte informatif (icônes, glyphes décoratifs, libellés visuellement
 * cachés, contenu sous `aria-hidden`, etc.).
 *
 * IMPORTANT — Ces règles ne désactivent JAMAIS l'audit pour du texte réellement
 * lisible. Si tu te retrouves à ajouter une règle pour faire passer un test,
 * c'est probablement un vrai bug de contraste à corriger côté composant.
 *
 * Ce module est PURE : aucune dépendance Playwright. Il est sérialisé et
 * injecté dans le navigateur via `page.addInitScript` ou `page.evaluate(fn, …)`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Forme sérialisable côté navigateur. */
export type ContrastSkipReason =
  | "aria-hidden"
  | "role-presentation"
  | "sr-only"
  | "icon-glyph"
  | "decorative-tag"
  | "empty-or-symbol"
  | "presentational-svg"
  | "data-skip-contrast";

/**
 * Liste documentée des règles d'exclusion appliquées dans l'ordre.
 * Chaque entrée est commentée pour expliquer la justification WCAG / UX.
 */
export const CONTRAST_SKIP_RULES: ReadonlyArray<{
  id: ContrastSkipReason;
  description: string;
}> = [
  {
    id: "aria-hidden",
    description:
      "L'élément (ou un de ses ancêtres) porte aria-hidden=\"true\". Il est " +
      "explicitement retiré de l'arbre d'accessibilité : son contenu textuel " +
      "n'est pas lu par les AT et n'est généralement présent qu'à des fins " +
      "décoratives ou de duplication visuelle.",
  },
  {
    id: "role-presentation",
    description:
      'role="presentation" ou role="none" — le développeur déclare que ' +
      "l'élément n'a pas de sémantique. Convention WAI-ARIA pour le purement " +
      "décoratif.",
  },
  {
    id: "sr-only",
    description:
      "Classe utilitaire `.sr-only` (ou équivalent visually-hidden / " +
      "screen-reader-only) : libellé destiné aux lecteurs d'écran uniquement, " +
      "non rendu visuellement → pas de contraste à mesurer.",
  },
  {
    id: "icon-glyph",
    description:
      "Élément <i> ou <span> qui contient uniquement une font-icon (ex. " +
      "lucide, font-awesome, classes `icon-*`). Le texte exposé est un " +
      "code-point glyph, pas du texte lisible.",
  },
  {
    id: "decorative-tag",
    description:
      "Balises intrinsèquement non textuelles ou présentationnelles : svg, " +
      "path, g, use, defs, symbol, title (svg), desc (svg), hr, br.",
  },
  {
    id: "empty-or-symbol",
    description:
      "Le texte direct est vide après trim, ne contient que des espaces " +
      "Unicode, ou est composé exclusivement de symboles décoratifs courts " +
      "(•, ·, ‣, ▪, ★, ─, …) → aucun mot lisible.",
  },
  {
    id: "presentational-svg",
    description:
      "Élément situé à l'intérieur d'un <svg> : la couleur de fond effective " +
      "n'est pas calculable de façon fiable et le contenu est généralement un " +
      "rendu graphique, pas du texte au sens WCAG 1.4.3.",
  },
  {
    id: "data-skip-contrast",
    description:
      "Opt-out explicite côté composant via l'attribut " +
      'data-skip-contrast="true". Réservé aux cas extrêmes documentés en revue ' +
      "code. À utiliser avec parcimonie.",
  },
];

/**
 * Code source (string) à injecter dans la page.
 *
 * Expose `window.__shouldSkipContrast(el)` qui retourne :
 *   - `null` si l'élément doit être audité
 *   - `{ reason, detail }` s'il doit être ignoré
 *
 * On exporte du code « stringifié » plutôt qu'une vraie fonction parce que
 * Playwright sérialise les fonctions vers le navigateur et perd les closures
 * partagées entre plusieurs `page.evaluate` successifs. Injecter ce script
 * une seule fois (via `addInitScript`) garantit une définition stable.
 */
export const CONTRAST_SKIP_SCRIPT = `
(() => {
  // Caractères considérés comme purement décoratifs (aucun mot).
  const DECORATIVE_CHARS = new Set([
    '\\u00B7','\\u2022','\\u2023','\\u25AA','\\u25AB','\\u25CF','\\u25CB',
    '\\u2605','\\u2606','\\u2500','\\u2501','\\u2014','\\u2013','\\u00A0',
    '\\u2009','\\u200A','\\u200B','|','/','-','—','–','·','•',
  ]);

  const DECORATIVE_TAGS = new Set([
    'svg','path','g','use','defs','symbol','title','desc',
    'hr','br','meta','link','script','style',
  ]);

  // Heuristique font-icon : préfixes de classes connus.
  const ICON_CLASS_PREFIXES = [
    'icon-', 'fa-', 'fas-', 'far-', 'fab-', 'mdi-', 'lucide-',
    'bi-', 'glyphicon-', 'material-icons',
  ];

  const SR_ONLY_CLASSES = new Set([
    'sr-only', 'visually-hidden', 'screen-reader-only', 'sr-only-focusable',
  ]);

  function hasIconClass(el) {
    const cls = el.className;
    if (typeof cls !== 'string' || !cls) return false;
    const tokens = cls.split(/\\s+/);
    for (const t of tokens) {
      for (const p of ICON_CLASS_PREFIXES) {
        if (t === p.replace(/-$/, '') || t.startsWith(p)) return true;
      }
    }
    return false;
  }

  function directText(el) {
    let txt = '';
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        txt += (node.textContent || '');
      }
    }
    return txt;
  }

  function isOnlyDecorative(text) {
    const trimmed = text.trim();
    if (!trimmed) return true;
    // Si tous les caractères (hors espaces) sont décoratifs → ignorer.
    let hasWordChar = false;
    for (const ch of trimmed) {
      if (DECORATIVE_CHARS.has(ch)) continue;
      if (/\\s/.test(ch)) continue;
      // Tout caractère lettre/chiffre/ponctuation textuelle → c'est du texte.
      hasWordChar = true;
      break;
    }
    return !hasWordChar;
  }

  function ancestorMatches(el, predicate) {
    let node = el;
    while (node && node.nodeType === 1) {
      if (predicate(node)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function shouldSkip(el) {
    if (!el || el.nodeType !== 1) {
      return { reason: 'decorative-tag', detail: 'non-element node' };
    }

    const tag = el.tagName ? el.tagName.toLowerCase() : '';

    // 1. Balises décoratives intrinsèques
    if (DECORATIVE_TAGS.has(tag)) {
      return { reason: 'decorative-tag', detail: tag };
    }

    // 2. Tout descendant de <svg> est traité comme rendu graphique
    if (tag !== 'svg' && ancestorMatches(el, (n) => n.tagName && n.tagName.toLowerCase() === 'svg')) {
      return { reason: 'presentational-svg', detail: 'inside <svg>' };
    }

    // 3. Opt-out explicite côté composant
    const optOut = ancestorMatches(el, (n) => n.getAttribute && n.getAttribute('data-skip-contrast') === 'true');
    if (optOut) {
      return { reason: 'data-skip-contrast', detail: optOut.tagName.toLowerCase() };
    }

    // 4. aria-hidden="true" sur l'élément OU un ancêtre
    const hidden = ancestorMatches(el, (n) => n.getAttribute && n.getAttribute('aria-hidden') === 'true');
    if (hidden) {
      return { reason: 'aria-hidden', detail: hidden.tagName.toLowerCase() };
    }

    // 5. role="presentation" / "none"
    const role = el.getAttribute('role');
    if (role === 'presentation' || role === 'none') {
      return { reason: 'role-presentation', detail: role };
    }
    const presAncestor = ancestorMatches(el, (n) => {
      const r = n.getAttribute && n.getAttribute('role');
      return r === 'presentation' || r === 'none';
    });
    if (presAncestor && presAncestor !== el) {
      return { reason: 'role-presentation', detail: 'ancestor:' + presAncestor.tagName.toLowerCase() };
    }

    // 6. sr-only / visually-hidden (classes utilitaires Tailwind/Bootstrap)
    const srAncestor = ancestorMatches(el, (n) => {
      if (!n.classList) return false;
      for (const c of SR_ONLY_CLASSES) {
        if (n.classList.contains(c)) return true;
      }
      return false;
    });
    if (srAncestor) {
      return { reason: 'sr-only', detail: srAncestor.className };
    }

    // 7. Font-icon : <i> ou <span> dont la classe matche un préfixe d'icône
    if ((tag === 'i' || tag === 'span') && hasIconClass(el)) {
      // Et qui ne contient PAS d'enfants textuels (juste le glyph CSS via ::before)
      const txt = directText(el).trim();
      if (!txt || isOnlyDecorative(txt)) {
        return { reason: 'icon-glyph', detail: el.className };
      }
    }

    // 8. Texte direct vide ou uniquement décoratif
    const text = directText(el);
    if (isOnlyDecorative(text)) {
      return { reason: 'empty-or-symbol', detail: JSON.stringify(text.slice(0, 20)) };
    }

    return null;
  }

  // Exposition globale (idempotent)
  /** @type {any} */ (window).__shouldSkipContrast = shouldSkip;
  /** @type {any} */ (window).__contrastSkipRules = ${JSON.stringify(
    CONTRAST_SKIP_RULES
  )};
})();
`;

/** Type de la fonction injectée dans `window`. */
export type ShouldSkipContrastFn = (el: Element) => {
  reason: ContrastSkipReason;
  detail: string;
} | null;

declare global {
  interface Window {
    __shouldSkipContrast?: ShouldSkipContrastFn;
    __contrastSkipRules?: typeof CONTRAST_SKIP_RULES;
  }
}
