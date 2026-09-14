/**
 * Genere public/alma.png, le portrait d'Alma utilise dans les emails.
 *
 * Pourquoi un PNG et pas le SVG inline des templates : Gmail ne rend pas
 * le SVG, ni inline ni en <img src="...svg">. Sans PNG, Alma est invisible
 * pour la majorite des destinataires.
 *
 * Le dessin reprend la geometrie de la silhouette du stade complice de
 * src/components/ai/alma/AlmaAvatarAnimated.tsx, en gouache a plat, sans
 * aucun contour. Recadre en portrait dans un medaillon creme cercle de
 * vert pin.
 *
 * Pas d'etincelle ici : c'est le signal d'etat de l'assistante, il n'a
 * aucun sens sur une image fixe. Le cercle vert du medaillon joue ce role.
 *
 * Relancer apres toute evolution du personnage :
 *   node scripts/generate-alma-png.mjs
 */
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'node:fs'

/* Gouache a plat : aucun contour. Trois plans de valeur par piece, plus les
   ombres de contact entre pieces. Identique au composant React. */
const FUR_OMBRE = '#DCC9A6', FUR = '#F2EADA', FUR_CLAIR = '#FDF9F0'
const EAR_OMBRE = '#C9B492', EAR = '#E0D0B2', EAR_CLAIR = '#F0E5D0'
const CONTACT = '#BBA687', MUSEAU = '#FDF9F0'
const IRIS = '#3E3225', PUPILLE = '#241A11', NOSE = '#3E3225', MOUTH = '#3E3225'
const LANGUE = '#EE9AA6', CHEEK = '#D99B72'
const SHADOW = 'rgba(20,15,10,0.16)', GREEN = '#2D6A4F', GOLD = '#E4A62A', GOLD_DARK = '#B9821A'
let uid = 0

/* Geometrie du stade complice, identique au composant React. */
const HR = 27.5, BR = 22.5, EYE = 5.4, EYE_Y = 45.5, EYE_X = 11.2, NOSE_R = 3.9
const HEAD_Y = 39, BODY_Y = 75, B = 24, S = 1.05

/** Contour boucle ferme : petites bosses regulieres posees sur un cercle. */
function scallop(cx, cy, r, bumps, amp, phase = 0) {
  const pts = []
  for (let i = 0; i < bumps; i++) {
    const a = phase + (i / bumps) * Math.PI * 2
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  const chord = 2 * r * Math.sin(Math.PI / bumps)
  const R = ((chord * chord) / 4 + amp * amp) / (2 * amp)
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
  for (let i = 1; i <= bumps; i++) {
    const q = pts[i % bumps]
    d += ` A ${R.toFixed(2)} ${R.toFixed(2)} 0 0 1 ${q[0].toFixed(2)} ${q[1].toFixed(2)}`
  }
  return `${d} Z`
}

const squash = (cx, cy, sx, sy) =>
  `translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`

/** Une piece de fourrure : la piece entiere part dans le ton d'ombre, la
    lumiere est posee par dessus, decalee vers le haut a gauche. */
function piece(d, tr, quelle, cx, cy, r) {
  const est = quelle === 'ear'
  const ombre = est ? EAR_OMBRE : FUR_OMBRE
  const base = est ? EAR : FUR
  const clair = est ? EAR_CLAIR : FUR_CLAIR
  const t = tr ? ` transform="${tr}"` : ''
  let inner = `<path d="${d}" fill="${ombre}"/>`
  if (cx !== undefined) {
    const id = `p${++uid}`
    inner += `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">`
      + `<circle cx="${(cx - r * 0.24).toFixed(2)}" cy="${(cy - r * 0.26).toFixed(2)}" r="${(r * 1.02).toFixed(2)}" fill="${base}"/>`
      + `<circle cx="${(cx - r * 0.46).toFixed(2)}" cy="${(cy - r * 0.5).toFixed(2)}" r="${(r * 0.72).toFixed(2)}" fill="${clair}"/>`
      + `</g>`
  }
  return `<g${t}>${inner}</g>`
}

/** Ombre de contact : la piece du dessus projette sur celle du dessous. */
function contact(receveurs, casters, dx, dy) {
  const idClip = `k${++uid}`, idMask = `k${++uid}`
  const cl = `<clipPath id="${idClip}">`
    + receveurs.map(rc => `<path d="${rc.d}"${rc.tr ? ` transform="${rc.tr}"` : ''}/>`).join('')
    + `</clipPath>`
  const mk = `<mask id="${idMask}"><rect x="0" y="0" width="100" height="110" fill="#fff"/>`
    + casters.map(c => `<path d="${c.d}"${c.tr ? ` transform="${c.tr}"` : ''} fill="#000"/>`).join('')
    + `</mask>`
  const dec = casters.map(c => `<path d="${c.d}"${c.tr ? ` transform="${c.tr}"` : ''} fill="${CONTACT}"/>`).join('')
  return cl + mk
    + `<g clip-path="url(#${idClip})" mask="url(#${idMask})" filter="url(#flou)" opacity="0.5">`
    + `<g transform="translate(${dx} ${dy})">${dec}</g></g>`
}

const head = scallop(50, HEAD_Y, HR, B, HR * 0.075, 0.12)
const body = scallop(50, BODY_Y, BR, B - 3, BR * 0.08, 0.3)

/* Asymetrie : une oreille un peu plus haute et plus petite que l'autre. */
const earRx = 50 - HR * 0.92, earLx = 50 + HR * 0.92
const earRy = HEAD_Y + 10.2, earLy = HEAD_Y + 5.4
const earRr = HR * 0.465, earLr = HR * 0.5
const earR = scallop(earRx, earRy, earRr, B - 10, HR * 0.06, 0.85)
const earL = scallop(earLx, earLy, earLr, B - 10, HR * 0.06, 0.25)
const earRtr = squash(earRx, earRy, 0.9, 1.26)
const earLtr = squash(earLx, earLy, 0.9, 1.3)

const toupY = HEAD_Y - HR * 0.88
const toup = scallop(50, toupY, HR * 0.4, B - 12, HR * 0.058, 1.05)
const toupTr = squash(50, toupY, 1.3, 0.94)

const noseY = HEAD_Y + HR * 0.655
const muzR = HR * 0.31, muzY = noseY + HR * 0.062
const muzB = 2 * Math.round((B - 10) / 2), muzPh = Math.PI / muzB
const muz = scallop(50, muzY, muzR, muzB, muzR * 0.15, muzPh)
const muzTr = squash(50, muzY, 1.5, 0.86)

const pawY = BODY_Y + BR - 3.2, pawX = BR * 0.44
const pawR = scallop(50 - pawX, pawY, 5.5, 7, 0.8, 0.4)
const pawL = scallop(50 + pawX, pawY, 5.5, 7, 0.8, 0.9)

const mouthY = noseY + NOSE_R * 0.78
const collarY = HEAD_Y + HR + 1.5

/* Le regard : la pupille remonte et rentre vers l'axe. */
const oeil = (cx) => {
  const dx = cx < 50 ? EYE * 0.17 : -EYE * 0.17
  const px = cx + dx, py = EYE_Y - EYE * 0.2
  return `
  <circle cx="${cx.toFixed(2)}" cy="${EYE_Y}" r="${EYE}" fill="${IRIS}"/>
  <circle cx="${px.toFixed(2)}" cy="${(py + EYE * 0.06).toFixed(2)}" r="${(EYE * 0.52).toFixed(2)}" fill="${PUPILLE}"/>
  <circle cx="${(px - EYE * 0.33).toFixed(2)}" cy="${(py - EYE * 0.36).toFixed(2)}" r="${(EYE * 0.33).toFixed(2)}" fill="#FFFFFF"/>
  <circle cx="${(px + EYE * 0.4).toFixed(2)}" cy="${(py + EYE * 0.4).toFixed(2)}" r="${(EYE * 0.155).toFixed(2)}" fill="#FFFFFF" opacity="0.72"/>`
}

const alma = `
<ellipse cx="50" cy="99.5" rx="24" ry="2.4" fill="${SHADOW}"/>
${piece(body, null, 'fur', 50, BODY_Y, BR)}
${contact([{ d: body }], [{ d: head }], 2.2, 3.6)}
${piece(pawR, squash(50 - pawX, pawY, 1.06, 0.84), 'fur', 50 - pawX, pawY, 5.5)}
${piece(pawL, squash(50 + pawX, pawY, 1.06, 0.84), 'fur', 50 + pawX, pawY, 5.5)}
<g transform="rotate(-7 50 63)">
  <path d="M ${(50 - BR * 0.62).toFixed(2)} ${collarY.toFixed(2)} Q 50 ${(collarY + 5.5).toFixed(2)} ${(50 + BR * 0.62).toFixed(2)} ${collarY.toFixed(2)}"
    fill="none" stroke="${GREEN}" stroke-width="${(S * 1.5).toFixed(2)}" stroke-linecap="round"/>
  <circle cx="50" cy="${(collarY + 6.4).toFixed(2)}" r="2.9" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="${(S * 0.35).toFixed(2)}"/>
  <circle cx="49" cy="${(collarY + 5.6).toFixed(2)}" r="0.9" fill="#FFFFFF" opacity="0.5"/>
</g>
<g transform="rotate(-7 50 63)">
  ${piece(earR, earRtr, 'ear', earRx, earRy, earRr)}
  ${piece(earL, earLtr, 'ear', earLx, earLy, earLr)}
  ${piece(toup, toupTr, 'fur', 50, toupY, HR * 0.4)}
  ${contact([{ d: earR, tr: earRtr }, { d: earL, tr: earLtr }, { d: toup, tr: toupTr }], [{ d: head }], 1.8, 2.8)}
  ${piece(head, null, 'fur', 50, HEAD_Y, HR)}
  <ellipse cx="${(50 - HR * 0.74).toFixed(2)}" cy="${(noseY - HR * 0.2).toFixed(2)}" rx="4.3" ry="3" fill="${CHEEK}" opacity="0.17"/>
  <ellipse cx="${(50 + HR * 0.74).toFixed(2)}" cy="${(noseY - HR * 0.2).toFixed(2)}" rx="4.3" ry="3" fill="${CHEEK}" opacity="0.17"/>
  ${contact([{ d: head }], [{ d: muz, tr: muzTr }], 1.1, 1.9)}
  <g transform="${muzTr}"><path d="${muz}" fill="${MUSEAU}"/></g>
  ${oeil(50 - EYE_X)}${oeil(50 + EYE_X)}
  <ellipse cx="50" cy="${noseY.toFixed(2)}" rx="${(NOSE_R * 1.12).toFixed(2)}" ry="${(NOSE_R * 0.82).toFixed(2)}" fill="${NOSE}"/>
  <ellipse cx="${(50 - NOSE_R * 0.3).toFixed(2)}" cy="${(noseY - NOSE_R * 0.32).toFixed(2)}" rx="${(NOSE_R * 0.3).toFixed(2)}" ry="${(NOSE_R * 0.17).toFixed(2)}" fill="#FFFFFF" opacity="0.45"/>
  <path d="M50 ${mouthY.toFixed(2)} v${(NOSE_R * 0.5).toFixed(2)} M50 ${(mouthY + NOSE_R * 0.5).toFixed(2)} q${(-NOSE_R * 0.62).toFixed(2)} ${(NOSE_R * 0.62).toFixed(2)} ${(-NOSE_R * 1.12).toFixed(2)} 0 M50 ${(mouthY + NOSE_R * 0.5).toFixed(2)} q${(NOSE_R * 0.62).toFixed(2)} ${(NOSE_R * 0.62).toFixed(2)} ${(NOSE_R * 1.12).toFixed(2)} 0"
    stroke="${MOUTH}" stroke-width="${(S * 0.62).toFixed(2)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M ${(50 - NOSE_R * 0.52).toFixed(2)} ${(noseY + NOSE_R * 2.1).toFixed(2)} q ${(NOSE_R * 0.52).toFixed(2)} ${(NOSE_R * 1.05).toFixed(2)} ${(NOSE_R * 1.04).toFixed(2)} 0 Z" fill="${LANGUE}"/>
</g>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="480" height="480">
<defs>
  <radialGradient id="bg" cx="50%" cy="36%" r="74%">
    <stop offset="0%" stop-color="#FFFDF9"/>
    <stop offset="100%" stop-color="#EFE8DC"/>
  </radialGradient>
  <filter id="flou" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="1.5"/>
  </filter>
  <clipPath id="clip"><circle cx="60" cy="60" r="57.2"/></clipPath>
</defs>
<circle cx="60" cy="60" r="60" fill="url(#bg)"/>
<g clip-path="url(#clip)">
  <g transform="translate(-12.5,-2) scale(1.45)">${alma}</g>
</g>
<circle cx="60" cy="60" r="58.4" fill="none" stroke="#2C6D50" stroke-width="2.4" opacity="0.9"/>
</svg>`

mkdirSync('public', { recursive: true })
await sharp(Buffer.from(svg)).resize(480, 480).png({ compressionLevel: 9 }).toFile('public/alma.png')
writeFileSync('public/alma.svg', svg)
console.log('public/alma.png genere')
