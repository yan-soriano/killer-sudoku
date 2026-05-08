/**
 * Скины сетки судоку.
 * Каждый скин определяет CSS-переменные для сетки:
 *   - gridBg          — фон всей сетки
 *   - cellBg          — фон ячейки
 *   - borderColor     — тонкие линии (внутри блока)
 *   - borderBlockColor — жирные линии (3×3)
 *   - selectedBg      — подсветка выбранной ячейки
 *   - selectedRing    — обводка выбранной ячейки
 *   - prefilledColor  — цвет предзаполненных чисел
 *   - userColor       — цвет чисел игрока
 *   - errorBg         — фон ошибочной ячейки
 *   - cageBorder      — цвет пунктирных границ кейджей
 *   - sumColor        — цвет суммы кейджа
 *   - draftColor      — цвет черновиковых цифр
 *   - fontFamily      — шрифт цифр
 *   - fontWeight      — жирность
 */

export const GRID_SKINS = [
  {
    id: 'default',
    name: 'Classic',
    description: 'Стандартный минималистичный дизайн',
    price: 0,
    preview: {
      bg: '#0a0a0a',
      accent: '#c8ff00',
      lines: '#666666',
    },
    light: {
      gridBg: 'transparent',
      cellBg: 'transparent',
      borderColor: '#d9d9d9',
      borderBlockColor: '#666666',
      selectedBg: 'rgba(200,255,0,0.3)',
      selectedRing: '#c8ff00',
      prefilledColor: '#0a0a0a',
      userColor: '#16a34a',
      errorBg: 'rgba(255,59,48,0.2)',
      cageBorder: 'rgba(10,10,10,0.3)',
      sumColor: 'inherit',
      draftColor: '#404040',
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: '700',
    },
    dark: {
      gridBg: 'transparent',
      cellBg: 'transparent',
      borderColor: '#1a1a1a',
      borderBlockColor: '#d9d9d9',
      selectedBg: 'rgba(200,255,0,0.2)',
      selectedRing: '#c8ff00',
      prefilledColor: '#f0f0f0',
      userColor: '#c8ff00',
      errorBg: 'rgba(255,59,48,0.2)',
      cageBorder: 'rgba(200,255,0,0.3)',
      sumColor: 'inherit',
      draftColor: '#8c8c8c',
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: '700',
    },
  },
  {
    id: 'neon_cyber',
    name: 'Neon Cyber',
    description: 'Кибер-неоновая сетка с глоу-эффектами',
    price: 50,
    preview: {
      bg: '#0d0221',
      accent: '#00f0ff',
      lines: '#7b2dff',
    },
    light: {
      gridBg: '#e8e0f4',
      cellBg: '#f5f0ff',
      borderColor: '#c4b5fd',
      borderBlockColor: '#7c3aed',
      selectedBg: 'rgba(0,240,255,0.25)',
      selectedRing: '#00f0ff',
      prefilledColor: '#4c1d95',
      userColor: '#7c3aed',
      errorBg: 'rgba(255,0,85,0.2)',
      cageBorder: 'rgba(124,58,237,0.4)',
      sumColor: '#7c3aed',
      draftColor: '#a78bfa',
      fontFamily: "'Orbitron', 'JetBrains Mono', monospace",
      fontWeight: '600',
    },
    dark: {
      gridBg: '#0d0221',
      cellBg: 'rgba(13,2,33,0.8)',
      borderColor: 'rgba(123,45,255,0.3)',
      borderBlockColor: '#7b2dff',
      selectedBg: 'rgba(0,240,255,0.15)',
      selectedRing: '#00f0ff',
      prefilledColor: '#e0d4ff',
      userColor: '#00f0ff',
      errorBg: 'rgba(255,0,85,0.25)',
      cageBorder: 'rgba(123,45,255,0.4)',
      sumColor: '#a78bfa',
      draftColor: 'rgba(0,240,255,0.4)',
      fontFamily: "'Orbitron', 'JetBrains Mono', monospace",
      fontWeight: '600',
    },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    description: 'Нежный японский стиль с розовыми тонами',
    price: 50,
    preview: {
      bg: '#fff5f7',
      accent: '#f472b6',
      lines: '#fda4af',
    },
    light: {
      gridBg: '#fff5f7',
      cellBg: '#fffbfc',
      borderColor: '#fecdd3',
      borderBlockColor: '#f472b6',
      selectedBg: 'rgba(244,114,182,0.2)',
      selectedRing: '#f472b6',
      prefilledColor: '#831843',
      userColor: '#db2777',
      errorBg: 'rgba(255,59,48,0.15)',
      cageBorder: 'rgba(244,114,182,0.4)',
      sumColor: '#be185d',
      draftColor: '#f9a8d4',
      fontFamily: "'Noto Serif JP', 'Georgia', serif",
      fontWeight: '500',
    },
    dark: {
      gridBg: '#1a0a10',
      cellBg: 'rgba(26,10,16,0.9)',
      borderColor: 'rgba(244,114,182,0.15)',
      borderBlockColor: '#f472b6',
      selectedBg: 'rgba(244,114,182,0.2)',
      selectedRing: '#f472b6',
      prefilledColor: '#fce7f3',
      userColor: '#f472b6',
      errorBg: 'rgba(255,59,48,0.2)',
      cageBorder: 'rgba(244,114,182,0.35)',
      sumColor: '#f9a8d4',
      draftColor: 'rgba(244,114,182,0.4)',
      fontFamily: "'Noto Serif JP', 'Georgia', serif",
      fontWeight: '500',
    },
  },
  {
    id: 'stealth',
    name: 'Stealth Ops',
    description: 'Тактический военный стиль с зелёным HUD',
    price: 50,
    preview: {
      bg: '#0a1208',
      accent: '#22c55e',
      lines: '#166534',
    },
    light: {
      gridBg: '#f0fdf4',
      cellBg: '#f7fef9',
      borderColor: '#bbf7d0',
      borderBlockColor: '#16a34a',
      selectedBg: 'rgba(34,197,94,0.2)',
      selectedRing: '#22c55e',
      prefilledColor: '#052e16',
      userColor: '#15803d',
      errorBg: 'rgba(255,59,48,0.15)',
      cageBorder: 'rgba(22,163,74,0.35)',
      sumColor: '#166534',
      draftColor: '#86efac',
      fontFamily: "'Share Tech Mono', 'JetBrains Mono', monospace",
      fontWeight: '700',
    },
    dark: {
      gridBg: '#0a1208',
      cellBg: 'rgba(10,18,8,0.9)',
      borderColor: 'rgba(22,101,52,0.35)',
      borderBlockColor: '#166534',
      selectedBg: 'rgba(34,197,94,0.15)',
      selectedRing: '#22c55e',
      prefilledColor: '#dcfce7',
      userColor: '#22c55e',
      errorBg: 'rgba(255,59,48,0.2)',
      cageBorder: 'rgba(34,197,94,0.35)',
      sumColor: '#4ade80',
      draftColor: 'rgba(34,197,94,0.4)',
      fontFamily: "'Share Tech Mono', 'JetBrains Mono', monospace",
      fontWeight: '700',
    },
  },
]

export function getSkinById(id) {
  return GRID_SKINS.find(s => s.id === id) || GRID_SKINS[0]
}

/** Загрузить Google-шрифт если ещё не загружен */
const loadedFonts = new Set()
export function loadSkinFont(skin) {
  if (!skin || skin.id === 'default') return
  const fontMap = {
    neon_cyber: 'Orbitron:wght@400;500;600;700',
    sakura: 'Noto+Serif+JP:wght@400;500;700',
    stealth: 'Share+Tech+Mono',
  }
  const fontParam = fontMap[skin.id]
  if (!fontParam || loadedFonts.has(skin.id)) return
  loadedFonts.add(skin.id)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`
  document.head.appendChild(link)
}

// ────────────────────────────────────────────
// Локальное хранение купленных/активного скина
// ────────────────────────────────────────────

function ownedKey(userId) { return `ks_owned_skins_${userId}` }
function activeKey(userId) { return `ks_active_skin_${userId}` }

export function getOwnedSkins(userId) {
  try {
    const raw = localStorage.getItem(ownedKey(userId))
    const arr = raw ? JSON.parse(raw) : ['default']
    if (!arr.includes('default')) arr.unshift('default')
    return arr
  } catch { return ['default'] }
}

export function setOwnedSkins(userId, arr) {
  localStorage.setItem(ownedKey(userId), JSON.stringify(arr))
}

export function getActiveSkin(userId) {
  try {
    return localStorage.getItem(activeKey(userId)) || 'default'
  } catch { return 'default' }
}

export function setActiveSkin(userId, skinId) {
  localStorage.setItem(activeKey(userId), skinId)
}
