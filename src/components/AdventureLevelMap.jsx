import { memo } from 'react'
import AdventureInventory from './AdventureInventory.jsx'

const DIFF_LABELS = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' }

/** Позиции 4 узлов по кругу (% от контейнера) */
const NODE_POS = [
    { x: 50, y: 12 },
    { x: 88, y: 50 },
    { x: 50, y: 88 },
    { x: 12, y: 50 },
]

const MapNode = memo(function MapNode({
    step, index, x, y, color, isLight,
    isPassed, isPlayable, isLocked, justUnlocked, onSelect,
}) {
    const ring = isLight ? 'border-black/20' : 'border-white/20'

    return (
        <div
            className="absolute z-10 flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
        >
            <button
                type="button"
                disabled={isLocked}
                onClick={isPlayable ? onSelect : undefined}
                className={`
                    w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 font-display text-xl
                    flex items-center justify-center transition-transform
                    ${isPassed ? 'border-green-500 bg-green-500/20 text-green-400' : ''}
                    ${isLocked ? `${ring} opacity-30 cursor-not-allowed` : ''}
                    ${isPlayable ? 'scale-110' : ''}
                    ${justUnlocked ? 'ring-2 ring-acid ring-offset-2 ring-offset-transparent' : ''}
                    ${!isPassed && !isLocked ? (isLight ? 'bg-white/80' : 'bg-black/40') : ''}
                `}
                style={!isPassed && !isLocked ? { borderColor: color, color } : undefined}
            >
                {isPassed ? '✓' : isLocked ? '🔒' : index + 1}
            </button>
            <span
                className={`mt-2 text-[9px] uppercase tracking-widest text-center max-w-[4.5rem] leading-tight
                    ${isLocked ? 'opacity-25' : ''}`}
                style={!isLocked ? { color } : undefined}
            >
                {step.name}
            </span>
        </div>
    )
})

function AdventureLevelMap({
    progress, cycle, userBytes, canPlay, hasKeys, keyFlash,
    onSelect, onBack, onUseKey,
}) {
    const currentStep = Number(progress.current_step) || 0
    const completed = progress.completed_steps || []
    const isLight = cycle.theme === 'gold'
    const completedCount = completed.length
    const progressPct = (completedCount / cycle.steps.length) * 100
    const activeStep = cycle.steps[currentStep]

    const muted = isLight ? 'text-black/50 hover:text-black' : 'text-white/50 hover:text-white'
    const panel = isLight ? 'border-black/15 bg-black/[0.03]' : 'border-white/10 bg-black/40'

    return (
        <div className={`min-h-dvh ${cycle.bg} flex flex-col p-5 font-mono relative ${isLight ? 'text-black' : 'text-white'}`}>
            {/* Шапка */}
            <header className="relative z-20 flex justify-between items-start gap-3 mb-4">
                <button type="button" onClick={onBack} className={`text-xs uppercase tracking-widest ${muted}`}>
                    ← В меню
                </button>
                <div className="text-right">
                    <div className="text-[10px] opacity-50 uppercase">{userBytes} B · {DIFF_LABELS[cycle.difficulty]}</div>
                    <div className="font-display text-lg tracking-widest" style={{ color: cycle.color }}>
                        {cycle.name}
                    </div>
                </div>
            </header>

            {/* Прогресс */}
            <div className="relative z-10 mb-4">
                <div className="flex justify-between text-[9px] uppercase opacity-50 mb-1">
                    <span>Прогресс цикла</span>
                    <span>{completedCount}/{cycle.steps.length}</span>
                </div>
                <div className={`h-1 border ${isLight ? 'border-black/10 bg-black/5' : 'border-white/10 bg-black/50'}`}>
                    <div className="h-full" style={{ width: `${progressPct}%`, backgroundColor: cycle.color }} />
                </div>
            </div>

            {/* Карта узлов */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 min-h-0">
                <h1 className="font-display text-2xl sm:text-3xl uppercase tracking-widest mb-1 text-center">
                    Вирусная атака
                </h1>
                <p className={`text-[10px] uppercase tracking-widest mb-6 ${isLight ? 'text-black/40' : 'text-white/40'}`}>
                    Цикл {String(cycle.id).padStart(2, '0')} · +{cycle.bonus}B за цикл
                </p>

                <div className="relative w-full max-w-[280px] sm:max-w-xs aspect-square">
                    {/* Простые связи — 4 отрезка крестом */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" aria-hidden>
                        {NODE_POS.map((p, i) => {
                            const next = NODE_POS[(i + 1) % 4]
                            const done = completed.includes(i)
                            return (
                                <line
                                    key={i}
                                    x1={p.x} y1={p.y} x2={next.x} y2={next.y}
                                    stroke={done ? cycle.color : (isLight ? '#00000018' : '#ffffff18')}
                                    strokeWidth={done ? 1.5 : 1}
                                    strokeDasharray={done ? undefined : '2 2'}
                                />
                            )
                        })}
                    </svg>

                    {/* Центр */}
                    <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center pointer-events-none"
                        style={{ borderColor: `${cycle.color}66`, color: cycle.color }}
                    >
                        <span className="text-[7px] uppercase opacity-60">цикл</span>
                        <span className="font-display text-2xl leading-none">{String(cycle.id).padStart(2, '0')}</span>
                    </div>

                    {cycle.steps.map((step, i) => (
                        <MapNode
                            key={i}
                            step={step}
                            index={i}
                            x={NODE_POS[i].x}
                            y={NODE_POS[i].y}
                            color={cycle.color}
                            isLight={isLight}
                            isPassed={completed.includes(i)}
                            isPlayable={i === currentStep && canPlay}
                            isLocked={!completed.includes(i) && !(i === currentStep && canPlay)}
                            justUnlocked={keyFlash === i}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            </div>

            {/* Низ */}
            <footer className="relative z-10 mt-4 space-y-3 pb-2">
                <AdventureInventory
                    items={progress.inventory}
                    accentColor={cycle.color}
                    onUseItem={onUseKey}
                />

                {hasKeys && !canPlay && (
                    <p className={`text-center text-[10px] uppercase tracking-widest ${isLight ? 'text-black/55' : 'text-white/60'}`}>
                        {progress.inventory[0]?.useVerb || 'Используй предмет'} → «{progress.inventory[0]?.targetStepName}»
                    </p>
                )}

                {activeStep && (
                    <div className={`p-4 border-2 text-center ${panel}`}>
                        <p className="text-[10px] uppercase opacity-50 mb-1">
                            {canPlay ? 'Активный узел' : hasKeys ? 'Нужен ключ' : 'Завершено'}
                        </p>
                        <p className="font-display text-lg uppercase tracking-wider mb-2" style={{ color: cycle.color }}>
                            {activeStep.name}
                        </p>
                        <p className={`text-[10px] mb-3 ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                            +{activeStep.bytes} B · {activeStep.detail}
                        </p>
                        {canPlay && (
                            <button
                                type="button"
                                onClick={onSelect}
                                className="w-full py-3 font-bold uppercase tracking-widest text-sm"
                                style={{ backgroundColor: cycle.color, color: '#000' }}
                            >
                                Начать взлом
                            </button>
                        )}
                    </div>
                )}
            </footer>
        </div>
    )
}

export default memo(AdventureLevelMap)
