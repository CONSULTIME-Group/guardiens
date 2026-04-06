interface StatutGardienBadgeProps {
  statut: 'novice' | 'confirme' | 'super_gardien'
  size?: 'normal' | 'compact'
}

export function StatutGardienBadge({ statut, size = 'normal' }: StatutGardienBadgeProps) {
  if (statut === 'novice') return null

  const isSuper = statut === 'super_gardien'
  const label = isSuper ? 'Super Gardien ✦' : 'Gardien Confirmé'
  const px = size === 'compact' ? 'px-2 py-0.5' : 'px-2.5 py-0.5'

  return (
    <span
      className={`inline-flex items-center rounded-full text-[11px] font-semibold leading-tight whitespace-nowrap ${px} ${
        isSuper ? 'ring-1' : ''
      }`}
      style={{
        backgroundColor: isSuper ? '#7A5200' : '#1A3C34',
        color: isSuper ? '#FFE27A' : '#FDF0CC',
        ...(isSuper ? { '--tw-ring-color': '#D4AF37' } as any : {}),
      }}
    >
      {label}
    </span>
  )
}

export default StatutGardienBadge
