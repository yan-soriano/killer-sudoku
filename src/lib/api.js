import { supabase } from './supabase.js'
import bcrypt from 'bcryptjs'

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

    if (scoreErr || !score) return null

    // Считаем ранг (сколько людей прошли быстрее)
    const { count } = await supabase
      .from('daily_scores')
      .select('user_id', { count: 'exact', head: true })
      .eq('date', today)
      .lt('time_spent', score.time_spent)

    return { ...score, rank: (count ?? 0) + 1 }
  } catch {
    return null
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
    const { data, error } = await supabase
      .from('daily_scores')
      .select(`
        time_spent,
        finished_at,
        users (
          id,
          username,
          photo_url
        )
      `)
      .eq('date', today)
      .order('time_spent', { ascending: true })
      .limit(10)

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Leaderboard fetch error:', err)
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

// Форматировать секунды → "mm:ss"
export function formatTime(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
