import { useState, useEffect, useRef } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { getAdventureProgress, createGameSession, useAdventureKey, getUserBytes } from '../lib/api.js'
import { VIRUS_CYCLES } from '../lib/adventure_config.js'
import { generatePuzzle } from '../lib/sudoku.js'
import AdventureLevelMap from '../components/AdventureLevelMap.jsx'
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
            <AdventureLevelMap
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

function AdventurePreLevel({ cycle, step, stepIdx, onStart, onBack }) {
    const lootPreview = getStepLootPreview(stepIdx)
    const isLight = cycle.theme === 'gold'
    const panel = isLight ? 'bg-black/[0.03] border-black/15' : 'bg-white/5 border-white/10'
    const muted = isLight ? 'text-black/50' : 'opacity-50'

    return (
        <div className={`min-h-dvh ${cycle.bg} flex flex-col p-6 sm:p-8 font-mono relative overflow-hidden ${isLight ? 'text-black' : 'text-white'}`}>
            <div className="absolute inset-0 pointer-events-none opacity-30"
                style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${cycle.color}22, transparent)` }}
            />

            <button type="button" onClick={onBack} className={`self-start text-xs mb-8 uppercase tracking-widest relative z-10 ${muted} hover:opacity-100`}>
                ← Назад к карте
            </button>

            <div className="flex-1 max-w-lg mx-auto flex flex-col justify-center relative z-10 w-full">
                <div className={`p-5 border-2 mb-6 ${panel}`} style={{ borderColor: `${cycle.color}44` }}>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 border-2 flex flex-col items-center justify-center shrink-0"
                            style={{ borderColor: cycle.color, boxShadow: `0 0 20px ${cycle.color}33` }}
                        >
                            <span className="text-[8px] uppercase opacity-50">узел</span>
                            <span className="text-2xl font-display leading-none" style={{ color: cycle.color }}>{stepIdx + 1}</span>
                        </div>
                        <div>
                            <div className={`text-[10px] uppercase tracking-widest ${muted}`}>Шаг {stepIdx + 1} · {cycle.name}</div>
                            <div className="text-2xl sm:text-3xl font-display uppercase tracking-widest leading-tight" style={{ color: cycle.color }}>
                                {step.name}
                            </div>
                        </div>
                    </div>
                </div>

                <blockquote className={`text-base sm:text-lg leading-relaxed mb-8 pl-4 border-l-2 font-light italic ${isLight ? 'text-black/70' : 'opacity-90'}`}
                    style={{ borderColor: cycle.color }}
                >
                    {step.desc}
                </blockquote>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                    <div className={`p-4 border-2 ${panel}`}>
                        <div className={`text-[10px] uppercase mb-2 ${muted}`}>Награда</div>
                        <div className="text-2xl font-display tabular-nums" style={{ color: cycle.color }}>+{step.bytes} B</div>
                        <div className={`text-[9px] mt-1 ${muted}`}>за прохождение</div>
                    </div>
                    <div className={`p-4 border-2 flex flex-col items-center text-center ${panel}`}>
                        <div className={`text-[10px] uppercase mb-2 ${muted}`}>
                            {lootPreview?.categoryLabel || 'Добыча'}
                        </div>
                        {lootPreview && (
                            <AdventureItemIcon type={lootPreview.icon} color={cycle.color} size="sm" />
                        )}
                        <div className="text-sm font-bold uppercase tracking-tight mt-2">{step.detail}</div>
                    </div>
                </div>

                {lootPreview && stepIdx < 3 && (
                    <p className={`text-xs mb-8 leading-relaxed border-l-2 pl-3 py-1 ${isLight ? 'text-black/55' : 'opacity-60'}`} style={{ borderColor: cycle.color }}>
                        После победы получишь «{step.detail}». {lootPreview.useVerb} на карте откроет следующий узел.
                    </p>
                )}

                <button
                    type="button"
                    onClick={onStart}
                    className="w-full py-5 font-bold uppercase tracking-[0.25em] text-lg sm:text-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{ backgroundColor: cycle.color, color: '#000', boxShadow: `0 0 40px ${cycle.color}44` }}
                >
                    Начать взлом
                </button>
            </div>
        </div>
    )
}
