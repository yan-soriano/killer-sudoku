import { createContext, useContext, useReducer, useEffect } from 'react'
import { getUserBytes } from '../lib/api.js'

const AppContext = createContext(null)

const initialState = {
  user: null,          // объект пользователя из БД
  screen: 'loading',  // loading | onboarding | hub | game | result | settings
  game: null,          // текущая игровая сессия
  theme: 'light',
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, theme: action.payload?.theme ?? 'light' }
    case 'SET_SCREEN':
      return { ...state, screen: action.payload }
    case 'SET_GAME':
      return { ...state, game: action.payload }
    case 'SET_THEME':
      return { ...state, theme: action.payload }
    case 'LOGOUT':
      return { ...initialState, screen: 'onboarding' }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // При старте — проверяем localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ks_user')
    if (saved) {
      try {
        const user = JSON.parse(saved)
        dispatch({ type: 'SET_USER', payload: user })
        dispatch({ type: 'SET_SCREEN', payload: 'hub' })
        getUserBytes(user.id).then(bytes => {
          const withBytes = { ...user, bytes }
          localStorage.setItem('ks_user', JSON.stringify(withBytes))
          dispatch({ type: 'SET_USER', payload: withBytes })
        }).catch(() => {})
      } catch {
        dispatch({ type: 'SET_SCREEN', payload: 'onboarding' })
      }
    } else {
      dispatch({ type: 'SET_SCREEN', payload: 'onboarding' })
    }
  }, [])

  // Синхронизация темы с DOM
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark')
  }, [state.theme])

  const actions = {
    login(user) {
      localStorage.setItem('ks_user', JSON.stringify(user))
      dispatch({ type: 'SET_USER', payload: user })
      dispatch({ type: 'SET_SCREEN', payload: 'hub' })
    },
    logout() {
      localStorage.removeItem('ks_user')
      dispatch({ type: 'LOGOUT' })
    },
    setScreen(screen) {
      dispatch({ type: 'SET_SCREEN', payload: screen })
    },
    startGame(gameData) {
      dispatch({ type: 'SET_GAME', payload: gameData })
      dispatch({ type: 'SET_SCREEN', payload: 'game' })
    },
    endGame(result) {
      dispatch({ type: 'SET_GAME', payload: { ...state.game, result } })
      dispatch({ type: 'SET_SCREEN', payload: 'result' })
    },
    setTheme(theme) {
      dispatch({ type: 'SET_THEME', payload: theme })
      // Обновить в localStorage тоже
      const user = JSON.parse(localStorage.getItem('ks_user') || '{}')
      if (user.id) {
        localStorage.setItem('ks_user', JSON.stringify({ ...user, theme }))
        dispatch({ type: 'SET_USER', payload: { ...state.user, theme } })
      }
    },
    updateUser(updates) {
      if (!state.user) return
      const changed = Object.keys(updates).some(
        (key) => state.user[key] !== updates[key],
      )
      if (!changed) return
      const updated = { ...state.user, ...updates }
      localStorage.setItem('ks_user', JSON.stringify(updated))
      dispatch({ type: 'SET_USER', payload: updated })
    },
  }

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
