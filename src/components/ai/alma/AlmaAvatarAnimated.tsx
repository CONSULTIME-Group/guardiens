/**
 * <AlmaAvatarAnimated />, Alma, bichon frisé qui évolue physiquement.
 *
 * Gouache à plat (septembre 2026) : aucun contour. Chaque pièce de fourrure
 * est un seul chemin festonné, peint en trois plans de valeur, ombre puis
 * base puis lumière, la lumière venant du haut à gauche. La pièce du dessus
 * projette une ombre de contact sur celle du dessous, et c'est cela, bien
 * plus que la quantité d'ombre, qui rend l'empilement lisible sans trait.
 *
 * Le signal « assistante » est une étincelle bleue posée DEVANT elle, en
 * haut à droite et hors de sa silhouette. Le bleu sort de la palette
 * Guardiens, donc elle se lit comme une couche assistante plutôt que comme
 * un ornement de marque. Elle scintille plus vite quand Alma cherche.
 *
 * Quatre leviers de tendresse sont acquis et permanents : le regard qui
 * remonte vers la personne, la tête penchée de sept degrés, l'asymétrie des
 * oreilles, et le bout de langue visible au repos.
 *
 * Chaque stade garde SA géométrie : proportions de chiot au début, grosse
 * tête et grands yeux bas dans le visage, proportions adultes à la fin, avec
 * un collier et une médaille à partir du stade complice. La croissance
 * perçue vient de ces proportions plus de ALMA_STAGE_SCALE.
 *
 * Couleurs du personnage : en dur (exception admise à la règle tokens),
 * pour que le bichon reste blanc en dark mode et ne s'inverse jamais.
 *
 * L'API du composant est stable : mêmes props (size, mood, stage,
 * showHalo, className, aria-hidden), mêmes exports (ALMA_STAGE_SCALE,
 * STAGE_HALO_CLASS, STAGE_RING_CLASS, STAGE_RING_WIDTH_CLASS,
 * ALMA_STAGE_ASSETS). Si une illustration dédiée est branchée pour un
 * stade dans ALMA_STAGE_ASSETS, elle prime sur le SVG.
 */
import { CSSProperties, ReactNode, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import type { AlmaStage } from "@/hooks/useAlmaEvolution";

export type AlmaAnimatedMood =
  | "idle"
  | "attentive"
  | "thinking"
  | "happy"
  | "gentle"
  | "playful"
  | "sleepy";

/**
 * Mapping stade → illustration dédiée. Tant qu'une entrée vaut `null`, on
 * rend le SVG animé ci-dessous. Pour brancher une illustration finale :
 * remplacer `null` par le `src` importé.
 */
export const ALMA_STAGE_ASSETS: Record<AlmaStage, string | null> = {
  nouvelle: null,
  eveillee: null,
  complice: null,
  fidele: null,
};

/**
 * Facteur de croissance d'Alma par stade, utilisé par les surfaces qui
 * veulent visualiser la trajectoire (page /alma). Le SVG a déjà des
 * proportions qui mûrissent ; ce facteur augmente en plus la taille rendue.
 */
export const ALMA_STAGE_SCALE: Record<AlmaStage, number> = {
  nouvelle: 0.9,
  eveillee: 1.05,
  complice: 1.2,
  fidele: 1.4,
};

/** Halo lumineux, teinte de stade. */
export const STAGE_HALO_CLASS: Record<AlmaStage, string> = {
  nouvelle: "bg-muted-foreground/20",
  eveillee: "bg-sky-500/35",
  complice: "bg-primary/45",
  fidele: "bg-amber-500/60",
};

/** Liseré autour du médaillon, teinte selon le stade. */
export const STAGE_RING_CLASS: Record<AlmaStage, string> = {
  nouvelle: "ring-muted-foreground/40",
  eveillee: "ring-sky-500/50",
  complice: "ring-primary/60",
  fidele: "ring-amber-500/70",
};

/** Épaisseur du liseré. */
export const STAGE_RING_WIDTH_CLASS: Record<AlmaStage, string> = {
  nouvelle: "ring-1",
  eveillee: "ring-2",
  complice: "ring-2",
  fidele: "ring-4",
};

interface Props {
  mood?: AlmaAnimatedMood;
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
  stage?: AlmaStage;
  showHalo?: boolean;
}

/* ------------------------------------------------------------------ */
/* Couleurs du personnage (en dur, aucune inversion dark mode).        */
/* ------------------------------------------------------------------ */
/* Gouache à plat : aucun contour. Chaque pièce porte trois plans de valeur,
   ombre, base, lumière, et la pièce du dessus projette sur celle du dessous.
   C'est ce qui rend l'empilement lisible sans un seul trait. */
const FUR_OMBRE = "#DCC9A6";
const FUR = "#F2EADA";
const FUR_CLAIR = "#FDF9F0";
const EAR_OMBRE = "#C9B492";
const EAR = "#E0D0B2";
const EAR_CLAIR = "#F0E5D0";
const CONTACT = "#BBA687";
const MUSEAU = "#FDF9F0";
const IRIS = "#3E3225";
const PUPILLE = "#241A11";
const EYE_HI = "#FFFFFF";
const NOSE = "#3E3225";
const MOUTH = "#3E3225";
const LANGUE = "#EE9AA6";
const CHEEK = "#D99B72";
const SHADOW = "rgba(20, 15, 10, 0.16)";

/* À petite taille, les valeurs se creusent : sans contour, c'est le seul
   moyen de tenir la silhouette sur une pastille de 24 pixels. */
const FUR_OMBRE_MINI = "#CFB98F";
const EAR_OMBRE_MINI = "#B9A176";
const CONTACT_MINI = "#A88F6A";

/* Accessoires et étincelle. */
const SKY = "#4FA3D8";
const GREEN = "#2D6A4F";
const GOLD = "#E4A62A";
const GOLD_DARK = "#B9821A";

/* ------------------------------------------------------------------ */
/* Feuille de style, mêmes classes que la version précédente pour     */
/* préserver les animations attachées aux groupes.                     */
/* ------------------------------------------------------------------ */
const STYLE = `
[data-alma-animated] .alma-part { transform-box: fill-box; transform-origin: center; }
[data-alma-animated] .alma-head-sway  { transform-origin: 50% 75%; }
[data-alma-animated] .alma-head-mood  { transform-origin: 50% 75%; }
[data-alma-animated] .alma-body-breath{ transform-origin: 50% 90%; }
[data-alma-animated] .alma-body-mood  { transform-origin: 50% 90%; }
[data-alma-animated] .alma-ear-l      { transform-origin: 50% 15%; }
[data-alma-animated] .alma-ear-r      { transform-origin: 50% 15%; }
[data-alma-animated] .alma-toupet     { transform-origin: 50% 100%; }
[data-alma-animated] .alma-tail-base  { transform-origin: 90% 90%; }
[data-alma-animated] .alma-tail-mood  { transform-origin: 90% 90%; }
[data-alma-animated] .alma-eyes       { transform-origin: 50% 50%; }
[data-alma-animated] .alma-eyelid     { transform-origin: 50% 0%; transform: scaleY(0); }
[data-alma-animated] .alma-tongue     { transform-origin: 50% 0%; transform: scaleY(0); opacity: 0; }
[data-alma-animated] .alma-shadow     { transform-origin: 50% 50%; }
[data-alma-animated] .alma-burst      { transform-origin: 50% 75%; }

/* L'étincelle bleue : couche d'interface posée DEVANT elle, en haut à
   droite, hors de sa silhouette. Elle scintille plus vite quand Alma
   cherche, et s'éteint quand elle dort. */
[data-alma-animated] .alma-etincelle { transform-box: view-box; transform-origin: 87px 13px; opacity: 0.85; transition: opacity 0.4s ease; }

@media (prefers-reduced-motion: no-preference) {
  [data-alma-animated] .alma-body-breath { animation: alma-breathe 4.2s ease-in-out infinite; }
  [data-alma-animated] .alma-head-sway   { animation: alma-head-sway 5.5s ease-in-out infinite; }
  [data-alma-animated] .alma-shadow      { animation: alma-shadow 4.2s ease-in-out infinite; }
  [data-alma-animated] .alma-eyelid-l    { animation: alma-blink-l 5.3s ease-in-out infinite; }
  [data-alma-animated] .alma-eyelid-r    { animation: alma-blink-r 5.3s ease-in-out infinite; }
  [data-alma-animated] .alma-ear-l       { animation: alma-ear-idle-l 6.5s ease-in-out infinite; }
  [data-alma-animated] .alma-ear-r       { animation: alma-ear-idle-r 6.5s ease-in-out infinite; }
  [data-alma-animated] .alma-toupet      { animation: alma-toupet 6s ease-in-out infinite; }
  [data-alma-animated] .alma-tail-base   { animation: alma-tail-slow 3.4s ease-in-out infinite; }

  [data-alma-animated] .alma-etincelle   { animation: alma-scintille 3.6s ease-in-out infinite; }

  [data-alma-animated][data-mood="gentle"]    .alma-body-breath { animation-duration: 6.5s; }
  [data-alma-animated][data-mood="gentle"]    .alma-head-sway   { animation-duration: 7.5s; }

  [data-alma-animated][data-mood="attentive"] .alma-head-mood   { animation: alma-tilt 2.4s ease-in-out infinite; }
  [data-alma-animated][data-mood="attentive"] .alma-ear-l       { animation: alma-ear-perk-l 2.4s ease-in-out infinite; }
  [data-alma-animated][data-mood="attentive"] .alma-ear-r       { animation: alma-ear-perk-r 2.4s ease-in-out infinite; }
  [data-alma-animated][data-mood="attentive"] .alma-tail-mood   { animation: alma-tail-wag 0.7s ease-in-out infinite; }
  [data-alma-animated][data-mood="attentive"] .alma-etincelle   { animation-duration: 2.2s; }

  [data-alma-animated][data-mood="thinking"]  .alma-head-mood   { animation: alma-tilt-slow 3.2s ease-in-out infinite; }
  [data-alma-animated][data-mood="thinking"]  .alma-eyes        { animation: alma-eyes-scan 3.2s ease-in-out infinite; }
  [data-alma-animated][data-mood="thinking"]  .alma-etincelle   { animation-duration: 1.1s; }

  [data-alma-animated][data-mood="happy"]     .alma-body-mood   { animation: alma-bounce 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) infinite; }
  [data-alma-animated][data-mood="happy"]     .alma-head-mood   { animation: alma-head-happy 0.55s ease-out infinite; }
  [data-alma-animated][data-mood="happy"]     .alma-tail-mood   { animation: alma-tail-wag 0.32s ease-in-out infinite; }
  [data-alma-animated][data-mood="happy"]     .alma-tongue      { animation: alma-tongue 1.1s ease-in-out infinite; }
  [data-alma-animated][data-mood="happy"]     .alma-etincelle   { animation-duration: 1.6s; }

  [data-alma-animated][data-mood="playful"]   .alma-body-mood   { animation: alma-wiggle 0.7s ease-in-out infinite; }
  [data-alma-animated][data-mood="playful"]   .alma-tail-mood   { animation: alma-tail-wag 0.3s ease-in-out infinite; }
  [data-alma-animated][data-mood="playful"]   .alma-head-mood   { animation: alma-head-happy 0.95s ease-in-out infinite; }
  [data-alma-animated][data-mood="playful"]   .alma-tongue      { animation: alma-tongue 0.95s ease-in-out infinite; }
  [data-alma-animated][data-mood="playful"]   .alma-etincelle   { animation-duration: 1.4s; }

  [data-alma-animated][data-mood="sleepy"]    .alma-body-breath { animation-duration: 7.5s; }
  [data-alma-animated][data-mood="sleepy"]    .alma-eyelid      { transform: scaleY(0.7); animation: none; }
  [data-alma-animated][data-mood="sleepy"]                      { opacity: 0.88; }
  [data-alma-animated][data-mood="sleepy"]    .alma-etincelle   { animation: none; opacity: 0.18; }

  /* Intensité par stade */
  [data-alma-animated][data-stage="nouvelle"] .alma-body-breath { animation-duration: 5.2s; }
  [data-alma-animated][data-stage="eveillee"] .alma-body-breath { animation-duration: 4.2s; }
  [data-alma-animated][data-stage="eveillee"] .alma-tail-base   { animation-duration: 3.4s; }
  [data-alma-animated][data-stage="complice"] .alma-body-breath { animation-duration: 3.4s; }
  [data-alma-animated][data-stage="complice"] .alma-tail-base   { animation-duration: 2.6s; }
  [data-alma-animated][data-stage="complice"] .alma-tail-mood   { animation: alma-tail-wag 1.4s ease-in-out infinite; }
  [data-alma-animated][data-stage="fidele"]   .alma-body-breath { animation-duration: 2.8s; }
  [data-alma-animated][data-stage="fidele"]   .alma-tail-base   { animation-duration: 2.0s; }
  [data-alma-animated][data-stage="fidele"]   .alma-tail-mood   { animation: alma-tail-wag 0.9s ease-in-out infinite; }
  [data-alma-animated][data-stage="fidele"]   .alma-ear-l       { animation: alma-ear-perk-l 3.2s ease-in-out infinite; }
  [data-alma-animated][data-stage="fidele"]   .alma-ear-r       { animation: alma-ear-perk-r 3.2s ease-in-out infinite; }
}

@keyframes alma-breathe    { 0%,100% { transform: scale(1); } 50% { transform: scale(1.025, 1.035); } }
@keyframes alma-shadow     { 0%,100% { transform: scaleX(1); opacity: 1; } 50% { transform: scaleX(1.06); opacity: 0.82; } }
@keyframes alma-head-sway  { 0%,100% { transform: translateY(0) rotate(0deg); } 40% { transform: translateY(-0.5px) rotate(1.2deg); } 70% { transform: translateY(-0.3px) rotate(-1deg); } }
@keyframes alma-tilt       { 0%,100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
@keyframes alma-tilt-slow  { 0%,100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
@keyframes alma-head-happy { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-1.6px) rotate(-3deg); } }
@keyframes alma-bounce     { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-2.6px) scale(1.03); } }
@keyframes alma-wiggle     { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
@keyframes alma-tail-slow  { 0%,100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
@keyframes alma-tail-wag   { 0%,100% { transform: rotate(-22deg); } 50% { transform: rotate(22deg); } }
@keyframes alma-ear-idle-l { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-2deg); } }
@keyframes alma-ear-idle-r { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(2deg); } }
@keyframes alma-ear-perk-l { 0%,100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(-8deg) translateY(-1.2px); } }
@keyframes alma-ear-perk-r { 0%,100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(8deg) translateY(-1.2px); } }
@keyframes alma-toupet     { 0%,100% { transform: rotate(3deg); } 50% { transform: rotate(-4deg); } }
@keyframes alma-blink-l    { 0%,91%,100% { transform: scaleY(0); } 93%,94.5% { transform: scaleY(1); } }
@keyframes alma-blink-r    { 0%,91.5%,100% { transform: scaleY(0); } 93.5%,95% { transform: scaleY(1); } }
@keyframes alma-eyes-scan  { 0%,100% { transform: translateX(-0.8px); } 50% { transform: translateX(0.8px); } }
@keyframes alma-tongue     { 0% { transform: scaleY(0); opacity: 0; } 40%,70% { transform: scaleY(1); opacity: 1; } 100% { transform: scaleY(0); opacity: 0; } }
@keyframes alma-scintille  { 0%,100% { transform: scale(1) rotate(0deg); opacity: 0.8; } 50% { transform: scale(1.18) rotate(12deg); opacity: 1; } }

/* Vie non linéaire : pirouette et pounce, jouées une fois, à intervalle
   aléatoire. La classe est posée puis retirée par le composant. */
@media (prefers-reduced-motion: no-preference) {
  [data-alma-animated][data-burst="pirouette"] .alma-burst { animation: alma-pirouette 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) 1; }
  [data-alma-animated][data-burst="pounce"]    .alma-burst { animation: alma-pounce 0.6s ease-out 1; }
}

@keyframes alma-pirouette {
  0%   { transform: rotate(0deg) translateY(0) scale(1, 1); }
  20%  { transform: rotate(90deg) translateY(-4px) scale(0.97, 1.05); }
  55%  { transform: rotate(230deg) translateY(-6px) scale(0.96, 1.06); }
  85%  { transform: rotate(360deg) translateY(0) scale(1.1, 0.9); }
  100% { transform: rotate(360deg) translateY(0) scale(1, 1); }
}

@keyframes alma-pounce {
  0%   { transform: translate(0, 0) rotate(0deg); }
  25%  { transform: translate(2.5px, 1.5px) rotate(3deg); }
  50%  { transform: translate(0, 0) rotate(0deg); }
  75%  { transform: translate(2.5px, 1.5px) rotate(3deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
`;

/* ------------------------------------------------------------------ */
/* Géométrie : une pièce de fourrure = UN chemin festonné.            */
/* ------------------------------------------------------------------ */

/**
 * Contour bouclé fermé. `bumps` petites bosses régulières de hauteur `amp`
 * posées sur un cercle de rayon `r`. Chaque bosse est un arc de cercle dont
 * le rayon se déduit de la corde et de la flèche, donc le raccord entre
 * deux bosses est parfaitement lisse.
 */
function scallop(
  cx: number,
  cy: number,
  r: number,
  bumps: number,
  amp: number,
  phase = 0,
): string {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < bumps; i++) {
    const a = phase + (i / bumps) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  const chord = 2 * r * Math.sin(Math.PI / bumps);
  const R = ((chord * chord) / 4 + amp * amp) / (2 * amp);
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i <= bumps; i++) {
    const q = pts[i % bumps];
    d += ` A ${R.toFixed(2)} ${R.toFixed(2)} 0 0 1 ${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
  }
  return `${d} Z`;
}


/** Écrasement local d'une pièce, pour l'ovaliser sans déformer le trait. */
function squash(cx: number, cy: number, sx: number, sy: number): string {
  return `translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`;
}

/* ------------------------------------------------------------------ */
/* Paramètres de silhouette par stade                                  */
/* ------------------------------------------------------------------ */
type Geo = {
  /** Rayon de la tête. */
  HR: number;
  /** Rayon du corps. */
  BR: number;
  /** Rayon de l'oeil. */
  eye: number;
  /** Hauteur des yeux dans le visage. Plus bas = plus jeune. */
  eyeY: number;
  /** Écart des yeux à l'axe. */
  eyeX: number;
  /** Demi-largeur de la truffe. */
  nose: number;
  /** Nombre de boucles du contour à pleine taille. */
  bumps: number;
  /** Collier et médaille, à partir du stade complice. */
  collier: boolean;
};

/**
 * Les proportions mûrissent d'un stade à l'autre : la tête rétrécit par
 * rapport au corps, les yeux rapetissent et remontent. C'est le mécanisme
 * du schéma bébé, pris à rebours.
 */
const STAGE_GEO: Record<AlmaStage, Geo> = {
  nouvelle: { HR: 30, BR: 21, eye: 6.4, eyeY: 47.5, eyeX: 12.0, nose: 4.4, bumps: 22, collier: false },
  eveillee: { HR: 28.5, BR: 22, eye: 5.8, eyeY: 46.5, eyeX: 11.5, nose: 4.2, bumps: 23, collier: false },
  complice: { HR: 27.5, BR: 22.5, eye: 5.4, eyeY: 45.5, eyeX: 11.2, nose: 4.1, bumps: 24, collier: true },
  fidele: { HR: 26.0, BR: 23.5, eye: 4.8, eyeY: 44.5, eyeX: 10.8, nose: 3.9, bumps: 25, collier: true },
};

/** Silhouette servie aux points d'appel sans stade : celle de complice. */
const DEFAULT_GEO: Geo = { ...STAGE_GEO.complice, collier: false };

const HEAD_Y = 39;
const BODY_Y = 75;

/**
 * Épaisseur de référence des quelques traits restants : le collier, la
 * médaille et la bouche. Il n'y a plus aucun contour de silhouette.
 */
function strokeFor(size: number): number {
  const raw = 2.9 * Math.pow(24 / Math.max(12, size), 0.55);
  return Math.min(3.4, Math.max(1.2, raw));
}

/** Moins de boucles quand la pastille rétrécit, sinon elles se brouillent. */
function bumpsFor(size: number, max: number): number {
  return Math.min(max, Math.max(11, Math.round(11 + (size - 24) / 5.2)));
}

/* ------------------------------------------------------------------ */
/* Une pièce de fourrure : trois plans de valeur, aucun contour.       */
/* ------------------------------------------------------------------ */
function Piece({
  d,
  transform,
  quelle,
  cx,
  cy,
  r,
  mini,
  ids,
}: {
  d: string;
  transform?: string;
  quelle: "fur" | "ear";
  cx?: number;
  cy?: number;
  r?: number;
  mini: boolean;
  ids: { n: () => string };
}) {
  const est = quelle === "ear";
  const ombre = est ? (mini ? EAR_OMBRE_MINI : EAR_OMBRE) : mini ? FUR_OMBRE_MINI : FUR_OMBRE;
  const base = est ? EAR : FUR;
  const clair = est ? EAR_CLAIR : FUR_CLAIR;
  const plans = cx !== undefined && cy !== undefined && r !== undefined;
  const id = plans ? ids.n() : "";
  return (
    <g transform={transform}>
      {/* La pièce entière part dans le ton d'ombre. */}
      <path d={d} fill={ombre} />
      {plans && (
        <>
          <clipPath id={id}>
            <path d={d} />
          </clipPath>
          <g clipPath={`url(#${id})`}>
            {/* La lumière est posée par dessus, décalée vers le haut à
                gauche. Le croissant d'ombre qui subsiste en bas à droite
                est ce qui donne le volume. */}
            <circle cx={cx! - r! * 0.24} cy={cy! - r! * 0.26} r={r! * 1.02} fill={base} />
            <circle cx={cx! - r! * 0.46} cy={cy! - r! * 0.5} r={r! * 0.72} fill={clair} />
          </g>
        </>
      )}
    </g>
  );
}

/**
 * Ombre de contact : la pièce du DESSUS projette sur celle du dessous.
 * On découpe au receveur, on peint le chemin du projeteur décalé vers le
 * bas à droite, et on masque la zone que le projeteur couvre lui-même.
 * Sans ce masquage, une grande pièce badigeonne tout son receveur au lieu
 * de n'y laisser qu'un croissant.
 */
function Contact({
  receveurs,
  casters,
  dx,
  dy,
  mini,
  ids,
}: {
  receveurs: Array<{ d: string; tr?: string }>;
  casters: Array<{ d: string; tr?: string }>;
  dx: number;
  dy: number;
  mini: boolean;
  ids: { n: () => string; flou: string };
}) {
  const idClip = ids.n();
  const idMask = ids.n();
  return (
    <>
      <clipPath id={idClip}>
        {receveurs.map((rc, i) => (
          <path key={i} d={rc.d} transform={rc.tr} />
        ))}
      </clipPath>
      <mask id={idMask}>
        <rect x="-9" y="-7" width="118" height="118" fill="#FFFFFF" />
        {casters.map((c, i) => (
          <path key={i} d={c.d} transform={c.tr} fill="#000000" />
        ))}
      </mask>
      <g
        clipPath={`url(#${idClip})`}
        mask={`url(#${idMask})`}
        filter={`url(#${ids.flou})`}
        opacity={0.5}
      >
        <g transform={`translate(${dx} ${dy})`}>
          {casters.map((c, i) => (
            <path key={i} d={c.d} transform={c.tr} fill={mini ? CONTACT_MINI : CONTACT} />
          ))}
        </g>
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Le personnage                                                       */
/* ------------------------------------------------------------------ */
function renderAlma(
  geo: Geo,
  S: number,
  b: number,
  size: number,
  ids: { n: () => string; flou: string },
): ReactNode {
  const detail = size >= 46;
  const mini = size < 40;
  const { HR, BR, eye, eyeY, eyeX, nose } = geo;

  const head = scallop(50, HEAD_Y, HR, b, HR * 0.075, 0.12);
  const body = scallop(50, BODY_Y, BR, Math.max(8, b - 3), BR * 0.08, 0.3);

  /* Asymétrie : une oreille un peu plus haute et un peu plus petite que
     l'autre. La symétrie parfaite est ce qui fait lire un logo. */
  const earRx = 50 - HR * 0.92;
  const earLx = 50 + HR * 0.92;
  const earRy = HEAD_Y + 10.2;
  const earLy = HEAD_Y + 5.4;
  const earRr = HR * 0.465;
  const earLr = HR * 0.5;
  const earR = scallop(earRx, earRy, earRr, Math.max(8, b - 10), HR * 0.06, 0.85);
  const earL = scallop(earLx, earLy, earLr, Math.max(8, b - 10), HR * 0.06, 0.25);
  const earRtr = squash(earRx, earRy, 0.9, 1.26);
  const earLtr = squash(earLx, earLy, 0.9, 1.3);

  const toupY = HEAD_Y - HR * 0.88;
  const toup = scallop(50, toupY, HR * 0.4, Math.max(7, b - 12), HR * 0.058, 1.05);
  const toupTr = squash(50, toupY, 1.3, 0.94);

  const tailX = 50 - BR - 2.5;
  const tailY = BODY_Y - 9;
  const tail = scallop(tailX, tailY, 9, Math.max(7, b - 12), 1.35, 0.45);

  const noseY = HEAD_Y + HR * 0.655;
  const muzR = HR * 0.31;
  const muzY = noseY + HR * 0.062;
  const muzB = Math.max(8, 2 * Math.round((b - 10) / 2));
  const muzPh = Math.PI / muzB;
  const muz = scallop(50, muzY, muzR, muzB, muzR * 0.15, muzPh);
  const muzTr = squash(50, muzY, 1.5, 0.86);

  const pawY = BODY_Y + BR - 3.2;
  const pawX = BR * 0.44;
  const pawR = scallop(50 - pawX, pawY, 5.5, 7, 0.8, 0.4);
  const pawL = scallop(50 + pawX, pawY, 5.5, 7, 0.8, 0.9);

  const mouthY = noseY + nose * 0.78;
  const collarY = HEAD_Y + HR + 1.5;

  /* Le regard : la pupille remonte et rentre vers l'axe, donc Alma lève les
     yeux vers la personne au lieu de fixer le vide. */
  const oneEye = (cx: number) => {
    const dx = cx < 50 ? eye * 0.17 : -eye * 0.17;
    const px = cx + dx;
    const py = eyeY - eye * 0.2;
    return (
      <g key={`eye-${cx}`}>
        <circle cx={cx} cy={eyeY} r={eye} fill={IRIS} />
        <circle cx={px} cy={py + eye * 0.06} r={eye * 0.52} fill={PUPILLE} />
        <circle cx={px - eye * 0.33} cy={py - eye * 0.36} r={eye * 0.33} fill={EYE_HI} />
        {detail && (
          <circle cx={px + eye * 0.4} cy={py + eye * 0.4} r={eye * 0.155} fill={EYE_HI} opacity={0.72} />
        )}
      </g>
    );
  };

  const eyelid = (cx: number, side: "l" | "r") => (
    <rect
      key={`blink-${side}`}
      className={`alma-part alma-eyelid alma-eyelid-${side}`}
      x={cx - eye - 0.4}
      y={eyeY - eye - 0.4}
      width={eye * 2 + 0.8}
      height={eye * 2 + 0.8}
      rx={eye}
      fill={FUR_CLAIR}
    />
  );

  return (
    <g className="alma-part alma-body-breath">
      <g className="alma-part alma-body-mood">
        <g className="alma-part alma-tail-base">
          <g className="alma-part alma-tail-mood">
            <Piece
              d={tail}
              transform={squash(tailX, tailY, 0.94, 1.14)}
              quelle="fur"
              cx={tailX}
              cy={tailY}
              r={9}
              mini={mini}
              ids={ids}
            />
          </g>
        </g>

        <Piece d={body} quelle="fur" cx={50} cy={BODY_Y} r={BR} mini={mini} ids={ids} />

        {/* La tête est devant le corps, donc elle projette sur le poitrail. */}
        <Contact receveurs={[{ d: body }]} casters={[{ d: head }]} dx={2.2} dy={3.6} mini={mini} ids={ids} />

        <Piece
          d={pawR}
          transform={squash(50 - pawX, pawY, 1.06, 0.84)}
          quelle="fur"
          cx={50 - pawX}
          cy={pawY}
          r={5.5}
          mini={mini}
          ids={ids}
        />
        <Piece
          d={pawL}
          transform={squash(50 + pawX, pawY, 1.06, 0.84)}
          quelle="fur"
          cx={50 + pawX}
          cy={pawY}
          r={5.5}
          mini={mini}
          ids={ids}
        />

        {geo.collier && !mini && (
          <g aria-hidden transform="rotate(-7 50 63)">
            <path
              d={`M ${(50 - BR * 0.62).toFixed(2)} ${collarY.toFixed(2)} Q 50 ${(collarY + 5.5).toFixed(2)} ${(50 + BR * 0.62).toFixed(2)} ${collarY.toFixed(2)}`}
              fill="none"
              stroke={GREEN}
              strokeWidth={S * 1.5}
              strokeLinecap="round"
            />
            <circle cx={50} cy={collarY + 6.4} r={2.9} fill={GOLD} stroke={GOLD_DARK} strokeWidth={S * 0.35} />
            {detail && <circle cx={49} cy={collarY + 5.6} r={0.9} fill={EYE_HI} opacity={0.5} />}
          </g>
        )}

        {/* La tête penchée en permanence : la posture du chien qui écoute. */}
        <g className="alma-part alma-head-sway" transform="rotate(-7 50 63)">
          <g className="alma-part alma-head-mood">
            <g className="alma-part alma-ear-r">
              <Piece d={earR} transform={earRtr} quelle="ear" cx={earRx} cy={earRy} r={earRr} mini={mini} ids={ids} />
            </g>
            <g className="alma-part alma-ear-l">
              <Piece d={earL} transform={earLtr} quelle="ear" cx={earLx} cy={earLy} r={earLr} mini={mini} ids={ids} />
            </g>
            <g className="alma-part alma-toupet">
              <Piece d={toup} transform={toupTr} quelle="fur" cx={50} cy={toupY} r={HR * 0.4} mini={mini} ids={ids} />
            </g>

            {/* La tête est devant les oreilles et le toupet. */}
            <Contact
              receveurs={[
                { d: earR, tr: earRtr },
                { d: earL, tr: earLtr },
                { d: toup, tr: toupTr },
              ]}
              casters={[{ d: head }]}
              dx={1.8}
              dy={2.8}
              mini={mini}
              ids={ids}
            />

            <Piece d={head} quelle="fur" cx={50} cy={HEAD_Y} r={HR} mini={mini} ids={ids} />

            {detail && (
              <g aria-hidden>
                <ellipse cx={50 - HR * 0.74} cy={noseY - HR * 0.2} rx={4.3} ry={3} fill={CHEEK} opacity={0.17} />
                <ellipse cx={50 + HR * 0.74} cy={noseY - HR * 0.2} rx={4.3} ry={3} fill={CHEEK} opacity={0.17} />
              </g>
            )}

            {/* Le museau est devant le visage. */}
            <Contact receveurs={[{ d: head }]} casters={[{ d: muz, tr: muzTr }]} dx={1.1} dy={1.9} mini={mini} ids={ids} />
            <g transform={muzTr}>
              <path d={muz} fill={MUSEAU} />
            </g>

            <g className="alma-part alma-eyes">
              {oneEye(50 - eyeX)}
              {oneEye(50 + eyeX)}
            </g>
            {eyelid(50 - eyeX, "l")}
            {eyelid(50 + eyeX, "r")}

            <ellipse cx={50} cy={noseY} rx={nose * 1.12} ry={nose * 0.82} fill={NOSE} />
            {detail && (
              <ellipse
                cx={50 - nose * 0.3}
                cy={noseY - nose * 0.32}
                rx={nose * 0.3}
                ry={nose * 0.17}
                fill={EYE_HI}
                opacity={0.45}
              />
            )}

            {!mini && (
              <path
                d={`M50 ${mouthY.toFixed(2)} v${(nose * 0.5).toFixed(2)} M50 ${(mouthY + nose * 0.5).toFixed(2)} q${(-nose * 0.62).toFixed(2)} ${(nose * 0.62).toFixed(2)} ${(-nose * 1.12).toFixed(2)} 0 M50 ${(mouthY + nose * 0.5).toFixed(2)} q${(nose * 0.62).toFixed(2)} ${(nose * 0.62).toFixed(2)} ${(nose * 1.12).toFixed(2)} 0`}
                stroke={MOUTH}
                strokeWidth={S * 0.62}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Le bout de langue, visible au repos. */}
            {!mini && (
              <path
                d={`M ${(50 - nose * 0.52).toFixed(2)} ${(noseY + nose * 2.1).toFixed(2)} q ${(nose * 0.52).toFixed(2)} ${(nose * 1.05).toFixed(2)} ${(nose * 1.04).toFixed(2)} 0 Z`}
                fill={LANGUE}
              />
            )}

            <g className="alma-part alma-tongue">
              <ellipse cx={50} cy={mouthY + nose * 1.5} rx={1.8} ry={1.5} fill={LANGUE} />
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}

/** L'étincelle bleue : quatre branches douces, posées hors de sa silhouette. */
function etoile(cx: number, cy: number, r: number, op: number, k: number): ReactNode {
  const d = `M ${cx} ${cy - r} Q ${cx} ${cy} ${cx + r} ${cy} Q ${cx} ${cy} ${cx} ${cy + r} Q ${cx} ${cy} ${cx - r} ${cy} Q ${cx} ${cy} ${cx} ${cy - r} Z`;
  return <path key={k} d={d} fill={SKY} opacity={op} />;
}

/** Ombre au sol, rendue hors du groupe animé pour ne jamais pivoter. */
function renderStageShadow(stage?: AlmaStage): ReactNode {
  const rx = stage === "nouvelle" ? 20 : stage === "eveillee" ? 22 : stage === "fidele" ? 26 : 24;
  return (
    <ellipse
      className="alma-part alma-shadow"
      cx="50"
      cy="99.5"
      rx={rx}
      ry="2.4"
      fill={SHADOW}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                 */
/* ------------------------------------------------------------------ */
export function AlmaAvatarAnimated({
  mood = "idle",
  size = 40,
  className,
  stage,
  showHalo = false,
  ...rest
}: Props) {
  const ariaHidden = rest["aria-hidden"];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  /* Compteur local : chaque découpe et chaque masque a besoin d'un
     identifiant unique dans le document, sinon deux Alma sur la même page
     se voleraient leurs ombres. */
  let compteur = 0;
  const ids = {
    n: () => `alma-${uid}-${++compteur}`,
    flou: `alma-flou-${uid}`,
  };

  /* Vie non linéaire : une pirouette ou un pounce à intervalle aléatoire
     entre 25 et 50 secondes. Jamais de boucle, jamais de rythme constant.
     Le rendu reste immobile pour qui a réduit les animations. */
  const [burst, setBurst] = useState<"pirouette" | "pounce" | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let playTimer: ReturnType<typeof setTimeout> | undefined;
    let nextTimer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const delay = 25000 + Math.random() * 25000;
      nextTimer = setTimeout(() => {
        const kind = Math.random() < 0.5 ? "pirouette" : "pounce";
        setBurst(kind);
        playTimer = setTimeout(
          () => {
            setBurst(null);
            schedule();
          },
          kind === "pirouette" ? 1150 : 650,
        );
      }, delay);
    };
    schedule();
    return () => {
      if (playTimer) clearTimeout(playTimer);
      if (nextTimer) clearTimeout(nextTimer);
    };
  }, []);

  const style: CSSProperties = {
    width: size,
    height: size,
    display: "inline-block",
    position: "relative",
  };

  // Illustration dédiée branchée pour ce stade ? Elle prime.
  const stageAsset = stage ? ALMA_STAGE_ASSETS[stage] : null;
  if (stageAsset) {
    return (
      <span
        data-alma-animated=""
        data-mood={mood}
        data-stage={stage}
        aria-label={ariaHidden ? undefined : "Alma"}
        role={ariaHidden ? undefined : "img"}
        aria-hidden={ariaHidden}
        className={cn(
          "relative inline-flex items-center justify-center select-none",
          className,
        )}
        style={style}
      >
        <img
          src={stageAsset}
          alt=""
          width={size}
          height={size}
          draggable={false}
          className={cn(
            "relative block object-contain rounded-full",
            stage && "ring-offset-0",
            stage && STAGE_RING_WIDTH_CLASS[stage],
            stage && STAGE_RING_CLASS[stage],
          )}
          style={{ width: size, height: size }}
        />
      </span>
    );
  }

  const geo = stage ? STAGE_GEO[stage] : DEFAULT_GEO;
  const S = strokeFor(size);
  const b = bumpsFor(size, geo.bumps);
  return (
    <span
      data-alma-animated=""
      data-mood={mood}
      data-stage={stage}
      data-burst={burst ?? undefined}
      aria-label={ariaHidden ? undefined : "Alma"}
      role={ariaHidden ? undefined : "img"}
      aria-hidden={ariaHidden}
      className={cn("select-none", className)}
      style={style}
    >
      <style>{STYLE}</style>
      <svg
        viewBox="-9 -7 118 118"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <filter id={ids.flou} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {renderStageShadow(stage)}
        <g className="alma-burst">{renderAlma(geo, S, b, size, ids)}</g>

        {/* Le signal assistante : une étincelle bleue posée DEVANT elle, en
            haut à droite et hors de sa silhouette. Le bleu sort de la
            palette Guardiens, donc elle se lit comme une couche assistante
            plutôt que comme un ornement de marque. Elle scintille plus vite
            quand Alma cherche, et s'éteint quand elle dort. */}
        {showHalo && (
          <g className="alma-etincelle" aria-hidden>
            {etoile(87, 13, 11.5, 1, 1)}
            {etoile(100, 27, 5.4, 0.8, 2)}
            {etoile(75, 3, 3.8, 0.6, 3)}
          </g>
        )}
      </svg>
    </span>
  );
}


export default AlmaAvatarAnimated;
