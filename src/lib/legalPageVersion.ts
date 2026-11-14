/**
 * Lot J2b : choix de la version affichée sur /cgu et /cgs.
 *
 * Sans paramètre, la page montre la version en vigueur à la date de Paris
 * (versionInForce). `?version=N` montre une version publiée du document,
 * quelle que soit la date. Une version annoncée mais pas encore publiée
 * (publishedOn dans le futur) reste hors ligne : la page montre alors la
 * version en vigueur.
 */
import {
  LEGAL_VERSIONS,
  frenchDate,
  parisToday,
  upcomingVersion,
  versionInForce,
  type LegalDocument,
  type LegalVersion,
} from "@/config/legalVersions";

export interface LegalPageSelection {
  /** Version affichée. */
  shown: LegalVersion;
  /** Version en vigueur à la date du jour. */
  inForce: LegalVersion;
  /** Version publiée qui entre en vigueur plus tard, s'il y en a une. */
  upcoming: LegalVersion | null;
  /** Version qui précède la version affichée, s'il y en a une. */
  previous: LegalVersion | null;
}

export function findLegalVersion(document: LegalDocument, version: string): LegalVersion | undefined {
  return LEGAL_VERSIONS.find((v) => v.document === document && v.version === version);
}

/** Version qui précède `version` (entrée en vigueur la plus récente avant la sienne). */
export function previousLegalVersion(document: LegalDocument, version: string): LegalVersion | null {
  const current = findLegalVersion(document, version);
  if (!current) return null;
  const older = LEGAL_VERSIONS.filter((v) => v.document === document && v.effectiveOn < current.effectiveOn);
  return older.sort((a, b) => b.effectiveOn.localeCompare(a.effectiveOn))[0] ?? null;
}

export function selectLegalPageVersion(
  document: LegalDocument,
  requested: string | null,
  today: string = parisToday(),
): LegalPageSelection {
  const inForce = versionInForce(document, today);
  const upcoming = upcomingVersion(document, today);
  const asked = requested ? findLegalVersion(document, requested.trim()) : undefined;
  const shown = asked && asked.publishedOn <= today ? asked : inForce;
  return { shown, inForce, upcoming, previous: previousLegalVersion(document, shown.version) };
}

/**
 * En-tête de version : « Version 9, publiée le 16 octobre 2026, en vigueur le
 * 16 novembre 2026. La version 8 reste applicable jusqu'à cette date. »
 */
export function legalVersionHeading(document: LegalDocument, version: string, today: string = parisToday()): string {
  const v = findLegalVersion(document, version);
  if (!v) return `Version ${version}`;
  const head = `Version ${v.version}, publiée le ${frenchDate(v.publishedOn)}, en vigueur le ${frenchDate(v.effectiveOn)}.`;
  const prev = previousLegalVersion(document, version);
  if (!prev || v.effectiveOn <= v.publishedOn) return head;
  // Lot COR1 : quand la version précédente n'est pas encore en vigueur elle
  // non plus (deux versions annoncées à la suite), l'en-tête nomme la version
  // qui s'applique aujourd'hui puis celle qui prend le relais.
  if (prev.effectiveOn > today) {
    const now = versionInForce(document, today);
    return `${head} La version ${now.version} s'applique jusqu'au ${frenchDate(prev.effectiveOn)}, puis la version ${prev.version} jusqu'à cette date.`;
  }
  return `${head} La version ${prev.version} reste applicable jusqu'à cette date.`;
}

/** Adresse d'une version précise de la page. */
export function legalVersionHref(path: string, version: string): string {
  return `${path}?version=${encodeURIComponent(version)}`;
}
