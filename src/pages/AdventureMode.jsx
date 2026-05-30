import { useState, useEffect, useRef } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { getAdventureProgress, createGameSession, useAdventureKey, getUserBytes } from '../lib/api.js'
import { VIRUS_CYCLES } from '../lib/adventure_config.js'
import { generatePuzzle } from '../lib/sudoku.js'
import AdventureInventory from '../components/AdventureInventory.jsx'
import AdventureItemIcon from '../components/AdventureItemIcon.jsx'
import { enrichInventory, getStepLootPreview } from '../lib/adventure_items.js'
import { playClick, sfx } from '../lib/sounds.js'

export default function AdventureMode() {
    const { state, actions } = useApp()
    const { screen } = state
    const { user } = state

    const [loading, setLoading] = useState(true)
    const [progress, setProgress] = useState(null)
    const [adventureScreen, setAdventureScreen] = useState('map')
    const [currentCycle, setCurrentCycle] = useState(null)
    const [currentStep, setCurrentStep] = useState(null)
    const [keyFlash, setKeyFlash] = useState(null)

    const loadIdRef = useRef(0)

    useEffect(() => {
        if (!user?.id || screen !== 'adventure') return

        const loadId = ++loadIdRef.current
        setLoading(true)
        setAdventureScreen('map')

        const fallbackProgress = {
            current_cycle: 1,
            current_step: 0,
            completed_cycles: 0,
            completed_steps: [],
            inventory: [],
        }

        ;(async () => {
            try {
                const [data, bytes] = await Promise.all([
                    getAdventureProgress(user.id),
                    getUserBytes(user.id),
                ])
                if (loadId !== loadIdRef.current) return

                const step = Number(data.current_step) || 0
                const cycleNum = Number(data.current_cycle) || 1
                const normalized = {
                    ...data,
                    current_step: step,
                    current_cycle: cycleNum,
                    completed_steps: data.completed_steps || [],
                    inventory: enrichInventory(data.inventory || []),
                }
                setProgress(normalized)
                const cycle = VIRUS_CYCLES[(cycleNum - 1) % VIRUS_CYCLES.length]
                setCurrentCycle(cycle)
                setCurrentStep(cycle.steps[Math.min(step, cycle.steps.length - 1)])

                if (bytes !== (user.bytes ?? 0)) {
                    actions.updateUser({ bytes })
                }
            } catch (e) {
                console.error('Adventure load failed:', e)
                if (loadId !== loadIdRef.current) return
                setProgress(fallbackProgress)
                const cycle = VIRUS_CYCLES[0]
                setCurrentCycle(cycle)
                setCurrentStep(cycle.steps[0])
            } finally {
                if (loadId === loadIdRef.current) setLoading(false)
            }
        })()
    }, [user?.id, screen])

    const handleStartLevel = async () => {
        playClick()
        const step = progress.current_step
        if (progress.completed_steps.includes(step)) return

        const puzzle = generatePuzzle(currentCycle.difficulty)
        const nextStep = currentCycle.steps[step + 1]
        const gamePayload = {
            puzzle,
            difficulty: currentCycle.difficulty,
            isAdventure: true,
            adventureStep: step,
            adventureCycle: progress.current_cycle,
            adventureStepReward: currentStep.bytes,
            adventureCycleBonus: currentCycle.bonus,
            adventureStepName: currentStep.name,
            adventureDetail: currentStep.detail,
            adventureTargetStepName: nextStep?.name,
        }

        try {
            const session = await createGameSession(user.id, currentCycle.difficulty, puzzle)
            actions.startGame({ ...gamePayload, sessionId: session.id })
        } catch (e) {
            console.error('Adventure session error:', e)
            actions.startGame({ ...gamePayload, sessionId: 'temp-' + Date.now() })
        }
    }

    const handleUseKey = (keyId) => {
        const item = progress.inventory.find(k => k.id === keyId)
        if (!item) return

        try {
            const updated = useAdventureKey(user.id, keyId)
            const enriched = { ...updated, inventory: enrichInventory(updated.inventory) }
            sfx.keyUse()
            setProgress(enriched)
            const step = Number(enriched.current_step) || 0
            const cycle = VIRUS_CYCLES[(Number(enriched.current_cycle) - 1) % VIRUS_CYCLES.length]
            setCurrentCycle(cycle)
            setCurrentStep(cycle.steps[Math.min(step, cycle.steps.length - 1)])
            setKeyFlash(step)
            setTimeout(() => setKeyFlash(null), 1500)
        } catch (e) {
            console.error(e)
        }
    }

    if (loading) return <div className="min-h-dvh flex items-center justify-center bg-ink-950 text-acid">ЗАГРУЗКА ДАННЫХ...</div>

    const canPlay = !progress.completed_steps.includes(progress.current_step)
    const hasKeys = progress.inventory.length > 0

    if (adventureScreen === 'map') {
        return (
            <AdventureMap
                progress={progress}
                cycle={currentCycle}
                userBytes={user.bytes || 0}
                canPlay={canPlay}
                hasKeys={hasKeys}
                keyFlash={keyFlash}
                onSelect={() => { playClick(); setAdventureScreen('pre') }}
                onBack={() => { playClick(); actions.setScreen('hub') }}
                onUseKey={handleUseKey}
            />
        )
    }

    if (adventureScreen === 'pre') {
        return (
            <AdventurePreLevel
                cycle={currentCycle}
                step={currentStep}
                stepIdx={progress.current_step}
                onStart={handleStartLevel}
                onBack={() => { playClick(); setAdventureScreen('map') }}
            />
        )
    }

    return null
}

function AdventureMap({
    progress, cycle, userBytes, canPlay, hasKeys, keyFlash,
    onSelect, onBack, onUseKey,
}) {
    const currentStep = Number(progress.current_step) || 0
    const completed = progress.completed_steps || []

    return (
        <div className={`min-h-dvh ${cycle.bg} text-white flex flex-col p-6 font-mono overflow-hidden relative transition-colors duration-1000`}>
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
                {cycle.theme === 'glitch' && <div className="absolute inset-0 bg-red-900 animate-pulse" />}
                {cycle.theme === 'terminal' && <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent,transparent_2px,rgba(0,255,65,0.1)_2px,rgba(0,255,65,0.1)_4px)]" />}
            </div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <button type="button" onClick={onBack} className="text-sm opacity-50 hover:opacity-100 transition-opacity">← В МЕНЮ</button>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 border border-white/20 rounded-full">
                        <div className="w-3 h-3 rounded-full bg-acid" />
                        <span className="font-bold text-sm">{userBytes} B</span>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] opacity-70">УГРОЗА</div>
                        <div className="text-xl font-display tracking-widest" style={{ color: cycle.color }}>{cycle.name}</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                <div className="text-center mb-8">
                    <div className="text-sm tracking-[0.2em] mb-2 uppercase opacity-80">Система заражена</div>
                    <div className="text-4xl font-display uppercase tracking-widest">Вирусная атака</div>
                </div>

                <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {[0, 1, 2].map(i => {
                            const x1 = 50 + 35 * Math.cos((i * 90 - 45) * Math.PI / 180)
                            const y1 = 50 + 35 * Math.sin((i * 90 - 45) * Math.PI / 180)
                            const x2 = 50 + 35 * Math.cos(((i + 1) * 90 - 45) * Math.PI / 180)
                            const y2 = 50 + 35 * Math.sin(((i + 1) * 90 - 45) * Math.PI / 180)
                            const isPassed = completed.includes(i)
                            return (
                                <line
                                    key={i}
                                    x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
                                    stroke={isPassed ? cycle.color : '#333'}
                                    strokeWidth="3"
                                    strokeDasharray={isPassed ? 'none' : '5,5'}
                                />
                            )
                        })}
                    </svg>

                    {cycle.steps.map((step, i) => {
                        const angle = (i * 90 - 45) * Math.PI / 180
                        const x = 50 + 35 * Math.cos(angle)
                        const y = 50 + 35 * Math.sin(angle)
                        const isPassed = completed.includes(i)
                        const isPlayable = i === currentStep && canPlay
                        const isLocked = !isPassed && !isPlayable
                        const justUnlocked = keyFlash === i

                        return (
                            <div
                                key={i}
                                className="absolute -translate-x-1/2 -translate-y-1/2"
                                style={{ left: `${x}%`, top: `${y}%` }}
                            >
                                <button
                                    type="button"
                                    disabled={isLocked}
                                    onClick={isPlayable ? onSelect : undefined}
                                    className={`
                                        w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-500
                                        ${isPassed ? 'border-none bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]' : ''}
                                        ${isPlayable ? 'border-white scale-110 shadow-2xl animate-pulse bg-white/10' : ''}
                                        ${justUnlocked ? 'ring-4 ring-acid scale-125' : ''}
                                        ${isLocked ? 'border-white/10 text-white/10 bg-black/20' : ''}
                                    `}
                                >
                                    {isPassed ? (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : isLocked ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    ) : (
                                        <div className="text-xl font-bold">{i + 1}</div>
                                    )}
                                </button>
                                <div className={`mt-3 text-center whitespace-nowrap text-[10px] tracking-widest uppercase ${isLocked ? 'opacity-20' : 'opacity-100'}`}>
                                    {step.name}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="mt-6 space-y-4 relative z-10">
                <AdventureInventory
                    items={progress.inventory}
                    accentColor={cycle.color}
                    onUseItem={onUseKey}
                />

                {hasKeys && !canPlay && (
                    <p className="text-center text-xs uppercase tracking-widest opacity-70 animate-pulse px-4">
                        ↑ {progress.inventory[0]?.useVerb || 'Используй предмет'} в инвентаре, чтобы открыть «{progress.inventory[0]?.targetStepName}»
                    </p>
                )}

                <div className="text-center">
                    <div className="text-[10px] opacity-40 mb-1">
                        {canPlay ? 'АКТИВНЫЙ УЗЕЛ' : hasKeys ? 'ОЖИДАНИЕ КЛЮЧА' : 'ЗАВЕРШЕНО'}
                    </div>
                    <div className="text-lg uppercase tracking-[0.3em] font-display">
                        {cycle.steps[currentStep]?.name}
                    </div>
                    {canPlay && (
                        <button
                            type="button"
                            onClick={onSelect}
                            className="mt-4 px-12 py-4 bg-white text-black font-bold uppercase tracking-[0.2em] hover:scale-105 transition-transform"
                        >
                            Начать взлом
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function AdventurePreLevel({ cycle, step, stepIdx, onStart, onBack }) {
    const lootPreview = getStepLootPreview(stepIdx)

    return (
        <div className={`min-h-dvh ${cycle.bg} text-white flex flex-col p-8 font-mono`}>
            <button type="button" onClick={onBack} className="self-start text-xs opacity-50 hover:opacity-100 mb-12 uppercase tracking-widest">← Назад к карте</button>

            <div className="flex-1 max-w-lg mx-auto flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 border-2 border-white/20 flex items-center justify-center text-2xl font-bold">
                        {stepIdx + 1}
                    </div>
                    <div>
                        <div className="text-[10px] opacity-50 uppercase tracking-widest">Шаг {stepIdx + 1}</div>
                        <div className="text-2xl font-display uppercase tracking-widest" style={{ color: cycle.color }}>{step.name}</div>
                    </div>
                </div>

                <p className="text-lg leading-relaxed mb-12 font-light opacity-90 italic">"{step.desc}"</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-white/5 border border-white/10">
                        <div className="text-[10px] opacity-50 uppercase mb-2">Награда</div>
                        <div className="text-xl font-display" style={{ color: cycle.color }}>{step.bytes} B</div>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 flex flex-col items-center text-center">
                        <div className="text-[10px] opacity-50 uppercase mb-2">
                            {lootPreview?.categoryLabel || 'Добыча'}
                        </div>
                        {lootPreview && (
                            <AdventureItemIcon type={lootPreview.icon} color={cycle.color} size="sm" />
                        )}
                        <div className="text-sm font-bold uppercase tracking-tighter mt-2">{step.detail}</div>
                    </div>
                </div>

                {lootPreview && stepIdx < 3 && (
                    <p className="text-xs font-mono opacity-60 mb-8 leading-relaxed border-l-2 pl-3" style={{ borderColor: cycle.color }}>
                        После победы получишь «{step.detail}». {lootPreview.useVerb} на карте откроет следующий узел.
                    </p>
                )}

                <button
                    type="button"
                    onClick={onStart}
                    className="w-full py-5 bg-white text-black font-bold uppercase tracking-[0.3em] text-xl hover:bg-opacity-90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                    Начать взлом
                </button>
            </div>
        </div>
    )
}
