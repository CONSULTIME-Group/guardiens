interface FounderBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-5 w-auto drop-shadow-lg object-contain',
  md: 'h-8 w-auto drop-shadow-lg object-contain',
  lg: 'h-14 w-auto drop-shadow-lg object-contain',
} as const;

export default function FounderBadge({ size = 'md', className = '' }: FounderBadgeProps) {
  return (
    <div className="relative group">
      <img
        src="/badges/fondateur.png"
        alt="Badge Fondateur"
        className={`${sizeClasses[size]} ${className}`}
      />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        Membre Fondateur — inscrit avant le 13 mai 2026
      </div>
    </div>
  );
}
