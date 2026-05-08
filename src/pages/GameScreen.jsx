import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { checkCell, checkWin, getHint, getCellBorders } from '../lib/sudoku.js'
import { updateGameSession, finishGameSession, updateUserBytes } from '../lib/api.js'
import { formatTime } from '../lib/api.js'
import { sfx, playClick } from '../lib/sounds.js'
import { getSkinById, getActiveSkin, loadSkinFont } from '../lib/grid_skins.js'

export default function GameScreen() {
  const { state, actions } = useApp()
  const { user, game } = state
  const { puzzle, sessionId, difficulty } = game

  const activeSkinId = useMemo(() => getActiveSkin(user?.id), [user?.id])
  const activeSkin = useMemo(() => getSkinById(activeSkinId), [activeSkinId])

  useEffect(() => {
    if (activeSkin) {
      loadSkinFont(activeSkin)
    }
  }, [activeSkin])

  const { solution, cages, cageMap: cageMapRaw, prefilled } = puzzle

  const cagesById = useMemo(
    () => Object.fromEntries(cages.map(c => [c.id, c])),
    [cages],
  )
  const cellToCageId = cageMapRaw
  const cageMapForBorders = useMemo(
    () => Object.fromEntries(
      Object.entries(cellToCageId).map(([k, id]) => [k, cagesById[id]]),
    ),
    [cellToCageId, cagesById],
  )
  const cageTopLeft = useMemo(() => {
    const map = {}
    for (const cage of cages) {
      const sorted = [...cage.cells].sort((a, b) => a[0] - b[0] || a[1] - b[1])
      map[`${sorted[0][0]},${sorted[0][1]}`] = cage.sum
    }
    return map
  }, [cages])

  const [board, setBoard] = useState(() => {
    return Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (__, c) => ({
        value: prefilled[r][c] ?? null,
        draft: new Set(),
        isError: false,
      }))
    )
  })

  const [selected, setSelected] = useState(null)
  const [draftMode, setDraftMode] = useState(false)
  const [errors, setErrors] = useState(0)
  const [hints, setHints] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const timerRef = useRef()
  const boardRef = useRef(board)
  const secondsRef = useRef(0)
  const gameOverRef = useRef(gameOver)
  const wonRef = useRef(won)
  boardRef.current = board
  secondsRef.current = seconds
  gameOverRef.current = gameOver
  wonRef.current = won

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        const next = s + 1
        secondsRef.current = next
        return next
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const stopTimer = () => clearInterval(timerRef.current)

  useEffect(() => {
    const save = setInterval(() => {
      if (gameOverRef.current || wonRef.current) return
      const playerInput = {}
      const b = boardRef.current
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (b[r][c].value !== null) playerInput[`${r},${c}`] = b[r][c].value
        }
      }
      updateGameSession(sessionId, {
        player_input: playerInput,
        time_spent: secondsRef.current,
      }).catch(console.error)
    }, 30000)
    return () => clearInterval(save)
  }, [sessionId])

  const isFixed = (r, c) => {
    if (prefilled[r][c] !== null) return true
    if (board[r][c].value === solution[r][c] && board[r][c].value !== null) return true
    return false
  }

  const handleCellClick = useCallback((r, c) => {
    if (gameOver || won) return
    playClick()
    setSelected([r, c])
  }, [gameOver, won])

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
          sfx.wrong()
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
          const flatInput = Array.from({ length: 9 }, (_, row) =>
            Array.from({ length: 9 }, (__, col) => {
              if (row === r && col === c) return num
              return next[row][col].value ?? prefilled[row][col]
            })
          )
          if (checkWin(solution, flatInput)) {
            sfx.win()
            stopTimer()
            setWon(true)
            finishGameSession(sessionId, {
              won: true, errorsCount: errors, hintsUsed: hints, timeSpent: seconds, userId: user.id, difficulty
            }).catch(console.error)
            setTimeout(() => actions.endGame({ won: true, errors, time: seconds, hints }), 600)
          } else {
            sfx.correct()
          }
        }
      }
      return next
    })
  }, [selected, draftMode, errors, hints, seconds, solution, prefilled, gameOver, won, sessionId, difficulty, user.id, actions])

  const handleScan = async () => {
    if ((user.bytes || 0) < 15 || gameOver || won) return
    const playerInput = board.map(row => row.map(c => c.value))
    const hint = getHint(solution, playerInput, prefilled)
    if (!hint) return

    try {
      const newBytes = await updateUserBytes(user.id, -15)
      actions.updateUser({ bytes: newBytes })
      playClick()
      setHints(h => h + 1)
      setBoard(prev => {
        const next = prev.map(row => row.map(cell => ({ ...cell, draft: new Set(cell.draft) })))
        next[hint.row][hint.col] = { value: hint.value, draft: new Set(), isError: false }
        return next
      })
      setSelected([hint.row, hint.col])
    } catch (e) {
      console.error(e)
    }
  }

  const handleAnalyze = async () => {
    if ((user.bytes || 0) < 10 || gameOver || won || showErrors) return
    try {
      const newBytes = await updateUserBytes(user.id, -10)
      actions.updateUser({ bytes: newBytes })
      setShowErrors(true)
    } catch (e) {
      console.error(e)
    }
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

  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '1' && e.key <= '9') handleNumber(parseInt(e.key))
      if (e.key === 'Backspace' || e.key === 'Delete') handleErase()
      if (e.key === 'd' || e.key === 'D') setDraftMode(m => !m)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNumber])

  return (
    <div className="min-h-dvh flex flex-col p-4 md:p-6 lg:p-8 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto transition-all">
      <div className="flex flex-col lg:flex-row lg:gap-20 lg:items-center lg:justify-center">
        <div className="w-full lg:max-w-md">
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <button onClick={handleSurrender} className="text-xs md:text-sm font-mono text-ink-500 dark:text-ink-400 hover:text-danger uppercase tracking-widest">Сдаться</button>
            <div className="font-display text-2xl md:text-3xl tracking-widest text-green-900 dark:text-acid">{difficulty.toUpperCase()}</div>
            <div className="font-mono text-lg md:text-xl text-ink-600 dark:text-ink-300">{formatTime(seconds)}</div>
          </div>

          <div className="flex items-center justify-between mb-4 md:mb-5">
            <div className="flex gap-2 items-center">
              <span className="text-xs md:text-sm font-mono text-ink-500 uppercase tracking-tighter">Ошибки</span>
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-3 h-3 md:w-3.5 md:h-3.5 rounded-full ${i < errors ? 'bg-danger' : 'bg-ink-200 dark:bg-ink-700'}`} />
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-ink-100 dark:bg-ink-800 rounded">
                <div className="w-3 h-3 rounded-full bg-acid" />
                <span className="font-mono text-sm font-bold">{user.bytes || 0}</span>
              </div>
            </div>
          </div>

          <SudokuGrid
            board={board}
            selected={selected}
            showErrors={showErrors}
            prefilled={prefilled}
            cellToCageId={cellToCageId}
            cagesById={cagesById}
            cageMapForBorders={cageMapForBorders}
            cageTopLeft={cageTopLeft}
            onCellClick={handleCellClick}
            activeSkin={activeSkin}
            theme={state.theme}
          />
        </div>

        <div className="w-full lg:max-w-xs flex flex-col gap-6">
          <div className="grid grid-cols-4 gap-2">
            <ActionBtn onClick={handleAnalyze} icon={<SearchIcon />} label="Aнализ (10B)" active={showErrors} disabled={(user.bytes || 0) < 10 || showErrors} />
            <ActionBtn onClick={() => setDraftMode(m => !m)} icon={<DraftIcon />} label="Черновик" active={draftMode} />
            <ActionBtn onClick={handleScan} icon={<HintIcon />} label="Сканер (15B)" disabled={(user.bytes || 0) < 15} />
            <ActionBtn onClick={handleErase} icon={<EraseIcon />} label="Стереть" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button key={n} onClick={() => handleNumber(n)} className="aspect-square flex items-center justify-center bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 font-display text-2xl hover:bg-acid active:scale-95 transition-all">{n}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const SudokuGrid = memo(function SudokuGrid({
  board,
  selected,
  showErrors,
  prefilled,
  cellToCageId,
  cagesById,
  cageMapForBorders,
  cageTopLeft,
  onCellClick,
  activeSkin,
  theme,
}) {
  const isPrefilled = (r, c) => prefilled[r][c] !== null
  const s = activeSkin[theme === 'light' ? 'light' : 'dark']

  return (
    <div className="relative select-none mb-6">
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(9, 1fr)',
          aspectRatio: '1',
          backgroundColor: s.gridBg,
          borderColor: s.borderBlockColor,
          borderWidth: '2px',
          borderStyle: 'solid',
        }}
      >
        {Array.from({ length: 9 }, (_, r) =>
          Array.from({ length: 9 }, (__, c) => {
            const cell = board[r][c]
            const key = `${r},${c}`
            const cageId = cellToCageId[key]
            const cage = cagesById[cageId]
            const borders = cage ? getCellBorders(r, c, cageMapForBorders) : {}
            const isSelected = selected && selected[0] === r && selected[1] === c
            const sumLabel = cageTopLeft[key]
            const prefilledCell = isPrefilled(r, c)

            // Dynamic styles
            const cellBg = isSelected ? s.selectedBg : (cell.isError && showErrors) ? s.errorBg : s.cellBg
            const borderTopW = r % 3 === 0 && r > 0 ? '2px' : '1px'
            const borderTopC = r % 3 === 0 && r > 0 ? s.borderBlockColor : s.borderColor
            const borderLeftW = c % 3 === 0 && c > 0 ? '2px' : '1px'
            const borderLeftC = c % 3 === 0 && c > 0 ? s.borderBlockColor : s.borderColor

            return (
              <div
                key={key}
                onClick={() => onCellClick(r, c)}
                className="relative flex items-center justify-center cursor-pointer aspect-square touch-manipulation transition-all"
                style={{
                  backgroundColor: cellBg,
                  borderTop: `${borderTopW} solid ${borderTopC}`,
                  borderLeft: `${borderLeftW} solid ${borderLeftC}`,
                  borderRight: c === 8 ? 'none' : undefined,
                  borderBottom: r === 8 ? 'none' : undefined,
                  boxShadow: isSelected ? `inset 0 0 0 2.5px ${s.selectedRing}` : undefined,
                }}
              >
                {cage && (
                  <div
                    className="absolute pointer-events-none border-dashed z-0"
                    style={{
                      top: borders.top ? '3px' : '-1px',
                      bottom: borders.bottom ? '3px' : '-1px',
                      left: borders.left ? '3px' : '-1px',
                      right: borders.right ? '3px' : '-1px',
                      borderTopWidth: borders.top ? '1px' : '0',
                      borderBottomWidth: borders.bottom ? '1px' : '0',
                      borderLeftWidth: borders.left ? '1px' : '0',
                      borderRightWidth: borders.right ? '1px' : '0',
                      borderColor: s.cageBorder,
                    }}
                  />
                )}
                {sumLabel !== undefined && (
                  <span
                    className="absolute top-1 left-1 text-[8px] md:text-[10px] opacity-75 z-10"
                    style={{
                      fontFamily: s.fontFamily,
                      color: s.sumColor === 'inherit' ? undefined : s.sumColor,
                    }}
                  >
                    {sumLabel}
                  </span>
                )}
                {cell.value !== null ? (
                  <span
                    className="text-lg md:text-2xl font-bold"
                    style={{
                      fontFamily: s.fontFamily,
                      fontWeight: s.fontWeight,
                      color: (cell.isError && showErrors) ? '#ef4444' : prefilledCell ? s.prefilledColor : s.userColor,
                    }}
                  >
                    {cell.value}
                  </span>
                ) : cell.draft.size > 0 ? (
                  <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <span
                        key={n}
                        className="text-[7px] md:text-[9px] text-center"
                        style={{
                          fontFamily: s.fontFamily,
                          color: cell.draft.has(n) ? s.draftColor : 'transparent',
                        }}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
})

function ActionBtn({ onClick, icon, label, active, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex flex-col items-center gap-1 p-2 md:p-3 transition-all disabled:opacity-30 border-2 ${active ? 'border-acid text-acid bg-acid/10' : 'border-ink-200 dark:border-ink-800 text-ink-500 hover:border-acid'}`}>
      <div className="scale-90 md:scale-100">{icon}</div>
      <span className="text-[8px] md:text-[9px] font-mono uppercase font-bold text-center leading-tight">{label}</span>
    </button>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
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
