import { supabase } from './supabase.js'
import bcrypt from 'bcryptjs'
import { buildLootItem, enrichInventory } from './adventure_items.js'

// ────────────────────────────────────────────
// AUTH
// ────────────────────────────────────────────

export async function registerUser(username, password, photoUrl = null) {
  const password_hash = await bcrypt.hash(password, 10)

  const { data, error } = await supabase
    .from('users')
    .insert({ username, password_hash, photo_url: photoUrl })
    .select()
    .single()

  if (error) throw error

  // Создаём начальную статистику
  await supabase.from('user_stats').insert([
    { user_id: data.id, difficulty: 'easy' },
    { user_id: data.id, difficulty: 'medium' },
    { user_id: data.id, difficulty: 'hard' },
  ])

  return data
}

export async function loginUser(username, password) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !data) throw new Error('Пользователь не найден')

  const ok = await bcrypt.compare(password, data.password_hash)
  if (!ok) throw new Error('Неверный пароль')

  return data
}

export async function updateUserTheme(userId, theme) {
  const { error } = await supabase
    .from('users')
    .update({ theme })
    .eq('id', userId)
  if (error) throw error
}

export async function updateUserPhoto(userId, photoUrl) {
  const { error } = await supabase
    .from('users')
    .update({ photo_url: photoUrl })
    .eq('id', userId)
  if (error) throw error
}

// ────────────────────────────────────────────
// GAME SESSIONS
// ────────────────────────────────────────────

export async function createGameSession(userId, difficulty, sudokuData) {
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      user_id: userId,
      difficulty,
      sudoku_data: sudokuData,
      player_input: {},
      status: 'in_progress',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateGameSession(sessionId, updates) {
  const { error } = await supabase
    .from('game_sessions')
    .update(updates)
    .eq('id', sessionId)
  if (error) throw error
}

export async function finishGameSession(sessionId, { won, errorsCount, hintsUsed, timeSpent, userId, difficulty }) {
  const { error } = await supabase
    .from('game_sessions')
    .update({
      status: won ? 'won' : 'lost',
      errors_count: errorsCount,
      hints_used: hintsUsed,
      finished_at: new Date().toISOString(),
      time_spent: timeSpent,
    })
    .eq('id', sessionId)

  if (error) throw error

  // Обновить статистику через RPC
  await supabase.rpc('update_user_stats', {
    p_user_id: userId,
    p_difficulty: difficulty,
    p_won: won,
    p_time_spent: timeSpent,
  })
}

// ────────────────────────────────────────────
// HARD ATTEMPTS (по дате браузера)
// ────────────────────────────────────────────

function getTodayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function getHardAttemptsToday(userId) {
  const today = getTodayLocal()
  const { data } = await supabase
    .from('daily_hard_attempts')
    .select('attempts_used')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  return data?.attempts_used ?? 0
}

export async function incrementHardAttempts(userId) {
  const today = getTodayLocal()
  const current = await getHardAttemptsToday(userId)

  if (current === 0) {
    await supabase.from('daily_hard_attempts').insert({
      user_id: userId,
      date: today,
      attempts_used: 1,
    })
  } else {
    await supabase
      .from('daily_hard_attempts')
      .update({ attempts_used: current + 1 })
      .eq('user_id', userId)
      .eq('date', today)
  }
}

// ────────────────────────────────────────────
// DAILY CHALLENGE
// ────────────────────────────────────────────

export async function getDailyChallengeStatus(userId) {
  try {
    const today = getTodayLocal()
    // Получаем результат пользователя
    const { data: score, error: scoreErr } = await supabase
      .from('daily_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    if (scoreErr) {
      console.error('getDailyChallengeStatus error:', scoreErr)
      return null
    }
    if (!score) return null

    // Считаем ранг (сколько людей прошли быстрее)
    let rank = 1
    try {
      const { count } = await supabase
        .from('daily_scores')
        .select('user_id', { count: 'exact', head: true })
        .eq('date', today)
        .lt('time_spent', score.time_spent)
      rank = (count ?? 0) + 1
    } catch { /* rank stays 1 */ }

    return { ...score, rank }
  } catch (e) {
    console.error('getDailyChallengeStatus unexpected error:', e)
    return null
  }
}

/** Проверить, есть ли уже запись daily_scores за сегодня (надёжная проверка) */
export async function hasCompletedDailyChallenge(userId) {
  try {
    const today = getTodayLocal()
    const { data, error } = await supabase
      .from('daily_scores')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()
    if (error) {
      console.error('hasCompletedDailyChallenge error:', error)
      return false
    }
    return !!data
  } catch {
    return false
  }
}

export async function submitDailyScore(userId, { timeSpent, hintsUsed, errorsCount, won }) {
  try {
    const today = getTodayLocal()

    // Сначала проверим, есть ли уже запись
    const { data: existing } = await supabase
      .from('daily_scores')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    const payload = {
      user_id: userId,
      date: today,
      time_spent: timeSpent,
      hints_used: hintsUsed,
      errors_count: errorsCount,
      finished_at: new Date().toISOString(),
      won: won
    }

    if (existing) {
      const { error } = await supabase
        .from('daily_scores')
        .update(payload)
        .eq('id', existing.id)
      if (error) console.error('Update daily score error:', error)
    } else {
      const { error } = await supabase
        .from('daily_scores')
        .insert(payload)
      if (error) console.error('Insert daily score error:', error)
    }
  } catch (e) {
    console.error('Failed to submit daily score', e)
  }
}

export async function getDailyLeaderboard() {
  try {
    const today = getTodayLocal()

    // Сначала пробуем запрос с join
    const { data, error } = await supabase
      .from('daily_scores')
      .select(`
        time_spent,
        finished_at,
        user_id,
        users (
          id,
          username,
          photo_url
        )
      `)
      .eq('date', today)
      .order('time_spent', { ascending: true })
      .limit(10)

    if (error) {
      console.warn('Leaderboard join query failed, trying fallback:', error)
      return await getDailyLeaderboardFallback(today)
    }

    // Проверим, есть ли у всех записей users (join мог не сработать)
    const allHaveUsers = data && data.length > 0 && data.every(d => d.users && d.users.username)
    if (!allHaveUsers && data && data.length > 0) {
      console.warn('Leaderboard join returned null users, using fallback')
      return await getDailyLeaderboardFallback(today)
    }

    return data || []
  } catch (err) {
    console.error('Leaderboard fetch error:', err)
    return []
  }
}

/** Fallback: получаем daily_scores, потом подтягиваем users отдельно */
async function getDailyLeaderboardFallback(today) {
  try {
    const { data: scores, error: scoresErr } = await supabase
      .from('daily_scores')
      .select('time_spent, finished_at, user_id')
      .eq('date', today)
      .order('time_spent', { ascending: true })
      .limit(10)

    if (scoresErr || !scores || scores.length === 0) return []

    // Получаем уникальные user_id
    const userIds = [...new Set(scores.map(s => s.user_id))]

    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('id, username, photo_url')
      .in('id', userIds)

    if (usersErr) {
      console.error('Fallback users fetch error:', usersErr)
    }

    const usersMap = {}
    if (users) {
      for (const u of users) {
        usersMap[u.id] = u
      }
    }

    return scores.map(s => ({
      time_spent: s.time_spent,
      finished_at: s.finished_at,
      users: usersMap[s.user_id] || { id: s.user_id, username: 'Unknown', photo_url: null }
    }))
  } catch (err) {
    console.error('Leaderboard fallback error:', err)
    return []
  }
}

// ────────────────────────────────────────────
// STATS
// ────────────────────────────────────────────

export async function getUserStats(userId) {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data
}

// ────────────────────────────────────────────
// CURRENCY & ADVENTURE
// ────────────────────────────────────────────

function withTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    ),
  ])
}

function bytesStorageKey(userId) {
  return `ks_bytes_${userId}`
}

function syncBytesToLocalUser(userId, bytes) {
  localStorage.setItem(bytesStorageKey(userId), String(bytes))
  try {
    const raw = localStorage.getItem('ks_user')
    if (!raw) return
    const user = JSON.parse(raw)
    if (user.id === userId) {
      localStorage.setItem('ks_user', JSON.stringify({ ...user, bytes }))
    }
  } catch { /* ignore */ }
}

export async function getUserBytes(userId) {
  const localRaw = localStorage.getItem(bytesStorageKey(userId))
  if (localRaw !== null) return Math.max(0, Number(localRaw) || 0)

  try {
    const { data, error } = await withTimeout(
      supabase.from('users').select('bytes').eq('id', userId).single()
    )

    if (!error && data?.bytes != null) {
      const val = Math.max(0, Number(data.bytes) || 0)
      syncBytesToLocalUser(userId, val)
      return val
    }
  } catch (e) {
    console.warn('getUserBytes: using 0 (local/timeout)', e?.message || e)
  }

  return 0
}

export async function updateUserBytes(userId, delta) {
  const current = await getUserBytes(userId)
  const newVal = Math.max(0, current + delta)
  syncBytesToLocalUser(userId, newVal)

  try {
    const { error } = await supabase
      .from('users')
      .update({ bytes: newVal })
      .eq('id', userId)
    if (error) console.error('Bytes DB save failed (local kept):', error)
  } catch (e) {
    console.error('Bytes DB save failed:', e)
  }

  return newVal
}

const DEFAULT_ADVENTURE_PROGRESS = {
  current_cycle: 1,
  current_step: 0,
  completed_cycles: 0,
  completed_steps: [],
  inventory: [],
}

function adventureStorageKey(userId) {
  return `ks_adventure_progress_${userId}`
}

function normalizeAdventureProgress(raw) {
  if (!raw) return { ...DEFAULT_ADVENTURE_PROGRESS, completed_steps: [], inventory: [] }
  return {
    current_cycle: Number(raw.current_cycle) || 1,
    current_step: Number(raw.current_step) || 0,
    completed_cycles: Number(raw.completed_cycles) || 0,
    completed_steps: Array.isArray(raw.completed_steps)
      ? raw.completed_steps.map(Number).filter(n => !Number.isNaN(n))
      : [],
    inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
  }
}

function readLocalAdventureProgress(userId) {
  try {
    const saved = localStorage.getItem(adventureStorageKey(userId))
    return saved ? normalizeAdventureProgress(JSON.parse(saved)) : null
  } catch {
    return null
  }
}

function writeLocalAdventureProgress(userId, progress) {
  localStorage.setItem(adventureStorageKey(userId), JSON.stringify(normalizeAdventureProgress(progress)))
}

function pickFurtherAdventureProgress(a, b) {
  const left = normalizeAdventureProgress(a)
  const right = normalizeAdventureProgress(b)
  if (left.current_cycle !== right.current_cycle) {
    return left.current_cycle > right.current_cycle ? left : right
  }
  if (left.current_step !== right.current_step) {
    return left.current_step > right.current_step ? left : right
  }
  return left.completed_cycles >= right.completed_cycles ? left : right
}

export async function getAdventureProgress(userId) {
  const local = readLocalAdventureProgress(userId)
  // Сразу отдаём локальный прогресс — не ждём Supabase
  if (local) {
    return { ...local, inventory: enrichInventory(local.inventory) }
  }

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('adventure_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
    )

    if (error) console.error('Error fetching adventure progress:', error)

    if (data) {
      const merged = normalizeAdventureProgress(data)
      merged.inventory = enrichInventory(merged.inventory)
      writeLocalAdventureProgress(userId, merged)
      return merged
    }
  } catch (e) {
    console.warn('Adventure progress: default (timeout/offline)', e?.message || e)
  }

  return { ...DEFAULT_ADVENTURE_PROGRESS, completed_steps: [], inventory: [] }
}

function syncAdventureProgressToDb(userId, normalized) {
  withTimeout(
    supabase
      .from('adventure_progress')
      .select('id, completed_cycles')
      .eq('user_id', userId)
      .maybeSingle(),
    3000
  )
    .then(({ data: existing, error: fetchError }) => {
      if (fetchError) throw fetchError

      const dbPayload = {
        user_id: userId,
        current_cycle: normalized.current_cycle,
        current_step: normalized.current_step,
        completed_cycles: normalized.completed_cycles,
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        return supabase.from('adventure_progress').update(dbPayload).eq('id', existing.id)
      }
      return supabase.from('adventure_progress').insert(dbPayload)
    })
    .catch(e => {
      console.warn('Adventure progress DB sync (local saved):', e?.message || e)
    })
}

function saveAdventureProgress(userId, payload) {
  const normalized = normalizeAdventureProgress(payload)
  writeLocalAdventureProgress(userId, normalized)
  syncAdventureProgressToDb(userId, normalized)
  return normalized
}

/** Победа в шаге: байты + ключ в инвентарь (следующий узел — через ключ) */
export async function grantAdventureWin(userId, {
  cycle,
  cycleName,
  step,
  detail,
  stepName,
  targetStepName,
  isLastStep,
}) {
  const progress = await getAdventureProgress(userId)
  const stepIdx = Number(step) || 0
  const cycleIdx = Number(cycle) || 1

  const completed_steps = [...progress.completed_steps]
  if (!completed_steps.includes(stepIdx)) completed_steps.push(stepIdx)

  let inventory = [...progress.inventory]
  let current_cycle = cycleIdx
  let current_step = progress.current_step
  let completed_cycles = progress.completed_cycles

  if (isLastStep) {
    current_cycle = cycleIdx + 1
    current_step = 0
    completed_steps.length = 0
    inventory = inventory.filter(k => Number(k.cycle) !== cycleIdx)
    completed_cycles += 1
  } else {
    const loot = buildLootItem({
      cycleIdx,
      cycleName: cycleName || '',
      fromStep: stepIdx,
      detail,
      stepName,
      targetStepName,
    })
    if (loot) inventory.push(loot)
  }

  return saveAdventureProgress(userId, {
    current_cycle,
    current_step,
    completed_cycles,
    completed_steps,
    inventory,
  })
}

/** Применить предмет из инвентаря — открывает следующий узел (мгновенно, localStorage) */
export function useAdventureKey(userId, keyId) {
  const progress = readLocalAdventureProgress(userId) || { ...DEFAULT_ADVENTURE_PROGRESS, completed_steps: [], inventory: [] }
  const key = progress.inventory.find(k => k.id === keyId)
  if (!key) throw new Error('Предмет не найден')

  return saveAdventureProgress(userId, {
    ...progress,
    current_step: Number(key.unlocksStep),
    inventory: progress.inventory.filter(k => k.id !== keyId),
  })
}

// Форматировать секунды → "mm:ss"
export function formatTime(seconds) {
  if (seconds === undefined || seconds === null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
