/** Note affichée à la française : une décimale, virgule (ex. « 4,8 »). */
export function formatRatingFr(n: number): string {
  return (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
