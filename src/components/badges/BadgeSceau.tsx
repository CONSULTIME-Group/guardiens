import { useState, forwardRef } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { BADGE_DEFINITIONS, getTier, isBadgeActive, type BadgeTier } from './badge-definitions'
import { BadgeSceauLarge } from './BadgeSceauLarge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface BadgeSceauProps {
  id: string
  count?: number
  active?: boolean
  size?: 'normal' | 'compact'
  showCount?: boolean
  showLabel?: boolean
  className?: string
  obtainedAt?: string
}

const TIER_COLORS: Record<BadgeTier, { stroke: string; width: number; glow?: string }> = {
  bronze: { stroke: '#CD7F32', width: 1.5 },
  silver: { stroke: '#C0C0C0', width: 2 },
  gold: { stroke: '#D4AF37', width: 2.5, glow: '#FFE27A' },
  steel: { stroke: '#8A8A8A', width: 2 },
}

function TierRing({ tier, r }: { tier: BadgeTier; r: number }) {
  const t = TIER_COLORS[tier]
  if (tier === 'gold') {
    return (
      <>
        <circle cx="26" cy="26" r={r} fill="none" stroke={t.stroke} strokeWidth={t.width} />
        <circle cx="26" cy="26" r={r + 2} fill="none" stroke={t.glow!} strokeWidth="0.5" opacity="0.5" />
      </>
    )
  }
  if (tier === 'steel') {
    return <circle cx="26" cy="26" r={r} fill="none" stroke={t.stroke} strokeWidth={t.width} strokeDasharray="3 2" />
  }
  return <circle cx="26" cy="26" r={r} fill="none" stroke={t.stroke} strokeWidth={t.width} />
}

export const BadgeSceau = forwardRef<HTMLDivElement, BadgeSceauProps>(function BadgeSceau({
  id,
  count = 1,
  active,
  size = 'normal',
  showCount = true,
  showLabel = false,
  className = '',
  obtainedAt,
}, ref) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const def = BADGE_DEFINITIONS[id]

  const sz = size === 'normal' ? 52 : 40

  if (!def) {
    return (
      <div ref={ref} className={className}>
        <svg width={sz} height={sz} viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="22" fill="hsl(var(--muted))" />
        </svg>
      </div>
    )
  }

  const isActive = active !== undefined ? active : (obtainedAt ? isBadgeActive(id, obtainedAt) : true)
  const tier = getTier(id, count)
  const showPastille = showCount && count > 1 && size === 'normal'
  const pastilleLabel = count > 99 ? '99+' : `×${count}`

  const dateLabel = obtainedAt
    ? format(new Date(obtainedAt), "d MMMM yyyy", { locale: fr })
    : null

  const svgElement = (
    <div
      ref={ref}
      className={`relative inline-flex flex-col items-center cursor-pointer group ${className}`}
      style={{ width: showLabel ? undefined : sz }}
      onClick={() => setDialogOpen(true)}
    >
      <div className="relative" style={{ width: sz, height: sz }}>
        <svg
          width={sz}
          height={sz}
          viewBox="0 0 52 52"
          aria-label={def.label}
          role="img"
          className="transition-all duration-300 group-hover:scale-110"
          style={{
            filter: isActive ? 'none' : 'grayscale(80%) brightness(1.1)',
            opacity: isActive ? 1 : 0.4,
          }}
        >
          {/* Subtle shadow for depth */}
          {isActive && <circle cx="27" cy="27" r="22" fill="rgba(0,0,0,0.08)" />}
          <circle cx="26" cy="26" r="22" fill={def.bg} />
          {/* Inner ring for texture */}
          <circle cx="26" cy="26" r="18" fill="none" stroke={def.iconColor} strokeWidth="0.5" opacity="0.15" />
          <g transform="translate(6, 6)" dangerouslySetInnerHTML={{ __html: def.svgIcon }} />
          <TierRing tier={tier} r={24} />
        </svg>

        {showPastille && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[10px] font-bold leading-none shadow-sm"
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
      </div>

      {showLabel && (
        <span
          className="mt-1 text-[10px] leading-tight text-center font-medium max-w-[56px] truncate"
          style={{ color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}
          title={def.label}
        >
          {def.label}
        </span>
      )}
    </div>
  )

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {svgElement}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-center">
            <p className="font-semibold text-sm">{def.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{def.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xs text-center p-6 space-y-3">
          <div className="flex justify-center">
            <BadgeSceauLarge id={id} size={96} />
          </div>
          <h3 className="font-heading font-bold text-lg">{def.label}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {def.tooltip}
          </p>
          {count > 0 && (
            <p className="text-sm font-semibold" style={{ color: def.iconColor }}>
              Obtenu {count} fois
            </p>
          )}
          {dateLabel && (
            <p className="text-xs text-muted-foreground/70 italic">
              Dernière obtention : {dateLabel}
            </p>
          )}
          <p
            className="text-xs font-medium"
            style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
          >
            {isActive ? '✓ Actif' : 'Expiré'}
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
})

export default BadgeSceau
