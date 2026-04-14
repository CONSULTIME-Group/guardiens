import { BADGE_DEFINITIONS, getTier, type BadgeTier } from './badge-definitions'

interface BadgeSceauLargeProps {
  id: string
  active?: boolean
  size?: number
  className?: string
}

function TierRingLarge({ tier }: { tier: BadgeTier }) {
  if (tier === 'bronze') return (
    <>
      <circle cx="50" cy="50" r="43.5" fill="none" stroke="#8B7355" strokeWidth="2" opacity="0.65" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#8B7355" strokeWidth="0.5" opacity="0.25" />
    </>
  )
  if (tier === 'silver') return (
    <>
      <circle cx="50" cy="50" r="43.5" fill="none" stroke="#C0C0C0" strokeWidth="2.5" opacity="0.9" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#E0E0E0" strokeWidth="0.5" opacity="0.3" />
    </>
  )
  if (tier === 'gold') return (
    <>
      <circle cx="50" cy="50" r="44.5" fill="none" stroke="#D4AF37" strokeWidth="1.5" opacity="0.5" />
      <circle cx="50" cy="50" r="43" fill="none" stroke="#D4AF37" strokeWidth="3" opacity="0.95" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#FFE27A" strokeWidth="0.5" opacity="0.35" />
    </>
  )
  return (
    <>
      <circle cx="50" cy="50" r="43.5" fill="none" stroke="#9E9E9E" strokeWidth="2.5" opacity="0.9" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#B0B0B0" strokeWidth="0.5" opacity="0.3" />
    </>
  )
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
        {/* Radial gradient for inner glow */}
        <radialGradient id={`glow-${id}-${size}`} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor={def.iconColor} stopOpacity="0.12" />
          <stop offset="100%" stopColor={def.iconColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Drop shadow */}
      <ellipse cx="51" cy="52" rx="43" ry="43" fill="rgba(0,0,0,0.12)" />

      {/* Background */}
      <circle cx="50" cy="50" r="44" fill={def.bg} />

      {/* Inner glow */}
      <circle cx="50" cy="50" r="38" fill={`url(#glow-${id}-${size})`} />

      {/* Outer rope border */}
      <circle
        cx="50" cy="50" r="42"
        fill="none"
        stroke={def.iconColor}
        strokeWidth="2"
        strokeDasharray="3.5 2.5"
        opacity="0.5"
      />

      {/* Inner rope border */}
      <circle
        cx="50" cy="50" r="38.5"
        fill="none"
        stroke={def.iconColor}
        strokeWidth="0.8"
        opacity="0.2"
      />

      {/* Arc text */}
      <text
        fill={def.iconColor}
        fontSize="7"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="1.8"
        opacity="0.85"
      >
        <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
          {def.labelArc}
        </textPath>
      </text>

      {/* Icon — centered lower to make room for arc text */}
      <g
        transform="translate(30, 36) scale(0.9)"
        dangerouslySetInnerHTML={{ __html: def.svgIcon }}
      />

      {/* Tier ring */}
      <TierRingLarge tier={tier} />
    </svg>
  )
}

export default BadgeSceauLarge
