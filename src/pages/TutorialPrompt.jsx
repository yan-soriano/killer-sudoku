import { useApp } from '../store/AppContext.jsx'

export default function TutorialPrompt() {
  const { actions } = useApp()

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-md md:max-w-lg bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 p-8 md:p-10 animate-fade-in shadow-2xl">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-24 h-24 bg-acid/20 rounded-full blur-2xl" />

        <div className="text-center mb-8">
          <div className="font-display text-4xl md:text-5xl tracking-wider text-green-900 dark:text-acid mb-3">
            ДОБРО ПОЖАЛОВАТЬ!
          </div>
          <p className="text-ink-500 dark:text-ink-400 font-mono text-sm leading-relaxed">
            Вы впервые в Killer Sudoku? Пройдите короткое обучение — за пару минут разберётесь в правилах.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => actions.setScreen('tutorial')}
            className="w-full py-4 bg-acid text-ink-900 font-body font-semibold text-lg tracking-wide hover:bg-acid-dark transition-colors"
          >
            НАЧАТЬ ОБУЧЕНИЕ
          </button>
          <button
            onClick={() => actions.skipTutorial()}
            className="w-full py-4 border border-ink-300 dark:border-ink-600 text-ink-600 dark:text-ink-200 font-body font-semibold text-lg tracking-wide hover:border-acid hover:text-acid transition-colors"
          >
            ПРОПУСТИТЬ
          </button>
        </div>
      </div>
    </div>
  )
}
