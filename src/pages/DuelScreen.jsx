import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { generatePuzzle } from '../lib/sudoku.js'

export default function DuelScreen() {
    const { state, actions } = useApp()
    const { user } = state

    const [phase, setPhase] = useState('searching') // searching, offer, playing, finished
    const [searchTime, setSearchTime] = useState(0)
    const [board, setBoard] = useState(null)
    const [aiBoard, setAiBoard] = useState(null)
    const [solution, setSolution] = useState(null)
    const [prefilled, setPrefilled] = useState(null)
    const [selected, setSelected] = useState(null)
    const [won, setWon] = useState(false)
    const [opponentProgress, setOpponentProgress] = useState(0)
    const [myProgress, setMyProgress] = useState(0)

    const aiIntervalRef = useRef()

    // Поиск игроков
    useEffect(() => {
        if (phase === 'searching') {
            const start = Date.now()
            const timer = setInterval(() => {
                const elapsed = Math.floor((Date.now() - start) / 1000)
                setSearchTime(elapsed)
                if (elapsed >= 30) {
                    setPhase('offer')
                    clearInterval(timer)
                }
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [phase])

    // Инициализация дуэли с ИИ
    const startDuelAI = () => {
        const puzzle = generatePuzzle('medium')
        const { solution: sol, prefilled: pre } = puzzle
        setSolution(sol)
        setPrefilled(pre)

        // Начальная доска пользователя
        setBoard(pre.map(row => row.map(val => ({ value: val, draft: new Set(), isError: false }))))

        // Доска ИИ
        setAiBoard(pre.map(row => row.map(val => val)))

        setPhase('playing')
        setWon(false)
        setMyProgress(calculateProgress(pre, pre))
        setOpponentProgress(calculateProgress(pre, pre))
    }

    const calculateProgress = (curr, pre) => {
        let count = 0
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++)
                if (curr[r][c] !== null) count++
        return Math.floor((count / 81) * 100)
    }

    // Логика ИИ (решает судоку каждые 12 секунд)
    useEffect(() => {
        if (phase === 'playing' && !won) {
            aiIntervalRef.current = setInterval(() => {
                setAiBoard(prev => {
                    const next = prev.map(row => [...row])
                    // Найти пустую ячейку
                    const empties = []
                    for (let r = 0; r < 9; r++)
                        for (let c = 0; c < 9; c++)
                            if (next[r][c] === null) empties.push([r, c])

                    if (empties.length > 0) {
                        const [r, c] = empties[Math.floor(Math.random() * empties.length)]
                        next[r][c] = solution[r][c]
                        const prog = calculateProgress(next, prefilled)
                        setOpponentProgress(prog)
                        if (prog >= 100) {
                            setWon(false)
                            setPhase('finished')
                        }
                    }
                    return next
                })
            }, 12000)
            return () => clearInterval(aiIntervalRef.current)
        }
    }, [phase, won, solution, prefilled])

    const handleInput = (num) => {
        if (phase !== 'playing' || !selected) return
        const [r, c] = selected
        if (prefilled[r][c] !== null) return

        setBoard(prev => {
            const next = prev.map(row => row.map(cell => ({ ...cell, draft: new Set(cell.draft) })))
            const isCorrect = solution[r][c] === num
            next[r][c] = { value: num, draft: new Set(), isError: !isCorrect }

            const flat = next.map(row => row.map(c => c.value))
            const prog = calculateProgress(flat, prefilled)
            setMyProgress(prog)

            if (prog >= 100 && isCorrect) {
                setWon(true)
                setPhase('finished')
            }
            return next
        })
    }

    // UI компоненты
    if (phase === 'searching') {
        return (
            <div className="min-h-dvh bg-ink-950 flex flex-col items-center justify-center p-6 text-white font-mono">
                <div className="w-24 h-24 border-4 border-acid border-t-transparent rounded-full animate-spin mb-8" />
                <div className="text-2xl mb-2 tracking-widest text-acid">SEARCHING PLAYERS...</div>
                <div className="text-ink-400">Elapsed: {searchTime}s</div>
                <button disabled className="mt-12 px-8 py-3 border border-ink-700 bg-ink-900 text-ink-600 uppercase tracking-widest cursor-not-allowed">
                    Players found: 1/2
                </button>
            </div>
        )
    }

    if (phase === 'offer') {
        return (
            <div className="min-h-dvh bg-ink-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full p-8 border-2 border-acid bg-ink-900 shadow-[0_0_50px_rgba(202,255,0,0.2)]">
                    <div className="font-display text-4xl text-acid mb-4">TIMEOUT</div>
                    <div className="text-ink-200 mb-8 font-mono tracking-tight leading-relaxed">
                        К сожалению, игроки поблизости не найдены.<br />Желаете сразиться с продвинутым ИИ?
                    </div>
                    <div className="space-y-4">
                        <button
                            onClick={startDuelAI}
                            className="w-full py-4 bg-acid text-ink-950 font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                        >
                            Сразиться с ИИ
                        </button>
                        <button
                            onClick={() => actions.setScreen('hub')}
                            className="w-full py-4 border border-ink-700 text-ink-400 uppercase tracking-widest hover:bg-ink-800 transition-colors"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-dvh bg-ink-950 text-white flex flex-col lg:flex-row p-4 gap-6">
            {/* Основная доска (Пользователь) */}
            <div className="flex-1 flex flex-col items-center">
                <div className="w-full max-w-[500px]">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                            <span className="text-xs font-mono text-ink-400">YOU</span>
                            <span className="text-xl font-display text-acid">{user.username}</span>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-mono text-ink-400 uppercase">Progress</div>
                            <div className="w-32 h-2 bg-ink-800 mt-1 relative">
                                <div className="absolute left-0 top-0 h-full bg-acid transition-all duration-300" style={{ width: `${myProgress}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Сетка */}
                    <div className="aspect-square grid grid-cols-9 border-4 border-ink-800 bg-ink-900 shadow-2xl">
                        {board?.map((row, r) => row.map((cell, c) => {
                            const isSel = selected?.[0] === r && selected?.[1] === c
                            return (
                                <button
                                    key={`${r}-${c}`}
                                    onClick={() => setSelected([r, c])}
                                    className={`
                      aspect-square flex items-center justify-center text-xl md:text-2xl font-mono border border-ink-800/50 transition-colors
                      ${r % 3 === 2 && r !== 8 ? 'border-b-4' : ''}
                      ${c % 3 === 2 && c !== 8 ? 'border-r-4' : ''}
                      ${isSel ? 'bg-acid/20 text-acid' : 'hover:bg-ink-800'}
                      ${cell.isError ? 'text-danger bg-danger/10' : ''}
                      ${prefilled[r][c] !== null ? 'font-bold text-ink-300 bg-ink-800/20' : 'text-white'}
                    `}
                                >
                                    {cell.value || ''}
                                </button>
                            )
                        }))}
                    </div>

                    {/* Цифры */}
                    <div className="grid grid-cols-5 md:grid-cols-9 gap-2 mt-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                            <button
                                key={n}
                                onClick={() => handleInput(n)}
                                className="aspect-square flex items-center justify-center border-2 border-ink-800 bg-ink-900 font-display text-2xl hover:bg-acid hover:text-ink-950 transition-all active:scale-95"
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Доска противника (ИИ) */}
            <div className="w-full lg:w-80 flex flex-col items-center">
                <div className="w-full max-w-[300px] lg:max-w-none p-4 border-2 border-ink-800 bg-ink-900/50">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-mono text-ink-400">OPPONENT (AI)</span>
                            <span className="text-lg font-display text-warn">NEURO SOLVER V2</span>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-mono text-ink-400 uppercase">Progress</div>
                            <div className="w-20 h-1.5 bg-ink-800 mt-1 relative">
                                <div className="absolute left-0 top-0 h-full bg-warn transition-all duration-300" style={{ width: `${opponentProgress}%` }} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-9 border-2 border-ink-800 bg-ink-950 opacity-80 pointer-events-none">
                        {aiBoard?.map((row, r) => row.map((val, c) => (
                            <div key={`${r}-${c}`} className={`aspect-square flex items-center justify-center text-[10px] border border-ink-800/30
                    ${r % 3 === 2 && r !== 8 ? 'border-b-2' : ''}
                    ${c % 3 === 2 && c !== 8 ? 'border-r-2' : ''}
                    ${val !== null ? 'text-warn' : ''}
                  `}>
                                {val || ''}
                            </div>
                        )))}
                    </div>

                    <div className="mt-4 p-2 bg-black/30 rounded font-mono text-[11px] text-ink-400 italic">
                        {opponentProgress < 100 ? '> Анализирую паттерны... ' : '> Решение найдено.'}
                    </div>
                </div>

                <button
                    onClick={() => actions.setScreen('hub')}
                    className="mt-6 w-full py-3 text-xs uppercase tracking-widest text-ink-500 hover:text-white transition-colors"
                >
                    Сдаться и выйти
                </button>
            </div>

            {/* Модалка завершения */}
            {phase === 'finished' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="max-w-md w-full bg-ink-900 border-t-4 border-acid p-10 text-center animate-in zoom-in duration-300">
                        <div className={`font-display text-6xl mb-4 ${won ? 'text-acid' : 'text-danger'}`}>
                            {won ? 'VICTORY' : 'DEFEAT'}
                        </div>
                        <div className="text-ink-300 font-mono mb-8">
                            {won ? 'Вы оказались быстрее алгоритма!' : 'ИИ проанализировал быстрее вас.'}
                        </div>
                        <button
                            onClick={() => actions.setScreen('hub')}
                            className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-acid transition-colors"
                        >
                            Вернуться в меню
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
