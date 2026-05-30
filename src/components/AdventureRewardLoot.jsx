import { useEffect, useState, useRef } from 'react'
import { sfx } from '../lib/sounds.js'
import AdventureItemIcon from './AdventureItemIcon.jsx'

export default function AdventureRewardLoot({
  bytes,
  cycleBonus = 0,
  lootItem,
  accentColor = '#00ff41',
  onReady,
}) {
  const [phase, setPhase] = useState(0)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    sfx.loot()
    const t1 = setTimeout(() => setPhase(1), 400)
    const t2 = setTimeout(() => setPhase(2), 900)
    const t3 = setTimeout(() => {
      setPhase(3)
      onReadyRef.current?.()
    }, 1600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  const totalBytes = bytes + cycleBonus

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-acid animate-pulse mb-2">
          Добыча получена
        </div>
        <div className="font-display text-3xl md:text-4xl tracking-widest text-green-900 dark:text-acid">
          ВЗЛОМ УСПЕШЕН
        </div>
      </div>

      <div className="grid gap-5">
        <div
          className={`relative overflow-hidden rounded-lg border-2 p-6 transition-all duration-700 ${phase >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}
          style={{ borderColor: `${accentColor}55`, boxShadow: `0 0 40px ${accentColor}33` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-acid/20 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-20 h-20 rounded-full bg-acid flex items-center justify-center shadow-[0_0_30px_rgba(202,255,0,0.5)] shrink-0">
              <span className="font-display text-3xl text-ink-950">B</span>
            </div>
            <div className="text-left flex-1">
              <div className="text-[10px] font-mono uppercase tracking-widest text-ink-500 dark:text-ink-400 mb-1">
                Валюта системы
              </div>
              <div className="font-display text-4xl text-acid-dark dark:text-acid leading-none">
                +{totalBytes}
              </div>
              <div className="font-mono text-xs text-ink-500 dark:text-ink-400 mt-1 uppercase">
                Bytes {cycleBonus > 0 ? `(+${bytes} + бонус ${cycleBonus})` : ''}
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs font-mono text-ink-500 dark:text-ink-400 text-left leading-relaxed border-t border-ink-200 dark:border-ink-700 pt-3">
            Байты тратятся на сканер, анализ ошибок и другие инструменты в бою с судоку.
          </p>
        </div>

        {lootItem && (
          <div
            className={`relative overflow-hidden rounded-lg border-2 p-6 transition-all duration-700 delay-150 ${phase >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}
            style={{ borderColor: accentColor, boxShadow: `0 0 50px ${accentColor}44` }}
          >
            <div
              className="absolute top-0 right-0 w-32 h-32 opacity-20 pointer-events-none"
              style={{ background: `radial-gradient(circle at top right, ${accentColor}, transparent)` }}
            />
            <div className="flex items-start gap-5 relative z-10">
              <AdventureItemIcon type={lootItem.icon} color={accentColor} size="lg" />
              <div className="text-left flex-1">
                <div
                  className="text-[10px] font-mono uppercase tracking-widest mb-1"
                  style={{ color: accentColor }}
                >
                  ★ {lootItem.lootBadge}
                </div>
                <div className="text-[10px] font-mono uppercase opacity-60 mb-0.5">
                  {lootItem.categoryLabel}
                </div>
                <div className="font-display text-2xl uppercase tracking-wide text-ink-900 dark:text-white">
                  {lootItem.detail}
                </div>
                <div className="font-mono text-sm mt-2 opacity-80">
                  Сектор: <span className="font-bold">{lootItem.stepName}</span>
                </div>
              </div>
            </div>

            <div
              className={`mt-5 p-4 rounded border transition-all duration-500 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}
              style={{ borderColor: `${accentColor}66`, backgroundColor: `${accentColor}11` }}
            >
              <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: accentColor }}>
                Как использовать?
              </div>
              <p className="text-sm font-mono leading-relaxed text-left text-ink-700 dark:text-ink-200">
                {lootItem.useHint}
              </p>
              <p className="text-xs font-mono mt-3 opacity-70 text-left">
                На карте: инвентарь → <strong>{lootItem.useVerb}</strong>
              </p>
            </div>
          </div>
        )}

        {cycleBonus > 0 && (
          <div className="p-4 rounded-lg border border-warn/50 bg-warn/10 text-center font-mono text-sm uppercase tracking-widest text-warn">
            Цикл завершён — вирус нейтрализован
          </div>
        )}
      </div>
    </div>
  )
}
