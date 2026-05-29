import { useState, useRef } from 'react'
import { registerUser, loginUser } from '../lib/api.js'
import { useApp } from '../store/AppContext.jsx'

const STEPS = ['name', 'password', 'photo', 'done']

export default function Onboarding() {
  const { actions } = useApp()
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState(null) // 'register' | 'login'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoBase64, setPhotoBase64] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPhotoPreview(ev.target.result)
      setPhotoBase64(ev.target.result) // base64 data URL
    }
    reader.readAsDataURL(file)
  }

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    try {
      const user = await registerUser(username.trim(), password, photoBase64)
      actions.login(user)
    } catch (e) {
      setError(e.message || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const user = await loginUser(username.trim(), password)
      actions.login(user)
    } catch (e) {
      setError(e.message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  if (!mode) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6">
        <div className="mb-12 md:mb-16 text-center">
          <div className="font-display text-7xl md:text-9xl tracking-wider text-acid-dark dark:text-acid mb-2 transition-all">KILLER</div>
          <div className="font-display text-5xl md:text-7xl tracking-widest text-ink-300 dark:text-ink-200 transition-all">SUDOKU</div>
          <div className="mt-4 md:mt-8 w-16 md:w-24 h-0.5 md:h-1 bg-acid mx-auto" />
        </div>

        <div className="w-full max-w-xs md:max-w-md lg:max-w-lg space-y-4 md:space-y-6">
          <button
            onClick={() => setMode('register')}
            className="w-full py-4 md:py-6 bg-acid text-ink-900 font-body font-semibold text-lg md:text-2xl tracking-wide hover:bg-acid-dark transition-colors"
          >
            СОЗДАТЬ АККАУНТ
          </button>
          <button
            onClick={() => setMode('login')}
            className="w-full py-4 md:py-6 border border-ink-300 dark:border-ink-600 text-ink-600 dark:text-ink-200 font-body font-semibold text-lg md:text-2xl tracking-wide hover:border-acid hover:text-acid transition-colors"
          >
            ВОЙТИ
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'login') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6">
        <button
          onClick={() => { setMode(null); setError('') }}
          className="absolute top-6 left-6 text-ink-500 dark:text-ink-400 hover:text-acid transition-colors text-sm font-mono"
        >
          ← НАЗАД
        </button>
        <div className="font-display text-4xl md:text-6xl tracking-wider text-acid-dark dark:text-acid mb-10 md:mb-16">ВХОД</div>
        <div className="w-full max-w-xs md:max-w-md space-y-4 md:space-y-8">
          <div>
            <label className="text-xs font-mono text-ink-500 dark:text-ink-400 uppercase tracking-widest block mb-1">Имя</label>
            <input
              className="w-full bg-ink-100 dark:bg-ink-800 border border-ink-300 dark:border-ink-600 text-ink-900 dark:text-ink-100 px-4 py-3 font-mono focus:outline-none focus:border-acid transition-colors"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-ink-500 dark:text-ink-400 uppercase tracking-widest block mb-1">Пароль</label>
            <input
              type="password"
              className="w-full bg-ink-100 dark:bg-ink-800 border border-ink-300 dark:border-ink-600 text-ink-900 dark:text-ink-100 px-4 py-3 font-mono focus:outline-none focus:border-acid transition-colors"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-danger text-sm font-mono">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={!username || !password || loading}
            className="w-full py-4 bg-acid text-ink-900 font-semibold text-lg tracking-wide disabled:opacity-40 hover:bg-acid-dark transition-colors"
          >
            {loading ? 'ЗАГРУЗКА...' : 'ВОЙТИ'}
          </button>
        </div>
      </div>
    )
  }

  // REGISTER FLOW — 3 шага
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 relative">
      {/* Back */}
      <button
        onClick={() => {
          if (step === 0) { setMode(null); setError('') }
          else setStep(s => s - 1)
        }}
        className="absolute top-6 left-6 text-ink-500 dark:text-ink-400 hover:text-acid transition-colors text-sm font-mono"
      >
        ← НАЗАД
      </button>

      {/* Step dots */}
      <div className="absolute top-6 right-6 flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className={`w-2 h-2 rounded-full transition-colors ${step >= i ? 'bg-acid-dark dark:bg-acid' : 'bg-ink-200 dark:bg-ink-700'}`} />
        ))}
      </div>

      <div className="w-full max-w-xs md:max-w-md lg:max-w-lg">
        {/* STEP 0: Имя */}
        {step === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="font-display text-4xl tracking-wider text-acid-dark dark:text-acid mb-2">КАК ТЕБЯ ЗОВУТ?</div>
              <div className="text-ink-500 dark:text-ink-400 text-sm font-mono">Это будет твоё имя в игре</div>
            </div>
            <input
              className="w-full bg-ink-100 dark:bg-ink-800 border border-ink-300 dark:border-ink-600 text-ink-900 dark:text-ink-100 px-4 py-3 font-mono text-lg focus:outline-none focus:border-acid transition-colors"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && username.trim() && setStep(1)}
            />
            <button
              onClick={() => setStep(1)}
              disabled={!username.trim()}
              className="w-full py-4 bg-acid text-ink-900 font-semibold text-lg tracking-wide disabled:opacity-40 hover:bg-acid-dark transition-colors"
            >
              ДАЛЕЕ
            </button>
          </div>
        )}

        {/* STEP 1: Пароль */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="font-display text-4xl tracking-wider text-acid-dark dark:text-acid mb-2">ПРИДУМАЙ ПАРОЛЬ</div>
              <div className="text-ink-500 dark:text-ink-400 text-sm font-mono">Минимум 4 символа</div>
            </div>
            <input
              type="password"
              className="w-full bg-ink-100 dark:bg-ink-800 border border-ink-300 dark:border-ink-600 text-ink-900 dark:text-ink-100 px-4 py-3 font-mono text-lg focus:outline-none focus:border-acid transition-colors"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              autoComplete="new-password"
              onKeyDown={e => e.key === 'Enter' && password.length >= 4 && setStep(2)}
            />
            {error && <p className="text-danger text-sm font-mono">{error}</p>}
            <button
              onClick={() => setStep(2)}
              disabled={password.length < 4}
              className="w-full py-4 bg-acid text-ink-900 font-semibold text-lg tracking-wide disabled:opacity-40 hover:bg-acid-dark transition-colors"
            >
              ДАЛЕЕ
            </button>
          </div>
        )}

        {/* STEP 2: Фото */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <div className="font-display text-4xl tracking-wider text-acid-dark dark:text-acid mb-2">ДОБАВЬ ФОТО</div>
              <div className="text-ink-500 dark:text-ink-400 text-sm font-mono">Необязательно, можно пропустить</div>
            </div>

            <div
              className="w-32 h-32 mx-auto border-2 border-dashed border-ink-300 dark:border-ink-600 flex items-center justify-center cursor-pointer hover:border-acid transition-colors overflow-hidden relative transition-colors"
              onClick={() => fileRef.current.click()}
            >
              {photoPreview ? (
                <img src={photoPreview} className="w-full h-full object-cover" alt="photo" />
              ) : (
                <div className="text-ink-300 dark:text-ink-500 text-center">
                  <div className="text-3xl mb-1">+</div>
                  <div className="text-xs font-mono">ФОТО</div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            {error && <p className="text-danger text-sm font-mono">{error}</p>}

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full py-4 bg-acid text-ink-900 font-semibold text-lg tracking-wide disabled:opacity-40 hover:bg-acid-dark transition-colors"
            >
              {loading ? 'СОЗДАЁМ...' : 'НАЧАТЬ ИГРУ'}
            </button>
            <button
              onClick={() => { setPhotoBase64(null); setPhotoPreview(null); handleRegister() }}
              className="w-full py-2 text-ink-500 dark:text-ink-400 text-sm font-mono hover:text-acid transition-colors"
            >
              Пропустить
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
