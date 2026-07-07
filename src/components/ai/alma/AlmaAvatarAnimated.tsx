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

        {/* Ombre de contact au sol (respire avec le corps) */}
        <ellipse
          className="alma-part alma-shadow"
          cx="50" cy="95" rx="30" ry="3.2"
          fill="var(--alma-shadow)"
        />

        {/* CORPS : wrapper "respiration" (base) + wrapper "mood" (rebond/wiggle) */}
        <g className="alma-part alma-body-breath">
          <g className="alma-part alma-body-mood">
            {/* Queue en arrière-plan : base slow-wag + mood fast-wag */}
            <g className="alma-part alma-tail-base">
              <g className="alma-part alma-tail-mood">
                <ellipse cx="14" cy="80" rx="6.5" ry="9" fill="var(--alma-fur)" />
                <Curls positions={[[12, 74, 3.5], [16, 78, 3.5], [12, 86, 3.5], [10, 82, 3]]} />
                <ellipse cx="14" cy="78" rx="2" ry="3" fill="var(--alma-fur-hi)" opacity="0.6" />
              </g>
            </g>

            {/* Silhouette corps */}
            <ellipse cx="50" cy="82" rx="30" ry="14" fill={`url(#${gBody})`} />
            <Curls positions={BODY_CURLS} />
            {/* Ombre sous corps */}
            <ellipse cx="50" cy="90" rx="22" ry="3" fill="var(--alma-fur-shadow)" opacity="0.4" />
            {/* Poitrail clair */}
            <ellipse cx="50" cy="76" rx="14" ry="8" fill="#ffffff" opacity="0.65" />
            {/* Pattes avant suggérées */}
            <ellipse cx="42" cy="94" rx="5" ry="3" fill="var(--alma-fur)" />
            <ellipse cx="58" cy="94" rx="5" ry="3" fill="var(--alma-fur)" />
            <ellipse cx="42" cy="93.5" rx="3" ry="1.4" fill="var(--alma-fur-hi)" opacity="0.7" />
            <ellipse cx="58" cy="93.5" rx="3" ry="1.4" fill="var(--alma-fur-hi)" opacity="0.7" />
          </g>
        </g>

        {/* Accessoire de cou (collier / bandana / écharpe) selon le stade */}
        <StageNeckAccessory stage={stage} />

        {/* Oreilles tombantes (indépendantes, derrière la tête) */}
        <g className="alma-part alma-ear-r">
          <path
            d="M22 30 q-12 6 -12 22 q0 12 10 16 q6 2 10 -2 q0 -18 -2 -34 z"
            fill="var(--alma-fur)"
          />
          <Curls positions={EAR_R_CURLS} />
          <path
            d="M20 34 q-6 6 -6 18"
            stroke="var(--alma-fur-shadow)" strokeWidth="1.2" fill="none" opacity="0.5"
          />
        </g>
        <g className="alma-part alma-ear-l">
          <path
            d="M78 30 q12 6 12 22 q0 12 -10 16 q-6 2 -10 -2 q0 -18 2 -34 z"
            fill="var(--alma-fur)"
          />
          <Curls positions={EAR_L_CURLS} />
          <path
            d="M80 34 q6 6 6 18"
            stroke="var(--alma-fur-shadow)" strokeWidth="1.2" fill="none" opacity="0.5"
          />
        </g>

        {/* TÊTE : wrapper "sway" (base micro-bob) + wrapper "mood" (tilt) */}
        <g className="alma-part alma-head-sway">
          <g className="alma-part alma-head-mood">
            {/* Halo tête */}
            <ellipse cx="50" cy="40" rx="27" ry="25" fill={`url(#${gHead})`} />
            {/* Ombres douces internes */}
            <Curls positions={HEAD_SHADOWS} fill="var(--alma-fur-shadow)" opacity={0.5} />
            {/* Bouclettes du pourtour (silhouette festonnée) */}
            <Curls positions={HEAD_OUTER_CURLS} />
            {/* Highlights (volume duveteux) */}
            <Curls positions={HEAD_HIGHLIGHTS} fill="var(--alma-fur-hi)" opacity={0.9} />

            {/* Toupet ondulé sur le front */}
            <path
              d="M40 22 q4 -4 10 -4 q6 0 10 4 q-3 4 -10 4 q-7 0 -10 -4 z"
              fill="#ffffff"
              opacity="0.9"
            />
            <circle cx="47" cy="20" r="2.4" fill="#ffffff" opacity="0.9" />
            <circle cx="53" cy="20" r="2.4" fill="#ffffff" opacity="0.9" />

            {/* Accessoire de tête (étincelle / couronne) selon le stade */}
            <StageHeadAccessory stage={stage} />


            {/* Museau blanc */}
            <ellipse cx="50" cy="54" rx="13" ry="10.5" fill="#ffffff" opacity="0.9" />
            <ellipse cx="50" cy="54" rx="13" ry="10.5" fill={`url(#${gMuzzle})`} opacity="0.5" />

            {/* Joues rosées */}
            <circle cx="34" cy="52" r="3.4" fill="var(--alma-cheek)" />
            <circle cx="66" cy="52" r="3.4" fill="var(--alma-cheek)" />

            {/* Yeux : grands ronds foncés */}
            <g className="alma-part alma-eyes">
              <ellipse cx="40" cy="43" rx="4.4" ry="4.8" fill="var(--alma-mouth)" opacity="0.18" />
              <ellipse cx="60" cy="43" rx="4.4" ry="4.8" fill="var(--alma-mouth)" opacity="0.18" />
              <ellipse cx="40" cy="43" rx="3.7" ry="4.3" fill="var(--alma-eye)" />
              <ellipse cx="60" cy="43" rx="3.7" ry="4.3" fill="var(--alma-eye)" />
              {/* Reflets principaux */}
              <circle cx="41.4" cy="41.4" r="1.3" fill="var(--alma-eye-hi)" />
              <circle cx="61.4" cy="41.4" r="1.3" fill="var(--alma-eye-hi)" />
              {/* Micro-reflets */}
              <circle cx="38.8" cy="45" r="0.55" fill="var(--alma-eye-hi)" opacity="0.75" />
              <circle cx="58.8" cy="45" r="0.55" fill="var(--alma-eye-hi)" opacity="0.75" />
            </g>
            {/* Paupières indépendantes (clignements légèrement décalés) */}
            <rect
              className="alma-part alma-eyelid alma-eyelid-l"
              x="36" y="38.2" width="8" height="9.5" rx="4"
              fill="var(--alma-fur-shadow)"
            />
            <rect
              className="alma-part alma-eyelid alma-eyelid-r"
              x="56" y="38.2" width="8" height="9.5" rx="4"
              fill="var(--alma-fur-shadow)"
            />

            {/* Truffe */}
            <ellipse cx="50" cy="52.8" rx="3.4" ry="2.6" fill="var(--alma-nose)" />
            <ellipse cx="48.9" cy="51.9" rx="1.1" ry="0.75" fill="#ffffff" opacity="0.6" />

            {/* Sillon */}
            <path d="M50 55.5 L50 58" stroke="var(--alma-mouth)" strokeWidth="1" strokeLinecap="round" />

            {/* Sourire */}
            <path
              d="M43 58.5 q3.5 4.5 7 4.5 q3.5 0 7 -4.5"
              fill="none"
              stroke="var(--alma-mouth)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Langue (happy / playful) */}
            <g className="alma-part alma-tongue">
              <ellipse cx="50" cy="60.5" rx="2.3" ry="1.9" fill="var(--alma-tongue)" />
              <path d="M50 60.5 L50 62.5" stroke="#c26f7a" strokeWidth="0.5" />
            </g>
          </g>
        </g>
      </svg>
    </span>
  );
}

export default AlmaAvatarAnimated;
