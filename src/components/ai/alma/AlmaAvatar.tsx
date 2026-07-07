/**
 * Avatar SVG d'Alma, la narratrice IA de Guardiens.
 * Petit bichon frisé blanc, arrivée de Córdoba (Argentine).
 * Tête fluffy en nuage de puffs, yeux et truffe noirs, petit nœud coral.
 *
 * Tailles supportées : 24 / 32 / 40 (compact) et 56 / 72 / 96 (grand format
 * réservé aux premiers contacts et dialogs d'accueil).
 * Contours renforcés (1.5 px, gris moyen) pour rester reconnaissable en petit.
 */
type Size = 24 | 32 | 40 | 56 | 72 | 96;

interface AlmaAvatarProps {
  size?: Size;
  className?: string;
  "aria-hidden"?: boolean;
}

export function AlmaAvatar({ size = 32, className, ...rest }: AlmaAvatarProps) {
  const ariaHidden = rest["aria-hidden"];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Alma"
      aria-hidden={ariaHidden}
    >
      <circle cx="24" cy="24" r="24" fill="#FFF6E9" />
      <g fill="#FFFFFF" stroke="#8A7FA6" strokeWidth="1.5">
        <ellipse cx="11" cy="29" rx="6.5" ry="9" />
        <ellipse cx="37" cy="29" rx="6.5" ry="9" />
      </g>
      <g fill="#FFFFFF" stroke="#8A7FA6" strokeWidth="1.5">
        <circle cx="16" cy="17" r="6" />
        <circle cx="24" cy="13" r="6.5" />
        <circle cx="32" cy="17" r="6" />
        <circle cx="13" cy="25" r="6" />
        <circle cx="35" cy="25" r="6" />
        <circle cx="17" cy="33" r="6" />
        <circle cx="31" cy="33" r="6" />
        <circle cx="24" cy="27" r="13" />
      </g>
      <g>
        <circle cx="19.5" cy="25" r="2.6" fill="#1F1F1F" />
        <circle cx="28.5" cy="25" r="2.6" fill="#1F1F1F" />
        <circle cx="20.4" cy="24.2" r="0.8" fill="#FFFFFF" />
        <circle cx="29.4" cy="24.2" r="0.8" fill="#FFFFFF" />
        <ellipse cx="24" cy="30" rx="2.8" ry="2.2" fill="#1F1F1F" />
        <path
          d="M24 32.1 C 22.6 33.9, 21 33.5, 20.4 32.5"
          stroke="#1F1F1F"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M24 32.1 C 25.4 33.9, 27 33.5, 27.6 32.5"
          stroke="#1F1F1F"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      <g fill="#F6A6A0" stroke="#C97169" strokeWidth="0.8">
        <path d="M31.5 11 l4 -2 v4 z" />
        <path d="M31.5 11 l4 2 v-4 z" />
        <circle cx="31.5" cy="11" r="1.7" />
      </g>
    </svg>
  );
}

export default AlmaAvatar;
