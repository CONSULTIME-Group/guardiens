import { useState } from 'react'
import { isBadgeActive } from './badge-definitions'
import { BadgeSceau } from './BadgeSceau'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface BadgeRowProps {
  badges: Array<{
    badge_id: string
    created_at: string
    count: number
  }>
  size?: 'normal' | 'compact'
  maxVisible?: number
}

const PRIORITY_ORDER = ['fondateur', 'id_verifiee']

export function BadgeRow({ badges, size = 'normal', maxVisible = 6 }: BadgeRowProps) {
  const [showAll, setShowAll] = useState(false)

  const active = badges
    .filter(b => isBadgeActive(b.badge_id, b.created_at))
    .sort((a, b) => {
      const aIdx = PRIORITY_ORDER.indexOf(a.badge_id)
      const bIdx = PRIORITY_ORDER.indexOf(b.badge_id)
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
      if (aIdx !== -1) return -1
      if (bIdx !== -1) return 1
      return b.count - a.count
    })

  const expired = badges.filter(b => !isBadgeActive(b.badge_id, b.created_at))

  const visible = active.slice(0, maxVisible)
  const overflow = active.length - maxVisible

  if (active.length === 0 && expired.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {visible.map(b => (
          <BadgeSceau
            key={b.badge_id}
            id={b.badge_id}
            count={b.count}
            active
            size={size}
            obtainedAt={b.created_at}
          />
        ))}
        {overflow > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center justify-center rounded-full text-xs font-semibold text-muted-foreground bg-muted hover:bg-muted/80 transition-colors"
            style={{ width: size === 'normal' ? 52 : 34, height: size === 'normal' ? 52 : 34 }}
          >
            +{overflow}
          </button>
        )}
      </div>

      {expired.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="heritage" className="border-none">
            <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline">
              {expired.length} badge{expired.length > 1 ? 's' : ''} obtenu{expired.length > 1 ? 's' : ''} par le passé
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {expired.map(b => (
                  <BadgeSceau
                    key={b.badge_id}
                    id={b.badge_id}
                    count={b.count}
                    active={false}
                    size="compact"
                    obtainedAt={b.created_at}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tous les badges</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-3 py-2">
            {active.map(b => (
              <BadgeSceau
                key={b.badge_id}
                id={b.badge_id}
                count={b.count}
                active
                size="normal"
                obtainedAt={b.created_at}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BadgeRow
