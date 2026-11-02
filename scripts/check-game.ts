/**
 * Verifica las reglas de juego de Liga Fit (lib/game) con casos fijos.
 *
 * Uso:
 *   pnpm check:game
 */
import assert from 'node:assert/strict'
import type { HistoryExercise } from '@/lib/data/sessions'
import { bodyParams, evolutionMessage } from '@/lib/game/avatar-params'
import { balancedWeek, isValleyHour } from '@/lib/game/challenges'
import { levelForXp, xpForLevel } from '@/lib/game/levels'
import { currentStreak } from '@/lib/game/streak'
import { ligaSummary } from '@/lib/game/summary'
import { sessionsXp, totalXp } from '@/lib/game/xp'
import { weeksMetTarget, type GameSession } from '@/lib/game/weeks'
import { sessionZones } from '@/lib/game/zones'
import { weeklyFrequency } from '@/lib/workouts/history-stats'

// --- Constructores de datos de prueba -------------------------------------

function strength(bodyPart: string | null, sets: number): HistoryExercise {
  return {
    key: `ex:${bodyPart}`,
    name: `Ejercicio ${bodyPart}`,
    body_part: bodyPart,
    target: null,
    tracking_type: 'sets_reps_weight',
    is_completed: sets > 0,
    sets: Array.from({ length: sets }, () => ({ weight: 20, reps: 10 })),
  }
}

function timed(bodyPart: string, done: boolean): HistoryExercise {
  return {
    key: `ex:${bodyPart}`,
    name: `Ejercicio ${bodyPart}`,
    body_part: bodyPart,
    target: null,
    tracking_type: 'duration',
    is_completed: done,
    sets: [],
  }
}

/** `bogotaTime` en hora de Bogotá (UTC−5), p. ej. '08:00'. */
function session(
  id: string,
  date: string,
  bogotaTime: string,
  exercises: HistoryExercise[]
): GameSession {
  const [hour, minute] = bogotaTime.split(':').map(Number)
  const completedAt = new Date(
    Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)),
      hour + 5,
      minute
    )
  ).toISOString()
  return { id, title: `Sesión ${id}`, scheduled_date: date, completed_at: completedAt, exercises }
}

let passed = 0
function check(name: string, fn: () => void) {
  fn()
  passed += 1
  console.log(`  ✓ ${name}`)
}

// --- Niveles ----------------------------------------------------------------

check('niveles: umbral 100 × n^1,5', () => {
  assert.equal(xpForLevel(1), 100)
  assert.equal(xpForLevel(2), 283)
  assert.equal(xpForLevel(4), 800)
})

check('niveles: bordes y lo que falta', () => {
  assert.equal(levelForXp(0).level, 0)
  assert.equal(levelForXp(99).level, 0)
  assert.equal(levelForXp(100).level, 1)
  assert.equal(levelForXp(282).level, 1)
  assert.equal(levelForXp(283).level, 2)
  assert.equal(levelForXp(250).xpToNext, 33)
  assert.equal(levelForXp(800).xpIntoLevel, 0)
})

// --- Hora valle -------------------------------------------------------------

check('hora valle: de 10:00 a 15:59 en Bogotá', () => {
  assert.equal(isValleyHour(session('a', '2026-10-27', '10:00', []).completed_at), true)
  assert.equal(isValleyHour(session('a', '2026-10-27', '15:59', []).completed_at), true)
  assert.equal(isValleyHour(session('a', '2026-10-27', '16:00', []).completed_at), false)
  assert.equal(isValleyHour(session('a', '2026-10-27', '09:59', []).completed_at), false)
  assert.equal(isValleyHour(null), false)
})

// --- XP ---------------------------------------------------------------------

check('xp: 100 base + 5 por serie', () => {
  const [xp] = sessionsXp([session('a', '2026-10-27', '07:00', [strength('chest', 10)])], 3)
  assert.equal(xp.total, 150)
})

check('xp: máximo 40 series contadas', () => {
  const [xp] = sessionsXp([session('a', '2026-10-27', '07:00', [strength('chest', 55)])], 3)
  assert.equal(xp.total, 300)
})

check('xp: hora valle da ×1,5 a la sesión', () => {
  const [xp] = sessionsXp([session('a', '2026-10-27', '12:00', [strength('chest', 10)])], 3)
  assert.equal(xp.total, 225)
})

check('xp: el bono semanal va solo a la sesión que alcanza la meta', () => {
  const list = sessionsXp(
    [
      // Llegan desordenadas: cuenta el orden en que se terminaron.
      session('c', '2026-10-29', '07:00', []),
      session('a', '2026-10-26', '07:00', []),
      session('b', '2026-10-27', '07:00', []),
    ],
    2
  )
  const bonus = Object.fromEntries(list.map((item) => [item.sessionId, item.weeklyGoalBonus]))
  assert.deepEqual(bonus, { a: 0, b: 50, c: 0 })
})

check('xp: una sesión repetida cuenta una sola vez', () => {
  const a = session('a', '2026-10-27', '07:00', [])
  assert.equal(totalXp([a, a], 3), 100)
})

// --- Racha ------------------------------------------------------------------

const today = '2026-11-04' // miércoles; semana del lunes 2 de noviembre
const twoPerWeek = [
  session('w1a', '2026-10-12', '07:00', []),
  session('w1b', '2026-10-14', '07:00', []),
  session('w2a', '2026-10-19', '07:00', []),
  session('w2b', '2026-10-21', '07:00', []),
  session('w3a', '2026-10-26', '07:00', []),
  session('w3b', '2026-10-28', '07:00', []),
]

check('racha: la semana en curso no la rompe', () => {
  assert.equal(currentStreak(weeksMetTarget(twoPerWeek, 2), today), 3)
})

check('racha: la semana en curso suma si ya se cumplió', () => {
  const withThisWeek = [
    ...twoPerWeek,
    session('w4a', '2026-11-02', '07:00', []),
    session('w4b', '2026-11-03', '07:00', []),
  ]
  assert.equal(currentStreak(weeksMetTarget(withThisWeek, 2), today), 4)
})

check('racha: una semana sin cumplir la corta', () => {
  const gap = twoPerWeek.filter((item) => item.id !== 'w2b')
  assert.equal(currentStreak(weeksMetTarget(gap, 2), today), 1)
})

check('racha: se recalcula con la meta actual', () => {
  assert.equal(currentStreak(weeksMetTarget(twoPerWeek, 3), today), 0)
})

// --- Zonas y retos ----------------------------------------------------------

check('zonas: el cardio por tiempo cuenta si se marcó hecho', () => {
  const zones = sessionZones(
    session('a', '2026-10-27', '07:00', [
      timed('cardio', true),
      timed('waist', false),
      strength('upper legs', 0),
      strength('shoulders', 3),
      strength(null, 3),
    ])
  )
  assert.deepEqual([...zones].sort(), ['cardio', 'chest-shoulders'])
})

check('zonas: el historial sigue sin contar ejercicios por tiempo', () => {
  const { rows } = weeklyFrequency(
    [{ ...session('a', '2026-10-27', '07:00', [timed('cardio', true)]), status: 'completed', exercise_count: 1, units_done: 1, units_total: 1, duration_seconds: null }],
    ['2026-10-26']
  )
  assert.equal(rows.length, 0)
})

check('reto semana balanceada: 4 zonas distintas', () => {
  const week = [
    session('a', '2026-10-26', '07:00', [strength('chest', 3), strength('back', 3)]),
    session('b', '2026-10-28', '07:00', [strength('upper legs', 3)]),
  ]
  assert.deepEqual(balancedWeek(week), { done: 3, target: 4, completed: false })
  const full = [...week, session('c', '2026-10-30', '07:00', [timed('cardio', true)])]
  assert.equal(balancedWeek(full).completed, true)
})

// --- Avatar -----------------------------------------------------------------

check('avatar: sin medidas usa una silueta neutra', () => {
  const params = bodyParams({ body: 'neutral', goal: 'bienestar', heightCm: null, weightKg: null, weeksMet: 0 })
  assert.deepEqual(params, { fat: 0.35, muscle: 0, tall: 0.5, body: 'neutral' })
})

check('avatar: fuerza gana músculo y no "engorda" al subir de peso', () => {
  const start = bodyParams({ body: 'male', goal: 'fuerza', heightCm: 175, weightKg: 80, weeksMet: 0 })
  const now = bodyParams({ body: 'male', goal: 'fuerza', heightCm: 175, weightKg: 84, weeksMet: 40 })
  assert.equal(now.muscle, 1)
  assert.ok(now.fat <= start.fat, 'con fuerza el peso ganado no debe verse como grasa')
})

check('avatar: factor de músculo por objetivo', () => {
  const args = { body: 'female' as const, heightCm: null, weightKg: null, weeksMet: 20 }
  assert.equal(bodyParams({ ...args, goal: 'fuerza' }).muscle, 0.5)
  assert.equal(bodyParams({ ...args, goal: 'grasa' }).muscle, 0.275)
  assert.equal(bodyParams({ ...args, goal: 'bienestar' }).muscle, 0.2)
})

check('avatar: los mensajes no hablan de peso ni de cuerpo', () => {
  for (const goal of ['fuerza', 'grasa', 'bienestar'] as const) {
    for (const weeks of [0, 10]) {
      assert.doesNotMatch(evolutionMessage(goal, weeks), /kg|peso|gord|flac|delgad/i)
    }
  }
})

// --- Resumen de "Mi gym" ----------------------------------------------------

check('resumen: semana en curso, zonas y días', () => {
  const summary = ligaSummary(
    [
      ...twoPerWeek,
      session('t1', '2026-11-02', '12:00', [strength('chest', 4), timed('cardio', true)]),
    ],
    { weeklyTarget: 2, today }
  )
  assert.equal(summary.streak, 3)
  assert.equal(summary.week.sessions, 1)
  assert.deepEqual(
    summary.week.days.filter((day) => day.trained).map((day) => day.date),
    ['2026-11-02']
  )
  assert.deepEqual(
    summary.zones.filter((zone) => zone.sessions.length > 0).map((zone) => zone.id),
    ['chest-shoulders', 'cardio']
  )
  assert.equal(summary.challenges.valleySessions, 1)
})

console.log(`\n${passed} verificaciones de Liga Fit OK`)
