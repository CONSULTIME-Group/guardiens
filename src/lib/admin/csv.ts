/**
 * Export CSV admin : BOM UTF-8 pour Excel, et neutralisation des cellules
 * qui commencent par = + - @ (injection de formule), préfixées d'une apostrophe.
 */
export const CSV_BOM = "\uFEFF";

export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildCsv(header: string[], rows: unknown[][], sep = ","): string {
  return CSV_BOM + [header, ...rows].map((r) => r.map(csvCell).join(sep)).join("\n");
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const TRUNCATED_NOTICE = "Données partielles, plus de 50 000 lignes sur la période";
