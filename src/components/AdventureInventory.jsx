import { useState } from 'react'
import { playClick } from '../lib/sounds.js'
import AdventureItemIcon from './AdventureItemIcon.jsx'

export default function AdventureInventory({ items, accentColor, onUseItem, using, usingLabel }) {
  const [open, setOpen] = useState(items.length > 0)

  if (!items.length) return null

  return (
    <div className="relative z-20 w-full max-w-sm mx-auto">
      <button
        type="button"
        onClick={() => { playClick(); setOpen(o => !o) }}
        className="w-full flex items-center justify-between px-4 py-3 border-2 bg-black/50 uppercase tracking-widest text-xs font-mono"
        style={{ borderColor: accentColor, color: accentColor }}
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">🎒</span>
          Инвентарь
          <span
            className="px-2 py-0.5 rounded-full text-[10px] bg-white/10"
            style={{ color: accentColor }}
          >
            {items.length}
          </span>
        </span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className="p-4 border-2 bg-black/60"
              style={{ borderColor: `${accentColor}88` }}
            >
              <div className="flex gap-3 items-start">
                <AdventureItemIcon type={item.icon} color={accentColor} size="sm" />
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[10px] font-mono uppercase opacity-50">
                    {item.categoryLabel}
                  </div>
                  <div className="font-display text-sm uppercase tracking-wider" style={{ color: accentColor }}>
                    {item.detail}
                  </div>
                  <div className="text-[10px] font-mono opacity-70 mt-1 leading-relaxed">
                    {item.inventoryLine}
                  </div>
                  <p className="text-[10px] font-mono mt-2 opacity-60 leading-relaxed border-t border-white/10 pt-2">
                    {item.useHint}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={using}
                onClick={() => { playClick(); onUseItem(item.id) }}
                className="mt-3 w-full py-3 font-bold uppercase tracking-[0.15em] text-xs transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ backgroundColor: accentColor, color: '#000' }}
              >
                {using ? (usingLabel || item.useProgress || 'Активация…') : item.useVerb}
              </button>
            </div>
          ))}
          <p className="text-[10px] font-mono text-center opacity-50 px-2 leading-relaxed">
            Предмет расходуется при использовании. Действие зависит от типа добычи.
          </p>
        </div>
      )}
    </div>
  )
}
