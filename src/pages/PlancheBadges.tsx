import { Helmet } from 'react-helmet-async'
import { BadgeSceauLarge } from '@/components/badges/BadgeSceauLarge'
import { BADGE_DEFINITIONS, GARDIEN_BADGE_IDS, PROPRIO_BADGE_IDS, SPECIAL_BADGE_IDS, MISSION_BADGE_IDS } from '@/components/badges/badge-definitions'

const SECTIONS = [
  { title: 'Écussons Gardien', ids: GARDIEN_BADGE_IDS },
  { title: 'Écussons Propriétaire', ids: PROPRIO_BADGE_IDS },
  { title: 'Badges spéciaux', ids: SPECIAL_BADGE_IDS },
  { title: 'Petites missions', ids: MISSION_BADGE_IDS },
]

export default function PlancheBadges() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-8">
      <Helmet>
        <title>Planche des badges — Guardiens</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <h1 className="text-3xl font-heading font-bold text-foreground text-center mb-2">
        Les badges Guardiens
      </h1>

      <p className="text-center text-muted-foreground text-sm mb-10 max-w-md mx-auto">
        Attribués par la communauté après chaque garde ou mission.
      </p>

      {SECTIONS.map(section => (
        <div key={section.title} className="mb-12">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4 border-b border-border pb-2">
            {section.title}
          </h2>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
            {section.ids.map(id => {
              const def = BADGE_DEFINITIONS[id]
              if (!def) return null
              return (
                <div key={id} className="flex flex-col items-center text-center gap-1.5">
                  <BadgeSceauLarge id={id} size={96} />
                  <p className="text-xs font-semibold text-foreground leading-tight">
                    {def.label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {def.tooltip}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
