/**
 * Local state, mirroring Android's `util/Prefs`: localStorage instead of SharedPreferences.
 * The cloud profile stays the authority — this is the instant/offline mirror of it.
 */

const KEY = 'mhike'
const SESSION_MS = 14 * 24 * 60 * 60 * 1000   // 14-day session, same as Android

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
const write = (patch) => {
  const next = { ...read(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export const Prefs = {
  all: read,
  get: (k, def = null) => (read()[k] ?? def),
  set: (k, v) => write({ [k]: v }),

  isOnboarded: () => !!read().onboarded,
  setOnboarded: () => write({ onboarded: true }),

  isLoggedIn: () => !!read().email,
  userId: () => read().userId || null,

  /** Only sign-in stamps this — editing the profile must not extend the session. */
  startSession: (userId) => write({ userId, loginAt: Date.now() }),
  sessionExpired: () => {
    const at = read().loginAt || 0
    return at <= 0 || Date.now() - at > SESSION_MS
  },

  logout: () => {
    const { onboarded, theme } = read()
    localStorage.setItem(KEY, JSON.stringify({ onboarded, theme }))
  },

  /** Cloud profile → local mirror. Field names are the cloud's (snake_case). */
  applyProfile: (p) => {
    if (!p) return
    write({
      name: p.name || null, email: p.email || null, gender: p.gender || null,
      height_cm: p.height_cm || 0, weight_kg: p.weight_kg || 0, age: p.age || 0,
      avatar_path: p.avatar_path || null,
    })
  },
  toProfile: () => {
    const s = read()
    return {
      name: s.name, email: s.email, gender: s.gender,
      height_cm: s.height_cm || 0, weight_kg: s.weight_kg || 0, age: s.age || 0,
      avatar_path: s.avatar_path,
    }
  },

  cloudSync: () => read().cloudSync !== false,   // default ON, same as Android
  initials: () => {
    const n = (read().name || '').trim()
    if (!n) return 'AF'
    const parts = n.split(/\s+/)
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
  },
}

/** light | dark | auto — applied by stamping data-theme on <html>, same three-way as Android. */
export function applyTheme(mode) {
  const m = mode || Prefs.get('theme', 'auto')
  const root = document.documentElement
  if (m === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', m)
}

// ------------------------------------------------------------------- auth

/**
 * Google Identity Services. The `sub` claim is the same value the Android app stores as the uid
 * (same Google account + same OAuth client), so both apps land on the same users/{uid} node.
 */
export function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(escape(atob(payload))))
  } catch {
    return null
  }
}

/** Resolves when the GSI script has loaded (it is deferred in index.html). */
export function waitForGoogle(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      if (window.google?.accounts?.id) return resolve(window.google.accounts.id)
      if (Date.now() - start > timeoutMs) return reject(new Error('Google Identity Services không tải được'))
      setTimeout(tick, 60)
    }
    tick()
  })
}

// ------------------------------------------------------------------ format

export const fmt = {
  km: (n) => `${Number(n || 0) % 1 === 0 ? Number(n || 0) : Number(n || 0).toFixed(1)} km`,
  date: (iso) => {
    if (!iso) return '—'
    const d = new Date(iso + 'T00:00:00')
    return isNaN(d) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  },
  today: () => new Date().toISOString().slice(0, 10),
  now: () => new Date().toISOString().slice(0, 16).replace('T', ' '),
}

/** BMI, same formula and bands as Android's util/BmiUtil. */
export function bmi(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null
  const m = heightCm / 100
  const v = weightKg / (m * m)
  const band = v < 18.5 ? 'Thiếu cân' : v < 25 ? 'Khoẻ mạnh' : v < 30 ? 'Thừa cân' : 'Béo phì'
  return { value: Math.round(v * 10) / 10, band }
}

export const DIFF_COLOR = {
  Easy: 'var(--diff-easy)',
  Moderate: 'var(--diff-moderate)',
  Hard: 'var(--diff-hard)',
}
