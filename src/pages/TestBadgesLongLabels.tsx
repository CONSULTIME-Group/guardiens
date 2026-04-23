import { Helmet } from 'react-helmet-async'
import { useState } from 'react'
import BadgeSceau from '@/components/badges/BadgeSceau'
import { BadgeSceauLarge } from '@/components/badges/BadgeSceauLarge'
import { BADGE_DEFINITIONS } from '@/components/badges/badge-definitions'

/**
 * Page de test interne — vérifie que les sceaux de badges et leurs libellés
 * (courts, longs, très longs) s'affichent correctement sur mobile, tablette
 * et desktop, et que la modale ouverte au clic ne masque jamais le titre.
 *
 * Accessible uniquement via /test/badges-long-labels (noindex).
 */

// Cas de test avec libellés volontairement variés
const TEST_CASES: Array<{
  id: string
  overrideLabel?: string
  overrideTooltip?: string
  count: number
  obtainedAt?: string
  note: string
}> = [
  {
    id: 'animaux_heureux',
    count: 1,
    note: 'Libellé court (référence)',
  },
  {
    id: 'maison_nickel',
    overrideLabel: "Maison rendue absolument irréprochable et parfaitement rangée",
    overrideTooltip: "Le logement a été restitué dans un état de propreté et de rangement véritablement exemplaire, au-delà de toute attente raisonnable.",
    count: 3,
    note: 'Libellé long (≈ 60 caractères)',
  },
  {
    id: 'voisins_adorent',
    overrideLabel: "Reconnaissance unanime du voisinage pour son sens du contact humain et son extraordinaire bienveillance quotidienne",
    overrideTooltip: "Les voisins ont spontanément témoigné, à plusieurs reprises et de leur propre initiative, du caractère chaleureux, attentionné et particulièrement bienveillant de la personne tout au long de la garde.",
    count: 6,
    note: 'Libellé très long (≈ 110 caractères, niveau or)',
  },
  {
    id: 'fondateur',
    overrideLabel: "Antidisestablishmentarianismexceptionnellementincassable",
    overrideTooltip: "Mot unique sans espace pour tester le comportement du break-words / hyphens-auto sur les chaînes ininterrompues.",
    count: 1,
    note: 'Mot unique sans espace (test break-words)',
  },
  {
    id: 'coup_de_main_or',
    overrideLabel: "Coup de main exceptionnel rendu avec une diligence remarquable",
    count: 2,
    obtainedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    note: 'Libellé long + date d\'obtention',
  },
  {
    id: 'id_verifiee',
    overrideLabel: "Identité vérifiée par notre équipe interne après contrôle complet du document officiel",
    count: 1,
    note: 'Badge permanent (jamais expiré)',
  },
]

export default function TestBadgesLongLabels() {
  // On clone temporairement les définitions pour injecter les libellés de test
  const [originalDefs] = useState(() => {
    const snapshot: Record<string, { label: string; tooltip: string }> = {}
    TEST_CASES.forEach(tc => {
      const def = BADGE_DEFINITIONS[tc.id]
      if (!def) return
      snapshot[tc.id] = { label: def.label, tooltip: def.tooltip }
      if (tc.overrideLabel) def.label = tc.overrideLabel
      if (tc.overrideTooltip) def.tooltip = tc.overrideTooltip
    })
    return snapshot
  })

  // Restauration au démontage pour ne pas polluer les autres pages
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useState(() => {
    return () => {
      Object.entries(originalDefs).forEach(([id, snap]) => {
        const def = BADGE_DEFINITIONS[id]
        if (def) {
          def.label = snap.label
          def.tooltip = snap.tooltip
        }
      })
    }
  })

  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-8">
      <Helmet>
        <title>Test — Badges libellés longs</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-2">
          Test — badges à libellés longs
        </h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
          Page interne de QA. Cliquez sur chaque sceau pour ouvrir la modale et
          vérifier que le titre reste lisible sur mobile, tablette et desktop.
        </p>

        {/* Section 1 — Sceaux compacts en grille (vue dashboard) */}
        <section className="mb-12">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4 border-b border-border pb-2">
            1. Sceaux compacts en grille (40-52 px)
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 md:gap-6">
            {TEST_CASES.map((tc, i) => (
              <div
                key={`compact-${tc.id}-${i}`}
                className="flex flex-col items-center text-center gap-2 p-3 rounded-lg border border-border bg-card"
              >
                <BadgeSceau
                  id={tc.id}
                  count={tc.count}
                  showLabel
                  obtainedAt={tc.obtainedAt}
                />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {tc.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2 — Sceaux larges (planche / page profil) */}
        <section className="mb-12">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4 border-b border-border pb-2">
            2. Sceaux larges (96 px) avec libellés sous le badge
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {TEST_CASES.map((tc, i) => {
              const def = BADGE_DEFINITIONS[tc.id]
              if (!def) return null
              return (
                <div
                  key={`large-${tc.id}-${i}`}
                  className="flex flex-col items-center text-center gap-2 p-4 rounded-lg border border-border bg-card"
                >
                  <BadgeSceauLarge id={tc.id} size={96} />
                  <p className="text-xs font-semibold text-foreground leading-snug break-words hyphens-auto w-full">
                    {def.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug break-words">
                    {def.tooltip}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 italic mt-1">
                    {tc.note}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Section 3 — Test responsive : largeurs simulées */}
        <section className="mb-12">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4 border-b border-border pb-2">
            3. Vérification responsive — modale dans conteneurs étroits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Mobile (320px)', width: 320 },
              { label: 'Tablette (480px)', width: 480 },
              { label: 'Desktop (640px)', width: 640 },
            ].map(({ label, width }) => (
              <div
                key={label}
                className="border border-dashed border-border rounded-lg p-4 bg-muted/30"
                style={{ maxWidth: width }}
              >
                <p className="text-xs font-semibold text-muted-foreground mb-3">
                  {label}
                </p>
                <div className="flex gap-3 flex-wrap">
                  {TEST_CASES.slice(0, 3).map((tc, i) => (
                    <BadgeSceau
                      key={`resp-${tc.id}-${i}`}
                      id={tc.id}
                      count={tc.count}
                      obtainedAt={tc.obtainedAt}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-muted-foreground italic text-center mt-8">
          Les libellés affichés ici sont volontairement exagérés pour le QA — ils
          ne reflètent pas les libellés réels des badges en production.
        </p>
      </div>
    </div>
  )
}
