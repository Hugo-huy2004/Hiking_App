import AsyncStorage from '@react-native-async-storage/async-storage'
import { localDate, localDateTime } from './date'
import { Db } from './db'
import { L } from './i18n'
import { decryptData, encryptData } from './security'

const KEY = 'mhike'
const SESSION_MS = 14 * 24 * 60 * 60 * 1000

class PrefsService {
  private cache: Record<string, any> = {}

  private async read() {
    try {
      const json = await AsyncStorage.getItem(KEY)
      this.cache = json ? JSON.parse(json) : {}
    } catch {
      this.cache = {}
    }
    if (!this.cache.lang) {
      this.cache.lang = 'en'
    }
    if (this.cache.sessionToken) {
      this.cache.decryptedToken = decryptData(this.cache.sessionToken)
    }
    // Also pull persisted user profile from SQLite DB meta table
    try {
      const dbProfile = await Db.getUserProfile()
      if (dbProfile) {
        this.cache = { ...this.cache, ...dbProfile }
      }
    } catch {
      // ignore
    }
    return this.cache
  }

  private async write(patch: Record<string, any>) {
    this.cache = { ...this.cache, ...patch }
    await AsyncStorage.setItem(KEY, JSON.stringify(this.cache))
    return this.cache
  }

  async init() {
    return this.read()
  }

  all() {
    return this.cache
  }

  get(key: string, def: any = null) {
    return this.cache[key] === undefined ? def : this.cache[key]
  }

  set(key: string, value: any) {
    return this.write({ [key]: value })
  }

  isOnboarded() {
    return !!this.cache.onboarded
  }

  setOnboarded() {
    return this.write({ onboarded: true })
  }

  isLoggedIn() {
    return !!this.cache.userId
  }

  userId() {
    return this.cache.userId || null
  }

  startSession(userId: string, email?: string) {
    const encToken = encryptData(`session_${userId}_${Date.now()}`)
    return this.write({
      userId,
      email: email || this.cache.email || '',
      loginAt: Date.now(),
      sessionToken: encToken,
    })
  }

  sessionExpired() {
    const at = this.cache.loginAt || 0
    return at <= 0 || Date.now() - at > SESSION_MS
  }

  logout() {
    const { onboarded, theme, lang } = this.cache
    this.cache = { onboarded, theme, lang }
    AsyncStorage.setItem(KEY, JSON.stringify(this.cache))
  }

  applyProfile(profile: Record<string, any>) {
    if (!profile) return
    const avatar = profile.avatar_path ?? profile.avatarUri ?? profile.photo ?? profile.photo_uri ?? this.cache.avatar_path ?? null
    const updated = {
      name: profile.name ?? this.cache.name ?? null,
      email: profile.email ?? this.cache.email ?? null,
      gender: profile.gender ?? this.cache.gender ?? null,
      height_cm: profile.height_cm ?? this.cache.height_cm ?? 0,
      weight_kg: profile.weight_kg ?? this.cache.weight_kg ?? 0,
      age: profile.age ?? this.cache.age ?? 0,
      avatar_path: avatar,
      emergency_contact: profile.emergency_contact ?? this.cache.emergency_contact ?? '115',
    }
    Db.saveUserProfile(updated).catch(() => {})
    return this.write(updated)
  }

  toProfile() {
    return {
      name: this.cache.name,
      email: this.cache.email,
      gender: this.cache.gender,
      height_cm: this.cache.height_cm || 0,
      weight_kg: this.cache.weight_kg || 0,
      age: this.cache.age || 0,
      avatar_path: this.cache.avatar_path || null,
      emergency_contact: this.cache.emergency_contact || '115',
    }
  }

  cloudSync() {
    return this.cache.cloudSync !== false
  }

  initials() {
    const name = (this.cache.name || '').trim()
    if (!name) return 'AF'
    const parts = name.split(/\s+/)
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
  }

  setDraft(draft: Record<string, any>) {
    return this.write({ draft })
  }

  getDraft() {
    return this.cache.draft || null
  }

  clearDraft() {
    return this.write({ draft: null })
  }
}

export const Prefs = new PrefsService()

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function b64Decode(str: string) {
  if (typeof globalThis.atob === 'function') {
    try {
      return globalThis.atob(str)
    } catch {
      // fallback
    }
  }
  let output = ''
  const cleanStr = String(str).replace(/=+$/, '')
  let block = 0
  let code = 0
  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr.charAt(i)
    const idx = BASE64_CHARS.indexOf(char)
    if (idx === -1) continue
    code = (i % 4) ? block * 64 + idx : idx
    if (i % 4) {
      output += String.fromCharCode(255 & (code >> ((-2 * (i + 1)) & 6)))
    }
    block = code
  }
  return output
}

export function decodeJwt(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    const decoded = b64Decode(base64)
    try {
      const jsonString = decodeURIComponent(
        Array.from(decoded)
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      )
      return JSON.parse(jsonString)
    } catch {
      return JSON.parse(decoded)
    }
  } catch {
    return null
  }
}

export const fmt = {
  km: (n: any) => `${Number(n || 0) % 1 === 0 ? Number(n || 0) : Number(n || 0).toFixed(1)} km`,
  date: (iso: string) => {
    if (!iso) return '—'
    const d = new Date(iso + 'T00:00:00')
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString(L.tag, { day: 'numeric', month: 'short', year: 'numeric' })
  },
  dayShort: (iso: string) => {
    if (!iso) return '—'
    const d = new Date(iso + 'T00:00:00')
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString(L.tag, { weekday: 'short', day: 'numeric', month: 'short' })
  },
  today: () => localDate(),
  now: () => localDateTime(),
}

export { bmi } from './health'

export const KIT = ['Map & compass', 'First aid', 'Torch', 'Raincoat', 'Water', 'Snacks']
export const DIFFICULTIES = ['Easy', 'Moderate', 'Hard']
export const PRIORITIES = ['Must do', 'Soon', 'Someday']
export const VISIBILITIES = ['Private', 'Friends', 'Public']
export const CONDITIONS = ['Dry', 'Muddy', 'Rocky', 'Icy']
export const MOODS = ['Stoked', 'Calm', 'Beat']
export const WILDLIFE = ['Birds', 'Deer', 'Squirrels', 'Cattle', 'Sheep', 'Insects']
export const VEGETATION = ['Pine forest', 'Reeds', 'Ferns', 'Wildflowers', 'Moss']
