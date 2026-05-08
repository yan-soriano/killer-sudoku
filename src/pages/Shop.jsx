import { useState, useEffect } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { getUserBytes, updateUserBytes } from '../lib/api.js'
import {
  GRID_SKINS,
  getSkinById,
  getOwnedSkins,
  setOwnedSkins,
  getActiveSkin,
  setActiveSkin,
  loadSkinFont,
} from '../lib/grid_skins.js'

const BYTES_OFFERS = [
  { id: 'pack_1', amount: 5000, price: '500 ₸', priceNum: 500, badge: null },
  { id: 'pack_2', amount: 10000, price: '1 000 ₸', priceNum: 1000, badge: 'Популярный' },
  { id: 'pack_3', amount: 30000, price: '2 500 ₸', priceNum: 2500, badge: 'Лучшая цена' },
]

export default function Shop() {
  const { state, actions } = useApp()
  const { user } = state

  const [tab, setTab] = useState('skins') // 'skins' | 'bytes'
  const [owned, setOwned] = useState([])
  const [activeSkin, setActiveSkinState] = useState('default')
  const [purchasing, setPurchasing] = useState(null)
  const [toast, setToast] = useState(null)
  const [bytesPackMsg, setBytesPackMsg] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    setOwned(getOwnedSkins(user.id))
    setActiveSkinState(getActiveSkin(user.id))
    // Подгрузить шрифт активного скина
    loadSkinFont(getSkinById(getActiveSkin(user.id)))
  }, [user?.id])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handleBuySkin = async (skin) => {
    if (owned.includes(skin.id)) return
    if ((user.bytes || 0) < skin.price) {
      showToast('Недостаточно Bytes!')
      return
    }

    setPurchasing(skin.id)
    try {
      const newBytes = await updateUserBytes(user.id, -skin.price)
      actions.updateUser({ bytes: newBytes })

      const newOwned = [...owned, skin.id]
      setOwnedSkins(user.id, newOwned)
      setOwned(newOwned)

      showToast(`Скин «${skin.name}» куплен!`)
    } catch (e) {
      console.error('Purchase error:', e)
      showToast('Ошибка при покупке')
    } finally {
      setPurchasing(null)
    }
  }

  const handleEquip = (skinId) => {
    setActiveSkin(user.id, skinId)
    setActiveSkinState(skinId)
    loadSkinFont(getSkinById(skinId))
    showToast(`Скин «${getSkinById(skinId).name}» установлен!`)
  }

  const handleBuyBytes = (offer) => {
    setBytesPackMsg(offer.id)
    setTimeout(() => setBytesPackMsg(null), 3000)
  }

  return (
    <div className="min-h-dvh flex flex-col p-5 md:p-8 lg:p-12 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-10 pt-2">
        <button
          onClick={() => actions.setScreen('hub')}
          className="text-ink-500 dark:text-ink-400 hover:text-acid transition-colors p-2"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="md:w-8 md:h-8">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="font-display text-3xl md:text-5xl tracking-wider text-green-900 dark:text-acid">SHOP</div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-ink-100 dark:bg-ink-800 rounded-full">
          <div className="w-5 h-5 rounded-full bg-acid flex items-center justify-center text-[11px] font-bold text-ink-950 font-mono shadow-[0_0_10px_rgba(202,255,0,0.4)]">B</div>
          <span className="font-mono text-sm font-bold text-ink-600 dark:text-ink-300 tracking-widest">{user?.bytes || 0}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 md:mb-10">
        <button
          onClick={() => setTab('skins')}
          className={`flex-1 py-3 md:py-4 font-display text-lg md:text-2xl tracking-widest transition-all border-2 ${
            tab === 'skins'
              ? 'border-acid bg-acid/10 text-acid-dark dark:text-acid'
              : 'border-ink-200 dark:border-ink-800 text-ink-400 dark:text-ink-500 hover:border-ink-400 dark:hover:border-ink-600'
          }`}
        >
          🎨 СКИНЫ
        </button>
        <button
          onClick={() => setTab('bytes')}
          className={`flex-1 py-3 md:py-4 font-display text-lg md:text-2xl tracking-widest transition-all border-2 ${
            tab === 'bytes'
              ? 'border-acid bg-acid/10 text-acid-dark dark:text-acid'
              : 'border-ink-200 dark:border-ink-800 text-ink-400 dark:text-ink-500 hover:border-ink-400 dark:hover:border-ink-600'
          }`}
        >
          💰 BYTES
        </button>
      </div>

      {/* Content */}
      {tab === 'skins' ? (
        <div className="space-y-4 md:space-y-6 flex-1">
          {GRID_SKINS.map(skin => {
            const isOwned = owned.includes(skin.id)
            const isActive = activeSkin === skin.id
            const isPurchasing = purchasing === skin.id

            return (
              <div
                key={skin.id}
                className={`border-2 transition-all overflow-hidden ${
                  isActive
                    ? 'border-acid shadow-[0_0_20px_rgba(200,255,0,0.15)]'
                    : 'border-ink-200 dark:border-ink-800'
                }`}
              >
                {/* Skin Preview */}
                <div className="p-4 md:p-5" style={{ background: skin.preview.bg }}>
                  <div className="flex items-center gap-4">
                    {/* Mini grid preview */}
                    <div
                      className="w-20 h-20 md:w-24 md:h-24 grid shrink-0 rounded-lg overflow-hidden"
                      style={{
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        border: `2px solid ${skin.preview.lines}`,
                        background: skin.preview.bg,
                      }}
                    >
                      {Array.from({ length: 9 }, (_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-center aspect-square"
                          style={{
                            borderRight: (i % 3 !== 2) ? `1px solid ${skin.preview.lines}40` : 'none',
                            borderBottom: (i < 6) ? `1px solid ${skin.preview.lines}40` : 'none',
                            color: skin.preview.accent,
                            fontFamily: skin.dark.fontFamily,
                            fontWeight: skin.dark.fontWeight,
                            fontSize: '14px',
                          }}
                        >
                          {[5, '', 3, '', 8, '', 1, '', 7][i]}
                        </div>
                      ))}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className="font-display text-xl md:text-3xl tracking-wider truncate"
                          style={{ color: skin.preview.accent }}
                        >
                          {skin.name}
                        </h3>
                        {isActive && (
                          <span className="text-[9px] md:text-[10px] font-mono bg-acid text-ink-950 px-1.5 py-0.5 font-bold uppercase shrink-0">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm font-mono opacity-60" style={{ color: skin.preview.accent }}>
                        {skin.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 bg-white dark:bg-ink-900">
                  {skin.price === 0 ? (
                    <span className="text-xs font-mono text-green-600 dark:text-green-400 uppercase tracking-widest font-bold">
                      Бесплатно
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-acid flex items-center justify-center text-[9px] font-bold text-ink-950 font-mono">B</div>
                      <span className="font-mono text-sm font-bold text-ink-600 dark:text-ink-300">{skin.price}</span>
                    </div>
                  )}

                  {isActive ? (
                    <span className="text-xs font-mono text-acid uppercase tracking-widest font-bold flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                      Установлен
                    </span>
                  ) : isOwned ? (
                    <button
                      onClick={() => handleEquip(skin.id)}
                      className="px-4 py-2 bg-acid text-ink-900 font-mono text-xs font-bold uppercase tracking-widest hover:bg-acid-dark transition-all active:scale-95"
                    >
                      Установить
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuySkin(skin)}
                      disabled={isPurchasing || (user?.bytes || 0) < skin.price}
                      className="px-4 py-2 bg-acid text-ink-900 font-mono text-xs font-bold uppercase tracking-widest hover:bg-acid-dark transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isPurchasing ? (
                        <div className="w-3 h-3 border-2 border-ink-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
                          </svg>
                          Купить
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Bytes Store */
        <div className="space-y-4 md:space-y-6 flex-1">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-ink-100 dark:bg-ink-800 rounded-full">
              <div className="w-8 h-8 rounded-full bg-acid flex items-center justify-center text-lg font-bold text-ink-950 font-mono shadow-[0_0_15px_rgba(202,255,0,0.4)]">B</div>
              <span className="font-display text-3xl md:text-4xl text-acid-dark dark:text-acid">{user?.bytes || 0}</span>
            </div>
          </div>

          {BYTES_OFFERS.map(offer => (
            <div
              key={offer.id}
              className={`border-2 transition-all overflow-hidden relative ${
                offer.badge === 'Лучшая цена'
                  ? 'border-acid shadow-[0_0_20px_rgba(200,255,0,0.12)]'
                  : 'border-ink-200 dark:border-ink-800'
              }`}
            >
              {offer.badge && (
                <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest ${
                  offer.badge === 'Лучшая цена'
                    ? 'bg-acid text-ink-900'
                    : 'bg-warn text-ink-900'
                }`}>
                  {offer.badge}
                </div>
              )}

              <div className="flex items-center justify-between p-5 md:p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-acid/20 to-acid/5 dark:from-acid/15 dark:to-acid/5 flex items-center justify-center border border-acid/20">
                    <div className="text-center">
                      <div className="w-6 h-6 rounded-full bg-acid flex items-center justify-center text-[11px] font-bold text-ink-950 font-mono mx-auto">B</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-2xl md:text-4xl text-green-900 dark:text-acid tracking-wider">
                      {offer.amount.toLocaleString()}
                    </div>
                    <div className="text-[10px] md:text-xs font-mono text-ink-400 dark:text-ink-500 uppercase tracking-widest">
                      байтов
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleBuyBytes(offer)}
                  className="px-5 py-3 bg-acid text-ink-900 font-display text-xl md:text-2xl tracking-widest hover:bg-acid-dark transition-all active:scale-95"
                >
                  {offer.price}
                </button>
              </div>

              {bytesPackMsg === offer.id && (
                <div className="px-5 pb-4 animate-fade-in">
                  <div className="px-4 py-3 bg-ink-100 dark:bg-ink-800 border border-dashed border-ink-300 dark:border-ink-700">
                    <span className="text-ink-500 dark:text-acid font-mono text-xs uppercase tracking-widest leading-relaxed">
                      Мы ещё работаем над этой частью. Скоро покупка за реальные деньги будет доступна!
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="text-center pt-4">
            <p className="text-xs font-mono text-ink-400 dark:text-ink-600 uppercase tracking-widest">
              Зарабатывай Bytes выигрывая партии и Daily Challenge
            </p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="px-6 py-3 bg-ink-900 dark:bg-ink-100 text-ink-100 dark:text-ink-900 font-mono text-sm shadow-xl border border-acid/30">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
