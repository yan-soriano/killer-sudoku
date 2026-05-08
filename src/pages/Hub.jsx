import { useState, useEffect } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { getUserStats, getHardAttemptsToday, formatTime, getDailyChallengeStatus, getUserBytes, hasCompletedDailyChallenge } from '../lib/api.js'
import { generatePuzzle, generateDailyPuzzle } from '../lib/sudoku.js'
import { createGameSession, incrementHardAttempts } from '../lib/api.js'

const DIFF_CONFIG = {
  easy: { label: 'EASY', sub: 'Бесконечные попытки', color: 'text-green-600 dark:text-green-400', border: 'border-green-600 dark:border-green-400', bg: 'hover:bg-green-600 dark:hover:bg-green-400' },
  medium: { label: 'MEDIUM', sub: 'Бесконечные попытки', color: 'text-warn dark:text-warn', border: 'border-warn dark:border-warn', bg: 'hover:bg-warn dark:hover:bg-warn' },
  hard: { label: 'HARD', sub: 'Ограниченные попытки', color: 'text-danger dark:text-danger', border: 'border-danger dark:border-danger', bg: 'hover:bg-danger dark:hover:bg-danger' },
}

export default function Hub() {
  const { state, actions } = useApp()
  const { user } = state
  const [stats, setStats] = useState([])
  const [hardAttempts, setHardAttempts] = useState(0)
  const [loading, setLoading] = useState(null)
  const [dailyStatus, setDailyStatus] = useState(null)
  const [dailyCompleted, setDailyCompleted] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    const userId = user.id
    const bytesSnapshot = user.bytes ?? 0

    getUserStats(userId).then(setStats).catch(console.error)
    getHardAttemptsToday(userId).then(setHardAttempts).catch(console.error)
    getDailyChallengeStatus(userId).then(status => {
      setDailyStatus(status)
      if (status) setDailyCompleted(true)
    }).catch(console.error)

    // Отдельная надёжная проверка — completed ли daily
    hasCompletedDailyChallenge(userId).then(completed => {
      if (completed) setDailyCompleted(true)
    }).catch(console.error)

    getUserBytes(userId).then(b => {
      if (b !== bytesSnapshot) actions.updateUser({ bytes: b })
    }).catch(console.error)
  }, [user?.id])

  const getStatFor = (diff) => stats.find(s => s.difficulty === diff)

  const handleStart = async (difficulty) => {
    if (difficulty === 'hard') {
      const maxAttempts = user.is_pro ? 5 : 1
      if (hardAttempts >= maxAttempts) {
        setShowPaywall(true)
        setIsUpgrading(false)
        return
      }
    }

    setLoading(difficulty)
    try {
      const puzzle = difficulty === 'daily' ? generateDailyPuzzle() : generatePuzzle(difficulty)

      // Блокировка daily challenge если уже решён
      if (difficulty === 'daily' && dailyCompleted) {
        setLoading(null)
        return
      }

      if (difficulty === 'hard') {
        await incrementHardAttempts(user.id)
        setHardAttempts(prev => prev + 1)
      }

      const session = await createGameSession(user.id, difficulty, puzzle)

      actions.startGame({
        sessionId: session.id,
        puzzle,
        difficulty,
        isDaily: difficulty === 'daily'
      })
    } catch (e) {
      console.error('ERROR STARTING GAME:', e)
      // Если создание сессии в БД упало (например, таблица не создана), 
      // все равно пускаем в игру с временным ID
      try {
        const puzzle = difficulty === 'daily' ? generateDailyPuzzle() : generatePuzzle(difficulty)
        actions.startGame({
          sessionId: 'temp-' + Date.now(),
          puzzle,
          difficulty,
          isDaily: difficulty === 'daily'
        })
      } catch (e2) {
        console.error('CRITICAL ERROR:', e2)
      }
    } finally {
      setLoading(null)
    }
  }

  const hardMax = user?.is_pro ? 5 : 1
  const hardLeft = Math.max(0, hardMax - hardAttempts)

  return (
    <div className="min-h-dvh flex flex-col p-5 md:p-8 lg:p-12 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 md:mb-12 pt-2">
        <div className="flex items-center gap-3 md:gap-5">
          <div
            className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-ink-300 dark:border-ink-600 bg-ink-100 dark:bg-ink-700 flex items-center justify-center cursor-pointer transition-all"
            onClick={() => actions.setScreen('settings')}
          >
            {user?.photo_url
              ? <img src={user.photo_url} className="w-full h-full object-cover" alt="avatar" />
              : <span className="font-display text-xl md:text-3xl text-ink-900 dark:text-acid">{user?.username?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div>
            <div className="font-display text-xl md:text-2xl tracking-wider text-green-800 dark:text-acid flex items-center gap-2">
              {user?.username}
              {user?.is_pro && (
                <span className="text-[10px] md:text-xs font-mono bg-acid text-ink-950 px-1.5 py-0.5 font-bold uppercase">PRO</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-acid flex items-center justify-center text-[10px] md:text-[11px] font-bold text-ink-950 font-mono shadow-[0_0_10px_rgba(202,255,0,0.4)]">B</div>
              <div className="font-mono text-sm font-bold text-ink-600 dark:text-ink-300 tracking-widest">{user?.bytes || 0}</div>
            </div>
          </div>
        </div>

        <button
          onClick={() => actions.setScreen('settings')}
          className="text-ink-500 dark:text-ink-400 hover:text-acid transition-colors p-2"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="md:w-8 md:h-8">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Title */}
      <div className="mb-8 md:mb-10">
        <div className="font-display text-5xl md:text-7xl tracking-wider leading-none text-green-900 dark:text-ink-100 transition-colors">KILLER</div>
        <div className="font-display text-5xl md:text-7xl tracking-wider leading-none text-green-700/60 dark:text-ink-500 transition-colors">SUDOKU</div>
        <div className="w-12 md:w-16 h-1 md:h-1.5 bg-green-600 dark:bg-acid mt-3 md:mt-4" />
      </div>

      <div className="mb-8 md:mb-12">
        <button
          onClick={() => !(dailyStatus || dailyCompleted) && handleStart('daily')}
          disabled={loading === 'daily' || !!dailyStatus || dailyCompleted}
          className={`w-full relative overflow-hidden group transition-all
            ${(dailyStatus || dailyCompleted) ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'}
          `}
        >
          <div className={`p-6 md:p-8 lg:p-10 border-2 transition-colors relative z-10
            ${(dailyStatus || dailyCompleted) ? 'border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900' : 'border-acid bg-acid/5 dark:bg-acid/10'}
          `}>
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="text-xs font-mono text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-1">Ежедневный вызов</div>
                <div className="font-display text-3xl md:text-5xl text-green-900 dark:text-acid mb-2">DAILY CHALLENGE</div>
                {(dailyStatus || dailyCompleted) ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {dailyStatus ? (
                      <>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-mono uppercase tracking-widest font-bold border border-green-200 dark:border-green-800">
                          ✅ {formatTime(dailyStatus.time_spent)}
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-acid text-ink-900 text-xs font-mono uppercase tracking-widest font-bold border border-acid shadow-[0_0_10px_rgba(202,255,0,0.3)]">
                          RANK #{dailyStatus.rank || '?'}
                        </div>
                      </>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-mono uppercase tracking-widest font-bold border border-green-200 dark:border-green-800">
                        ✅ Уже решено сегодня
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm font-mono text-ink-600 dark:text-ink-300">Один пазл для всех — покажи лучший результат</div>
                )}
              </div>
              <div className="flex flex-col items-end">
                {(dailyStatus || dailyCompleted) ? (
                  <div className="text-acid-dark dark:text-acid animate-bounce">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-acid text-ink-900 rounded-full animate-pulse">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
          {!(dailyStatus || dailyCompleted) && <div className="absolute inset-0 bg-acid/10 skew-x-12 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000 p-2" />}
        </button>
      </div>

      {/* Adventure Mode */}
      <div className="mb-8 md:mb-12">
        <button
          onClick={() => actions.setScreen('adventure')}
          className="w-full relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02]"
        >
          <div className="p-6 md:p-8 lg:p-10 border-2 border-green-600/80 bg-gradient-to-br from-green-600/10 via-ink-900/5 to-green-900/10 dark:from-green-600/15 dark:via-ink-950 dark:to-green-900/20 transition-colors relative z-10 overflow-hidden">
            <div className="absolute inset-0 adventure-grid opacity-40 pointer-events-none" style={{ '--adv-accent': '#16a34a' }} />
            <div className="absolute top-0 right-0 p-2 opacity-[0.07] font-mono text-[60px] md:text-[80px] leading-none select-none pointer-events-none">SYS_ADV</div>
            <div className="absolute bottom-2 left-4 text-[9px] font-mono text-green-600/60 dark:text-green-400/50 uppercase tracking-[0.3em] hidden sm:block">
              4 узла · 4 цикла · лут
            </div>

            <div className="flex items-center justify-between relative z-10">
              <div className="text-left">
                <div className="text-xs font-mono text-green-600 dark:text-green-400 uppercase tracking-widest mb-1">Режим приключения</div>
                <div className="font-display text-3xl md:text-5xl text-green-800 dark:text-green-500 mb-2 whitespace-nowrap">ADVENTURE</div>
                <div className="text-sm font-mono text-ink-600 dark:text-ink-300 max-w-[14rem] md:max-w-none">
                  Карта угроз, ключи и награды за каждый сектор
                </div>
              </div>
              <div className="flex flex-col items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-green-600 text-white rounded-xl border border-green-400/30 shadow-[0_0_24px_rgba(21,128,61,0.35)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-green-500/10 skew-x-12 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000 p-2" />
        </button>
      </div>

      {/* Duel Mode */}
      <div className="mb-8 md:mb-12">
        <button
          onClick={() => actions.setScreen('duel')}
          className="w-full relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02]"
        >
          <div className="p-6 md:p-8 lg:p-10 border-2 border-warn bg-warn/5 dark:bg-warn/10 transition-colors relative z-10">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="text-xs font-mono text-warn dark:text-warn-light uppercase tracking-widest mb-1">Режим PVP</div>
                <div className="font-display text-3xl md:text-5xl text-warn-dark dark:text-warn mb-2">DUELS MODE</div>
                <div className="text-sm font-mono text-ink-600 dark:text-ink-300">Соревнуйся с другими игроками или ИИ</div>
              </div>
              <div className="flex flex-col items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-warn text-ink-950 rounded-lg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-warn/10 skew-y-12 translate-y-full group-hover:translate-y-[-100%] transition-transform duration-700 p-2" />
        </button>
      </div>

      {/* Difficulty buttons */}
      <div className="space-y-3 md:space-y-4 mb-8 md:mb-12">
        {Object.entries(DIFF_CONFIG).map(([diff, cfg]) => {
          const stat = getStatFor(diff)
          const isHard = diff === 'hard'
          const blocked = isHard && hardLeft === 0

          return (
            <button
              key={diff}
              onClick={() => handleStart(diff)}
              disabled={!!loading}
              className={`w-full border ${cfg.border} p-4 md:p-6 lg:p-8 flex items-center justify-between transition-all group
                ${blocked ? 'border-dashed opacity-80' : `${cfg.bg} hover:text-ink-900 cursor-pointer`}
                ${loading === diff ? 'opacity-60' : ''}
              `}
            >
              <div className="text-left">
                <div className={`font-display text-2xl md:text-4xl tracking-widest ${cfg.color} group-hover:text-ink-50 dark:group-hover:text-ink-900 transition-colors`}>
                  {cfg.label}
                </div>
                <div className="text-xs md:text-sm font-mono text-ink-500 dark:text-ink-400 group-hover:text-ink-700 dark:group-hover:text-ink-200 transition-colors mt-0.5 md:mt-1">
                  {isHard ? `${hardLeft}/${hardMax} попыток сегодня` : cfg.sub}
                </div>
              </div>

              <div className="text-right text-xs md:text-sm font-mono text-ink-500 dark:text-ink-500 group-hover:text-ink-50 dark:group-hover:text-ink-200 transition-colors">
                {stat ? (
                  <>
                    <div>{stat.total_won}W / {stat.total_lost}L</div>
                    {stat.best_time && <div>🏆 {formatTime(stat.best_time)}</div>}
                    {stat.current_streak > 0 && <div>🔥 {stat.current_streak}</div>}
                  </>
                ) : (
                  <div>Нет игр</div>
                )}
              </div>

              {loading === diff && (
                <div className="ml-3 w-4 h-4 md:w-6 md:h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          )
        })}
      </div>

      {/* Quick stats */}
      <div className="mt-auto grid grid-cols-3 gap-3 md:gap-5">
        {['easy', 'medium', 'hard'].map(diff => {
          const stat = getStatFor(diff)
          const total = (stat?.total_won ?? 0) + (stat?.total_lost ?? 0)
          const wr = total > 0 ? Math.round((stat.total_won / total) * 100) : null
          return (
            <div key={diff} className="bg-ink-100 dark:bg-ink-800 p-3 md:p-6 text-center transition-colors">
              <div className="text-[10px] md:text-sm font-mono text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-1 md:mb-2">{diff}</div>
              <div className="font-display text-2xl md:text-5xl text-acid-dark dark:text-acid">{wr !== null ? `${wr}%` : '—'}</div>
              <div className="text-xs md:text-sm font-mono text-ink-400 dark:text-ink-600">побед</div>
            </div>
          )
        })}
      </div>
      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-ink-900 border-2 border-acid p-8 relative overflow-hidden transition-all">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-acid/20 rounded-full blur-3xl" />

            <button
              onClick={() => setShowPaywall(false)}
              className="absolute top-4 right-4 text-ink-400 hover:text-ink-900 dark:hover:text-acid transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center">
              <div className="inline-block px-3 py-1 bg-acid text-ink-900 text-[10px] font-mono font-bold tracking-widest uppercase mb-4">
                Limit Reached
              </div>
              <h2 className="font-display text-4xl text-green-900 dark:text-acid mb-4 leading-tight">
                ПОРА ПЕРЕЙТИ<br />НА PRO УРОВЕНЬ
              </h2>
              <p className="text-ink-500 dark:text-ink-400 font-mono text-sm mb-8 leading-relaxed">
                Вы использовали бесплатную попытку уровня HARD на сегодня. Стань PRO, чтобы получать 5 попыток ежедневно и доступ к эксклюзивным функциям.
              </p>

              {isUpgrading ? (
                <div className="py-4 px-6 bg-ink-100 dark:bg-ink-800 border border-dashed border-ink-300 dark:border-ink-700 animate-pulse">
                  <span className="text-ink-600 dark:text-acid font-mono text-xs uppercase tracking-widest leading-relaxed">
                    Мы еще работаем над этой частью программы. Скоро подписка будет доступна!
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => setIsUpgrading(true)}
                    className="w-full py-4 bg-acid text-ink-900 font-display text-xl tracking-widest hover:bg-acid-dark transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    🚀 ПОВЫСИТЬ УРОВЕНЬ
                  </button>
                  <button
                    onClick={() => setShowPaywall(false)}
                    className="w-full py-2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200 font-mono text-xs uppercase tracking-widest transition-colors"
                  >
                    Вернуться позже
                  </button>
                </div>
              )}
            </div>

            {/* Decorations */}
            <div className="mt-8 pt-6 border-t border-ink-100 dark:border-ink-800 flex justify-center gap-6 opacity-40">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono text-ink-500 uppercase">Streak</span>
                <span className="text-xs dark:text-acid">🔥</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono text-ink-500 uppercase">Support</span>
                <span className="text-xs dark:text-acid">⭐</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono text-ink-500 uppercase">Unlimited</span>
                <span className="text-xs dark:text-acid">⚡</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
