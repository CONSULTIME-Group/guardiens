/**
 * Collage sécurisé en texte brut.
 *
 * Un copier-coller depuis Word (ou tout traitement de texte) place dans le
 * presse-papiers plusieurs représentations du même contenu : du HTML complet
 * (avec balises, styles et commentaires conditionnels Office), parfois du RTF,
 * et enfin du texte brut. Selon le navigateur et la façon dont le collage est
 * déclenché, le champ peut recevoir un fragment HTML volumineux, des caractères
 * de contrôle, des espaces insécables et des séparateurs de ligne exotiques.
 *
 * Conséquences observées en production : saisie tronquée, valeur illisible
 * une fois sérialisée dans le brouillon local, et dans certains cas un rendu
 * qui échoue et provoque une réinitialisation du formulaire.
 *
 * Ce module normalise systématiquement le contenu collé en texte brut, sans
 * jamais rejeter le collage, et insère le résultat à la position du curseur en
 * respectant la sélection en cours.
 */

/** Retire les balises d'un fragment HTML, sans exécuter le moindre script. */
function htmlToPlainText(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, " ");
  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "</$1>\n")
    .replace(/<br\s*\/?>/gi, "\n");
  return doc.body.textContent ?? "";
}

/** Normalise un texte collé : fins de ligne, espaces exotiques, caractères de contrôle. */
export function sanitizePastedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    // Caractères de contrôle (hors tabulation et saut de ligne).
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** Extrait le texte brut d'un presse-papiers, quelle que soit sa provenance. */
export function readPlainTextFromClipboard(data: DataTransfer | null): string {
  if (!data) return "";
  let text = "";
  try {
    text = data.getData("text/plain") || "";
  } catch {
    text = "";
  }
  if (!text) {
    try {
      const html = data.getData("text/html") || "";
      if (html) text = htmlToPlainText(html);
    } catch {
      /* presse-papiers restreint : on laisse le navigateur gérer */
    }
  }
  return sanitizePastedText(text);
}

interface PasteOptions {
  /** Longueur maximale du champ après insertion. */
  maxLength?: number;
}

/**
 * Gestionnaire `onPaste` pour un champ contrôlé.
 *
 * Le collage est toujours accepté, converti en texte brut, inséré à la position
 * du curseur, puis remonté au state via `commit`. La saisie déjà présente n'est
 * jamais perdue, et le curseur reste après le texte inséré.
 */
export function makePlainTextPasteHandler(
  commit: (next: string) => void,
  options: PasteOptions = {},
) {
  return (event: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const pasted = readPlainTextFromClipboard(event.clipboardData);
    if (!pasted) return;
    event.preventDefault();
    event.stopPropagation();

    const el = event.currentTarget;
    const current = el.value ?? "";
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? start;
    let next = current.slice(0, start) + pasted + current.slice(end);
    if (options.maxLength && next.length > options.maxLength) {
      next = next.slice(0, options.maxLength);
    }
    const caret = Math.min(start + pasted.length, next.length);

    commit(next);
    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(caret, caret);
      } catch {
        /* champ démonté entre-temps */
      }
    });
  };
}
