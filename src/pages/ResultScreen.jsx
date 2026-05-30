import { useState, useEffect, useRef } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { formatTime, submitDailyScore, getDailyLeaderboard, updateUserBytes, grantAdventureWin } from '../lib/api.js'
import AdventureRewardLoot from '../components/AdventureRewardLoot.jsx'
import { VIRUS_CYCLES } from '../lib/adventure_config.js'
import { buildLootItem } from '../lib/adventure_items.js'
import { sfx } from '../lib/sounds.js'

export default function ResultScreen() {
  const { state, actions } = useApp()
  const { user, game } = state
  const { result, difficulty, isDaily, isAdventure } = game
  const { won, errors, time, hints, surrendered } = result

  const [leaderboard, setLeaderboard] = useState([])
  const [loadingLB, setLoadingLB] = useState(false)

  const [reward, setReward] = useState(0)
  const [cycleBonus, setCycleBonus] = useState(0)
  const [adventureSaved, setAdventureSaved] = useState(!(isAdventure && won))
  const [lootReady, setLootReady] = useState(!(isAdventure && won))
  const adventureProgressApplied = useRef(false)

  const cycleConfig = isAdventure
    ? VIRUS_CYCLES[(Number(game.adventureCycle) - 1) % VIRUS_CYCLES.length]
    : null
  const stepIdx = Number(game.adventureStep) || 0
  const nextStepName = cycleConfig?.steps[stepIdx + 1]?.name
  const lootItem = isAdventure && won && stepIdx < 3 && cycleConfig
    ? buildLootItem({
        cycleIdx: Number(game.adventureCycle) || 1,
        cycleName: cycleConfig.name,
        fromStep: stepIdx,
        detail: game.adventureDetail,
        stepName: game.adventureStepName,
        targetStepName: nextStepName || 'Следующий сектор',
      })
    : null

  useEffect(() => {
    if (won) sfx.win()
  }, [won])

  useEffect(() => {
    if (!won && !surrendered) return

    let earn = 0
    let bonus = 0
    if (won) {
      if (isDaily) earn = 25
      else if (isAdventure) earn = game.adventureStepReward ?? 10
      else if (difficulty === 'hard') earn = 15
      else earn = 5
    }

    if (isAdventure && won && stepIdx === 3) {
      bonus = game.adventureCycleBonus ?? 30
    }

    if (earn > 0 || bonus > 0) {
      setReward(earn)
      setCycleBonus(bonus)
      const total = earn + bonus
      updateUserBytes(user.id, total)
        .then(newBytes => actions.updateUser({ bytes: newBytes }))
        .catch(e => {
          console.error(e)
          actions.updateUser({ bytes: (user.bytes || 0) + total })
        })
    }

    if (isDaily) {
      setLoadingLB(true)
      submitDailyScore(user.id, { timeSpent: time, hintsUsed: hints, errorsCount: errors, won })
        .then(() => (won ? getDailyLeaderboard() : []))
        .then(data => {
          if (!won) return
          const exists = data.some(entry => entry.users?.username === user.username)
          if (!exists) {
            const myEntry = { time_spent: time, users: { username: user.username, photo_url: user.photo_url, id: user.id } }
            setLeaderboard([...data, myEntry].sort((a, b) => a.time_spent - b.time_spent))
          } else setLeaderboard(data)
        })
        .finally(() => setLoadingLB(false))
    }

    if (isAdventure && won) {
      if (adventureProgressApplied.current) return
      adventureProgressApplied.current = true

      setAdventureSaved(false)
      setLootReady(false)

      grantAdventureWin(user.id, {
        cycle: game.adventureCycle,
        cycleName: cycleConfig?.name,
        step: stepIdx,
        detail: game.adventureDetail,
        stepName: game.adventureStepName,
        targetStepName: nextStepName || 'Следующий сектор',
        isLastStep: stepIdx === 3,
      })
        .then(() => {
          setAdventureSaved(true)
        })
        .catch(e => {
          console.error('Adventure progress save error:', e)
          setAdventureSaved(true)
        })
    }
  }, [isDaily, isAdventure, won, user.id, time, hints, errors, surrendered, game.adventureCycle, game.adventureStep])

  const handleContinue = () => {
    if (isAdventure && won && (!adventureSaved || !lootReady)) return
    actions.setScreen(isAdventure ? 'adventure' : 'hub')
  }

  const showAdventureLoot = isAdventure && won

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 md:p-8 lg:p-12 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto text-center transition-all">
      {showAdventureLoot ? (
        <>
          <AdventureRewardLoot
            bytes={reward}
            cycleBonus={cycleBonus}
            lootItem={lootItem}
            accentColor={cycleConfig?.color}
            onReady={() => setLootReady(true)}
          />

          <div className="w-full grid grid-cols-3 gap-3 mt-10 mb-8">
            <StatCard label="Время" value={formatTime(time)} />
            <StatCard label="Ошибки" value={`${errors}/3`} />
            <StatCard label="Подсказки" value={`${hints}`} />
          </div>
        </>
      ) : (
        <>
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

            {(reward > 0 || cycleBonus > 0) && won && (
              <div className="mt-8 flex flex-col items-center gap-3 animate-bounce">
                {reward > 0 && (
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-acid text-ink-950 rounded-full font-mono font-bold text-xl md:text-2xl shadow-[0_0_30px_rgba(202,255,0,0.4)]">
                    <div className="w-8 h-8 rounded-full bg-ink-950 text-acid flex items-center justify-center">B</div>
                    +{reward + cycleBonus} BYTES
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full grid grid-cols-3 gap-3 md:gap-6 mb-10 md:mb-16">
            <StatCard label="Время" value={formatTime(time)} />
            <StatCard label="Ошибки" value={`${errors}/3`} warn={errors === 3} />
            <StatCard label="Подсказки" value={`${hints}/3`} />
          </div>

          <div className="mb-10">
            <span className="font-mono text-xs text-ink-500 dark:text-ink-500 uppercase tracking-widest border border-ink-300 dark:border-ink-700 px-3 py-1">
              {difficulty}
            </span>
          </div>
        </>
      )}

      {isDaily && won && !showAdventureLoot && (
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
                      <span className="font-mono text-sm text-ink-900 dark:text-ink-100 font-bold">
                        {entry.users?.username}
                      </span>
                    </div>
                    <div className="font-mono text-sm text-acid-dark dark:text-acid font-bold">
                      {formatTime(entry.time_spent)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-ink-500 font-mono text-sm">Пока нет результатов</div>
            )}
          </div>
        </div>
      )}

      <div className="w-full space-y-3">
        <button
          onClick={handleContinue}
          disabled={isAdventure && won && (!adventureSaved || !lootReady)}
          className="w-full py-4 bg-acid text-ink-900 font-semibold text-lg tracking-wide hover:bg-acid-dark transition-colors disabled:opacity-50"
        >
          {isAdventure && won && !adventureSaved
            ? 'СОХРАНЕНИЕ...'
            : isAdventure && won && !lootReady
              ? '...'
              : isAdventure
                ? (lootItem ? `НА КАРТУ — ${lootItem.useVerb.toUpperCase()}` : 'НА КАРТУ')
                : 'ИГРАТЬ ЕЩЁ'}
        </button>
        <button
          onClick={() => actions.setScreen('hub')}
          className="w-full py-3 border border-ink-300 dark:border-ink-700 text-ink-500 dark:text-ink-400 font-mono text-sm uppercase tracking-widest hover:border-ink-900 dark:hover:border-ink-500 transition-colors"
        >
          В Меню
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, warn }) {
  return (
    <div className="bg-ink-100 dark:bg-ink-800 p-4 md:p-6 transition-colors">
      <div className="text-[10px] md:text-sm font-mono text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-2">{label}</div>
      <div className={`font-display text-2xl md:text-4xl tracking-wider ${warn ? 'text-danger' : 'text-acid-dark dark:text-acid'}`}>{value}</div>
    </div>
  )
}
