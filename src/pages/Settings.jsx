import { useRef, useState } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { updateUserTheme, updateUserPhoto } from '../lib/api.js'
import { isSoundEnabled, setSoundEnabled, playClick } from '../lib/sounds.js'

export default function Settings() {
  const { state, actions } = useApp()
  const { user, theme } = state
  const [photoPreview, setPhotoPreview] = useState(user?.photo_url || null)
  const [saving, setSaving] = useState(false)
  const [soundOn, setSoundOn] = useState(isSoundEnabled())
  const fileRef = useRef()

  const handleTheme = async (t) => {
    actions.setTheme(t)
    try {
      await updateUserTheme(user.id, t)
    } catch (e) {
      console.error(e)
    }
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      setPhotoPreview(dataUrl)
      setSaving(true)
      try {
        await updateUserPhoto(user.id, dataUrl)
        actions.updateUser({ photo_url: dataUrl })
      } catch (err) {
        console.error(err)
      } finally {
        setSaving(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="min-h-dvh flex flex-col p-6 md:p-8 lg:p-12 max-w-md md:max-w-xl lg:max-w-2xl mx-auto transition-all">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10 md:mb-16 pt-2">
        <button onClick={() => actions.setScreen('hub')} className="text-ink-500 dark:text-ink-400 hover:text-acid transition-colors p-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="md:w-8 md:h-8">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="font-display text-3xl md:text-5xl tracking-widest text-acid-dark dark:text-acid">НАСТРОЙКИ</div>
      </div>

      {/* Avatar */}
      <div className="mb-8 md:mb-12">
        <div className="text-xs md:text-sm font-mono text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-3 md:mb-5">Аватар</div>
        <div className="flex items-center gap-4 md:gap-8">
          <div
            className="w-20 h-20 md:w-32 md:h-32 border-2 border-ink-300 dark:border-ink-600 overflow-hidden bg-ink-100 dark:bg-ink-800 flex items-center justify-center cursor-pointer hover:border-acid transition-colors"
            onClick={() => fileRef.current.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} className="w-full h-full object-cover" alt="avatar" />
            ) : (
              <span className="font-display text-3xl md:text-6xl text-acid-dark dark:text-acid">{user?.username?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div>
            <button
              onClick={() => fileRef.current.click()}
              className="text-sm md:text-lg font-mono text-acid-dark dark:text-acid hover:text-acid-dark transition-colors block mb-1"
            >
              Изменить фото
            </button>
            {saving && <span className="text-xs md:text-sm font-mono text-ink-500 dark:text-ink-400">Сохранение...</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
      </div>

      {/* Username */}
      <div className="mb-8 md:mb-12">
        <div className="text-xs md:text-sm font-mono text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-3 md:mb-5">Имя</div>
        <div className="font-mono text-lg md:text-2xl text-ink-900 dark:text-ink-200 bg-ink-100 dark:bg-ink-800 px-4 md:px-6 py-3 md:py-5 border border-ink-300 dark:border-ink-700 transition-colors">
          {user?.username}
        </div>
      </div>

      {/* Sound */}
      <div className="mb-8">
        <div className="text-xs font-mono text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-3">Звук</div>
        <button
          type="button"
          onClick={() => {
            const next = !soundOn
            setSoundOn(next)
            setSoundEnabled(next)
            if (next) playClick()
          }}
          className={`w-full py-3 font-mono text-sm uppercase tracking-widest border transition-colors
            ${soundOn
              ? 'border-acid-dark dark:border-acid text-acid-dark dark:text-acid bg-acid/5'
              : 'border-ink-300 dark:border-ink-700 text-ink-500'}
          `}
        >
          {soundOn ? '🔊 Звук включён' : '🔇 Звук выключен'}
        </button>
      </div>

      {/* Theme */}
      <div className="mb-8">
        <div className="text-xs font-mono text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-3">Тема</div>
        <div className="flex gap-3">
          {['dark', 'light'].map(t => (
            <button
              key={t}
              onClick={() => handleTheme(t)}
              className={`flex-1 py-3 font-mono text-sm uppercase tracking-widest border transition-colors
                ${theme === t
                  ? 'border-acid-dark dark:border-acid text-acid-dark dark:text-acid bg-acid/5 dark:bg-acid/10'
                  : 'border-ink-300 dark:border-ink-700 text-ink-500 dark:text-ink-400 hover:border-ink-900 dark:hover:border-ink-400 hover:text-ink-900 dark:hover:text-ink-200'}
              `}
            >
              {t === 'dark' ? '🌙 Тёмная' : '☀️ Светлая'}
            </button>
          ))}
        </div>
      </div>

      {/* Pro status */}
      <div className="mb-10">
        <div className="text-xs font-mono text-ink-500 dark:text-ink-400 uppercase tracking-widest mb-3">Подписка</div>
        <div className={`px-4 py-3 border font-mono text-sm transition-colors
          ${user?.is_pro ? 'border-acid-dark dark:border-acid text-acid-dark dark:text-acid bg-acid/5 dark:bg-acid/10' : 'border-ink-300 dark:border-ink-700 text-ink-500 dark:text-ink-500'}
        `}>
          {user?.is_pro ? '⭐ PRO — 5 попыток Hard в день' : 'FREE — 1 попытка Hard в день'}
        </div>
      </div>

      {/* Logout */}
      <div className="mt-auto">
        <button
          onClick={actions.logout}
          className="w-full py-3 border border-danger/50 text-danger font-mono text-sm uppercase tracking-widest hover:bg-danger/10 transition-colors"
        >
          Выйти
        </button>
      </div>
    </div>
  )
}
