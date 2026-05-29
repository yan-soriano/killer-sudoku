import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { checkCell, checkWin, getHint, getCellBorders } from '../lib/sudoku.js'
import { updateGameSession, finishGameSession } from '../lib/api.js'
import { formatTime } from '../lib/api.js'

export default function GameScreen() {
  const { state, actions } = useApp()
  const { user, game } = state
  const { puzzle, sessionId, difficulty } = game

  const { solution, cages, cageMap: cageMapRaw, prefilled } = puzzle

  // Строим cageMap (id → cage объект) и cellToCage
  const cagesById = Object.fromEntries(cages.map(c => [c.id, c]))
  const cellToCageId = cageMapRaw // "r,c" → id

  // Состояние игры
  const [board, setBoard] = useState(() => {
    // board[r][c] = { value: number|null, draft: Set, isError: bool }
    return Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (__, c) => ({
        value: prefilled[r][c] ?? null,
        draft: new Set(),
        isError: false,
      }))
    )
  })

  const [selected, setSelected] = useState(null) // [row, col]
  const [draftMode, setDraftMode] = useState(false)
  const [errors, setErrors] = useState(0)
  const [hints, setHints] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const timerRef = useRef()

  // Таймер
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const stopTimer = () => clearInterval(timerRef.current)

  // Авто-сохранение каждые 30 сек
  useEffect(() => {
    const save = setInterval(() => {
      if (!gameOver && !won) {
        const playerInput = {}
        for (let r = 0; r < 9; r++)
          for (let c = 0; c < 9; c++)
            if (board[r][c].value !== null)
              playerInput[`${r},${c}`] = board[r][c].value

        updateGameSession(sessionId, { player_input: playerInput, time_spent: seconds })
          .catch(console.error)
      }
    }, 30000)
    return () => clearInterval(save)
  }, [board, seconds, gameOver, won, sessionId])

  const isFixed = (r, c) => {
    if (prefilled[r][c] !== null) return true
    if (board[r][c].value === solution[r][c] && board[r][c].value !== null) return true
    return false
  }

  const handleCellClick = (r, c) => {
    if (gameOver || won) return
    if (isFixed(r, c) && !draftMode) {
      setSelected([r, c])
      return
    }
    setSelected([r, c])
  }

  const handleNumber = useCallback((num) => {
    if (!selected || gameOver || won) return
    const [r, c] = selected
    if (isFixed(r, c)) return

    setBoard(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell, draft: new Set(cell.draft) })))

      if (draftMode) {
        const cell = next[r][c]
        if (cell.draft.has(num)) cell.draft.delete(num)
        else cell.draft.add(num)
        cell.value = null
        cell.isError = false
      } else {
        const isCorrect = checkCell(solution, r, c, num)
        next[r][c] = { value: num, draft: new Set(), isError: !isCorrect }

        if (!isCorrect) {
          const newErrors = errors + 1
          setErrors(newErrors)
          if (newErrors >= 3) {
            stopTimer()
            setGameOver(true)
            finishGameSession(sessionId, {
              won: false, errorsCount: 3, hintsUsed: hints, timeSpent: seconds, userId: user.id, difficulty
            }).catch(console.error)
            setTimeout(() => actions.endGame({ won: false, errors: 3, time: seconds, hints }), 600)
          }
        } else {
          // Проверить победу
          const flatInput = Array.from({ length: 9 }, (_, row) =>
            Array.from({ length: 9 }, (__, col) => {
              if (row === r && col === c) return num
              return next[row][col].value ?? prefilled[row][col]
            })
          )
          if (checkWin(solution, flatInput)) {
            stopTimer()
            setWon(true)
            finishGameSession(sessionId, {
              won: true, errorsCount: errors, hintsUsed: hints, timeSpent: seconds, userId: user.id, difficulty
            }).catch(console.error)
            setTimeout(() => actions.endGame({ won: true, errors, time: seconds, hints }), 600)
          }
        }
      }
      return next
    })
  }, [selected, draftMode, errors, hints, seconds, solution, prefilled, gameOver, won, sessionId, difficulty, user.id, actions, board])

  const handleHint = () => {
    if (hints >= 3 || gameOver || won) return
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
  }

  const handleErase = () => {
    if (!selected || gameOver || won) return
    const [r, c] = selected
    if (isFixed(r, c)) return
    setBoard(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell, draft: new Set(cell.draft) })))
      next[r][c] = { value: null, draft: new Set(), isError: false }
      return next
    })
  }

  const handleSurrender = async () => {
    stopTimer()
    setGameOver(true)
    await finishGameSession(sessionId, {
      won: false, errorsCount: errors, hintsUsed: hints, timeSpent: seconds, userId: user.id, difficulty
    }).catch(console.error)
    actions.endGame({ won: false, errors, time: seconds, hints, surrendered: true })
  }

  // Keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '1' && e.key <= '9') handleNumber(parseInt(e.key))
      if (e.key === 'Backspace' || e.key === 'Delete') handleErase()
      if (e.key === 'd' || e.key === 'D') setDraftMode(m => !m)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNumber])

  // Get top-left cell of each cage for sum label
  const cageTopLeft = {}
  for (const cage of cages) {
    const sorted = [...cage.cells].sort((a, b) => a[0] - b[0] || a[1] - b[1])
    cageTopLeft[`${sorted[0][0]},${sorted[0][1]}`] = cage.sum
  }

  const sel = selected

  return (
    <div className="min-h-dvh flex flex-col p-4 md:p-6 lg:p-8 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto transition-all">
      <div className="flex flex-col lg:flex-row lg:gap-20 lg:items-center lg:justify-center">
        <div className="w-full lg:max-w-md">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <button
              onClick={handleSurrender}
              className="text-xs md:text-sm font-mono text-ink-500 dark:text-ink-400 hover:text-danger transition-colors uppercase tracking-widest"
            >
              Сдаться
            </button>
            <div className="font-display text-2xl md:text-3xl tracking-widest text-green-900 dark:text-acid transition-colors">
              {difficulty.toUpperCase()}
            </div>
            <div className="font-mono text-lg md:text-xl text-ink-600 dark:text-ink-300">{formatTime(seconds)}</div>
          </div>

          {/* Error & hint indicators */}
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <div className="flex gap-2 items-center">
              <span className="text-xs md:text-sm font-mono text-ink-500 dark:text-ink-400 uppercase">Ошибки</span>
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-3 h-3 md:w-3.5 md:h-3.5 rounded-full ${i < errors ? 'bg-danger' : 'bg-ink-200 dark:bg-ink-700'}`} />
              ))}
            </div>
            <div className="flex gap-2 items-center">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-3 h-3 md:w-3.5 md:h-3.5 rounded-full ${i < hints ? 'bg-acid-dark' : 'bg-ink-200 dark:bg-ink-700'}`} />
              ))}
              <span className="text-xs md:text-sm font-mono text-ink-500 dark:text-ink-400 uppercase">Подсказки</span>
            </div>
          </div>

          {/* Grid */}
          <div className="relative select-none mb-4">
            <div
              className="grid border-2 border-ink-400 dark:border-ink-300"
              style={{ gridTemplateColumns: 'repeat(9, 1fr)', aspectRatio: '1' }}
            >
              {Array.from({ length: 9 }, (_, r) =>
                Array.from({ length: 9 }, (__, c) => {
                  const cell = board[r][c]
                  const key = `${r},${c}`
                  const cageId = cellToCageId[key]
                  const cage = cagesById[cageId]
                  const borders = cage ? getCellBorders(r, c, Object.fromEntries(
                    Object.entries(cellToCageId).map(([k, id]) => [k, cagesById[id]])
                  )) : {}

                  const isSelected = sel && sel[0] === r && sel[1] === c
                  const isSameValue = sel && board[sel[0]][sel[1]].value && cell.value === board[sel[0]][sel[1]].value && !isSelected
                  const isHighlighted = sel && (sel[0] === r || sel[1] === c || (
                    Math.floor(sel[0] / 3) === Math.floor(r / 3) && Math.floor(sel[1] / 3) === Math.floor(c / 3)
                  ))
                  const isBox3 = (r % 3 === 0 && r > 0)
                  const isCol3 = (c % 3 === 0 && c > 0)
                  const sumLabel = cageTopLeft[key]

                  return (
                    <div
                      key={key}
                      className={`relative flex items-center justify-center cursor-pointer transition-colors
                    ${isBox3 ? 'border-t-2 border-t-ink-400 dark:border-t-ink-300' : 'border-t border-t-ink-200 dark:border-t-ink-700'}
                    ${isCol3 ? 'border-l-2 border-l-ink-400 dark:border-l-ink-300' : 'border-l border-l-ink-200 dark:border-l-ink-700'}
                    ${isSelected ? 'bg-acid/30 dark:bg-acid/20' : isSameValue ? 'bg-acid/15 dark:bg-acid/10' : isHighlighted ? 'bg-ink-100 dark:bg-ink-800' : 'bg-white dark:bg-ink-900'}
                    ${cell.isError ? '!bg-danger/20' : ''}
                  `}
                      style={{ aspectRatio: '1' }}
                      onClick={() => handleCellClick(r, c)}
                    >
                      {/* Cage border outline */}
                      {cage && (
                        <div
                          className="absolute pointer-events-none border-ink-900/30 dark:border-acid/30 border-dashed z-0"
                          style={{
                            top: borders.top ? '3px' : '-1px',
                            bottom: borders.bottom ? '3px' : '-1px',
                            left: borders.left ? '3px' : '-1px',
                            right: borders.right ? '3px' : '-1px',
                            borderTopWidth: borders.top ? '1px' : '0',
                            borderBottomWidth: borders.bottom ? '1px' : '0',
                            borderLeftWidth: borders.left ? '1px' : '0',
                            borderRightWidth: borders.right ? '1px' : '0',
                          }}
                        />
                      )}
                      {/* Cage sum */}
                      {sumLabel !== undefined && (
                        <span className="absolute top-1 left-1 text-[8px] md:text-[9px] lg:text-[10px] font-mono text-ink-900/60 dark:text-acid leading-none z-10">
                          {sumLabel}
                        </span>
                      )}

                      {/* Cell value */}
                      {cell.value !== null ? (
                        <span className={`font-mono font-semibold text-sm md:text-lg lg:text-2xl leading-none
                      ${cell.isError ? 'text-danger' : isFixed(r, c) ? 'text-ink-700 dark:text-ink-100' : 'text-green-900 dark:text-acid'}
                    `}>
                          {cell.value}
                        </span>
                      ) : cell.draft.size > 0 ? (
                        <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5 md:p-0.5 lg:p-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                            <span key={n} className={`text-[6px] md:text-[7px] lg:text-[10px] font-mono text-center leading-none flex items-center justify-center
                          ${cell.draft.has(n) ? 'text-ink-500 dark:text-ink-300' : 'text-transparent'}
                        `}>{n}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>

        {/* Side Controls (PC) / Bottom Controls (Mobile) */}
        <div className="w-full lg:max-w-md flex flex-col lg:justify-center lg:mt-10">
          {/* Action buttons */}
          <div className="grid grid-cols-3 lg:grid-cols-3 gap-2 mb-6 md:mb-8 lg:mb-6">
            <ActionBtn
              onClick={handleErase}
              icon={<EraseIcon />}
              label="Стереть"
            />
            <ActionBtn
              onClick={() => setDraftMode(m => !m)}
              icon={<DraftIcon />}
              label="Черновик"
              active={draftMode}
            />
            <ActionBtn
              onClick={handleHint}
              disabled={hints >= 3}
              icon={<HintIcon />}
              label={`Подсказка (${3 - hints})`}
            />
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-9 lg:grid-cols-3 gap-1 md:gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button
                key={n}
                onClick={() => handleNumber(n)}
                className="aspect-square bg-ink-100 dark:bg-ink-800 font-mono font-semibold text-lg md:text-xl lg:text-2xl text-ink-900 dark:text-ink-100 hover:bg-acid hover:text-ink-900 active:scale-95 transition-all flex items-center justify-center rounded-sm"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ onClick, icon, label, active, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 px-2 py-3 md:py-4 transition-colors disabled:opacity-30 lg:border lg:border-ink-200 dark:lg:border-ink-700 lg:bg-ink-100 dark:lg:bg-ink-800 lg:hover:border-acid transition-all
        ${active ? 'text-acid-dark dark:text-acid lg:border-acid' : 'text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100'}
      `}
    >
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
