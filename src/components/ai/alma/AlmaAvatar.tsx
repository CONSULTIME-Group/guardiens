/**
 * Avatar SVG d'Alma, la narratrice IA de Guardiens.
 * Silhouette de chienne stylisée, oreilles tombantes, museau discret.
 * Stroke `currentColor`, tailles 24/32/40. Ne pas surdesigner.
 */
type Size = 24 | 32 | 40;

interface AlmaAvatarProps {
  size?: Size;
  className?: string;
  "aria-hidden"?: boolean;
}

export function AlmaAvatar({ size = 32, className, ...rest }: AlmaAvatarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={rest["aria-hidden"] ?? true}
    >
      {/* Cercle de fond doux */}
      <circle cx="20" cy="20" r="19" fill="currentColor" fillOpacity="0.08" />
      {/* Tête de chienne, oreilles tombantes */}
      <path
        d="M13 15c0-4 3-7 7-7s7 3 7 7v3c0 1.5-.5 3-1.5 4l-1 1c-.3.3-.5.7-.5 1.1v1.4c0 1.4-1.1 2.5-2.5 2.5h-3c-1.4 0-2.5-1.1-2.5-2.5v-1.4c0-.4-.2-.8-.5-1.1l-1-1c-1-1-1.5-2.5-1.5-4v-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Oreilles tombantes */}
      <path
        d="M13 15c-1.5 1-2.5 3-2.5 5s.5 3.5 1.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M27 15c1.5 1 2.5 3 2.5 5s-.5 3.5-1.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Yeux */}
      <circle cx="17" cy="18" r="1" fill="currentColor" />
      <circle cx="23" cy="18" r="1" fill="currentColor" />
      {/* Museau discret */}
      <path
        d="M19 22c.5.5 1.5.5 2 0"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default AlmaAvatar;
