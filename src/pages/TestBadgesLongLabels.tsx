import { Helmet } from 'react-helmet-async'
import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import BadgeSceau from '@/components/badges/BadgeSceau'
import { BadgeSceauLarge } from '@/components/badges/BadgeSceauLarge'
import { BADGE_DEFINITIONS } from '@/components/badges/badge-definitions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Camera, Loader2, Download, Maximize2 } from 'lucide-react'
import { toast } from 'sonner'

const WIDTH_PRESETS = [
  { value: 320, label: '320 px' },
  { value: 480, label: '480 px' },
  { value: 640, label: '640 px' },
] as const

/**
 * Page de test interne — vérifie que les sceaux de badges et leurs libellés
 * (courts, longs, très longs) s'affichent correctement sur mobile, tablette
 * et desktop, et que la modale ouverte au clic ne masque jamais le titre.
 *
 * Accessible uniquement via /test/badges-long-labels (noindex).
 */

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
    note: "Libellé long + date d'obtention",
  },
  {
    id: 'id_verifiee',
    overrideLabel: "Identité vérifiée par notre équipe interne après contrôle complet du document officiel",
    count: 1,
    note: 'Badge permanent (jamais expiré)',
  },
]

const VIEWPORTS = [
  { label: 'mobile', width: 375 },
  { label: 'tablette', width: 768 },
  { label: 'desktop', width: 1920 },
] as const

type CaptureItem = { name: string; dataUrl: string }

export default function TestBadgesLongLabels() {
  // Injection one-shot des libellés de test
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

  const [isCapturing, setIsCapturing] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [captures, setCaptures] = useState<CaptureItem[]>([])
  const [stageWidth, setStageWidth] = useState<number | null>(null)
  const [stageBadgeId, setStageBadgeId] = useState<string | null>(null)
  // Largeur manuelle choisie par l'utilisateur pour tester en direct
  const [manualWidth, setManualWidth] = useState<number | null>(null)

  // Largeur effective du conteneur : capture (priorité) > manuelle > 100%
  const effectiveWidth = stageWidth ?? manualWidth ?? null

  const stageRef = useRef<HTMLDivElement>(null)

  // Restauration au démontage
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

  const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

  const captureNode = async (node: HTMLElement, width: number): Promise<string> => {
    const canvas = await html2canvas(node, {
      backgroundColor: '#ffffff',
      scale: 1,
      width,
      windowWidth: width,
      useCORS: true,
      logging: false,
    })
    return canvas.toDataURL('image/png')
  }

  const handleGenerate = async () => {
    setIsCapturing(true)
    setCaptures([])
    const results: CaptureItem[] = []

    try {
      for (const vp of VIEWPORTS) {
        // 1) Capture de la grille à cette largeur
        setProgress(`Grille ${vp.label} (${vp.width}px)…`)
        setStageWidth(vp.width)
        setStageBadgeId(null)
        await wait(250)
        if (stageRef.current) {
          const dataUrl = await captureNode(stageRef.current, vp.width)
          results.push({ name: `grille-${vp.label}-${vp.width}px.png`, dataUrl })
        }

        // 2) Capture de chaque modale ouverte à cette largeur
        for (const tc of TEST_CASES) {
          setProgress(`Modale « ${tc.id} » — ${vp.label}…`)
          setStageBadgeId(tc.id)
          await wait(350) // laisse le Dialog se monter + animer
          // Le DialogContent de shadcn est porté hors du stage → on cible le portail
          const dialog = document.querySelector('[role="dialog"]') as HTMLElement | null
          if (dialog) {
            const dataUrl = await captureNode(dialog, Math.min(vp.width, 480))
            results.push({
              name: `modale-${tc.id}-${vp.label}-${vp.width}px.png`,
              dataUrl,
            })
          }
          setStageBadgeId(null)
          await wait(150)
        }
      }

      setCaptures(results)
      toast.success(`${results.length} captures générées`)
    } catch (err) {
      console.error('[TestBadgesLongLabels] capture error', err)
      toast.error('Erreur pendant la capture — voir la console')
    } finally {
      setStageWidth(null)
      setStageBadgeId(null)
      setProgress('')
      setIsCapturing(false)
    }
  }

  const downloadAll = () => {
    captures.forEach((c, i) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = c.dataUrl
        a.download = c.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }, i * 120)
    })
  }

  // Badge ouvert programmatiquement pour la capture
  const stagedCase = stageBadgeId ? TEST_CASES.find(t => t.id === stageBadgeId) : null
  const stagedDef = stagedCase ? BADGE_DEFINITIONS[stagedCase.id] : null

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
        <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
          Page interne de QA. Cliquez sur chaque sceau pour ouvrir la modale, ou
          utilisez le bouton ci-dessous pour générer automatiquement toutes les
          captures aux trois breakpoints de référence.
        </p>

        {/* Barre d'actions */}
        <div className="sticky top-0 z-10 -mx-4 md:mx-0 mb-4 bg-background/95 backdrop-blur border-y border-border md:border md:rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerate} disabled={isCapturing} size="sm">
            {isCapturing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Capture en cours…
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Générer captures (mobile / tablette / desktop)
              </>
            )}
          </Button>
          {captures.length > 0 && !isCapturing && (
            <Button onClick={downloadAll} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Télécharger les {captures.length} images
            </Button>
          )}
          {progress && (
            <span className="text-xs text-muted-foreground">{progress}</span>
          )}
        </div>

        {/* Sélecteur de largeur du conteneur (test responsive en direct) */}
        <div className="mb-8 flex flex-wrap items-center gap-2 px-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground mr-1">
            <Maximize2 className="w-3.5 h-3.5" />
            Largeur du conteneur :
          </span>
          {WIDTH_PRESETS.map(p => {
            const active = manualWidth === p.value
            return (
              <Button
                key={p.value}
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => setManualWidth(active ? null : p.value)}
                disabled={isCapturing}
                className="h-7 px-2.5 text-xs"
                aria-pressed={active}
              >
                {p.label}
              </Button>
            )
          })}
          <Button
            size="sm"
            variant={manualWidth === null ? 'default' : 'outline'}
            onClick={() => setManualWidth(null)}
            disabled={isCapturing}
            className="h-7 px-2.5 text-xs"
            aria-pressed={manualWidth === null}
          >
            Auto (100 %)
          </Button>
          {effectiveWidth && (
            <span className="text-[11px] text-muted-foreground ml-2">
              Actif : <strong>{effectiveWidth} px</strong>
              {stageWidth && ' (capture)'}
            </span>
          )}
        </div>

        {/* Stage de capture — grille hébergée dans un conteneur redimensionnable.
            Quand stageWidth (capture) ou manualWidth (manuel) est défini, on force la largeur. */}
        <section className="mb-12">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4 border-b border-border pb-2">
            1. Grille de sceaux (capturée par le bouton)
          </h2>
          <div
            className="mx-auto overflow-hidden border border-dashed border-border rounded-lg transition-all"
            style={{
              width: effectiveWidth ?? '100%',
              maxWidth: effectiveWidth ?? '100%',
            }}
          >
            <div ref={stageRef} className="bg-background p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 md:gap-6">
                {TEST_CASES.map((tc, i) => (
                  <div
                    key={`grid-${tc.id}-${i}`}
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
            </div>
          </div>
        </section>

        {/* Sceaux larges (vue planche) */}
        <section className="mb-12">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4 border-b border-border pb-2">
            2. Sceaux larges (96 px) — référence visuelle
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
                </div>
              )
            })}
          </div>
        </section>

        {/* Galerie des captures générées */}
        {captures.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-heading font-semibold text-foreground mb-4 border-b border-border pb-2">
              3. Captures générées ({captures.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {captures.map((c, i) => (
                <figure
                  key={`cap-${i}`}
                  className="border border-border rounded-lg overflow-hidden bg-card"
                >
                  <img
                    src={c.dataUrl}
                    alt={c.name}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                  <figcaption className="p-2 text-[11px] text-muted-foreground break-all border-t border-border">
                    {c.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-muted-foreground italic text-center mt-8">
          Les libellés affichés ici sont volontairement exagérés pour le QA — ils
          ne reflètent pas les libellés réels des badges en production.
        </p>
      </div>

      {/* Modale contrôlée pour la capture automatique.
          On reproduit le contenu de BadgeSceau.Dialog pour pouvoir l'ouvrir
          sans interaction utilisateur. */}
      {stagedDef && stagedCase && (
        <Dialog open onOpenChange={() => setStageBadgeId(null)}>
          <DialogContent className="max-w-sm p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex justify-center pt-4 pb-5 shrink-0">
                <BadgeSceauLarge id={stagedCase.id} size={96} />
              </div>
              <h3
                className="font-heading font-bold text-lg leading-snug px-2 mb-3 hyphens-auto w-full max-w-full"
                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                {stagedDef.label}
              </h3>
              <p
                className="text-sm text-muted-foreground leading-relaxed mb-3 max-w-full"
                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                {stagedDef.tooltip}
              </p>
              {stagedCase.count > 0 && (
                <p className="text-sm font-semibold mb-1" style={{ color: stagedDef.iconColor }}>
                  Obtenu {stagedCase.count} fois
                </p>
              )}
              <p className="text-xs font-medium text-primary">✓ Actif</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
