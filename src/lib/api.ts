// Cloud Backend REST API Sync Client.

import { Db, type Hike, type Observation, type Plan, type UserProfile, type Row } from './db'
import { Prefs } from './store'

const BASE = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '')

const safeUid = (uid: string) => (!uid || !uid.trim() ? 'demo' : uid.replace(/[.$#[\]/]/g, '_'))
const userUrl = (uid: string, path = '') => `${BASE}/users/${safeUid(uid)}${path}.json`

const sessionUrl = (uid: string, id: string) => userUrl(uid, `/planSessions/s_${id}`)

type Result<T> = { data: T; error: null } | { data: null; error: string }

const ok = <T,>(data: T): Result<T> => ({ data, error: null })
const fail = (e: any): Result<never> => ({ data: null, error: String(e?.message || e || 'unknown error') })

const clean = (o: Row) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined))

const values = (node: any): Row[] => (node ? (Array.isArray(node) ? node.filter(Boolean) : Object.values(node)) : [])

async function req(url: string, method = 'GET', body?: any): Promise<Result<any>> {
  if (!BASE) return fail('API_BASE_URL chưa cấu hình')
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    if (!res.ok) return fail(`HTTP ${res.status} ${text}`)
    return ok(text && text !== 'null' ? JSON.parse(text) : null)
  } catch (e) {
    return fail(e)
  }
}

const mirror = (p: Promise<unknown>) => { p.catch(() => {}) }

export const Api = {
  // ------------------------------------------------------------ account

  async signIn(uid: string, name: string, email: string, avatarUrl?: string) {
    const { data: existing, error } = await req(userUrl(uid, '/profile'))
    if (error) return fail(error)
    const avatar = avatarUrl || existing?.avatar_path || existing?.photo || existing?.avatarUri || null
    const merged = { ...(existing || {}), name, email, avatar_path: avatar, lastLoginAt: Date.now() }
    const w = await req(userUrl(uid, '/profile'), 'PATCH', clean(merged))
    if (!w.error) {
      await Db.saveUserProfile(merged)
      Prefs.applyProfile(merged)
      mirror(req(userUrl(uid, '/syncedAt'), 'PUT', Date.now()))
    }
    return w.error ? fail(w.error) : ok(merged)
  },

  getProfile(uid: string) {
    return req(userUrl(uid, '/profile'))
  },

  async saveProfile(uid: string, profile: UserProfile) {
    await Db.saveUserProfile(profile)
    Prefs.applyProfile(profile)
    const user = safeUid(uid)
    if (user && user !== 'demo') {
      mirror(Promise.all([
        req(userUrl(user, '/profile'), 'PATCH', clean(profile)),
        req(userUrl(user, '/syncedAt'), 'PUT', Date.now()),
      ]))
    }
    return ok(profile)
  },

  // -------------------------------------------------------------- hikes

  async listHikes(_uid?: string) {
    try { return ok(await Db.listHikes()) } catch (e) { return fail(e) }
  },

  async getHike(_uid: string, id: any) {
    try { return ok(await Db.getHike(id)) } catch (e) { return fail(e) }
  },

  async saveHike(uid: string, hike: Row) {
    try {
      const row = await Db.saveHike(hike)
      mirror(req(userUrl(uid, `/hikes/h_${row.id}`), 'PUT', clean(row)))
      return ok(row)
    } catch (e) {
      return fail(e)
    }
  },

  async deleteHike(uid: string, id: any) {
    try {
      const obs = await Db.listObservationsByHike(id)
      await Db.deleteHike(id)
      mirror(Promise.all([
        ...obs.map((o) => req(userUrl(uid, `/observations/o_${o.id}`), 'DELETE')),
        req(userUrl(uid, `/hikes/h_${id}`), 'DELETE'),
      ]))
      return ok(true)
    } catch (e) {
      return fail(e)
    }
  },

  async deleteAllHikes(uid: string) {
    try {
      await Db.deleteAll()
      mirror(Promise.all([
        req(userUrl(uid, '/hikes'), 'DELETE'),
        req(userUrl(uid, '/observations'), 'DELETE'),
      ]))
      return ok(true)
    } catch (e) {
      return fail(e)
    }
  },

  // ------------------------------------------------------- observations

  async listObservations(_uid?: string) {
    try { return ok(await Db.listObservations()) } catch (e) { return fail(e) }
  },

  async listObservationsByHike(_uid: string, hikeId: any) {
    try { return ok(await Db.listObservationsByHike(hikeId)) } catch (e) { return fail(e) }
  },

  async getObservation(_uid: string, id: any) {
    try { return ok(await Db.getObservation(id)) } catch (e) { return fail(e) }
  },

  async saveObservation(uid: string, obs: Row) {
    try {
      const row = await Db.saveObservation(obs)
      mirror(req(userUrl(uid, `/observations/o_${row.id}`), 'PUT', clean(row)))
      return ok(row)
    } catch (e) {
      return fail(e)
    }
  },

  async deleteObservation(uid: string, id: any) {
    try {
      await Db.deleteObservation(id)
      mirror(req(userUrl(uid, `/observations/o_${id}`), 'DELETE'))
      return ok(true)
    } catch (e) {
      return fail(e)
    }
  },

  // ------------------------------------------------------------ search

  async searchByName(_uid: string, prefix: string) {
    try { return ok(await Db.searchByName(prefix)) } catch (e) { return fail(e) }
  },

  async advancedSearch(_uid: string, filters: Row) {
    try { return ok(await Db.advancedSearch(filters)) } catch (e) { return fail(e) }
  },

  // -------------------------------------------------------------- sync

  ping(uid: string) {
    return req(userUrl(uid, '/syncedAt'))
  },

  async push(uid: string) {
    try {
      const [hikes, observations, plan, userProfile] = await Promise.all([
        Db.listHikes(),
        Db.listObservations(),
        Db.getPlan(),
        Db.getUserProfile(),
      ])
      const { sessions = [], ...planRow } = plan || {}
      const { error } = await req(userUrl(uid), 'PATCH', {
        hikes: Object.fromEntries(hikes.map((h) => [`h_${h.id}`, clean(h)])),
        observations: Object.fromEntries(observations.map((o) => [`o_${o.id}`, clean(o)])),
        ...(plan ? {
          plan: clean(planRow),
          planSessions: Object.fromEntries(sessions.map((x: Row) => [`s_${x.id}`, clean(x)])),
        } : {}),
        ...(userProfile ? { profile: clean(userProfile) } : {}),
        syncedAt: Date.now(),
      })
      return error ? fail(error) : ok(hikes.length)
    } catch (e) {
      return fail(e)
    }
  },

  async pull(uid: string) {
    const { data, error } = await req(userUrl(uid))
    if (error) return fail(error)
    try {
      const hikes = values(data?.hikes)
      const observations = values(data?.observations)
      const skipped = await Db.replaceAll(hikes, observations)
      const planSkipped = await Db.replacePlan(data?.plan ?? null, values(data?.planSessions))

      if (data?.profile) {
        await Db.saveUserProfile(data.profile)
        Prefs.applyProfile(data.profile)
      }

      return ok({
        hikes: hikes.length, observations: observations.length,
        ...skipped, skippedSessions: planSkipped.skipped,
      })
    } catch (e) {
      return fail(e)
    }
  },

  // Synchronize local data on login
  async syncOnLogin(uid: string) {
    const res = await this.pull(uid)
    await Db.setMeta('owner', uid)
    if (res.error) {
      await this.push(uid)
      return ok({ pulled: false })
    }
    return ok({ pulled: true, ...res.data })
  },

  counts() {
    return Db.counts()
  },

  subscribeRealtime(uid: string, onUpdate: () => void, intervalMs = 3000) {
    let lastTs = 0
    const timer = setInterval(async () => {
      const { data } = await this.ping(uid)
      if (typeof data === 'number' && data > lastTs) {
        if (lastTs > 0) {
          await this.pull(uid)
          onUpdate()
        }
        lastTs = data
      }
    }, intervalMs)
    return () => clearInterval(timer)
  },


  async getPlan(uid?: string) {
    try {
      const inDb = await Db.getPlan()
      if (inDb) return ok(inDb)

      const user = uid || Prefs.userId()
      if (user && user !== 'demo') {
        const { data } = await req(userUrl(user))
        if (data?.plan) {
          const planRow = data.plan
          const sessions = values(data.planSessions)
          await Db.replacePlan(planRow, sessions)
          const restored = await Db.getPlan()
          if (restored) return ok(restored)
        }
      }

      return ok(await migrateLegacyPlan())
    } catch (e) {
      return fail(e)
    }
  },

  async savePlan(uid: string, plan: Row) {
    try {
      const saved = await Db.savePlan(plan)
      mirror(pushPlan(uid, saved))
      return ok(saved)
    } catch (e) {
      return fail(e)
    }
  },

  async beginSession(uid: string, id: string, startedAt: number) {
    try {
      await Db.beginSession(id, startedAt)
      mirror(pushSession(uid, id))
      return ok(true)
    } catch (e) {
      return fail(e)
    }
  },

  async getSession(id: string) {
    try { return ok(await Db.getSession(id)) } catch (e) { return fail(e) }
  },

  async clearSession(uid: string, id: string) {
    try {
      await Db.clearSession(id)
      mirror(pushSession(uid, id))
      return ok(true)
    } catch (e) {
      return fail(e)
    }
  },

  async logSession(uid: string, id: string, r: Parameters<typeof Db.logSession>[1]) {
    try {
      await Db.logSession(id, r)
      mirror(pushSession(uid, id))
      return ok(true)
    } catch (e) {
      return fail(e)
    }
  },
}

// Migrate plan from legacy AsyncStorage format
async function migrateLegacyPlan(): Promise<Row | null> {
  const legacy: any = Prefs.get('plan', null)
  if (!legacy?.sessions?.length) return null

  const plan = await Db.savePlan({
    start: legacy.start,
    perWeek: Number(legacy.perWeek) || 3,
    weeks: Number(legacy.weeks) || 12,
    etaWeeks: legacy.etaWeeks ?? null,
    sessions: legacy.sessions.map((x: any) => ({
      id: x.id, date: x.date, week: x.week, minutes: x.minutes, done: x.done,
    })),
  })
  await Prefs.set('plan', null)
  return plan
}

async function pushPlan(uid: string, plan: Row) {
  const { sessions = [], ...row } = plan
  await req(userUrl(uid, '/plan'), 'PUT', clean(row))
  await req(userUrl(uid, '/planSessions'), 'DELETE')
  await req(userUrl(uid, '/planSessions'), 'PUT',
    Object.fromEntries(sessions.map((x: Row) => [`s_${x.id}`, clean({ ...x, plan_id: plan.id })])))
}

async function pushSession(uid: string, id: string) {
  const row = await Db.getSession(id)
  if (row) {
    await req(sessionUrl(uid, id), 'PUT', clean(row))
    const plan = await Db.getPlan()
    if (plan) {
      const { sessions, ...planRow } = plan
      await req(userUrl(uid, '/plan'), 'PUT', clean(planRow))
    }
  }
}

export function isProfileComplete(p: UserProfile | null | undefined) {
  return !!(p && p.name?.trim() && p.gender?.trim() && (p.height_cm ?? 0) > 0 && (p.weight_kg ?? 0) > 0 && (p.age ?? 0) > 0)
}
