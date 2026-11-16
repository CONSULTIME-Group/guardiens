/**
 * Lot ART1 (16/11/2026) : tableaux d'article lisibles sur téléphone.
 *
 * Sous 640 px, un tableau de 2 à 4 colonnes s'affiche en cartes empilées :
 * une carte par ligne, la première cellule en titre, puis chaque valeur
 * précédée du nom de sa colonne. Le nom vient de l'attribut data-label posé
 * ici sur chaque cellule ; la feuille de styles (index.css, bloc ART1) fait
 * le reste. Au-delà de 4 colonnes, le tableau garde le défilement latéral.
 */

export const MAX_CARD_COLUMNS = 4;

function textOf(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function escapeAttr(value: string): string {
  return value
    .replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function labelTableForCards(table: string): { html: string; cards: boolean } {
  const thead = table.match(/<thead[\s\S]*?<\/thead>/i);
  if (!thead) return { html: table, cards: false };
  const labels = [...thead[0].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => textOf(m[1]));
  if (labels.length < 2 || labels.length > MAX_CARD_COLUMNS) return { html: table, cards: false };

  const html = table.replace(/<tbody[\s\S]*?<\/tbody>/i, (body) =>
    body.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, (row) => {
      let column = 0;
      return row.replace(/<td\b([^>]*)>/gi, (cell, attrs: string) => {
        const label = labels[column++];
        return label ? `<td${attrs} data-label="${escapeAttr(label)}">` : cell;
      });
    }),
  );
  return { html, cards: true };
}
