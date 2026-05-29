import { useState, useEffect } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { formatTime, submitDailyScore, getDailyLeaderboard } from '../lib/api.js'

export default function ResultScreen() {
  const { state, actions } = useApp()
  const { user, game } = state
  const { result, difficulty, isDaily } = game
  const { won, errors, time, hints, surrendered } = result

  const [leaderboard, setLeaderboard] = useState([])
  const [loadingLB, setLoadingLB] = useState(false)

  useEffect(() => {
    if (isDaily) {
      setLoadingLB(true)
      submitDailyScore(user.id, { timeSpent: time, hintsUsed: hints, errorsCount: errors, won })
        .then(() => {
          if (won) return getDailyLeaderboard()
          return []
        })
        .then(data => {
          if (!won) return
          // Если пользователя нет в топ-10, добавим его вручную для наглядности (если загрузка прошла успешно)
          const exists = data.some(entry => entry.users?.username === user.username)
          if (!exists) {
            const myEntry = {
              time_spent: time,
              users: { username: user.username, photo_url: user.photo_url, id: user.id }
            }
            // Вставим в правильное место или в конец
            const sorted = [...data, myEntry].sort((a, b) => a.time_spent - b.time_spent)
            setLeaderboard(sorted)
          } else {
            setLeaderboard(data)
          }
        })
        .catch(console.error)
        .finally(() => setLoadingLB(false))
    }
  }, [isDaily, won, user.id, time, hints, errors, user.username, user.photo_url])

  const handlePlayAgain = () => {
    actions.setScreen('hub')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 md:p-8 lg:p-12 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto text-center transition-all">
      {/* Big status */}
      <div className="mb-10 md:mb-16">
        {won ? (
          <>
            <div className="font-display text-8xl md:text-[12rem] tracking-wider text-green-900 dark:text-acid mb-2 md:mb-4 transition-colors">WIN</div>
            <div className="text-ink-500 dark:text-ink-400 font-mono text-sm md:text-xl uppercase tracking-widest">Головоломка решена</div>
          </>
        ) : surrendered ? (
          <>
            <div className="font-display text-7xl md:text-9xl tracking-wider text-ink-400 dark:text-ink-500 mb-2 md:mb-4">GG</div>
            <div className="text-ink-400 dark:text-ink-500 font-mono text-sm md:text-xl uppercase tracking-widest">Сдался</div>
          </>
        ) : (
          <>
            <div className="font-display text-7xl md:text-9xl tracking-wider text-danger mb-2 md:mb-4">GAME OVER</div>
            <div className="text-ink-500 dark:text-ink-400 font-mono text-sm md:text-xl uppercase tracking-widest">3 ошибки — конец игры</div>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="w-full grid grid-cols-3 gap-3 md:gap-6 mb-10 md:mb-16">
        <StatCard label="Время" value={formatTime(time)} />
        <StatCard label="Ошибки" value={`${errors}/3`} warn={errors === 3} />
        <StatCard label="Подсказки" value={`${hints}/3`} />
      </div>

      {/* Difficulty badge */}
      <div className="mb-10">
        <span className="font-mono text-xs text-ink-500 dark:text-ink-500 uppercase tracking-widest border border-ink-300 dark:border-ink-700 px-3 py-1">
          {difficulty}
        </span>
      </div>

      {/* Leaderboard for Daily Challenge */}
      {isDaily && won && (
        <div className="w-full mb-10 md:mb-16 animate-fade-in">
          <div className="text-left mb-4">
            <div className="text-xs font-mono text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-1">Leaderboard</div>
            <div className="font-display text-2xl text-acid-dark dark:text-acid">ТАБЛИЦА ЛИДЕРОВ</div>
          </div>

          <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 transition-colors">
            {loadingLB ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-acid border-t-transparent rounded-full animate-spin" />
              </div>
            ) : leaderboard.length > 0 ? (
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {leaderboard.map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-ink-400 w-4">{idx + 1}.</span>
                      <div className="w-8 h-8 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden border border-ink-200 dark:border-ink-700">
                        {entry.users?.photo_url ? (
                          <img src={entry.users.photo_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-ink-500">
                            {entry.users?.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-sm text-ink-900 dark:text-ink-100 font-bold">
                        {entry.users?.username}
                        {entry.users?.username === user.username && <span className="ml-2 text-[10px] bg-acid text-ink-900 px-1">YOU</span>}
                      </span>
                    </div>
                    <div className="font-mono text-sm text-acid-dark dark:text-acid font-bold">
                      {formatTime(entry.time_spent)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-ink-500 font-mono text-sm">Пока нет результатов. Будь первым!</div>
            )}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="w-full space-y-3">
        <button
          onClick={handlePlayAgain}
          className="w-full py-4 bg-acid text-ink-900 font-semibold text-lg tracking-wide hover:bg-acid-dark transition-colors"
        >
          ИГРАТЬ ЕЩЁ
        </button>
        <button
          onClick={() => actions.setScreen('hub')}
          className="w-full py-3 border border-ink-300 dark:border-ink-700 text-ink-500 dark:text-ink-400 font-mono text-sm uppercase tracking-widest hover:border-ink-900 dark:hover:border-ink-500 hover:text-ink-900 dark:hover:text-ink-200 transition-colors"
        >
          В Меню
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, warn }) {
  return (
    <div className="bg-ink-100 dark:bg-ink-800 p-4 md:p-8 transition-colors">
      <div className="text-[10px] md:text-sm font-mono text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-2 md:mb-4">{label}</div>
      <div className={`font-display text-3xl md:text-6xl tracking-wider ${warn ? 'text-danger' : 'text-acid-dark dark:text-acid'}`}>{value}</div>
    </div>
  )
}
