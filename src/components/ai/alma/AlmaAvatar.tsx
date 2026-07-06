/**
 * Avatar SVG d'Alma, la narratrice IA de Guardiens.
 * Petit bichon frisé blanc, arrivée de Córdoba (Argentine).
 * Tête fluffy en nuage de puffs, yeux et truffe noirs, petit nœud coral.
 * Lisible à 24/32/40px, propre en dark mode (fond crème, poil blanc).
 */
type Size = 24 | 32 | 40;

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
      <g fill="#FFFFFF" stroke="#E4E1EC" strokeWidth="1">
        <ellipse cx="11" cy="29" rx="6.5" ry="9" />
        <ellipse cx="37" cy="29" rx="6.5" ry="9" />
      </g>
      <g fill="#FFFFFF" stroke="#E4E1EC" strokeWidth="1">
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
        <circle cx="19.5" cy="25" r="2.3" fill="#2B2B2B" />
        <circle cx="28.5" cy="25" r="2.3" fill="#2B2B2B" />
        <circle cx="20.3" cy="24.3" r="0.7" fill="#FFFFFF" />
        <circle cx="29.3" cy="24.3" r="0.7" fill="#FFFFFF" />
        <ellipse cx="24" cy="30" rx="2.6" ry="2.1" fill="#2B2B2B" />
        <path
          d="M24 32.1 C 22.6 33.9, 21 33.5, 20.4 32.5"
          stroke="#2B2B2B"
          strokeWidth="1.1"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M24 32.1 C 25.4 33.9, 27 33.5, 27.6 32.5"
          stroke="#2B2B2B"
          strokeWidth="1.1"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      <g fill="#F6A6A0" stroke="#E08D86" strokeWidth="0.5">
        <path d="M31.5 11 l4 -2 v4 z" />
        <path d="M31.5 11 l4 2 v-4 z" />
        <circle cx="31.5" cy="11" r="1.5" />
      </g>
    </svg>
  );
}

export default AlmaAvatar;
