/**
 * Casse d'affichage d'un prénom. Découpe sur espaces, tirets et apostrophes
 * en conservant les séparateurs. Un segment entièrement en minuscules ou en
 * majuscules devient « Capitale + minuscules » ; une casse mixte voulue
 * (McArthur, LeBlanc) reste intacte. Affichage uniquement, la base ne change pas.
 */
export function formatFirstName(value: string | null | undefined): string {
  if (typeof value !== "string" || value.length === 0) return "";
  return value
    .split(/([\s\-'’]+)/u)
    .map((seg) => {
      if (!/\p{L}/u.test(seg)) return seg;
      const lower = seg.toLocaleLowerCase("fr-FR");
      const upper = seg.toLocaleUpperCase("fr-FR");
      if (seg !== lower && seg !== upper) return seg;
      return lower.charAt(0).toLocaleUpperCase("fr-FR") + lower.slice(1);
    })
    .join("");
}
