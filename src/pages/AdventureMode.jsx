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

    if (loading) return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-ink-950 text-acid font-mono">
            <div className="w-14 h-14 border-2 border-acid border-t-transparent rounded-full animate-spin" />
            <div className="text-xs uppercase tracking-[0.35em]">Сканирование секторов…</div>
        </div>
    )

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

const DIFF_LABELS = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' }

function AdventureBackdrop({ cycle }) {
    const light = cycle.theme === 'gold'
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            <div
                className="absolute inset-0 adventure-grid opacity-60"
                style={{ '--adv-accent': cycle.color }}
            />
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[80%] rounded-full blur-3xl opacity-25"
                style={{ background: `radial-gradient(circle, ${cycle.color} 0%, transparent 70%)` }}
            />
            <div className={`absolute inset-0 adventure-scanlines opacity-30 ${light ? 'invert' : ''}`} />
            {cycle.theme === 'glitch' && (
                <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-transparent to-black/60" />
            )}
            {cycle.theme === 'terminal' && (
                <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent,transparent_3px,rgba(0,255,65,0.04)_3px,rgba(0,255,65,0.04)_6px)]" />
            )}
            {cycle.theme === 'bsod' && (
                <div className="absolute inset-0 bg-gradient-to-t from-[#000088]/80 via-transparent to-[#0078d7]/20" />
            )}
        </div>
    )
}

function AdventureMap({
    progress, cycle, userBytes, canPlay, hasKeys, keyFlash,
    onSelect, onBack, onUseKey,
}) {
    const currentStep = Number(progress.current_step) || 0
    const completed = progress.completed_steps || []
    const cleared = completed.length
    const total = cycle.steps.length
    const light = cycle.theme === 'gold'
    const muted = light ? 'text-black/50' : 'text-white/50'
    const panel = light ? 'bg-black/5 border-black/15' : 'bg-black/40 border-white/10'
    const activeStep = cycle.steps[currentStep]

    return (
        <div
            className={`min-h-dvh ${cycle.bg} flex flex-col p-4 md:p-6 font-mono overflow-hidden relative transition-colors duration-700`}
            style={{ '--adv-accent': cycle.color }}
        >
            <AdventureBackdrop cycle={cycle} />

            {/* HUD header */}
            <header className="relative z-10 flex flex-col gap-3 mb-4 max-w-lg mx-auto w-full">
                <div className="flex justify-between items-start gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className={`text-[10px] uppercase tracking-widest px-3 py-2 border ${panel} backdrop-blur-sm hover:border-current transition-colors`}
                        style={{ borderColor: `${cycle.color}44`, color: cycle.color }}
                    >
                        ← Меню
                    </button>
                    <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-full backdrop-blur-sm ${panel}`}>
                        <div className="w-2.5 h-2.5 rounded-full bg-acid shadow-[0_0_8px_#c8ff00]" />
                        <span className="font-bold text-sm tabular-nums">{userBytes} B</span>
                    </div>
                </div>

                <div className={`p-4 border backdrop-blur-md ${panel}`}>
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <div className={`text-[9px] uppercase tracking-[0.25em] ${muted}`}>Цикл {progress.current_cycle} · угроза</div>
                            <div className="font-display text-2xl md:text-3xl tracking-widest leading-none mt-1" style={{ color: cycle.color }}>
                                {cycle.name}
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className={`text-[9px] uppercase tracking-widest ${muted}`}>Сложность</div>
                            <div className="text-xs font-bold uppercase mt-0.5" style={{ color: cycle.color }}>
                                {DIFF_LABELS[cycle.difficulty] || cycle.difficulty}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex justify-between text-[9px] uppercase tracking-widest mb-1.5">
                            <span className={muted}>Очистка сектора</span>
                            <span style={{ color: cycle.color }}>{cleared}/{total}</span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${light ? 'bg-black/10' : 'bg-white/10'}`}>
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${(cleared / total) * 100}%`, backgroundColor: cycle.color, boxShadow: `0 0 12px ${cycle.color}` }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Map */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2">
                <div className="text-center mb-5 px-4">
                    <div className={`text-[10px] tracking-[0.3em] uppercase ${muted}`}>Карта заражения</div>
                    <div className={`font-display text-3xl md:text-4xl uppercase tracking-widest mt-1 ${light ? 'text-black' : 'text-white'}`}>
                        Вирусная сеть
                    </div>
                </div>

                <div className="relative w-full max-w-[min(100%,22rem)] aspect-square">
                    {/* Outer ring */}
                    <div
                        className="absolute inset-[8%] rounded-full border border-dashed opacity-30"
                        style={{ borderColor: cycle.color }}
                    />

                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                        {[0, 1, 2].map(i => {
                            const a1 = (i * 90 - 45) * Math.PI / 180
                            const a2 = ((i + 1) * 90 - 45) * Math.PI / 180
                            const r = 38
                            const x1 = 50 + r * Math.cos(a1)
                            const y1 = 50 + r * Math.sin(a1)
                            const x2 = 50 + r * Math.cos(a2)
                            const y2 = 50 + r * Math.sin(a2)
                            const isPassed = completed.includes(i)
                            return (
                                <line
                                    key={i}
                                    x1={x1} y1={y1} x2={x2} y2={y2}
                                    stroke={isPassed ? cycle.color : light ? '#00000022' : '#ffffff18'}
                                    strokeWidth={isPassed ? 2.5 : 1.5}
                                    strokeDasharray={isPassed ? undefined : '4 4'}
                                    style={isPassed ? { filter: `drop-shadow(0 0 4px ${cycle.color})` } : undefined}
                                />
                            )
                        })}
                    </svg>

                    {/* Core */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28%] aspect-square">
                        <div
                            className={`w-full h-full rounded-full border-2 flex flex-col items-center justify-center backdrop-blur-sm ${panel}`}
                            style={{ borderColor: cycle.color, boxShadow: `0 0 40px ${cycle.color}33, inset 0 0 20px ${cycle.color}15` }}
                        >
                            <svg className="w-1/2 h-1/2 opacity-90" viewBox="0 0 24 24" fill="none" stroke={cycle.color} strokeWidth="1.5">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            <span className="text-[7px] uppercase tracking-widest mt-1 opacity-60" style={{ color: cycle.color }}>ядро</span>
                        </div>
                    </div>

                    {cycle.steps.map((step, i) => {
                        const angle = (i * 90 - 45) * Math.PI / 180
                        const x = 50 + 38 * Math.cos(angle)
                        const y = 50 + 38 * Math.sin(angle)
                        const isPassed = completed.includes(i)
                        const isPlayable = i === currentStep && canPlay
                        const isLocked = !isPassed && !isPlayable
                        const justUnlocked = keyFlash === i

                        return (
                            <div
                                key={i}
                                className="absolute -translate-x-1/2 -translate-y-1/2 w-[4.5rem]"
                                style={{ left: `${x}%`, top: `${y}%` }}
                            >
                                <button
                                    type="button"
                                    disabled={isLocked}
                                    onClick={isPlayable ? onSelect : undefined}
                                    className={`
                                        relative mx-auto w-[3.25rem] h-[3.25rem] rounded-xl border-2 flex flex-col items-center justify-center
                                        transition-all duration-300 backdrop-blur-sm
                                        ${isPassed ? 'border-green-500/80 bg-green-500/20 text-green-400 shadow-[0_0_16px_rgba(34,197,94,0.35)]' : ''}
                                        ${isPlayable ? 'scale-105 shadow-lg' : ''}
                                        ${justUnlocked ? 'ring-2 ring-acid scale-110' : ''}
                                        ${isLocked ? `${light ? 'border-black/10 bg-black/5 text-black/20' : 'border-white/10 bg-black/30 text-white/20'}` : ''}
                                        ${!isPassed && !isLocked && !isPlayable ? panel : ''}
                                    `}
                                    style={isPlayable ? {
                                        borderColor: cycle.color,
                                        boxShadow: `0 0 24px ${cycle.color}55`,
                                        backgroundColor: `${cycle.color}18`,
                                    } : undefined}
                                >
                                    {isPlayable && (
                                        <span
                                            className="absolute -inset-1 rounded-xl border animate-pulse opacity-60 pointer-events-none"
                                            style={{ borderColor: cycle.color }}
                                        />
                                    )}
                                    {isPassed ? (
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : isLocked ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    ) : (
                                        <span className="font-display text-xl leading-none" style={{ color: isPlayable ? cycle.color : undefined }}>
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                    )}
                                    <span className="text-[6px] uppercase tracking-wider opacity-70 mt-0.5">
                                        {step.bytes}B
                                    </span>
                                </button>
                                <div
                                    className={`mt-2 text-center text-[9px] leading-tight uppercase tracking-wide px-1
                                        ${isLocked ? 'opacity-25' : 'opacity-90'}
                                        ${light && !isLocked ? 'text-black/80' : ''}
                                    `}
                                >
                                    {step.name}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Footer panel */}
            <footer className="relative z-10 mt-auto space-y-3 max-w-lg mx-auto w-full pb-2">
                <AdventureInventory
                    items={progress.inventory}
                    accentColor={cycle.color}
                    onUseItem={onUseKey}
                />

                {hasKeys && !canPlay && (
                    <p className={`text-center text-[10px] uppercase tracking-widest px-3 leading-relaxed ${muted}`}>
                        {progress.inventory[0]?.useVerb || 'Используй предмет'} → «{progress.inventory[0]?.targetStepName}»
                    </p>
                )}

                <div className={`p-4 border backdrop-blur-md text-center ${panel}`}>
                    <div className={`text-[9px] uppercase tracking-[0.2em] ${muted}`}>
                        {canPlay ? '● активный узел' : hasKeys ? '○ ожидание ключа' : '✓ сектор очищен'}
                    </div>
                    <div
                        className={`font-display text-xl uppercase tracking-[0.2em] mt-1 ${light ? 'text-black' : 'text-white'}`}
                        style={canPlay ? { color: cycle.color } : undefined}
                    >
                        {activeStep?.name || '—'}
                    </div>
                    {activeStep && (
                        <p className={`text-[10px] mt-2 leading-relaxed max-w-xs mx-auto ${muted}`}>
                            {activeStep.desc}
                        </p>
                    )}
                    {canPlay && (
                        <button
                            type="button"
                            onClick={onSelect}
                            className="mt-4 w-full py-3.5 font-bold uppercase tracking-[0.2em] text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: cycle.color, color: light ? '#000' : '#000' }}
                        >
                            Начать взлом →
                        </button>
                    )}
                </div>
            </footer>
        </div>
    )
}

function AdventurePreLevel({ cycle, step, stepIdx, onStart, onBack }) {
    const lootPreview = getStepLootPreview(stepIdx)
    const light = cycle.theme === 'gold'
    const muted = light ? 'text-black/50' : 'text-white/50'
    const panel = light ? 'bg-black/5 border-black/15' : 'bg-black/40 border-white/10'
    const textMain = light ? 'text-black' : 'text-white'

    return (
        <div className={`min-h-dvh ${cycle.bg} flex flex-col p-4 md:p-8 font-mono relative overflow-hidden`} style={{ '--adv-accent': cycle.color }}>
            <AdventureBackdrop cycle={cycle} />

            <button
                type="button"
                onClick={onBack}
                className={`relative z-10 self-start text-[10px] uppercase tracking-widest px-3 py-2 border backdrop-blur-sm mb-6 ${panel}`}
                style={{ borderColor: `${cycle.color}44`, color: cycle.color }}
            >
                ← Карта
            </button>

            <div className={`relative z-10 flex-1 max-w-lg mx-auto w-full flex flex-col justify-center pb-8`}>
                <div className={`p-5 md:p-6 border backdrop-blur-md ${panel}`}>
                    <div className="flex items-start gap-4">
                        <div
                            className="shrink-0 w-14 h-14 border-2 flex flex-col items-center justify-center font-display"
                            style={{ borderColor: cycle.color, color: cycle.color, boxShadow: `0 0 20px ${cycle.color}33` }}
                        >
                            <span className="text-2xl leading-none">{String(stepIdx + 1).padStart(2, '0')}</span>
                            <span className="text-[7px] uppercase tracking-widest opacity-70">узел</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className={`text-[9px] uppercase tracking-[0.25em] ${muted}`}>
                                {cycle.name} · {DIFF_LABELS[cycle.difficulty]}
                            </div>
                            <h1 className="font-display text-2xl md:text-3xl uppercase tracking-widest leading-tight mt-1" style={{ color: cycle.color }}>
                                {step.name}
                            </h1>
                        </div>
                    </div>

                    <blockquote className={`mt-5 pl-4 border-l-2 text-sm md:text-base leading-relaxed italic ${textMain} opacity-90`} style={{ borderColor: cycle.color }}>
                        {step.desc}
                    </blockquote>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className={`p-4 border backdrop-blur-sm ${panel}`}>
                        <div className={`text-[9px] uppercase tracking-widest ${muted}`}>Награда</div>
                        <div className="font-display text-3xl mt-1 tabular-nums" style={{ color: cycle.color }}>
                            +{step.bytes}
                            <span className="text-lg ml-1 opacity-80">B</span>
                        </div>
                        {stepIdx === 3 && (
                            <div className={`text-[9px] mt-2 ${muted}`}>+{cycle.bonus} B за цикл</div>
                        )}
                    </div>
                    <div className={`p-4 border backdrop-blur-sm flex flex-col items-center text-center ${panel}`}>
                        <div className={`text-[9px] uppercase tracking-widest ${muted}`}>
                            {lootPreview?.categoryLabel || 'Добыча'}
                        </div>
                        <div className="my-2 p-2 rounded-lg" style={{ backgroundColor: `${cycle.color}15` }}>
                            {lootPreview && <AdventureItemIcon type={lootPreview.icon} color={cycle.color} size="sm" />}
                        </div>
                        <div className={`text-xs font-bold uppercase tracking-tight ${textMain}`}>{step.detail}</div>
                    </div>
                </div>

                {lootPreview && stepIdx < 3 && (
                    <div className={`mt-4 p-3 border text-[10px] leading-relaxed ${panel}`} style={{ borderColor: `${cycle.color}33` }}>
                        <span className="uppercase tracking-widest font-bold" style={{ color: cycle.color }}>Миссия: </span>
                        <span className={muted}>
                            после победы — «{step.detail}». {lootPreview.useVerb} на карте откроет следующий узел.
                        </span>
                    </div>
                )}

                <div className="mt-6 flex flex-col gap-2">
                    <div className={`flex justify-between text-[9px] uppercase tracking-widest px-1 ${muted}`}>
                        <span>Готовность</span>
                        <span style={{ color: cycle.color }}>100%</span>
                    </div>
                    <div className={`h-1 rounded-full overflow-hidden ${light ? 'bg-black/10' : 'bg-white/10'}`}>
                        <div className="h-full w-full rounded-full" style={{ backgroundColor: cycle.color }} />
                    </div>
                    <button
                        type="button"
                        onClick={onStart}
                        className="mt-4 w-full py-4 font-bold uppercase tracking-[0.25em] text-base transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        style={{ backgroundColor: cycle.color, color: '#000', boxShadow: `0 8px 32px ${cycle.color}44` }}
                    >
                        Запустить взлом →
                    </button>
                </div>
            </div>
        </div>
    )
}
