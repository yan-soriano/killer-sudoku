import { useState, useEffect, useRef } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { generatePuzzle, getHint } from '../lib/sudoku.js'
import { formatTime } from '../lib/api.js'

export default function DuelScreen() {
    const { state, actions } = useApp()
    const { user } = state

    const [phase, setPhase] = useState('searching') // searching, offer, playing, finished
    const [searchTime, setSearchTime] = useState(0)
    const [seconds, setSeconds] = useState(0)
    const [board, setBoard] = useState(null)
    const [aiBoard, setAiBoard] = useState(null)
    const [solution, setSolution] = useState(null)
    const [prefilled, setPrefilled] = useState(null)
    const [selected, setSelected] = useState(null)
    const [won, setWon] = useState(false)
    const [opponentProgress, setOpponentProgress] = useState(0)
    const [myProgress, setMyProgress] = useState(0)
    const [errors, setErrors] = useState(0)
    const [hints, setHints] = useState(0)
    const [draftMode, setDraftMode] = useState(false)

    const timerRef = useRef()
    const aiIntervalRef = useRef()

    // Таймер
    useEffect(() => {
        if (phase === 'playing') {
            timerRef.current = setInterval(() => {
                setSeconds(s => s + 1)
            }, 1000)
            return () => clearInterval(timerRef.current)
        }
    }, [phase])

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

    const startDuelAI = () => {
        const puzzle = generatePuzzle('medium')
        const { solution: sol, prefilled: pre } = puzzle
        setSolution(sol)
        setPrefilled(pre)
        setBoard(pre.map(row => row.map(val => ({ value: val, draft: new Set(), isError: false }))))
        setAiBoard(pre.map(row => row.map(val => val)))
        setPhase('playing')
        setWon(false)
        setErrors(0)
        setHints(0)
        setSeconds(0)
        setMyProgress(calculateProgress(pre))
        setOpponentProgress(calculateProgress(pre))
    }

    const calculateProgress = (curr) => {
        let count = 0
        const isCellObject = curr[0] && curr[0][0] !== null && typeof curr[0][0] === 'object' && ('value' in curr[0][0])
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++) {
                const val = isCellObject ? curr[r][c].value : curr[r][c]
                if (val !== null) count++
            }
        return Math.floor((count / 81) * 100)
    }

    useEffect(() => {
        if (phase === 'playing' && !won) {
            aiIntervalRef.current = setInterval(() => {
                setAiBoard(prev => {
                    const next = prev.map(row => [...row])
                    const empties = []
                    for (let r = 0; r < 9; r++)
                        for (let c = 0; c < 9; c++)
                            if (next[r][c] === null) empties.push([r, c])

                    if (empties.length > 0) {
                        const [r, c] = empties[Math.floor(Math.random() * empties.length)]
                        next[r][c] = solution[r][c]
                        const prog = calculateProgress(next)
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
    }, [phase, won, solution])

    const isFixed = (r, c) => {
        if (prefilled[r][c] !== null) return true
        if (board[r][c].value === solution[r][c] && board[r][c].value !== null) return true
        return false
    }

    const handleInput = (num) => {
        if (phase !== 'playing' || !selected) return
        const [r, c] = selected
        if (isFixed(r, c)) return

        if (draftMode) {
            setBoard(prev => {
                const next = prev.map(row => row.map(cell => ({ ...cell, draft: new Set(cell.draft) })))
                if (next[r][c].draft.has(num)) {
                    next[r][c].draft.delete(num)
                } else {
                    next[r][c].draft.add(num)
                }
                return next
            })
            return
        }

        setBoard(prev => {
            const next = prev.map(row => row.map(cell => ({ ...cell, draft: new Set(cell.draft) })))
            const isCorrect = solution[r][c] === num

            if (!isCorrect) {
                const newErrors = errors + 1
                setErrors(newErrors)
                if (newErrors >= 5) {
                    setWon(false)
                    setPhase('finished')
                }
            }

            next[r][c] = { value: num, draft: new Set(), isError: !isCorrect }

            const prog = calculateProgress(next)
            setMyProgress(prog)

            if (prog >= 100 && isCorrect) {
                setWon(true)
                setPhase('finished')
            }
            return next
        })
    }

    const handleErase = () => {
        if (!selected || phase !== 'playing') return
        const [r, c] = selected
        if (isFixed(r, c)) return
        setBoard(prev => {
            const next = prev.map(row => row.map(cell => ({ ...cell, draft: new Set(cell.draft) })))
            next[r][c] = { value: null, draft: new Set(), isError: false }
            return next
        })
    }

    const handleHint = () => {
        if (hints >= 3 || phase !== 'playing') return
        const playerInput = board.map(row => row.map(c => c.value))
        const hint = getHint(solution, playerInput, prefilled)
        if (!hint) return

        setHints(h => h + 1)
        setBoard(prev => {
            const next = prev.map(row => row.map(cell => ({ ...cell, draft: new Set(cell.draft) })))
            next[hint.row][hint.col] = { value: hint.value, draft: new Set(), isError: false }
            return next
        })
        setSelected([hint.row, hint.col])
        setMyProgress(calculateProgress(board)) // update prog will happen next render but let's be safe
    }

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
                        <button onClick={startDuelAI} className="w-full py-4 bg-acid text-ink-950 font-bold uppercase tracking-widest hover:scale-105 transition-transform">Сразиться с ИИ</button>
                        <button onClick={() => actions.setScreen('hub')} className="w-full py-4 border border-ink-700 text-ink-400 uppercase tracking-widest hover:bg-ink-800 transition-colors">Отмена</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-dvh flex flex-col p-4 md:p-6 lg:p-8 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto transition-all">
            <div className="flex flex-col lg:flex-row lg:gap-20 lg:items-start lg:justify-center">
                <div className="w-full lg:max-w-md">
                    {/* Top bar */}
                    <div className="flex items-center justify-between mb-4 md:mb-5">
                        <button onClick={() => actions.setScreen('hub')} className="text-xs md:text-sm font-mono text-ink-500 dark:text-ink-400 hover:text-danger transition-colors uppercase tracking-widest">Сдаться</button>
                        <div className="font-display text-2xl md:text-3xl tracking-widest text-warn transition-colors uppercase">DUEL</div>
                        <div className="font-mono text-lg md:text-xl text-ink-600 dark:text-ink-300">{formatTime(seconds)}</div>
                    </div>

                    <div className="flex items-center justify-between mb-4 md:mb-5">
                        <div className="flex gap-1.5 items-center">
                            <span className="text-[10px] font-mono text-ink-500 uppercase">Ошибки</span>
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${i < errors ? 'bg-danger' : 'bg-ink-200 dark:bg-ink-700'}`} />
                            ))}
                        </div>
                        <div className="flex gap-1.5 items-center">
                            {[0, 1, 2].map(i => (
                                <div key={i} className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${i < hints ? 'bg-acid-dark' : 'bg-ink-200 dark:bg-ink-700'}`} />
                            ))}
                            <span className="text-[10px] font-mono text-ink-500 uppercase">Подсказки</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-end mb-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-mono text-ink-500 uppercase tracking-tighter">Ваш прогресс</span>
                            <span className="text-sm font-display text-green-700 dark:text-ink-100 uppercase">{user.username}</span>
                        </div>
                        <div className="w-24 h-1.5 bg-ink-200 dark:bg-ink-800 rounded-full overflow-hidden">
                            <div className="h-full bg-acid transition-all duration-300" style={{ width: `${myProgress}%` }} />
                        </div>
                    </div>

                    {/* My Grid */}
                    <div className="relative select-none mb-6">
                        <div className="grid border-2 border-ink-400 dark:border-ink-300" style={{ gridTemplateColumns: 'repeat(9, 1fr)', aspectRatio: '1' }}>
                            {board?.map((row, r) => row.map((cell, c) => {
                                const isSelected = selected?.[0] === r && selected?.[1] === c
                                const isHighlighted = selected && (selected[0] === r || selected[1] === c || (Math.floor(selected[0] / 3) === Math.floor(r / 3) && Math.floor(selected[1] / 3) === Math.floor(c / 3)))
                                const isBox3 = (r % 3 === 0 && r > 0)
                                const isCol3 = (c % 3 === 0 && c > 0)
                                return (
                                    <button key={`${r}-${c}`} onClick={() => setSelected([r, c])} className={`relative flex items-center justify-center cursor-pointer transition-colors aspect-square ${isBox3 ? 'border-t-2 border-t-ink-400 dark:border-t-ink-300' : 'border-t border-t-ink-200 dark:border-t-ink-700'} ${isCol3 ? 'border-l-2 border-l-ink-400 dark:border-l-ink-300' : 'border-l border-l-ink-200 dark:border-l-ink-700'} ${isSelected ? 'bg-acid-dark/40 dark:bg-acid/40' : isHighlighted ? 'bg-ink-100 dark:bg-ink-800/40' : 'bg-transparent'} ${cell.isError ? 'bg-danger/20' : ''}`}>
                                        {cell.value !== null ? (
                                            <span className={`relative z-10 font-mono text-xl md:text-2xl ${prefilled[r][c] !== null ? 'font-bold text-ink-900 dark:text-ink-100' : 'text-green-600 dark:text-acid'} ${cell.isError ? '!text-danger' : ''}`}>{cell.value}</span>
                                        ) : cell.draft.size > 0 ? (
                                            <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5">
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                                    <span key={n} className={`text-[6px] md:text-[8px] font-mono text-center leading-none flex items-center justify-center ${cell.draft.has(n) ? 'text-ink-500 dark:text-ink-300' : 'text-transparent'}`}>{n}</span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </button>
                                )
                            }))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <ActionBtn onClick={handleErase} icon={<EraseIcon />} label="Стереть" />
                        <ActionBtn onClick={() => setDraftMode(m => !m)} icon={<DraftIcon />} label="Черновик" active={draftMode} />
                        <ActionBtn onClick={handleHint} disabled={hints >= 3} icon={<HintIcon />} label={`Подсказка (${3 - hints})`} />
                    </div>

                    {/* Keypad */}
                    <div className="grid grid-cols-9 gap-1 md:gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                            <button key={n} onClick={() => handleInput(n)} className="aspect-square flex items-center justify-center border border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-900 font-display text-xl md:text-2xl text-ink-800 dark:text-ink-100 hover:bg-ink-100 dark:hover:bg-ink-800 active:scale-95 transition-all shadow-sm rounded-sm">{n}</button>
                        ))}
                    </div>
                </div>

                {/* AI Grid */}
                <div className="w-full lg:w-72 mt-8 lg:mt-0">
                    <div className="p-4 border-2 border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-900/50 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-ink-500 uppercase tracking-widest">Противник</span>
                                <span className="text-sm font-display text-warn uppercase">Neuro Solver V2</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-mono text-ink-400 uppercase">{opponentProgress}%</span>
                                <div className="w-16 h-1 bg-ink-200 dark:bg-ink-800 rounded-full mt-1">
                                    <div className="h-full bg-warn transition-all duration-300" style={{ width: `${opponentProgress}%` }} />
                                </div>
                            </div>
                        </div>
                        <div className="grid border border-ink-400 dark:border-ink-700 bg-ink-50 dark:bg-ink-950 opacity-70 pointer-events-none" style={{ gridTemplateColumns: 'repeat(9, 1fr)', aspectRatio: '1' }}>
                            {aiBoard?.map((row, r) => row.map((val, c) => (
                                <div key={`${r}-${c}`} className={`aspect-square flex items-center justify-center text-[10px] ${r % 3 === 0 && r > 0 ? 'border-t-2 border-t-ink-300 dark:border-t-ink-700' : 'border-t border-t-ink-200 dark:border-t-ink-800/30'} ${c % 3 === 0 && c > 0 ? 'border-l-2 border-l-ink-300 dark:border-l-ink-700' : 'border-l border-l-ink-200 dark:border-l-ink-800/30'} ${val !== null ? 'text-warn font-bold' : ''}`}>
                                    {val || ''}
                                </div>
                            )))}
                        </div>
                        <div className="mt-4 p-2 bg-black/5 dark:bg-black/30 rounded font-mono text-[10px] text-ink-500 italic">
                            {opponentProgress < 100 ? '> Анализирую... ' : '> Готово.'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Finish Modal */}
            {phase === 'finished' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-white">
                    <div className="max-w-md w-full bg-ink-900 border-t-4 border-acid p-10 text-center animate-in zoom-in duration-300 shadow-2xl">
                        <div className={`font-display text-6xl mb-4 ${won ? 'text-acid' : 'text-danger'}`}>{won ? (errors >= 5 ? 'DEFEAT' : 'VICTORY') : 'DEFEAT'}</div>
                        <div className="text-ink-300 font-mono mb-8">
                            {won ? 'Вы оказались быстрее алгоритма!' : (errors >= 5 ? 'Вы допустили слишком много ошибок.' : 'ИИ проанализировал быстрее вас.')}
                        </div>
                        <button onClick={() => actions.setScreen('hub')} className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-acid transition-colors">Вернуться в меню</button>
                    </div>
                </div>
            )}
        </div>
    )
}

function ActionBtn({ onClick, icon, label, active, disabled }) {
    return (
        <button onClick={onClick} disabled={disabled} className={`flex flex-col items-center gap-1 px-2 py-3 md:py-4 transition-colors disabled:opacity-30 border border-ink-200 dark:border-ink-700 bg-ink-100 dark:bg-ink-800 hover:border-acid transition-all ${active ? 'text-acid-dark dark:text-acid border-acid' : 'text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100'}`}>
            <div className="transform scale-100 md:scale-110">{icon}</div>
            <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-tight">{label}</span>
        </button>
    )
}

function EraseIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 20H7L3 16l9-12 8 10-4 6z" /><path d="M6.5 17.5l5-5" />
        </svg>
    )
}
function DraftIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    )
}
function HintIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
    )
}
