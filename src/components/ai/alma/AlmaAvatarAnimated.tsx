/**
 * <AlmaAvatarAnimated /> — Alma, bichon frisé qui évolue physiquement.
 *
 * Contrairement à la version précédente (une seule silhouette dont les
 * accessoires changeaient), chaque stade rend désormais une SILHOUETTE
 * PROPRE : chiot assis, jeune debout, adulte fier, forme finale imposante.
 * Les animations (respiration, queue, oreilles, clignement, halo) sont
 * conservées et branchées sur les mêmes classes CSS, quelle que soit la
 * silhouette rendue.
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
import { CSSProperties, ReactNode, useId } from "react";
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
 * Facteur de croissance d'Alma par stade — utilisé par les surfaces qui
 * veulent visualiser la trajectoire (page /alma). Le SVG a déjà une
 * silhouette qui grandit intrinsèquement ; ce facteur augmente en plus
 * la taille rendue pour appuyer l'effet.
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
const FUR = "#FFFFFF";
const FUR_LINE = "#E6DDCB";
const FUR_SHADOW = "#EFE6D5";
const EAR = "#EFE6D5";
const EYE = "#2B2B2B";
const EYE_HI = "#FFFFFF";
const NOSE = "#20201F";
const MOUTH = "#7A6E5C";
const CHEEK = "rgba(240, 180, 180, 0.35)";
const SHADOW = "rgba(20, 15, 10, 0.22)";

/* Accessoires (teintes stades, en dur pour cohérence illustration). */
const SKY = "#4FA3D8";
const SKY_HALO = "#6FB7E6";
const GREEN = "#2D6A4F";
const GOLD = "#E4A62A";
const GOLD_DARK = "#B9821A";

/* ------------------------------------------------------------------ */
/* Feuille de style — mêmes classes que la version précédente pour     */
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
[data-alma-animated] .alma-tail-base  { transform-origin: 90% 90%; }
[data-alma-animated] .alma-tail-mood  { transform-origin: 90% 90%; }
[data-alma-animated] .alma-eyes       { transform-origin: 50% 50%; }
[data-alma-animated] .alma-eyelid     { transform-origin: 50% 0%; transform: scaleY(0); }
[data-alma-animated] .alma-tongue     { transform-origin: 50% 0%; transform: scaleY(0); opacity: 0; }
[data-alma-animated] .alma-shadow     { transform-origin: 50% 50%; }
[data-alma-animated] .alma-aura-ray   { transform-origin: 50% 50%; }

@media (prefers-reduced-motion: no-preference) {
  [data-alma-animated] .alma-body-breath { animation: alma-breathe 4.2s ease-in-out infinite; }
  [data-alma-animated] .alma-head-sway   { animation: alma-head-sway 5.5s ease-in-out infinite; }
  [data-alma-animated] .alma-shadow      { animation: alma-shadow 4.2s ease-in-out infinite; }
  [data-alma-animated] .alma-eyelid-l    { animation: alma-blink-l 5.3s ease-in-out infinite; }
  [data-alma-animated] .alma-eyelid-r    { animation: alma-blink-r 5.3s ease-in-out infinite; }
  [data-alma-animated] .alma-ear-l       { animation: alma-ear-idle-l 6.5s ease-in-out infinite; }
  [data-alma-animated] .alma-ear-r       { animation: alma-ear-idle-r 6.5s ease-in-out infinite; }
  [data-alma-animated] .alma-tail-base   { animation: alma-tail-slow 3.4s ease-in-out infinite; }
  [data-alma-animated] .alma-aura-ray    { animation: alma-ray 5s ease-in-out infinite; }

  [data-alma-animated][data-mood="gentle"]    .alma-body-breath { animation-duration: 6.5s; }
  [data-alma-animated][data-mood="gentle"]    .alma-head-sway   { animation-duration: 7.5s; }

  [data-alma-animated][data-mood="attentive"] .alma-head-mood   { animation: alma-tilt 2.4s ease-in-out infinite; }
  [data-alma-animated][data-mood="attentive"] .alma-ear-l       { animation: alma-ear-perk-l 2.4s ease-in-out infinite; }
  [data-alma-animated][data-mood="attentive"] .alma-ear-r       { animation: alma-ear-perk-r 2.4s ease-in-out infinite; }
  [data-alma-animated][data-mood="attentive"] .alma-tail-mood   { animation: alma-tail-wag 0.7s ease-in-out infinite; }

  [data-alma-animated][data-mood="thinking"]  .alma-head-mood   { animation: alma-tilt-slow 3.2s ease-in-out infinite; }
  [data-alma-animated][data-mood="thinking"]  .alma-eyes        { animation: alma-eyes-scan 3.2s ease-in-out infinite; }

  [data-alma-animated][data-mood="happy"]     .alma-body-mood   { animation: alma-bounce 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) infinite; }
  [data-alma-animated][data-mood="happy"]     .alma-head-mood   { animation: alma-head-happy 0.55s ease-out infinite; }
  [data-alma-animated][data-mood="happy"]     .alma-tail-mood   { animation: alma-tail-wag 0.32s ease-in-out infinite; }
  [data-alma-animated][data-mood="happy"]     .alma-tongue      { animation: alma-tongue 1.1s ease-in-out infinite; }

  [data-alma-animated][data-mood="playful"]   .alma-body-mood   { animation: alma-wiggle 0.7s ease-in-out infinite; }
  [data-alma-animated][data-mood="playful"]   .alma-tail-mood   { animation: alma-tail-wag 0.3s ease-in-out infinite; }
  [data-alma-animated][data-mood="playful"]   .alma-head-mood   { animation: alma-head-happy 0.95s ease-in-out infinite; }
  [data-alma-animated][data-mood="playful"]   .alma-tongue      { animation: alma-tongue 0.95s ease-in-out infinite; }

  [data-alma-animated][data-mood="sleepy"]    .alma-body-breath { animation-duration: 7.5s; }
  [data-alma-animated][data-mood="sleepy"]    .alma-eyelid      { transform: scaleY(0.7); animation: none; }
  [data-alma-animated][data-mood="sleepy"]                      { opacity: 0.88; }

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
@keyframes alma-blink-l    { 0%,91%,100% { transform: scaleY(0); } 93%,94.5% { transform: scaleY(1); } }
@keyframes alma-blink-r    { 0%,91.5%,100% { transform: scaleY(0); } 93.5%,95% { transform: scaleY(1); } }
@keyframes alma-eyes-scan  { 0%,100% { transform: translateX(-0.8px); } 50% { transform: translateX(0.8px); } }
@keyframes alma-tongue     { 0% { transform: scaleY(0); opacity: 0; } 40%,70% { transform: scaleY(1); opacity: 1; } 100% { transform: scaleY(0); opacity: 0; } }
@keyframes alma-ray        { 0%,100% { transform: scale(1); opacity: 0.55; } 50% { transform: scale(1.08); opacity: 0.9; } }
`;

/* ------------------------------------------------------------------ */
/* Helpers de dessin                                                   */
/* ------------------------------------------------------------------ */

/** Bouclette : petit cercle blanc contouré crème, effet powderpuff. */
function Curl({ x, y, r, opacity = 1 }: { x: number; y: number; r: number; opacity?: number }) {
  return (
    <circle cx={x} cy={y} r={r} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} opacity={opacity} />
  );
}

/** Chapelet de bouclettes le long d'un arc d'ellipse (silhouette festonnée). */
function ellipseCurls(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count: number,
  r: number,
  startDeg = -90,
  spanDeg = 360,
): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  const start = (startDeg * Math.PI) / 180;
  const span = (spanDeg * Math.PI) / 180;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const a = start + span * t;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, r]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Bloc visage réutilisable — yeux, truffe, bouche, langue.            */
/* ------------------------------------------------------------------ */
type FaceProps = {
  cx: number;
  cy: number;
  eyeDx: number;
  eyeRx: number;
  eyeRy: number;
  eyeY: number;
  noseCy: number;
  noseRx: number;
  noseRy: number;
  mouthY: number;
  mouthSpread: number;
};

function AlmaFace(f: FaceProps) {
  return (
    <>
      {/* Joues rosées */}
      <circle cx={f.cx - f.eyeDx - 2.5} cy={f.eyeY + 5} r={2.6} fill={CHEEK} />
      <circle cx={f.cx + f.eyeDx + 2.5} cy={f.eyeY + 5} r={2.6} fill={CHEEK} />

      {/* Yeux ronds noirs */}
      <g className="alma-part alma-eyes">
        <ellipse cx={f.cx - f.eyeDx} cy={f.eyeY} rx={f.eyeRx} ry={f.eyeRy} fill={EYE} />
        <ellipse cx={f.cx + f.eyeDx} cy={f.eyeY} rx={f.eyeRx} ry={f.eyeRy} fill={EYE} />
        <circle cx={f.cx - f.eyeDx + f.eyeRx * 0.35} cy={f.eyeY - f.eyeRy * 0.4} r={f.eyeRx * 0.32} fill={EYE_HI} />
        <circle cx={f.cx + f.eyeDx + f.eyeRx * 0.35} cy={f.eyeY - f.eyeRy * 0.4} r={f.eyeRx * 0.32} fill={EYE_HI} />
      </g>

      {/* Paupières */}
      <rect
        className="alma-part alma-eyelid alma-eyelid-l"
        x={f.cx - f.eyeDx - f.eyeRx - 0.4}
        y={f.eyeY - f.eyeRy - 0.4}
        width={f.eyeRx * 2 + 0.8}
        height={f.eyeRy * 2 + 0.8}
        rx={f.eyeRx}
        fill={FUR_LINE}
      />
      <rect
        className="alma-part alma-eyelid alma-eyelid-r"
        x={f.cx + f.eyeDx - f.eyeRx - 0.4}
        y={f.eyeY - f.eyeRy - 0.4}
        width={f.eyeRx * 2 + 0.8}
        height={f.eyeRy * 2 + 0.8}
        rx={f.eyeRx}
        fill={FUR_LINE}
      />

      {/* Truffe en bouton */}
      <ellipse cx={f.cx} cy={f.noseCy} rx={f.noseRx} ry={f.noseRy} fill={NOSE} />
      <ellipse cx={f.cx - f.noseRx * 0.35} cy={f.noseCy - f.noseRy * 0.4} rx={f.noseRx * 0.35} ry={f.noseRy * 0.3} fill="#FFFFFF" opacity={0.55} />

      {/* Petit sillon + bouche discrète */}
      <path
        d={`M${f.cx} ${f.noseCy + f.noseRy} L${f.cx} ${f.mouthY - 0.4}`}
        stroke={MOUTH}
        strokeWidth={0.9}
        strokeLinecap="round"
      />
      <path
        d={`M${f.cx - f.mouthSpread} ${f.mouthY} q${f.mouthSpread * 0.55} ${f.mouthSpread * 0.6} ${f.mouthSpread} ${f.mouthSpread * 0.6} q${f.mouthSpread * 0.45} 0 ${f.mouthSpread} -${f.mouthSpread * 0.6}`}
        fill="none"
        stroke={MOUTH}
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Langue (visible via animation happy/playful) */}
      <g className="alma-part alma-tongue">
        <ellipse cx={f.cx} cy={f.mouthY + 2} rx={1.8} ry={1.5} fill="#F2A6AD" />
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Oreilles tombantes, frisées, contour crème — dimension paramétrable */
/* ------------------------------------------------------------------ */
function DroopyEar({
  side,
  cx,
  cy,
  rx,
  ry,
}: {
  side: "l" | "r";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}) {
  const inward = side === "l" ? -1 : 1;
  return (
    <g className={side === "l" ? "alma-part alma-ear-l" : "alma-part alma-ear-r"}>
      {/* Base crème (juste teintée) sous les bouclettes */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={EAR} stroke={FUR_LINE} strokeWidth={0.5} />
      {/* Bouclettes qui débordent pour l'effet frisé */}
      <Curl x={cx + inward * rx * 0.2} y={cy - ry * 0.6} r={rx * 0.55} />
      <Curl x={cx - inward * rx * 0.3} y={cy - ry * 0.3} r={rx * 0.6} />
      <Curl x={cx + inward * rx * 0.35} y={cy + ry * 0.1} r={rx * 0.55} />
      <Curl x={cx - inward * rx * 0.15} y={cy + ry * 0.4} r={rx * 0.55} />
      <Curl x={cx + inward * rx * 0.2} y={cy + ry * 0.7} r={rx * 0.5} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* SILHOUETTES PAR STADE                                               */
/* Chaque fonction renvoie le contenu du SVG (viewBox 0 0 100 100)     */
/* prêt à s'inscrire dans le <span> data-alma-animated.                */
/* ------------------------------------------------------------------ */

/** Chiot bichon assis, tête proéminente, sans queue ni accessoire. */
function PuppySilhouette() {
  const headCx = 50, headCy = 42, headRx = 26, headRy = 24;
  const face: FaceProps = {
    cx: headCx, cy: headCy,
    eyeDx: 8.5, eyeRx: 4.8, eyeRy: 5.2, eyeY: 44,
    noseCy: 55, noseRx: 3, noseRy: 2.4,
    mouthY: 60, mouthSpread: 5,
  };
  const headCurls = ellipseCurls(headCx, headCy, headRx + 0.5, headRy + 0.5, 16, 5);
  return (
    <>
      {/* Ombre au sol */}
      <ellipse className="alma-part alma-shadow" cx="50" cy="96" rx="22" ry="2.6" fill={SHADOW} />

      {/* Corps assis (arrière-plan) */}
      <g className="alma-part alma-body-breath">
        <g className="alma-part alma-body-mood">
          {/* Silhouette assise : ovale un peu conique vers le bas */}
          <ellipse cx="50" cy="82" rx="19" ry="13" fill={FUR} stroke={FUR_LINE} strokeWidth={0.5} />
          {/* Bouclettes contour corps */}
          {ellipseCurls(50, 82, 19, 13, 10, 4.2, 200, 140).map(([x, y, r], i) => (
            <Curl key={`b${i}`} x={x} y={y} r={r} />
          ))}
          {/* Deux petites pattes avant repliées */}
          <ellipse cx={44} cy={93} rx={4.2} ry={3} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <ellipse cx={56} cy={93} rx={4.2} ry={3} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          {/* Petits coussinets à peine suggérés */}
          <ellipse cx={44} cy={94.2} rx={1.8} ry={0.9} fill={FUR_SHADOW} />
          <ellipse cx={56} cy={94.2} rx={1.8} ry={0.9} fill={FUR_SHADOW} />
        </g>
      </g>

      {/* Oreilles courtes (chiot) */}
      <DroopyEar side="r" cx={headCx - 22} cy={48} rx={7} ry={11} />
      <DroopyEar side="l" cx={headCx + 22} cy={48} rx={7} ry={11} />

      {/* Tête ronde bien distincte */}
      <g className="alma-part alma-head-sway">
        <g className="alma-part alma-head-mood">
          <ellipse cx={headCx} cy={headCy} rx={headRx} ry={headRy} fill={FUR} stroke={FUR_LINE} strokeWidth={0.5} />
          {headCurls.map(([x, y, r], i) => (
            <Curl key={`h${i}`} x={x} y={y} r={r} />
          ))}
          {/* Toupet frontal */}
          <Curl x={headCx - 3.5} y={headCy - headRy * 0.7} r={3.4} />
          <Curl x={headCx + 3.5} y={headCy - headRy * 0.7} r={3.4} />
          <Curl x={headCx} y={headCy - headRy * 0.85} r={3.6} />
          {/* Museau */}
          <ellipse cx={headCx} cy={57} rx={10} ry={8} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <AlmaFace {...face} />
        </g>
      </g>
    </>
  );
}

/** Jeune bichon debout sur 4 pattes, foulard bleu ciel. */
function YoungSilhouette() {
  const headCx = 50, headCy = 34, headRx = 20, headRy = 19;
  const face: FaceProps = {
    cx: headCx, cy: headCy,
    eyeDx: 6.5, eyeRx: 3.5, eyeRy: 3.9, eyeY: 35,
    noseCy: 43, noseRx: 2.4, noseRy: 1.9,
    mouthY: 47, mouthSpread: 4,
  };
  const bodyCx = 50, bodyCy = 68, bodyRx = 30, bodyRy = 12;
  const headCurls = ellipseCurls(headCx, headCy, headRx + 0.5, headRy + 0.5, 14, 4.4);
  return (
    <>
      <ellipse className="alma-part alma-shadow" cx="50" cy="96" rx="30" ry="2.6" fill={SHADOW} />

      <g className="alma-part alma-body-breath">
        <g className="alma-part alma-body-mood">
          {/* Queue dressée (petite) */}
          <g className="alma-part alma-tail-base" style={{ transformOrigin: "78px 62px" }}>
            <g className="alma-part alma-tail-mood">
              <ellipse cx={82} cy={57} rx={3.5} ry={5.5} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
              <Curl x={80} y={55} r={2.4} />
              <Curl x={83} y={53} r={2.4} />
              <Curl x={84} y={58} r={2.2} />
            </g>
          </g>

          {/* 4 pattes */}
          <rect x={30} y={78} width={5} height={14} rx={2.2} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <rect x={42} y={78} width={5} height={14} rx={2.2} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <rect x={55} y={78} width={5} height={14} rx={2.2} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <rect x={67} y={78} width={5} height={14} rx={2.2} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          {/* Pattes : petites bouclettes en haut */}
          <Curl x={32.5} y={78} r={3} />
          <Curl x={44.5} y={78} r={3} />
          <Curl x={57.5} y={78} r={3} />
          <Curl x={69.5} y={78} r={3} />

          {/* Corps horizontal */}
          <ellipse cx={bodyCx} cy={bodyCy} rx={bodyRx} ry={bodyRy} fill={FUR} stroke={FUR_LINE} strokeWidth={0.5} />
          {ellipseCurls(bodyCx, bodyCy, bodyRx, bodyRy, 14, 4.2).map(([x, y, r], i) => (
            <Curl key={`b${i}`} x={x} y={y} r={r} />
          ))}
        </g>
      </g>

      {/* Foulard bleu ciel avec petite médaille */}
      <g aria-hidden>
        <path
          d="M32 56 q18 8 36 0 l-3 6 q-15 5 -30 0 z"
          fill={SKY}
        />
        <circle cx={50} cy={64} r={2} fill={GOLD} stroke={GOLD_DARK} strokeWidth={0.4} />
      </g>

      {/* Oreilles plus longues */}
      <DroopyEar side="r" cx={headCx - 17} cy={38} rx={7} ry={14} />
      <DroopyEar side="l" cx={headCx + 17} cy={38} rx={7} ry={14} />

      {/* Tête */}
      <g className="alma-part alma-head-sway">
        <g className="alma-part alma-head-mood">
          <ellipse cx={headCx} cy={headCy} rx={headRx} ry={headRy} fill={FUR} stroke={FUR_LINE} strokeWidth={0.5} />
          {headCurls.map(([x, y, r], i) => (
            <Curl key={`h${i}`} x={x} y={y} r={r} />
          ))}
          <Curl x={headCx - 3} y={headCy - headRy * 0.75} r={3} />
          <Curl x={headCx + 3} y={headCy - headRy * 0.75} r={3} />
          <Curl x={headCx} y={headCy - headRy * 0.9} r={3.2} />
          <ellipse cx={headCx} cy={45} rx={8} ry={6.5} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <AlmaFace {...face} />
        </g>
      </g>
    </>
  );
}

/** Bichon adulte, poitrail fourni, queue en panache, bandana vert. */
function AdultSilhouette({ withAccessories = true }: { withAccessories?: boolean }) {
  const headCx = 50, headCy = 32, headRx = 22, headRy = 21;
  const face: FaceProps = {
    cx: headCx, cy: headCy,
    eyeDx: 7, eyeRx: 3.6, eyeRy: 4, eyeY: 33,
    noseCy: 42, noseRx: 2.5, noseRy: 2,
    mouthY: 46, mouthSpread: 4.2,
  };
  const bodyCx = 50, bodyCy = 68, bodyRx = 32, bodyRy = 14;
  const headCurls = ellipseCurls(headCx, headCy, headRx + 0.6, headRy + 0.6, 16, 4.8);
  return (
    <>
      <ellipse className="alma-part alma-shadow" cx="50" cy="96" rx="33" ry="2.8" fill={SHADOW} />

      <g className="alma-part alma-body-breath">
        <g className="alma-part alma-body-mood">
          {/* Queue en panache dressée et recourbée (arrière droit) */}
          <g className="alma-part alma-tail-base" style={{ transformOrigin: "82px 58px" }}>
            <g className="alma-part alma-tail-mood">
              <ellipse cx={85} cy={52} rx={5.5} ry={8} fill={FUR} stroke={FUR_LINE} strokeWidth={0.5} />
              <Curl x={82} y={48} r={3.4} />
              <Curl x={87} y={46} r={3.2} />
              <Curl x={89} y={52} r={3.2} />
              <Curl x={86} y={57} r={3} />
              <Curl x={82} y={54} r={3} />
            </g>
          </g>

          {/* 4 pattes */}
          <rect x={28} y={78} width={6} height={14} rx={2.6} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <rect x={42} y={78} width={6} height={14} rx={2.6} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <rect x={56} y={78} width={6} height={14} rx={2.6} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <rect x={70} y={78} width={6} height={14} rx={2.6} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <Curl x={31} y={78} r={3.4} />
          <Curl x={45} y={78} r={3.4} />
          <Curl x={59} y={78} r={3.4} />
          <Curl x={73} y={78} r={3.4} />

          {/* Corps */}
          <ellipse cx={bodyCx} cy={bodyCy} rx={bodyRx} ry={bodyRy} fill={FUR} stroke={FUR_LINE} strokeWidth={0.5} />
          {ellipseCurls(bodyCx, bodyCy, bodyRx, bodyRy, 16, 4.8).map(([x, y, r], i) => (
            <Curl key={`b${i}`} x={x} y={y} r={r} />
          ))}
          {/* Grosse touffe poitrail */}
          <Curl x={38} y={62} r={5} />
          <Curl x={44} y={64} r={5.4} />
          <Curl x={50} y={62} r={5.6} />
          <Curl x={56} y={64} r={5.4} />
          <Curl x={62} y={62} r={5} />
        </g>
      </g>

      {/* Bandana vert avec médaille dorée */}
      {withAccessories && (
        <g aria-hidden>
          <path
            d="M28 54 q22 10 44 0 l-4 8 q-18 6 -36 0 z"
            fill={GREEN}
          />
          <path d="M45 60 l5 10 l5 -10 z" fill={GREEN} />
          <circle cx={50} cy={65} r={2.8} fill={GOLD} stroke={GOLD_DARK} strokeWidth={0.5} />
          <circle cx={50} cy={65} r={1} fill={GOLD_DARK} opacity={0.7} />
        </g>
      )}

      <DroopyEar side="r" cx={headCx - 19} cy={36} rx={8} ry={16} />
      <DroopyEar side="l" cx={headCx + 19} cy={36} rx={8} ry={16} />

      <g className="alma-part alma-head-sway">
        <g className="alma-part alma-head-mood">
          <ellipse cx={headCx} cy={headCy} rx={headRx} ry={headRy} fill={FUR} stroke={FUR_LINE} strokeWidth={0.5} />
          {headCurls.map(([x, y, r], i) => (
            <Curl key={`h${i}`} x={x} y={y} r={r} />
          ))}
          <Curl x={headCx - 4} y={headCy - headRy * 0.75} r={3.4} />
          <Curl x={headCx + 4} y={headCy - headRy * 0.75} r={3.4} />
          <Curl x={headCx} y={headCy - headRy * 0.9} r={3.6} />
          <ellipse cx={headCx} cy={44} rx={9} ry={7} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <AlmaFace {...face} />
        </g>
      </g>
    </>
  );
}

/** Forme finale imposante, crinière fournie, couronne dorée. */
function ElderSilhouette() {
  const headCx = 50, headCy = 30, headRx = 25, headRy = 23;
  const face: FaceProps = {
    cx: headCx, cy: headCy,
    eyeDx: 7.5, eyeRx: 3.6, eyeRy: 4, eyeY: 31,
    noseCy: 40, noseRx: 2.5, noseRy: 2,
    mouthY: 44, mouthSpread: 4.5,
  };
  const bodyCx = 50, bodyCy = 66, bodyRx = 36, bodyRy = 17;
  const headCurls = ellipseCurls(headCx, headCy, headRx + 0.6, headRy + 0.6, 20, 5.6);
  // Crinière : couronne de bouclettes autour du crâne, plus généreuse
  const mane = ellipseCurls(headCx, headCy + 4, headRx + 4, headRy + 3, 14, 5, 30, 300);
  return (
    <>
      {/* Rayons dorés (aura visible même sans showHalo, discrets) */}
      <g aria-hidden opacity={0.55}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <g key={deg} className="alma-part alma-aura-ray" style={{ transformOrigin: "50px 50px", transform: `rotate(${deg}deg)` }}>
            <rect x={49.2} y={2} width={1.6} height={6} rx={0.8} fill={GOLD} />
          </g>
        ))}
      </g>

      <ellipse className="alma-part alma-shadow" cx="50" cy="96" rx="37" ry="3" fill={SHADOW} />

      <g className="alma-part alma-body-breath">
        <g className="alma-part alma-body-mood">
          {/* Grande queue en panache portée haut */}
          <g className="alma-part alma-tail-base" style={{ transformOrigin: "84px 56px" }}>
            <g className="alma-part alma-tail-mood">
              <ellipse cx={88} cy={48} rx={7} ry={10} fill={FUR} stroke={FUR_LINE} strokeWidth={0.5} />
              <Curl x={84} y={44} r={4} />
              <Curl x={90} y={41} r={3.8} />
              <Curl x={93} y={48} r={3.8} />
              <Curl x={90} y={54} r={3.6} />
              <Curl x={85} y={52} r={3.6} />
              <Curl x={88} y={38} r={3.4} />
            </g>
          </g>

          {/* Pattes plus fortes */}
          <rect x={24} y={78} width={7} height={14} rx={3} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <rect x={40} y={78} width={7} height={14} rx={3} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <rect x={55} y={78} width={7} height={14} rx={3} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <rect x={70} y={78} width={7} height={14} rx={3} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <Curl x={27.5} y={78} r={4} />
          <Curl x={43.5} y={78} r={4} />
          <Curl x={58.5} y={78} r={4} />
          <Curl x={73.5} y={78} r={4} />

          {/* Corps très volumineux */}
          <ellipse cx={bodyCx} cy={bodyCy} rx={bodyRx} ry={bodyRy} fill={FUR} stroke={FUR_LINE} strokeWidth={0.5} />
          {ellipseCurls(bodyCx, bodyCy, bodyRx, bodyRy, 22, 5.6).map(([x, y, r], i) => (
            <Curl key={`b${i}`} x={x} y={y} r={r} />
          ))}
          {/* Poitrail luxuriant */}
          <Curl x={34} y={60} r={5.4} />
          <Curl x={41} y={62} r={6} />
          <Curl x={50} y={60} r={6.4} />
          <Curl x={59} y={62} r={6} />
          <Curl x={66} y={60} r={5.4} />
        </g>
      </g>

      <DroopyEar side="r" cx={headCx - 21} cy={34} rx={9} ry={18} />
      <DroopyEar side="l" cx={headCx + 21} cy={34} rx={9} ry={18} />

      <g className="alma-part alma-head-sway">
        <g className="alma-part alma-head-mood">
          {/* Crinière (couronne de bouclettes) */}
          {mane.map(([x, y, r], i) => (
            <Curl key={`m${i}`} x={x} y={y} r={r} />
          ))}
          <ellipse cx={headCx} cy={headCy} rx={headRx} ry={headRy} fill={FUR} stroke={FUR_LINE} strokeWidth={0.5} />
          {headCurls.map(([x, y, r], i) => (
            <Curl key={`h${i}`} x={x} y={y} r={r} />
          ))}
          <Curl x={headCx - 5} y={headCy - headRy * 0.7} r={4} />
          <Curl x={headCx + 5} y={headCy - headRy * 0.7} r={4} />
          <Curl x={headCx} y={headCy - headRy * 0.85} r={4.2} />

          {/* Couronne dorée */}
          <g aria-hidden>
            <path
              d="M36 12 L42 3 L46 10 L50 1 L54 10 L58 3 L64 12 L62 16 L38 16 Z"
              fill={GOLD}
              stroke={GOLD_DARK}
              strokeWidth={0.6}
              strokeLinejoin="round"
            />
            <circle cx={42} cy={4} r={1.4} fill={GOLD} stroke={GOLD_DARK} strokeWidth={0.4} />
            <circle cx={50} cy={2} r={1.4} fill={GOLD} stroke={GOLD_DARK} strokeWidth={0.4} />
            <circle cx={58} cy={4} r={1.4} fill={GOLD} stroke={GOLD_DARK} strokeWidth={0.4} />
            <rect x={38} y={14.5} width={24} height={1.6} fill={GOLD_DARK} opacity={0.7} />
          </g>

          <ellipse cx={headCx} cy={42} rx={10} ry={7.5} fill={FUR} stroke={FUR_LINE} strokeWidth={0.4} />
          <AlmaFace {...face} />
        </g>
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sélecteur de silhouette                                             */
/* ------------------------------------------------------------------ */
function renderStage(stage?: AlmaStage): ReactNode {
  switch (stage) {
    case "nouvelle":
      return <PuppySilhouette />;
    case "eveillee":
      return <YoungSilhouette />;
    case "complice":
      return <AdultSilhouette withAccessories />;
    case "fidele":
      return <ElderSilhouette />;
    default:
      // Silhouette adulte neutre pour tous les points d'appel sans stade.
      return <AdultSilhouette withAccessories={false} />;
  }
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
  // useId conservé pour compat future (gradients, clipPaths…).
  useId();

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
        {showHalo && stage && (
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full blur-xl motion-safe:animate-alma-aura",
              STAGE_HALO_CLASS[stage],
            )}
          />
        )}
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

  return (
    <span
      data-alma-animated=""
      data-mood={mood}
      data-stage={stage}
      aria-label={ariaHidden ? undefined : "Alma"}
      role={ariaHidden ? undefined : "img"}
      aria-hidden={ariaHidden}
      className={cn("select-none", className)}
      style={style}
    >
      {showHalo && stage && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full blur-xl motion-safe:animate-alma-aura",
            STAGE_HALO_CLASS[stage],
          )}
        />
      )}

      <style>{STYLE}</style>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
      >
        {renderStage(stage)}
      </svg>
    </span>
  );
}

export default AlmaAvatarAnimated;
