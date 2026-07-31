// Convertit les dates ISO (AAAA-MM-JJ) laissées par le LLM dans un titre
// d'annonce en dates françaises lisibles.
// Règles :
//  - « du 2026-08-02 au 2026-08-15 » devient « du 2 au 15 août »
//  - mois différents, même année : « du 2 août au 15 septembre »
//  - années différentes : « du 28 décembre 2026 au 4 janvier 2027 »
//  - date isolée : « 2 août », l'année n'apparaît que si elle diffère de
//    l'année courante.

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const ISO = /(\d{4})-(\d{2})-(\d{2})/g;
const ISO_RANGE = /(\d{4})-(\d{2})-(\d{2})(\s*(?:au|à|jusqu'au|-|→)\s*)(\d{4})-(\d{2})-(\d{2})/;

const dayMonth = (m: number, d: number) => `${d} ${MONTHS_FR[m - 1] ?? ""}`.trim();

export function frenchifyTitleDates(title: string, today: Date = new Date()): string {
  if (!title) return title;
  let out = title;

  const range = out.match(ISO_RANGE);
  if (range) {
    const [full, y1, m1, d1, sep, y2, m2, d2] = range;
    const sy = Number(y1), sm = Number(m1), sd = Number(d1);
    const ey = Number(y2), em = Number(m2), ed = Number(d2);
    let left: string;
    let right: string;
    if (sy !== ey) {
      left = `${dayMonth(sm, sd)} ${sy}`;
      right = `${dayMonth(em, ed)} ${ey}`;
    } else if (sm === em) {
      left = String(sd);
      right = dayMonth(em, ed);
    } else {
      left = dayMonth(sm, sd);
      right = dayMonth(em, ed);
    }
    out = out.replace(full, `${left}${sep.includes("au") ? sep : " au "}${right}`);
  }

  // Dates ISO isolées restantes.
  out = out.replace(ISO, (_all, y: string, m: string, d: string) => {
    const year = Number(y);
    const base = dayMonth(Number(m), Number(d));
    return year === today.getFullYear() ? base : `${base} ${year}`;
  });

  return out.replace(/\s+/g, " ").trim();
}
