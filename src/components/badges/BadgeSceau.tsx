import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { BADGE_DEFINITIONS, getTier, type BadgeTier } from './badge-definitions'

interface BadgeSceauProps {
  id: string
  count?: number
  active?: boolean
  size?: 'normal' | 'compact'
  showCount?: boolean
  className?: string
}

function TierRing({ tier, r }: { tier: BadgeTier; r: number }) {
  if (tier === 'bronze') {
    return <circle cx="26" cy="26" r={r} fill="none" stroke="#CD7F32" strokeWidth="1.5" />
  }
  if (tier === 'silver') {
    return <circle cx="26" cy="26" r={r} fill="none" stroke="#C0C0C0" strokeWidth="2" />
  }
  if (tier === 'gold') {
    return (
      <>
        <circle cx="26" cy="26" r={r} fill="none" stroke="#D4AF37" strokeWidth="2.5" />
        <circle cx="26" cy="26" r={r + 2} fill="none" stroke="#FFE27A" strokeWidth="0.5" opacity="0.5" />
      </>
    )
  }
  // steel
  return <circle cx="26" cy="26" r={r} fill="none" stroke="#8A8A8A" strokeWidth="2" strokeDasharray="3 2" />
}

export function BadgeSceau({
  id,
  count = 1,
  active = true,
  size = 'normal',
  showCount = true,
  className = '',
}: BadgeSceauProps) {
  const def = BADGE_DEFINITIONS[id]

  if (!def) {
    const sz = size === 'normal' ? 52 : 34
    return (
      <svg width={sz} height={sz} viewBox="0 0 52 52" className={className}>
        <circle cx="26" cy="26" r="22" fill="hsl(var(--muted))" />
      </svg>
    )
  }

  const tier = getTier(id, count)
  const sz = size === 'normal' ? 52 : 34
  const showPastille = showCount && count > 1 && size === 'normal'
  const pastilleLabel = count > 99 ? '99+' : `×${count}`

  const svgElement = (
    <span className={`relative inline-block ${className}`} style={{ width: sz, height: sz }}>
      <svg
        width={sz}
        height={sz}
        viewBox="0 0 52 52"
        aria-label={def.label}
        role="img"
        style={{
          filter: active ? 'none' : 'grayscale(100%)',
          opacity: active ? 1 : 0.3,
          transition: 'filter 0.3s, opacity 0.3s',
        }}
      >
        {/* Fond */}
        <circle cx="26" cy="26" r="22" fill={def.bg} />
        {/* Anneau décoratif intérieur */}
        <circle cx="26" cy="26" r="18" fill="none" stroke={def.iconColor} strokeWidth="0.5" opacity="0.2" />
        {/* Icône SVG — offset pour centrer dans viewBox 52 */}
        <g transform="translate(6, 6)" dangerouslySetInnerHTML={{ __html: def.svgIcon }} />
        {/* Anneau de tier */}
        <TierRing tier={tier} r={24} />
      </svg>

      {/* Pastille count */}
      {showPastille && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[10px] font-bold leading-none"
          style={{
            width: 18,
            height: 18,
            backgroundColor: def.bg,
            color: def.iconColor,
            border: `1.5px solid ${def.iconColor}`,
          }}
        >
          {pastilleLabel}
        </span>
      )}
    </span>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {svgElement}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center">
          <p className="font-semibold text-sm">{def.label}</p>
          <p className="text-xs text-muted-foreground mt-1">{def.tooltip}</p>
          {!active && (
            <p className="text-xs text-muted-foreground/60 mt-1 italic">
              Obtenu {count} fois — expiré
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default BadgeSceau
