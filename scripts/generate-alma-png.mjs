/**
 * Genere public/alma.png, le portrait d'Alma utilise dans les emails.
 *
 * Pourquoi un PNG et pas le SVG inline des templates : Gmail ne rend pas
 * le SVG, ni inline ni en <img src="...svg">. Sans PNG, Alma est invisible
 * pour la majorite des destinataires.
 *
 * Le dessin reprend la geometrie de la silhouette du stade complice de
 * src/components/ai/alma/AlmaAvatarAnimated.tsx : un seul chemin festonne
 * par piece, trait fin, museau en relief avec sa barbe, yeux construits,
 * collier vert et medaille doree. Recadre en portrait dans un medaillon
 * creme cercle de vert pin.
 *
 * Pas de halo ici : le halo est le signal d'etat de l'assistante, il n'a
 * aucun sens sur une image fixe. Le cercle vert du medaillon joue ce role.
 *
 * Relancer apres toute evolution du personnage :
 *   node scripts/generate-alma-png.mjs
 */
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'node:fs'

const FUR = '#FFFFFF', FUR_LINE = '#E6DDCB', FUR_SHADOW = '#EFE6D5', EAR = '#FBF6EC'
const INK = '#221F19', NOSE = '#1A1712', CHEEK = '#D99B72'
const SHADOW = 'rgba(20,15,10,0.18)', GREEN = '#2D6A4F', GOLD = '#E4A62A', GOLD_DARK = '#B9821A'

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

/** Portion ouverte du meme contour : la barbe sous le museau. */
function scallopArc(cx, cy, r, bumps, amp, phase, i0, i1) {
  const pt = (i) => {
    const a = phase + (i / bumps) * Math.PI * 2
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  }
  const chord = 2 * r * Math.sin(Math.PI / bumps)
  const R = ((chord * chord) / 4 + amp * amp) / (2 * amp)
  const s0 = pt(i0)
  let d = `M ${s0[0].toFixed(2)} ${s0[1].toFixed(2)}`
  for (let i = i0 + 1; i <= i1; i++) {
    const q = pt(i)
    d += ` A ${R.toFixed(2)} ${R.toFixed(2)} 0 0 1 ${q[0].toFixed(2)} ${q[1].toFixed(2)}`
  }
  return d
}

const squash = (cx, cy, sx, sy) =>
  `translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`

/** Une piece de fourrure : aplat, volume, lumiere, puis le trait. */
function piece(d, tr, fill, sw, volume) {
  const t = tr ? ` transform="${tr}"` : ''
  return `<g${t}>
  <path d="${d}" fill="${fill}"/>
  ${volume ? `<path d="${d}" fill="url(#volume)"/><path d="${d}" fill="url(#lumiere)"/>` : ''}
  <path d="${d}" fill="none" stroke="${INK}" stroke-width="${sw.toFixed(2)}" stroke-linejoin="round"/>
  </g>`
}

const head = scallop(50, HEAD_Y, HR, B, HR * 0.075, 0.12)
const body = scallop(50, BODY_Y, BR, B - 3, BR * 0.08, 0.3)
const earRx = 50 - HR * 0.92, earLx = 50 + HR * 0.92
const earR = scallop(earRx, HEAD_Y + 8, HR * 0.48, B - 10, HR * 0.06, 0.85)
const earL = scallop(earLx, HEAD_Y + 7, HR * 0.48, B - 10, HR * 0.06, 0.25)
const toupY = HEAD_Y - HR * 0.88
const toup = scallop(50, toupY, HR * 0.4, B - 12, HR * 0.058, 1.05)

const noseY = HEAD_Y + HR * 0.655
const muzR = HR * 0.31, muzY = noseY + HR * 0.062
const muzB = 2 * Math.round((B - 10) / 2), muzPh = Math.PI / muzB
const muz = scallop(50, muzY, muzR, muzB, muzR * 0.15, muzPh)
const barbe = scallopArc(50, muzY, muzR, muzB, muzR * 0.15, muzPh, 0, muzB / 2 - 1)
const muzTr = squash(50, muzY, 1.5, 0.86)

const pawY = BODY_Y + BR - 3.2, pawX = BR * 0.44
const pawR = scallop(50 - pawX, pawY, 5.5, 7, 0.8, 0.4)
const pawL = scallop(50 + pawX, pawY, 5.5, 7, 0.8, 0.9)

const mouthY = noseY + NOSE_R * 0.78
const collarY = HEAD_Y + HR + 1.5

const oeil = (cx) => `
  <circle cx="${cx.toFixed(2)}" cy="${EYE_Y}" r="${EYE}" fill="url(#iris)"/>
  <circle cx="${cx.toFixed(2)}" cy="${(EYE_Y + EYE * 0.06).toFixed(2)}" r="${(EYE * 0.52).toFixed(2)}" fill="#100D09"/>
  <circle cx="${(cx - EYE * 0.33).toFixed(2)}" cy="${(EYE_Y - EYE * 0.36).toFixed(2)}" r="${(EYE * 0.33).toFixed(2)}" fill="#FFFFFF"/>
  <circle cx="${(cx + EYE * 0.4).toFixed(2)}" cy="${(EYE_Y + EYE * 0.4).toFixed(2)}" r="${(EYE * 0.155).toFixed(2)}" fill="#FFFFFF" opacity="0.72"/>`

const paupiere = (cx) => `
  <path d="M ${(cx - EYE * 1.06).toFixed(2)} ${(EYE_Y + EYE * 0.72).toFixed(2)} q ${(EYE * 1.06).toFixed(2)} ${(EYE * 0.72).toFixed(2)} ${(EYE * 2.12).toFixed(2)} 0"
    fill="none" stroke="${INK}" stroke-width="${(S * 0.5).toFixed(2)}" stroke-linecap="round" opacity="0.34"/>`

const alma = `
<ellipse cx="50" cy="99.5" rx="24" ry="2.4" fill="${SHADOW}"/>
${piece(body, null, FUR, S, true)}
${piece(pawR, squash(50 - pawX, pawY, 1.06, 0.84), FUR, S * 0.8, false)}
${piece(pawL, squash(50 + pawX, pawY, 1.06, 0.84), FUR, S * 0.8, false)}
<g stroke="${INK}" stroke-width="${(S * 0.46).toFixed(2)}" stroke-linecap="round" opacity="0.42" fill="none">
  <path d="M${(50 - pawX - 1.7).toFixed(2)} ${(pawY + 1.1).toFixed(2)} v1.8"/>
  <path d="M${(50 - pawX + 1.7).toFixed(2)} ${(pawY + 1.1).toFixed(2)} v1.8"/>
  <path d="M${(50 + pawX - 1.7).toFixed(2)} ${(pawY + 1.1).toFixed(2)} v1.8"/>
  <path d="M${(50 + pawX + 1.7).toFixed(2)} ${(pawY + 1.1).toFixed(2)} v1.8"/>
</g>
<path d="M ${(50 - BR * 0.62).toFixed(2)} ${collarY.toFixed(2)} Q 50 ${(collarY + 5.5).toFixed(2)} ${(50 + BR * 0.62).toFixed(2)} ${collarY.toFixed(2)}"
  fill="none" stroke="${GREEN}" stroke-width="${(S * 1.5).toFixed(2)}" stroke-linecap="round"/>
<circle cx="50" cy="${(collarY + 6.4).toFixed(2)}" r="2.9" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="${(S * 0.35).toFixed(2)}"/>
<circle cx="49" cy="${(collarY + 5.6).toFixed(2)}" r="0.9" fill="#FFFFFF" opacity="0.5"/>
${piece(earR, squash(earRx, HEAD_Y + 8, 0.9, 1.26), EAR, S * 0.9, true)}
${piece(earL, squash(earLx, HEAD_Y + 7, 0.9, 1.26), EAR, S * 0.9, true)}
${piece(toup, squash(50, toupY, 1.3, 0.94), FUR, S * 0.9, true)}
${piece(head, null, FUR, S * 1.04, true)}
<ellipse cx="${(50 - HR * 0.74).toFixed(2)}" cy="${(noseY - HR * 0.2).toFixed(2)}" rx="4.3" ry="3" fill="${CHEEK}" opacity="0.17"/>
<ellipse cx="${(50 + HR * 0.74).toFixed(2)}" cy="${(noseY - HR * 0.2).toFixed(2)}" rx="4.3" ry="3" fill="${CHEEK}" opacity="0.17"/>
<g transform="${muzTr}"><path d="${muz}" fill="url(#museau)"/></g>
<g transform="${muzTr}"><path d="${barbe}" fill="none" stroke="${INK}" stroke-width="${(S * 0.66).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/></g>
${oeil(50 - EYE_X)}${oeil(50 + EYE_X)}
${paupiere(50 - EYE_X)}${paupiere(50 + EYE_X)}
<ellipse cx="50" cy="${noseY.toFixed(2)}" rx="${(NOSE_R * 1.12).toFixed(2)}" ry="${(NOSE_R * 0.82).toFixed(2)}" fill="${NOSE}"/>
<ellipse cx="${(50 - NOSE_R * 0.3).toFixed(2)}" cy="${(noseY - NOSE_R * 0.32).toFixed(2)}" rx="${(NOSE_R * 0.3).toFixed(2)}" ry="${(NOSE_R * 0.17).toFixed(2)}" fill="#FFFFFF" opacity="0.5"/>
<path d="M50 ${mouthY.toFixed(2)} v${(NOSE_R * 0.5).toFixed(2)} M50 ${(mouthY + NOSE_R * 0.5).toFixed(2)} q${(-NOSE_R * 0.62).toFixed(2)} ${(NOSE_R * 0.62).toFixed(2)} ${(-NOSE_R * 1.12).toFixed(2)} 0 M50 ${(mouthY + NOSE_R * 0.5).toFixed(2)} q${(NOSE_R * 0.62).toFixed(2)} ${(NOSE_R * 0.62).toFixed(2)} ${(NOSE_R * 1.12).toFixed(2)} 0"
  stroke="${INK}" stroke-width="${(S * 0.62).toFixed(2)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="480" height="480">
<defs>
  <radialGradient id="bg" cx="50%" cy="36%" r="74%">
    <stop offset="0%" stop-color="#FFFDF9"/>
    <stop offset="100%" stop-color="#EFE8DC"/>
  </radialGradient>
  <linearGradient id="volume" x1="0" y1="0" x2="0" y2="1">
    <stop offset="40%" stop-color="#DED3BE" stop-opacity="0"/>
    <stop offset="100%" stop-color="#DED3BE" stop-opacity="0.42"/>
  </linearGradient>
  <radialGradient id="lumiere" cx="33%" cy="24%" r="70%">
    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
    <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="iris" cx="36%" cy="28%" r="80%">
    <stop offset="0%" stop-color="#5B4634"/>
    <stop offset="52%" stop-color="#32261B"/>
    <stop offset="100%" stop-color="#13100B"/>
  </radialGradient>
  <radialGradient id="museau" cx="46%" cy="34%" r="74%">
    <stop offset="0%" stop-color="#FFFFFF"/>
    <stop offset="100%" stop-color="${FUR_SHADOW}"/>
  </radialGradient>
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
