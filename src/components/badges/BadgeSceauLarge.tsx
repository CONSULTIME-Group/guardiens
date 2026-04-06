import { BADGE_DEFINITIONS, getTier, type BadgeTier } from './badge-definitions'

interface BadgeSceauLargeProps {
  id: string
  active?: boolean
  size?: number
  className?: string
}

function TierRingLarge({ tier }: { tier: BadgeTier }) {
  if (tier === 'bronze') return (
    <circle cx="50" cy="50" r="43.5" fill="none" stroke="#8B7355" strokeWidth="2" opacity="0.65" />
  )
  if (tier === 'silver') return (
    <circle cx="50" cy="50" r="43.5" fill="none" stroke="#C0C0C0" strokeWidth="2.5" opacity="0.9" />
  )
  if (tier === 'gold') return (<>
    <circle cx="50" cy="50" r="44.5" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.5" />
    <circle cx="50" cy="50" r="43" fill="none" stroke="#D4AF37" strokeWidth="3" opacity="0.95" />
  </>)
  return <circle cx="50" cy="50" r="43.5" fill="none" stroke="#9E9E9E" strokeWidth="2.5" opacity="0.9" />
}

export function BadgeSceauLarge({
  id,
  active = true,
  size = 96,
  className = '',
}: BadgeSceauLargeProps) {
  const def = BADGE_DEFINITIONS[id]
  if (!def) return null

  const tier = getTier(id, 1)
  const arcId = `arc-${id}-${size}`

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={def.label}
      style={{
        display: 'block',
        filter: !active ? 'grayscale(100%)' : undefined,
        opacity: !active ? 0.3 : 1,
      }}
    >
      <defs>
        <path
          id={arcId}
          d="M 12 50 A 38 38 0 0 1 88 50"
          fill="none"
        />
      </defs>

      {/* Ombre portée */}
      <ellipse cx="51" cy="52" rx="43" ry="43" fill="rgba(0,0,0,0.15)" />

      {/* Fond */}
      <circle cx="50" cy="50" r="44" fill={def.bg} />

      {/* Bordure corde extérieure */}
      <circle
        cx="50" cy="50" r="42"
        fill="none"
        stroke={def.iconColor}
        strokeWidth="2"
        strokeDasharray="3.5 2.5"
        opacity="0.6"
      />

      {/* Bordure corde intérieure */}
      <circle
        cx="50" cy="50" r="38.5"
        fill="none"
        stroke={def.iconColor}
        strokeWidth="0.8"
        opacity="0.25"
      />

      {/* Texte courbe */}
      <text
        fill={def.iconColor}
        fontSize="7"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="1.8"
        opacity="0.9"
      >
        <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
          {def.labelArc}
        </textPath>
      </text>

      {/* Icône centrée en bas pour laisser place au texte */}
      <g
        transform="translate(30, 36) scale(0.9)"
        dangerouslySetInnerHTML={{ __html: def.svgIcon }}
      />

      {/* Anneau de tier */}
      <TierRingLarge tier={tier} />
    </svg>
  )
}

export default BadgeSceauLarge
