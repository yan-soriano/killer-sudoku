/** Иконка предмета приключения по типу */
export default function AdventureItemIcon({ type, color = '#00ff41', size = 'lg' }) {
  const box = size === 'sm' ? 'w-12 h-12' : 'w-20 h-20'
  const svg = size === 'sm' ? 24 : 44

  return (
    <div
      className={`${box} shrink-0 flex items-center justify-center rounded-lg border-2 ${size === 'lg' ? 'rotate-[-6deg]' : ''}`}
      style={{
        borderColor: color,
        backgroundColor: `${color}18`,
        boxShadow: size === 'lg' ? `0 0 24px ${color}55` : undefined,
      }}
    >
      <ItemSvg type={type} color={color} size={svg} />
    </div>
  )
}

function ItemSvg({ type, color, size }) {
  const sw = 1.5
  switch (type) {
    case 'decode_module':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw}>
          <rect x="4" y="4" width="16" height="16" rx="2" fill={`${color}22`} />
          <path d="M8 8h8M8 12h8M8 16h5" strokeWidth="2" />
          <circle cx="17" cy="17" r="2" fill={color} />
        </svg>
      )
    case 'purge_utility':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw}>
          <path d="M12 3l8 4v6c0 5-3.5 8-8 8s-8-3-8-8V7l8-4z" fill={`${color}22`} />
          <path d="M9 12l2 2 4-4" strokeWidth="2" />
        </svg>
      )
    case 'access_key':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw}>
          <circle cx="8" cy="8" r="4" fill={`${color}33`} />
          <path d="M11 11l9 9" strokeWidth="2" />
          <path d="M16 16l3 3M19 13l3 3" strokeWidth="2" />
        </svg>
      )
  }
}
