/**
 * Lot RCH4 (14/11/2026) : « Publiée il y a 2 jours », sans dépendance (la vue
 * de démarrage de /annonces l'emploie aussi). Null sans date valide.
 */
export function publishedAgoLabel(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (isNaN(at.getTime())) return null;
  const minutes = Math.max(1, Math.floor((now.getTime() - at.getTime()) / 60_000));
  const unit = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
  let span: string;
  if (minutes < 60) span = unit(minutes, "minute", "minutes");
  else if (minutes < 24 * 60) span = unit(Math.floor(minutes / 60), "heure", "heures");
  else if (minutes < 30 * 24 * 60) span = unit(Math.floor(minutes / (24 * 60)), "jour", "jours");
  else if (minutes < 365 * 24 * 60) span = unit(Math.floor(minutes / (30 * 24 * 60)), "mois", "mois");
  else span = unit(Math.floor(minutes / (365 * 24 * 60)), "an", "ans");
  return `Publiée il y a ${span}`;
}

/** « Nouvelle » : publiée depuis moins de 48 heures. */
export function isNewlyPublished(iso: string | null | undefined, now: Date = new Date()): boolean {
  if (!iso) return false;
  const at = new Date(iso);
  if (isNaN(at.getTime())) return false;
  return now.getTime() - at.getTime() < 48 * 3_600_000;
}
