import { useApp } from './store/AppContext.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Hub from './pages/Hub.jsx'
import GameScreen from './pages/GameScreen.jsx'
import ResultScreen from './pages/ResultScreen.jsx'
import Settings from './pages/Settings.jsx'
import DuelScreen from './pages/DuelScreen.jsx'
import AdventureMode from './pages/AdventureMode.jsx'
import TutorialPrompt from './pages/TutorialPrompt.jsx'
import Tutorial from './pages/Tutorial.jsx'
import Shop from './pages/Shop.jsx'

function LoadingScreen() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="font-display text-4xl tracking-widest text-green-900 dark:text-acid animate-pulse transition-colors">KILLER SUDOKU</div>
    </div>
  )
}

function Router() {
  const { state } = useApp()

  switch (state.screen) {
    case 'loading': return <LoadingScreen />
    case 'onboarding': return <Onboarding />
    case 'tutorial-prompt': return <TutorialPrompt />
    case 'tutorial': return <Tutorial />
    case 'hub': return <Hub />
    case 'game': return <GameScreen />
    case 'result': return <ResultScreen />
    case 'settings': return <Settings />
    case 'duel': return <DuelScreen />
    case 'adventure': return <AdventureMode />
    case 'shop': return <Shop />
    default: return <LoadingScreen />
  }
}

export default function App() {
  return <Router />
}
