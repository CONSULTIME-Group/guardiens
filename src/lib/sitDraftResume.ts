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
