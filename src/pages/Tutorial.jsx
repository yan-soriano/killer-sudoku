import { useState } from 'react'
import { useApp } from '../store/AppContext.jsx'

const STEPS = [
  {
    title: 'ЧТО ТАКОЕ KILLER SUDOKU?',
    text: 'Это судоку 9×9 с дополнительным правилом: клетки объединены в группы — «клетки» (cages). Цифры внутри группы должны давать указанную сумму.',
    visual: 'intro',
  },
  {
    title: 'КЛАССИЧЕСКИЕ ПРАВИЛА',
    text: 'Как в обычном судоку: в каждой строке, столбце и блоке 3×3 цифры от 1 до 9 встречаются ровно один раз.',
    visual: 'rules',
  },
  {
    title: 'КЛЕТКИ И СУММЫ',
    text: 'Клетки, обведённые пунктиром, — одна группа. Число в углу — сумма всех цифр в этой группе. Цифры в группе не повторяются.',
    visual: 'cages',
  },
  {
    title: 'КАК ИГРАТЬ',
    text: 'Нажимайте на клетку и вводите цифру. Три ошибки — конец игры. Используйте черновик, подсказки и анализ, чтобы не ошибаться.',
    visual: 'play',
  },
]

function MiniGrid({ type }) {
  if (type === 'intro') {
    return (
      <div className="mx-auto w-48 aspect-square grid grid-cols-3 border-2 border-ink-400 dark:border-ink-300">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-center border border-ink-200 dark:border-ink-700 font-mono text-xl text-green-600 dark:text-acid"
          >
            {i === 4 ? '?' : ''}
          </div>
        ))}
      </div>
    )
  }

  if (type === 'rules') {
    const demo = [
      [5, 3, 4],
      [6, 7, 8],
      [9, 1, 2],
    ]
    return (
      <div className="mx-auto w-48 aspect-square grid grid-cols-3 border-2 border-ink-400 dark:border-ink-300 relative">
        {demo.flat().map((n, i) => (
          <div
            key={i}
            className={`flex items-center justify-center border border-ink-200 dark:border-ink-700 font-mono text-lg ${
              i < 3 ? 'bg-acid/10' : ''
            }`}
          >
            {n}
          </div>
        ))}
        <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-mono text-ink-500 uppercase tracking-widest">
          Строка без повторов
        </div>
      </div>
    )
  }

  if (type === 'cages') {
    const cells = [
      { v: 3, cage: 'a', sum: 7, top: true, left: true, bottom: true, right: false },
      { v: 4, cage: 'a', sum: null, top: true, left: false, bottom: true, right: true },
      { v: null, cage: 'b', sum: 5, top: true, left: true, bottom: false, right: true },
      { v: null, cage: 'b', sum: null, top: false, left: true, bottom: true, right: true },
    ]
    return (
      <div className="mx-auto w-32 aspect-square grid grid-cols-2 border-2 border-ink-400 dark:border-ink-300 relative mb-6">
        {cells.map((cell, i) => (
          <div key={i} className="relative flex items-center justify-center aspect-square">
            <div
              className="absolute inset-0 border-dashed border-ink-900/40 dark:border-acid/40 pointer-events-none"
              style={{
                top: cell.top ? '4px' : '-1px',
                bottom: cell.bottom ? '4px' : '-1px',
                left: cell.left ? '4px' : '-1px',
                right: cell.right ? '4px' : '-1px',
                borderTopWidth: cell.top ? '1px' : '0',
                borderBottomWidth: cell.bottom ? '1px' : '0',
                borderLeftWidth: cell.left ? '1px' : '0',
                borderRightWidth: cell.right ? '1px' : '0',
              }}
            />
            {cell.sum !== null && (
              <span className="absolute top-0.5 left-1 text-[8px] font-mono opacity-60">{cell.sum}</span>
            )}
            {cell.v !== null && (
              <span className="font-mono font-bold text-green-600 dark:text-acid">{cell.v}</span>
            )}
          </div>
        ))}
        <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-mono text-ink-500">
          3 + 4 = 7
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xs space-y-3">
      <div className="flex items-center justify-between text-xs font-mono text-ink-500 uppercase tracking-widest">
        <span>Ошибки</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-danger" />
          <div className="w-2.5 h-2.5 rounded-full bg-ink-200 dark:bg-ink-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-ink-200 dark:bg-ink-700" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <div
            key={n}
            className="aspect-square flex items-center justify-center border border-ink-200 dark:border-ink-700 font-display text-lg bg-white dark:bg-ink-900"
          >
            {n}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Tutorial() {
  const { actions } = useApp()
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleNext = () => {
    if (isLast) actions.completeTutorial()
    else setStep(s => s + 1)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 relative">
      <button
        onClick={() => actions.skipTutorial()}
        className="absolute top-6 right-6 text-ink-500 dark:text-ink-400 hover:text-acid transition-colors text-sm font-mono uppercase tracking-widest"
      >
        Пропустить
      </button>

      <div className="absolute top-6 left-6 flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              step >= i ? 'bg-acid-dark dark:bg-acid' : 'bg-ink-200 dark:bg-ink-700'
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-md md:max-w-lg animate-fade-in">
        <div className="mb-8 md:mb-10">
          <MiniGrid type={current.visual} />
        </div>

        <div className="text-center mb-8 space-y-4">
          <h1 className="font-display text-3xl md:text-4xl tracking-wider text-green-900 dark:text-acid">
            {current.title}
          </h1>
          <p className="text-ink-500 dark:text-ink-400 font-mono text-sm md:text-base leading-relaxed px-2">
            {current.text}
          </p>
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-4 border border-ink-300 dark:border-ink-600 text-ink-600 dark:text-ink-200 font-semibold tracking-wide hover:border-acid hover:text-acid transition-colors"
            >
              НАЗАД
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-4 bg-acid text-ink-900 font-semibold text-lg tracking-wide hover:bg-acid-dark transition-colors"
          >
            {isLast ? 'В ГЛАВНОЕ МЕНЮ' : 'ДАЛЕЕ'}
          </button>
        </div>
      </div>
    </div>
  )
}
