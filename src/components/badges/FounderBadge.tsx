interface FounderBadgeProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
} as const;

export default function FounderBadge({ size = 'md' }: FounderBadgeProps) {
  return (
    <img
      src="/badges/fondateur.png"
      alt="Badge Fondateur"
      className={`${sizeClasses[size]} drop-shadow-lg object-contain`}
    />
  );
}
