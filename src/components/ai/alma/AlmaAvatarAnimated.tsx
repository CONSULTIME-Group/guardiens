/**
 * <AlmaAvatarAnimated /> — Alma, bichon frisé vivant.
 *
 * Itération 3 : priorité absolue au vivant. Alma respire, cligne des yeux et
 * balance micro-la tête EN PERMANENCE, quelle que soit l'humeur. Les moods
 * viennent se superposer par-dessus cette base (nested groups → animations
 * qui s'additionnent sans se cannibaliser).
 *
 * Architecture SVG (100x100) :
 *  .alma-shadow                  ombre de contact au sol
 *  .alma-body-breath > .alma-body-mood   corps : respiration + rebond/wiggle
 *    .alma-tail-base > .alma-tail-mood   queue : oscillation lente + wag
 *  .alma-ear-l / .alma-ear-r     oreilles indépendantes
 *  .alma-head-sway > .alma-head-mood     tête : micro-bob + tilt d'humeur
 *    .alma-eyes                  yeux (scan en thinking)
 *    .alma-eyelid                paupières (clignement + sleepy)
 *    .alma-tongue                langue (happy / playful)
 *
 * Toutes les animations sous @media (prefers-reduced-motion: no-preference).
 */
import { CSSProperties, useId } from "react";
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
 * Mapping stade → asset dédié.
 * EMPLACEMENT POUR LES ILLUSTRATIONS DÉDIÉES, À FOURNIR.
 * Tant qu'une entrée vaut `null`, on tombe sur le rendu SVG animé actuel,
 * différencié visuellement par le halo et l'intensité d'animation liés au stade.
 * Pour brancher une illustration : importer l'asset, remplacer `null` par le
 * `src`, l'avatar affichera automatiquement l'image (le SVG reste le fallback).
 */
export const ALMA_STAGE_ASSETS: Record<AlmaStage, string | null> = {
  nouvelle: null,
  eveillee: null,
  complice: null,
  fidele: null,
};

/**
 * Facteur de croissance d'Alma par stade — réutilisable partout où l'avatar
 * est affiché. Alma est un petit chien qui grandit avec l'utilisateur.
 * Multiplier une taille de base par ce facteur donne la taille effective.
 */
export const ALMA_STAGE_SCALE: Record<AlmaStage, number> = {
  // Croissance volontairement modérée : la distinction principale entre
  // stades vient des accessoires (collier, bandana, couronne) et des effets
  // (aura, liseré), pas du volume.
  nouvelle: 1,
  eveillee: 1.08,
  complice: 1.18,
  fidele: 1.3,
};

/** Halo lumineux plus marqué au fil des stades. */
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

/** Épaisseur du liseré — s'épaissit avec le stade pour une présence croissante. */
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
  /**
   * Stade d'évolution utilisateur : influence l'aura, le liseré et
   * l'intensité d'animation. Optionnel (rétro-compat).
   */
  stage?: AlmaStage;
  /** Affiche un halo coloré derrière l'avatar (utile en grand format). */
  showHalo?: boolean;
}


const STYLE = `
[data-alma-animated] {
  --alma-fur-hi: #ffffff;
  --alma-fur: #f7f1e6;
  --alma-fur-shadow: #e6dcc8;
  --alma-fur-deep: #cfc2a6;
  --alma-nose: #1a130f;
  --alma-eye: #241812;
  --alma-eye-hi: #ffffff;
  --alma-mouth: #3d1a14;
  --alma-tongue: #f2a6ad;
  --alma-cheek: hsla(var(--primary), 0.16);
  --alma-shadow: rgba(20, 15, 10, 0.22);
}
[data-alma-animated] .alma-part { transform-box: fill-box; transform-origin: center; }
[data-alma-animated] .alma-head-sway  { transform-origin: 50% 78%; }
[data-alma-animated] .alma-head-mood  { transform-origin: 50% 78%; }
[data-alma-animated] .alma-body-breath{ transform-origin: 50% 92%; }
[data-alma-animated] .alma-body-mood  { transform-origin: 50% 92%; }
[data-alma-animated] .alma-ear-l      { transform-origin: 50% 10%; }
[data-alma-animated] .alma-ear-r      { transform-origin: 50% 10%; }
[data-alma-animated] .alma-tail-base  { transform-origin: 90% 90%; }
[data-alma-animated] .alma-tail-mood  { transform-origin: 90% 90%; }
[data-alma-animated] .alma-eyes       { transform-origin: 50% 50%; }
[data-alma-animated] .alma-eyelid     { transform-origin: 50% 0%; transform: scaleY(0); }
[data-alma-animated] .alma-tongue     { transform-origin: 50% 0%; transform: scaleY(0); opacity: 0; }
[data-alma-animated] .alma-shadow     { transform-origin: 50% 50%; }


@media (prefers-reduced-motion: no-preference) {
  /* ======== BASE (toujours actif, toutes humeurs) ======== */
  [data-alma-animated] .alma-body-breath {
    animation: alma-breathe 4.2s ease-in-out infinite;
  }
  [data-alma-animated] .alma-head-sway {
    animation: alma-head-sway 5.5s ease-in-out infinite;
  }
  [data-alma-animated] .alma-shadow {
    animation: alma-shadow 4.2s ease-in-out infinite;
  }
  /* Clignement naturel espacé et irrégulier (double blink ~ toutes les 5s) */
  [data-alma-animated] .alma-eyelid-l {
    animation: alma-blink-l 5.3s ease-in-out infinite;
  }
  [data-alma-animated] .alma-eyelid-r {
    animation: alma-blink-r 5.3s ease-in-out infinite;
  }
  [data-alma-animated] .alma-ear-l {
    animation: alma-ear-idle-l 6.5s ease-in-out infinite;
  }
  [data-alma-animated] .alma-ear-r {
    animation: alma-ear-idle-r 6.5s ease-in-out infinite;
  }
  [data-alma-animated] .alma-tail-base {
    animation: alma-tail-slow 3.4s ease-in-out infinite;
  }

  /* ======== MOODS (s'ajoutent au-dessus de la base) ======== */
  [data-alma-animated][data-mood="gentle"]  .alma-body-breath { animation-duration: 6.5s; }
  [data-alma-animated][data-mood="gentle"]  .alma-head-sway   { animation-duration: 7.5s; }

  [data-alma-animated][data-mood="attentive"] .alma-head-mood  {
    animation: alma-tilt 2.4s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="attentive"] .alma-ear-l      {
    animation: alma-ear-perk-l 2.4s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="attentive"] .alma-ear-r      {
    animation: alma-ear-perk-r 2.4s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="attentive"] .alma-tail-mood  {
    animation: alma-tail-wag 0.7s ease-in-out infinite;
  }

  [data-alma-animated][data-mood="thinking"] .alma-head-mood {
    animation: alma-tilt-slow 3.2s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="thinking"] .alma-eyes {
    animation: alma-eyes-scan 3.2s ease-in-out infinite;
  }

  [data-alma-animated][data-mood="happy"] .alma-body-mood {
    animation: alma-bounce 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
  }
  [data-alma-animated][data-mood="happy"] .alma-head-mood {
    animation: alma-head-happy 0.55s ease-out infinite;
  }
  [data-alma-animated][data-mood="happy"] .alma-tail-mood {
    animation: alma-tail-wag 0.32s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="happy"] .alma-tongue {
    animation: alma-tongue 1.1s ease-in-out infinite;
  }

  [data-alma-animated][data-mood="playful"] .alma-body-mood {
    animation: alma-wiggle 0.7s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="playful"] .alma-tail-mood {
    animation: alma-tail-wag 0.3s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="playful"] .alma-head-mood {
    animation: alma-head-happy 0.95s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="playful"] .alma-tongue {
    animation: alma-tongue 0.95s ease-in-out infinite;
  }

  [data-alma-animated][data-mood="sleepy"] .alma-body-breath { animation-duration: 7.5s; }
  [data-alma-animated][data-mood="sleepy"] .alma-eyelid     { transform: scaleY(0.7); animation: none; }
  [data-alma-animated][data-mood="sleepy"]                  { opacity: 0.88; }

  /* ======== STADES (intensité progressive : plus le stade est avancé,
     plus la respiration et la queue sont vives, plus le sourire est marqué) ======== */
  [data-alma-animated][data-stage="nouvelle"] .alma-body-breath { animation-duration: 5.2s; }
  [data-alma-animated][data-stage="nouvelle"] .alma-tail-base   { animation-duration: 4.2s; }

  [data-alma-animated][data-stage="eveillee"] .alma-body-breath { animation-duration: 4.2s; }
  [data-alma-animated][data-stage="eveillee"] .alma-tail-base   { animation-duration: 3.4s; }

  [data-alma-animated][data-stage="complice"] .alma-body-breath { animation-duration: 3.4s; }
  [data-alma-animated][data-stage="complice"] .alma-tail-base   { animation-duration: 2.6s; }
  [data-alma-animated][data-stage="complice"] .alma-tail-mood   {
    animation: alma-tail-wag 1.4s ease-in-out infinite;
  }

  [data-alma-animated][data-stage="fidele"]   .alma-body-breath { animation-duration: 2.8s; }
  [data-alma-animated][data-stage="fidele"]   .alma-tail-base   { animation-duration: 2.0s; }
  [data-alma-animated][data-stage="fidele"]   .alma-tail-mood   {
    animation: alma-tail-wag 0.9s ease-in-out infinite;
  }
  [data-alma-animated][data-stage="fidele"]   .alma-ear-l       {
    animation: alma-ear-perk-l 3.2s ease-in-out infinite;
  }
  [data-alma-animated][data-stage="fidele"]   .alma-ear-r       {
    animation: alma-ear-perk-r 3.2s ease-in-out infinite;
  }
}


/* Fallback statique : rien à faire, la pose de repos est déjà lisible */

@keyframes alma-breathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.025, 1.035); }
}
@keyframes alma-shadow {
  0%, 100% { transform: scaleX(1);    opacity: 1; }
  50%      { transform: scaleX(1.06); opacity: 0.82; }
}
@keyframes alma-head-sway {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  40%      { transform: translateY(-0.5px) rotate(1.2deg); }
  70%      { transform: translateY(-0.3px) rotate(-1deg); }
}
@keyframes alma-tilt {
  0%, 100% { transform: rotate(-7deg); }
  50%      { transform: rotate(7deg); }
}
@keyframes alma-tilt-slow {
  0%, 100% { transform: rotate(-5deg); }
  50%      { transform: rotate(5deg); }
}
@keyframes alma-head-happy {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-1.6px) rotate(-3deg); }
}
@keyframes alma-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-2.6px) scale(1.03); }
}
@keyframes alma-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25%      { transform: rotate(-3deg); }
  75%      { transform: rotate(3deg); }
}
@keyframes alma-tail-slow {
  0%, 100% { transform: rotate(-10deg); }
  50%      { transform: rotate(10deg); }
}
@keyframes alma-tail-wag {
  0%, 100% { transform: rotate(-22deg); }
  50%      { transform: rotate(22deg); }
}
@keyframes alma-ear-idle-l {
  0%, 100% { transform: rotate(0deg); }
  50%      { transform: rotate(-2deg); }
}
@keyframes alma-ear-idle-r {
  0%, 100% { transform: rotate(0deg); }
  50%      { transform: rotate(2deg); }
}
@keyframes alma-ear-perk-l {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  50%      { transform: rotate(-8deg) translateY(-1.2px); }
}
@keyframes alma-ear-perk-r {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  50%      { transform: rotate(8deg) translateY(-1.2px); }
}
/* Deux clignements très légèrement décalés → plus naturel */
@keyframes alma-blink-l {
  0%, 91%, 100%    { transform: scaleY(0); }
  93%, 94.5%       { transform: scaleY(1); }
}
@keyframes alma-blink-r {
  0%, 91.5%, 100%  { transform: scaleY(0); }
  93.5%, 95%       { transform: scaleY(1); }
}
@keyframes alma-eyes-scan {
  0%, 100% { transform: translateX(-0.8px); }
  50%      { transform: translateX(0.8px); }
}
@keyframes alma-tongue {
  0%       { transform: scaleY(0); opacity: 0; }
  40%, 70% { transform: scaleY(1); opacity: 1; }
  100%     { transform: scaleY(0); opacity: 0; }
}
`;

/**
 * Petites bouclettes déposées le long d'un contour pour créer l'effet frisé.
 * `positions` = [x, y, r] en unités du viewBox.
 */
function Curls({
  positions,
  fill = "var(--alma-fur)",
  opacity = 1,
}: {
  positions: Array<[number, number, number]>;
  fill?: string;
  opacity?: number;
}) {
  return (
    <>
      {positions.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={fill} opacity={opacity} />
      ))}
    </>
  );
}

/**
 * Génère des bouclettes réparties le long du périmètre d'une ellipse,
 * pour la silhouette festonnée typique du bichon.
 */
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

/**
 * Morphologie par stade. « nouvelle » = chiot (tête plus grosse par
 * rapport au corps, yeux plus grands, corps plus petit et rond). Les
 * stades suivants s'adulisent progressivement.
 */
type Morph = {
  headCx: number; headCy: number; headRx: number; headRy: number;
  eyeY: number; eyeDx: number; eyeRx: number; eyeRy: number;
  muzzleCy: number; muzzleRx: number; muzzleRy: number;
  noseCy: number; noseRx: number; noseRy: number;
  mouthY: number; mouthSpread: number;
  bodyCy: number; bodyRx: number; bodyRy: number;
  earCy: number; earRx: number; earRy: number; earSpread: number;
  neckY: number;
};

function stageMorph(stage?: AlmaStage): Morph {
  switch (stage) {
    case "eveillee":
      return {
        headCx: 50, headCy: 40, headRx: 27, headRy: 25,
        eyeY: 42, eyeDx: 10, eyeRx: 4.0, eyeRy: 4.4,
        muzzleCy: 55, muzzleRx: 12, muzzleRy: 9.5,
        noseCy: 53.5, noseRx: 3.0, noseRy: 2.3,
        mouthY: 59, mouthSpread: 6.5,
        bodyCy: 84, bodyRx: 26, bodyRy: 12,
        earCy: 46, earRx: 9, earRy: 15, earSpread: 24,
        neckY: 68,
      };
    case "complice":
      return {
        headCx: 50, headCy: 39, headRx: 26, headRy: 24,
        eyeY: 41, eyeDx: 10.5, eyeRx: 3.8, eyeRy: 4.2,
        muzzleCy: 54, muzzleRx: 12, muzzleRy: 9.5,
        noseCy: 52.5, noseRx: 2.9, noseRy: 2.2,
        mouthY: 58, mouthSpread: 7,
        bodyCy: 83, bodyRx: 28, bodyRy: 13,
        earCy: 46, earRx: 9, earRy: 16, earSpread: 25,
        neckY: 67,
      };
    case "fidele":
      return {
        headCx: 50, headCy: 38, headRx: 25, headRy: 23,
        eyeY: 40, eyeDx: 11, eyeRx: 3.6, eyeRy: 4.0,
        muzzleCy: 53, muzzleRx: 12, muzzleRy: 9.5,
        noseCy: 51.5, noseRx: 2.8, noseRy: 2.1,
        mouthY: 57, mouthSpread: 7.5,
        bodyCy: 82, bodyRx: 30, bodyRy: 14,
        earCy: 46, earRx: 9, earRy: 17, earSpread: 26,
        neckY: 66,
      };
    default:
      // nouvelle → CHIOT : tête proéminente, yeux immenses, petit corps.
      return {
        headCx: 50, headCy: 43, headRx: 30, headRy: 28,
        eyeY: 45, eyeDx: 9, eyeRx: 5.0, eyeRy: 5.4,
        muzzleCy: 57, muzzleRx: 11, muzzleRy: 8.5,
        noseCy: 55, noseRx: 3.2, noseRy: 2.5,
        mouthY: 61, mouthSpread: 5.5,
        bodyCy: 88, bodyRx: 20, bodyRy: 9,
        earCy: 50, earRx: 8, earRy: 13, earSpread: 22,
        neckY: 72,
      };
  }
}



/**
 * Accessoires portés autour du cou (collier, bandana, écharpe) — insérés
 * ENTRE le corps et la tête pour rester lisibles. Rendu conditionnel par
 * stade. Les couleurs utilisent les teintes de stade déjà définies
 * (sky pour eveillee, primary pour complice, amber pour fidele).
 *
 * `aria-hidden` implicite : ces éléments SVG sont décoratifs, le parent
 * <span> porte déjà `role="img"` / `aria-label="Alma"`.
 */
function StageNeckAccessory({ stage }: { stage?: AlmaStage }) {
  if (!stage || stage === "nouvelle") return null;

  if (stage === "eveillee") {
    // Collier fin bleu ciel avec une petite pastille
    return (
      <g>
        <path
          d="M32 68 q18 8 36 0"
          className="stroke-sky-500"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="50" cy="71.2" r="1.6" className="fill-sky-500" />
      </g>
    );
  }

  if (stage === "complice") {
    // Bandana + petite médaille
    return (
      <g>
        <path
          d="M27 66 q23 10 46 0 l-4 8 q-19 6 -38 0 z"
          className="fill-primary"
        />
        <path d="M46 73 l4 9 l4 -9 z" className="fill-primary" />
        <circle cx="42" cy="70" r="0.9" fill="#ffffff" opacity="0.75" />
        <circle cx="50" cy="72" r="0.9" fill="#ffffff" opacity="0.75" />
        <circle cx="58" cy="70" r="0.9" fill="#ffffff" opacity="0.75" />
        <circle
          cx="50"
          cy="78"
          r="2.4"
          className="fill-primary stroke-primary-foreground"
          strokeWidth="0.6"
        />
      </g>
    );
  }

  // fidele : écharpe ambre nouée
  return (
    <g>
      <path
        d="M26 66 q24 10 48 0 l-3 7 q-21 6 -42 0 z"
        className="fill-amber-500"
      />
      <path d="M45 72 l5 10 l5 -10 z" className="fill-amber-500" />
    </g>
  );
}

/**
 * Accessoires portés sur la tête (étincelle, couronne). Rendus DANS le
 * groupe `alma-head-mood` pour suivre les mouvements de tête.
 */
function StageHeadAccessory({ stage }: { stage?: AlmaStage }) {
  if (!stage || stage === "nouvelle") return null;

  if (stage === "eveillee") {
    // Petite étincelle discrète en haut à droite
    return (
      <path
        d="M80 20 l1 -3 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 z"
        className="fill-sky-500"
      />
    );
  }

  if (stage === "complice") {
    // Étincelle plus marquée + halo joueur
    return (
      <g>
        <circle cx="82" cy="22" r="2.2" className="fill-primary" opacity="0.35" />
        <path
          d="M82 18 l1.2 -3.4 l1.2 3.4 l3.4 1.2 l-3.4 1.2 l-1.2 3.4 l-1.2 -3.4 l-3.4 -1.2 z"
          className="fill-primary"
        />
      </g>
    );
  }

  // fidele : petite couronne posée sur le toupet + étoile flottante
  return (
    <g>
      <path
        d="M34 15 L42 6 L46 12 L50 3 L54 12 L58 6 L66 15 L64 19 L36 19 Z"
        className="fill-amber-500"
      />
      <circle cx="42" cy="7" r="1.3" className="fill-amber-500" />
      <circle cx="50" cy="4" r="1.3" className="fill-amber-500" />
      <circle cx="58" cy="7" r="1.3" className="fill-amber-500" />
      <rect x="36" y="17.5" width="28" height="1.8" className="fill-amber-500" opacity="0.85" />
      <path
        d="M84 22 l1.4 -4 l1.4 4 l4 1.4 l-4 1.4 l-1.4 4 l-1.4 -4 l-4 -1.4 z"
        className="fill-amber-500"
      />
    </g>
  );
}

export function AlmaAvatarAnimated({
  mood = "idle",
  size = 40,
  className,
  stage,
  showHalo = false,
  ...rest
}: Props) {
  const ariaHidden = rest["aria-hidden"];
  const uid = useId().replace(/:/g, "");
  const gHead = `alma-head-${uid}`;
  const gBody = `alma-body-${uid}`;
  const gMuzzle = `alma-muzzle-${uid}`;

  const style: CSSProperties = {
    width: size,
    height: size,
    display: "inline-block",
    position: "relative",
  };

  // Illustration dédiée par stade si fournie (mapping ALMA_STAGE_ASSETS).
  // Tant qu'aucune image n'est branchée, on rend le SVG animé avec les
  // variations stade (aura, liseré, intensité).
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

  // Morphologie du bichon selon le stade (chiot pour « nouvelle »).
  const m = stageMorph(stage);

  // Bouclettes procédurales autour du crâne (silhouette festonnée).
  const headOuter = ellipseCurls(m.headCx, m.headCy, m.headRx + 0.5, m.headRy + 0.5, 18, 5.2);
  const headHi = ellipseCurls(m.headCx, m.headCy - 2, m.headRx * 0.55, m.headRy * 0.5, 8, 2.6);
  // Bouclettes autour du corps
  const bodyOuter = ellipseCurls(m.bodyCy > 85 ? 50 : 50, m.bodyCy, m.bodyRx + 0.5, m.bodyRy + 0.5, 12, 4.6, 200, 140);

  // Positions ancrées à la morphologie
  const earLx = m.headCx + m.earSpread;   // oreille côté droit de l'écran
  const earRx = m.headCx - m.earSpread;   // oreille côté gauche de l'écran
  const tailCx = m.headCx + (m.bodyRx * 0.75); // queue relevée à l'arrière (côté droit)
  const tailCy = m.bodyCy - m.bodyRy * 0.4;

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
        <defs>
          <radialGradient id={gHead} cx="45%" cy="38%" r="65%">
            <stop offset="0%" stopColor="var(--alma-fur-hi)" />
            <stop offset="55%" stopColor="var(--alma-fur)" />
            <stop offset="100%" stopColor="var(--alma-fur-shadow)" />
          </radialGradient>
          <radialGradient id={gBody} cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="var(--alma-fur-hi)" />
            <stop offset="60%" stopColor="var(--alma-fur)" />
            <stop offset="100%" stopColor="var(--alma-fur-shadow)" />
          </radialGradient>
          <radialGradient id={gMuzzle} cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="var(--alma-fur)" />
          </radialGradient>
        </defs>

        {/* Ombre de contact au sol */}
        <ellipse
          className="alma-part alma-shadow"
          cx="50" cy="96" rx={m.bodyRx + 2} ry="2.8"
          fill="var(--alma-shadow)"
        />

        {/* CORPS : respiration (base) + mood (rebond/wiggle) */}
        <g className="alma-part alma-body-breath">
          <g className="alma-part alma-body-mood">
            {/* Queue relevée et frisée (typique bichon) */}
            <g className="alma-part alma-tail-base">
              <g className="alma-part alma-tail-mood">
                <ellipse cx={tailCx} cy={tailCy} rx="5" ry="7" fill="var(--alma-fur)" />
                <Curls
                  positions={[
                    [tailCx - 2, tailCy - 4, 3.2],
                    [tailCx + 2, tailCy - 2, 3.2],
                    [tailCx + 3, tailCy + 2, 3.2],
                    [tailCx - 2, tailCy + 3, 3],
                  ]}
                />
                <ellipse cx={tailCx - 1} cy={tailCy - 1} rx="1.8" ry="2.6" fill="var(--alma-fur-hi)" opacity="0.6" />
              </g>
            </g>

            {/* Silhouette corps arrondie */}
            <ellipse cx="50" cy={m.bodyCy} rx={m.bodyRx} ry={m.bodyRy} fill={`url(#${gBody})`} />
            <Curls positions={bodyOuter} />
            {/* Ombre sous corps */}
            <ellipse cx="50" cy={m.bodyCy + m.bodyRy * 0.55} rx={m.bodyRx * 0.72} ry="2.6" fill="var(--alma-fur-shadow)" opacity="0.4" />
            {/* Poitrail blanc */}
            <ellipse cx="50" cy={m.bodyCy - m.bodyRy * 0.4} rx={m.bodyRx * 0.55} ry={m.bodyRy * 0.6} fill="#ffffff" opacity="0.7" />
            {/* Pattes avant */}
            <ellipse cx={50 - m.bodyRx * 0.28} cy="94.5" rx="4.4" ry="2.8" fill="var(--alma-fur)" />
            <ellipse cx={50 + m.bodyRx * 0.28} cy="94.5" rx="4.4" ry="2.8" fill="var(--alma-fur)" />
            <ellipse cx={50 - m.bodyRx * 0.28} cy="94" rx="2.6" ry="1.3" fill="var(--alma-fur-hi)" opacity="0.7" />
            <ellipse cx={50 + m.bodyRx * 0.28} cy="94" rx="2.6" ry="1.3" fill="var(--alma-fur-hi)" opacity="0.7" />
          </g>
        </g>

        {/* Accessoire de cou */}
        <StageNeckAccessory stage={stage} />

        {/* Oreilles tombantes, frisées, larges (typique bichon) */}
        <g className="alma-part alma-ear-r">
          <ellipse cx={earRx} cy={m.earCy} rx={m.earRx} ry={m.earRy} fill="var(--alma-fur)" />
          <Curls
            positions={[
              [earRx - 2, m.earCy - m.earRy * 0.4, 4],
              [earRx + 1, m.earCy - m.earRy * 0.6, 3.6],
              [earRx - 3, m.earCy, 4],
              [earRx - 1, m.earCy + m.earRy * 0.4, 4],
              [earRx + 2, m.earCy + m.earRy * 0.55, 3.5],
              [earRx - 2, m.earCy + m.earRy * 0.75, 3.2],
            ]}
          />
          <ellipse cx={earRx - 1} cy={m.earCy - m.earRy * 0.3} rx="1.8" ry="3" fill="var(--alma-fur-hi)" opacity="0.55" />
        </g>
        <g className="alma-part alma-ear-l">
          <ellipse cx={earLx} cy={m.earCy} rx={m.earRx} ry={m.earRy} fill="var(--alma-fur)" />
          <Curls
            positions={[
              [earLx + 2, m.earCy - m.earRy * 0.4, 4],
              [earLx - 1, m.earCy - m.earRy * 0.6, 3.6],
              [earLx + 3, m.earCy, 4],
              [earLx + 1, m.earCy + m.earRy * 0.4, 4],
              [earLx - 2, m.earCy + m.earRy * 0.55, 3.5],
              [earLx + 2, m.earCy + m.earRy * 0.75, 3.2],
            ]}
          />
          <ellipse cx={earLx + 1} cy={m.earCy - m.earRy * 0.3} rx="1.8" ry="3" fill="var(--alma-fur-hi)" opacity="0.55" />
        </g>

        {/* TÊTE : sway (base) + mood (tilt) */}
        <g className="alma-part alma-head-sway">
          <g className="alma-part alma-head-mood">
            {/* Crâne rond duveteux */}
            <ellipse cx={m.headCx} cy={m.headCy} rx={m.headRx} ry={m.headRy} fill={`url(#${gHead})`} />
            {/* Silhouette festonnée : bouclettes du pourtour */}
            <Curls positions={headOuter} />
            {/* Highlights (mèches claires) */}
            <Curls positions={headHi} fill="var(--alma-fur-hi)" opacity={0.85} />
            {/* Toupet frisé sur le front */}
            <circle cx={m.headCx - 3} cy={m.headCy - m.headRy * 0.75} r="3.2" fill="#ffffff" opacity="0.95" />
            <circle cx={m.headCx + 3} cy={m.headCy - m.headRy * 0.75} r="3.2" fill="#ffffff" opacity="0.95" />
            <circle cx={m.headCx} cy={m.headCy - m.headRy * 0.85} r="3.4" fill="#ffffff" opacity="0.95" />

            {/* Accessoire de tête */}
            <StageHeadAccessory stage={stage} />

            {/* Museau blanc */}
            <ellipse cx={m.headCx} cy={m.muzzleCy} rx={m.muzzleRx} ry={m.muzzleRy} fill="#ffffff" opacity="0.95" />
            <ellipse cx={m.headCx} cy={m.muzzleCy} rx={m.muzzleRx} ry={m.muzzleRy} fill={`url(#${gMuzzle})`} opacity="0.45" />

            {/* Joues rosées */}
            <circle cx={m.headCx - m.eyeDx - 3} cy={m.eyeY + 6} r="3" fill="var(--alma-cheek)" />
            <circle cx={m.headCx + m.eyeDx + 3} cy={m.eyeY + 6} r="3" fill="var(--alma-cheek)" />

            {/* Yeux : grands ronds noirs expressifs */}
            <g className="alma-part alma-eyes">
              {/* Halo doux autour de chaque œil */}
              <ellipse cx={m.headCx - m.eyeDx} cy={m.eyeY} rx={m.eyeRx + 0.7} ry={m.eyeRy + 0.7} fill="var(--alma-mouth)" opacity="0.18" />
              <ellipse cx={m.headCx + m.eyeDx} cy={m.eyeY} rx={m.eyeRx + 0.7} ry={m.eyeRy + 0.7} fill="var(--alma-mouth)" opacity="0.18" />
              {/* Pupilles */}
              <ellipse cx={m.headCx - m.eyeDx} cy={m.eyeY} rx={m.eyeRx} ry={m.eyeRy} fill="var(--alma-eye)" />
              <ellipse cx={m.headCx + m.eyeDx} cy={m.eyeY} rx={m.eyeRx} ry={m.eyeRy} fill="var(--alma-eye)" />
              {/* Reflets principaux */}
              <circle cx={m.headCx - m.eyeDx + 1.2} cy={m.eyeY - 1.4} r={m.eyeRx * 0.3} fill="var(--alma-eye-hi)" />
              <circle cx={m.headCx + m.eyeDx + 1.2} cy={m.eyeY - 1.4} r={m.eyeRx * 0.3} fill="var(--alma-eye-hi)" />
              {/* Micro-reflets */}
              <circle cx={m.headCx - m.eyeDx - 1.2} cy={m.eyeY + 1.8} r={m.eyeRx * 0.15} fill="var(--alma-eye-hi)" opacity="0.75" />
              <circle cx={m.headCx + m.eyeDx - 1.2} cy={m.eyeY + 1.8} r={m.eyeRx * 0.15} fill="var(--alma-eye-hi)" opacity="0.75" />
            </g>
            {/* Paupières indépendantes */}
            <rect
              className="alma-part alma-eyelid alma-eyelid-l"
              x={m.headCx - m.eyeDx - m.eyeRx - 0.5} y={m.eyeY - m.eyeRy - 0.5}
              width={m.eyeRx * 2 + 1} height={m.eyeRy * 2 + 1}
              rx={m.eyeRx}
              fill="var(--alma-fur-shadow)"
            />
            <rect
              className="alma-part alma-eyelid alma-eyelid-r"
              x={m.headCx + m.eyeDx - m.eyeRx - 0.5} y={m.eyeY - m.eyeRy - 0.5}
              width={m.eyeRx * 2 + 1} height={m.eyeRy * 2 + 1}
              rx={m.eyeRx}
              fill="var(--alma-fur-shadow)"
            />

            {/* Truffe noire en bouton */}
            <ellipse cx={m.headCx} cy={m.noseCy} rx={m.noseRx} ry={m.noseRy} fill="var(--alma-nose)" />
            <ellipse cx={m.headCx - 1} cy={m.noseCy - 0.7} rx="1" ry="0.7" fill="#ffffff" opacity="0.6" />

            {/* Sillon */}
            <path
              d={`M${m.headCx} ${m.noseCy + m.noseRy} L${m.headCx} ${m.mouthY - 0.5}`}
              stroke="var(--alma-mouth)" strokeWidth="1" strokeLinecap="round"
            />

            {/* Sourire discret */}
            <path
              d={`M${m.headCx - m.mouthSpread} ${m.mouthY} q${m.mouthSpread * 0.55} ${m.mouthSpread * 0.65} ${m.mouthSpread} ${m.mouthSpread * 0.65} q${m.mouthSpread * 0.45} 0 ${m.mouthSpread} -${m.mouthSpread * 0.65}`}
              fill="none"
              stroke="var(--alma-mouth)"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Langue (happy / playful) */}
            <g className="alma-part alma-tongue">
              <ellipse cx={m.headCx} cy={m.mouthY + 2.5} rx="2.2" ry="1.8" fill="var(--alma-tongue)" />
              <path d={`M${m.headCx} ${m.mouthY + 2.5} L${m.headCx} ${m.mouthY + 4.5}`} stroke="#c26f7a" strokeWidth="0.5" />
            </g>
          </g>
        </g>
      </svg>
    </span>
  );
}

export default AlmaAvatarAnimated;

