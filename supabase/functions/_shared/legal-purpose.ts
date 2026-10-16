// Module pur, importé par le pied de page légal des emails et par les tests du site.
/**
 * Lot ADM1 : « dans le cadre de » suivi de la finalité, article contracté
 * (« de le suivi » devient « du suivi », « de les » devient « des »), une
 * finalité déjà introduite par du, de ou des gardée telle quelle.
 */
export function cadreDe(purpose: string): string {
  const p = purpose.trim()
  if (/^(du|des|de)\s/i.test(p)) return p
  if (/^le\s/i.test(p)) return `du ${p.slice(3)}`
  if (/^les\s/i.test(p)) return `des ${p.slice(4)}`
  return `de ${p}`
}
