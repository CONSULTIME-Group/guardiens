/**
 * Reprise d'un brouillon d'annonce : dates conservées et mesure honnête.
 *
 * Une date de début encore à venir (ou du jour, calendrier de l'appareil)
 * est conservée telle quelle, quel que soit le pays. Seule une date déjà
 * passée est retirée, et la date de fin reste si elle est encore à venir.
 */
export interface ResumedDates {
  start: string;
  end: string;
  /** Au moins une date enregistrée a été retirée parce qu'elle était passée. */
  cleared: boolean;
  /** Le brouillon portait au moins une date. */
  hadDates: boolean;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (v: string | null | undefined): string => {
  const s = (v ?? "").trim().slice(0, 10);
  return ISO_DAY.test(s) ? s : "";
};

export function resumeDraftDates(
  rawStart: string | null | undefined,
  rawEnd: string | null | undefined,
  today: string,
): ResumedDates {
  const s = day(rawStart);
  const e = day(rawEnd);
  const start = s && s >= today ? s : "";
  const end = e && e >= today && (!start || e >= start) ? e : "";
  return {
    start,
    end,
    cleared: (!!s && !start) || (!!e && !end),
    hadDates: !!s || !!e,
  };
}

/**
 * Métadonnées de `sit_draft_resumed` pour une copie locale restaurée : la
 * copie locale est appliquée telle quelle, rien n'est retiré. Avant le
 * 07/11/2026, `dates_cleared` valait vrai dès que la copie n'avait pas de
 * date (cas Christophe du 26/10/2026), sans qu'aucune date soit perdue.
 */
export function localResumeDateFlags(storedStart: string | null | undefined, today: string) {
  const s = day(storedStart);
  return { dates_cleared: false, had_dates: !!s, dates_past: !!s && s < today };
}

/**
 * Lot PUB2 (07/11/2026) : copie locale ou brouillon en base à la reprise.
 *
 * La copie locale porte l'horodatage serveur (`updated_at`) du brouillon sur
 * lequel elle a été écrite. Une base modifiée depuis cet horodatage (autre
 * appareil, autre onglet) l'emporte : la comparaison ne lit que des heures du
 * serveur, jamais l'horloge du téléphone. Mesuré au navigateur : un téléphone
 * en avance de 4 minutes restaurait une copie plus ancienne que la base, puis
 * l'enregistrait par-dessus à la première frappe.
 *
 * Copie sans horodatage serveur (écrite avant ce lot) : règle d'avant, la
 * plus récente des deux heures gagne.
 */
export type DraftSourceReason =
  | "no_remote"
  | "remote_changed_since_copy"
  | "copy_after_remote"
  | "legacy_remote_newer"
  | "legacy_local_newer";

export function chooseDraftSource(input: {
  remoteUpdatedAt: string | null | undefined;
  localSavedAt: number;
  localBaseUpdatedAt?: string | null;
}): { source: "local" | "remote"; reason: DraftSourceReason } {
  const remote = input.remoteUpdatedAt ? Date.parse(input.remoteUpdatedAt) : NaN;
  if (!Number.isFinite(remote)) return { source: "local", reason: "no_remote" };
  const base = input.localBaseUpdatedAt ? Date.parse(input.localBaseUpdatedAt) : NaN;
  if (Number.isFinite(base)) {
    return remote > base
      ? { source: "remote", reason: "remote_changed_since_copy" }
      : { source: "local", reason: "copy_after_remote" };
  }
  return input.localSavedAt <= remote
    ? { source: "remote", reason: "legacy_remote_newer" }
    : { source: "local", reason: "legacy_local_newer" };
}
