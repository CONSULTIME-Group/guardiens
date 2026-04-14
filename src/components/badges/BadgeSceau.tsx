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
  className?: string
  obtainedAt?: string
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
  return <circle cx="26" cy="26" r={r} fill="none" stroke="#8A8A8A" strokeWidth="2" strokeDasharray="3 2" />
}

export const BadgeSceau = forwardRef<HTMLSpanElement, BadgeSceauProps>(function BadgeSceau({
  id,
  count = 1,
  active,
  size = 'normal',
  showCount = true,
  className = '',
  obtainedAt,
}, ref) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const def = BADGE_DEFINITIONS[id]

  if (!def) {
    const sz = size === 'normal' ? 52 : 34
    return (
      <span ref={ref} className={className}>
        <svg width={sz} height={sz} viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="22" fill="hsl(var(--muted))" />
        </svg>
      </span>
    )
  }

  const isActive = active !== undefined ? active : (obtainedAt ? isBadgeActive(id, obtainedAt) : true)
  const tier = getTier(id, count)
  const sz = size === 'normal' ? 52 : 34
  const showPastille = showCount && count > 1 && size === 'normal'
  const pastilleLabel = count > 99 ? '99+' : `×${count}`

  const dateLabel = obtainedAt
    ? format(new Date(obtainedAt), "d MMMM yyyy", { locale: fr })
    : null

  const svgElement = (
    <span
      ref={ref}
      className={`relative inline-block cursor-pointer ${className}`}
      style={{ width: sz, height: sz }}
      onClick={() => setDialogOpen(true)}
    >
      <svg
        width={sz}
        height={sz}
        viewBox="0 0 52 52"
        aria-label={def.label}
        role="img"
        style={{
          filter: isActive ? 'none' : 'grayscale(100%)',
          opacity: isActive ? 1 : 0.3,
          transition: 'filter 0.3s, opacity 0.3s',
        }}
      >
        <circle cx="26" cy="26" r="22" fill={def.bg} />
        <circle cx="26" cy="26" r="18" fill="none" stroke={def.iconColor} strokeWidth="0.5" opacity="0.2" />
        <g transform="translate(6, 6)" dangerouslySetInnerHTML={{ __html: def.svgIcon }} />
        <TierRing tier={tier} r={24} />
      </svg>

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
