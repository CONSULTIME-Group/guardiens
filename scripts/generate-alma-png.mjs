/**
 * Genere public/alma.png, le portrait d'Alma utilise dans les emails.
 *
 * Pourquoi un PNG et pas le SVG inline des templates : Gmail ne rend pas
 * le SVG, ni inline ni en <img src="...svg">. Sans PNG, Alma est invisible
 * pour la majorite des destinataires.
 *
 * Le dessin est repris trait pour trait de la silhouette adulte de
 * src/components/ai/alma/AlmaAvatarAnimated.tsx (bichon frise, bandana
 * vert, medaille doree), recadre en portrait dans un medaillon creme
 * cercle de vert pin.
 *
 * Relancer apres toute evolution du personnage :
 *   node scripts/generate-alma-png.mjs
 */
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'node:fs'

const FUR = '#FFFFFF', FUR_LINE = '#E6DDCB', EAR = '#EFE6D5', EYE = '#2B2B2B'
const NOSE = '#20201F', MOUTH = '#7A6E5C', CHEEK = 'rgba(240,180,180,0.35)'
const SHADOW = 'rgba(20,15,10,0.18)', GREEN = '#2D6A4F', GOLD = '#E4A62A', GOLD_DARK = '#B9821A'

const curl = (x, y, r) =>
  `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="0.4"/>`

function ellipseCurls(cx, cy, rx, ry, count, r, startDeg = -90, spanDeg = 360) {
  const out = []
  const start = (startDeg * Math.PI) / 180
  const span = (spanDeg * Math.PI) / 180
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1)
    const a = start + span * t
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, r])
  }
  return out
}

function face(f) {
  return `
  <circle cx="${f.cx - f.eyeDx - 2.5}" cy="${f.eyeY + 5}" r="2.6" fill="${CHEEK}"/>
  <circle cx="${f.cx + f.eyeDx + 2.5}" cy="${f.eyeY + 5}" r="2.6" fill="${CHEEK}"/>
  <ellipse cx="${f.cx - f.eyeDx}" cy="${f.eyeY}" rx="${f.eyeRx}" ry="${f.eyeRy}" fill="${EYE}"/>
  <ellipse cx="${f.cx + f.eyeDx}" cy="${f.eyeY}" rx="${f.eyeRx}" ry="${f.eyeRy}" fill="${EYE}"/>
  <circle cx="${f.cx - f.eyeDx + f.eyeRx * 0.35}" cy="${f.eyeY - f.eyeRy * 0.4}" r="${f.eyeRx * 0.32}" fill="#FFFFFF"/>
  <circle cx="${f.cx + f.eyeDx + f.eyeRx * 0.35}" cy="${f.eyeY - f.eyeRy * 0.4}" r="${f.eyeRx * 0.32}" fill="#FFFFFF"/>
  <ellipse cx="${f.cx}" cy="${f.noseCy}" rx="${f.noseRx}" ry="${f.noseRy}" fill="${NOSE}"/>
  <ellipse cx="${f.cx - f.noseRx * 0.35}" cy="${f.noseCy - f.noseRy * 0.4}" rx="${f.noseRx * 0.35}" ry="${f.noseRy * 0.3}" fill="#FFFFFF" opacity="0.55"/>
  <path d="M${f.cx} ${f.noseCy + f.noseRy} L${f.cx} ${f.mouthY - 0.4}" stroke="${MOUTH}" stroke-width="0.9" stroke-linecap="round"/>
  <path d="M${f.cx - f.mouthSpread} ${f.mouthY} q${f.mouthSpread * 0.55} ${f.mouthSpread * 0.6} ${f.mouthSpread} ${f.mouthSpread * 0.6} q${f.mouthSpread * 0.45} 0 ${f.mouthSpread} -${f.mouthSpread * 0.6}"
    fill="none" stroke="${MOUTH}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`
}

function ear(side, cx, cy, rx, ry) {
  const inward = side === 'l' ? -1 : 1
  return `<g>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${EAR}" stroke="${FUR_LINE}" stroke-width="0.5"/>
  ${curl(cx + inward * rx * 0.2, cy - ry * 0.6, rx * 0.55)}
  ${curl(cx - inward * rx * 0.3, cy - ry * 0.3, rx * 0.6)}
  ${curl(cx + inward * rx * 0.35, cy + ry * 0.1, rx * 0.55)}
  ${curl(cx - inward * rx * 0.15, cy + ry * 0.4, rx * 0.55)}
  ${curl(cx + inward * rx * 0.2, cy + ry * 0.7, rx * 0.5)}
  </g>`
}

const headCx = 50, headCy = 32, headRx = 22, headRy = 21
const f = { cx: headCx, cy: headCy, eyeDx: 7, eyeRx: 3.6, eyeRy: 4, eyeY: 33, noseCy: 42, noseRx: 2.5, noseRy: 2, mouthY: 46, mouthSpread: 4.2 }
const bodyCx = 50, bodyCy = 68, bodyRx = 32, bodyRy = 14

const alma = `
<ellipse cx="50" cy="96" rx="33" ry="2.8" fill="${SHADOW}"/>
<rect x="28" y="78" width="6" height="14" rx="2.6" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="0.4"/>
<rect x="42" y="78" width="6" height="14" rx="2.6" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="0.4"/>
<rect x="56" y="78" width="6" height="14" rx="2.6" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="0.4"/>
<rect x="70" y="78" width="6" height="14" rx="2.6" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="0.4"/>
${curl(31, 78, 3.4)}${curl(45, 78, 3.4)}${curl(59, 78, 3.4)}${curl(73, 78, 3.4)}
<ellipse cx="${bodyCx}" cy="${bodyCy}" rx="${bodyRx}" ry="${bodyRy}" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="0.5"/>
${ellipseCurls(bodyCx, bodyCy, bodyRx, bodyRy, 16, 4.8).map(([x, y, r]) => curl(x, y, r)).join('')}
${curl(38, 62, 5)}${curl(44, 64, 5.4)}${curl(50, 62, 5.6)}${curl(56, 64, 5.4)}${curl(62, 62, 5)}
<path d="M28 54 q22 10 44 0 l-4 8 q-18 6 -36 0 z" fill="${GREEN}"/>
<path d="M45 60 l5 10 l5 -10 z" fill="${GREEN}"/>
<circle cx="50" cy="65" r="2.8" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width="0.5"/>
<circle cx="50" cy="65" r="1" fill="${GOLD_DARK}" opacity="0.7"/>
${ear('r', headCx - 19, 36, 8, 16)}
${ear('l', headCx + 19, 36, 8, 16)}
<g>
  <ellipse cx="${headCx}" cy="${headCy}" rx="${headRx}" ry="${headRy}" fill="${FUR}" stroke="${FUR_LINE}" stroke-width="0.5"/>
  ${ellipseCurls(headCx, headCy, headRx + 0.6, headRy + 0.6, 16, 4.8).map(([x, y, r]) => curl(x, y, r)).join('')}
  ${curl(headCx - 4, headCy - headRy * 0.75, 3.4)}
  ${curl(headCx + 4, headCy - headRy * 0.75, 3.4)}
  ${curl(headCx, headCy - headRy * 0.9, 3.6)}
  <ellipse cx="${headCx}" cy="44" rx="9.5" ry="7.4" fill="#FFFDFA" stroke="${FUR_LINE}" stroke-width="0.6"/>
  ${face(f)}
</g>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="480" height="480">
<defs>
  <radialGradient id="bg" cx="50%" cy="36%" r="74%">
    <stop offset="0%" stop-color="#FFFDF9"/>
    <stop offset="100%" stop-color="#EFE8DC"/>
  </radialGradient>
  <clipPath id="clip"><circle cx="60" cy="60" r="57.2"/></clipPath>
</defs>
<circle cx="60" cy="60" r="60" fill="url(#bg)"/>
<g clip-path="url(#clip)">
  <g transform="translate(-11.5,4) scale(1.42)">${alma}</g>
</g>
<circle cx="60" cy="60" r="58.4" fill="none" stroke="#2C6D50" stroke-width="2.4" opacity="0.9"/>
</svg>`

mkdirSync('public', { recursive: true })
await sharp(Buffer.from(svg)).resize(480, 480).png({ compressionLevel: 9 }).toFile('public/alma.png')
writeFileSync('public/alma.svg', svg)
console.log('public/alma.png genere')
