/**
 * The whole backend, in one module — the JS twin of Android's `net/Api.java`.
 * Same Realtime Database, same tree, same field names, so both apps read each other's data.
 *
 * Talks to the RTDB REST API with plain fetch: no Firebase SDK, no extra config beyond the
 * database URL. Android does single-value reads too, so nothing is lost by skipping the SDK.
 *
 * ## How to call it
 *     const { data, error } = await Api.getProfile(uid)
 *
 * Rules that hold for every endpoint, so call sites never have to think about them:
 *  - **Never throws.** Failure comes back as `{ data: null, error: "…" }`.
 *  - **`error !== null` means nothing changed** on the server.
 *  - **`data === null` with `error === null`** means "not there" (empty node), not a failure.
 *
 * ## Tree (identical to Android)
 *     users/{uid}/profile              name, email, gender, height_cm, weight_kg, age, lastLoginAt
 *     users/{uid}/hikes/h_{id}         one node per hike
 *     users/{uid}/observations/o_{id}
 *     users/{uid}/syncedAt
 */

const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

/** RTDB keys may not contain . $ # [ ] / — Google's sub is numeric, but never trust input. */
const safeUid = (uid) => (!uid || !uid.trim() ? 'demo' : uid.replace(/[.$#[\]/]/g, '_'))
const userUrl = (uid, path = '') => `${BASE}/users/${safeUid(uid)}${path}.json`

const ok = (data) => ({ data, error: null })
const fail = (error) => ({ data: null, error: String(error?.message || error || 'unknown error') })

async function req(url, method = 'GET', body) {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    if (!res.ok) return fail(`HTTP ${res.status} ${text}`)
    const json = text && text !== 'null' ? JSON.parse(text) : null
    return ok(json)
  } catch (e) {
    return fail(e)
  }
}

/** RTDB drops nulls; strip them so an edit clearing a field doesn't write `null` keys. */
const clean = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''))

/** RTDB hands back a map, or an array with holes when keys look numeric. Accept both. */
const values = (node) => (node ? (Array.isArray(node) ? node.filter(Boolean) : Object.values(node)) : [])

// ------------------------------------------------------------------ account

export const Api = {
  /**
   * Sign-in upsert: creates the profile if the account is new, refreshes name/email/lastLoginAt
   * if it is not, and returns the profile either way. `complete` decides what happens next.
   */
  async signIn(uid, name, email) {
    const { data: existing, error } = await req(userUrl(uid, '/profile'))
    if (error) return fail(error)
    const merged = { ...(existing || {}), name, email, lastLoginAt: Date.now() }
    const w = await req(userUrl(uid, '/profile'), 'PATCH', clean(merged))
    return w.error ? fail(w.error) : ok(merged)
  },

  /** `data === null` means the account node is gone — deleted server-side, session revoked. */
  getProfile(uid) {
    return req(userUrl(uid, '/profile'))
  },

  /** Only the keys present on `profile` are written (PATCH), so partial saves are safe. */
  saveProfile(uid, profile) {
    return req(userUrl(uid, '/profile'), 'PATCH', clean(profile))
  },

  // --------------------------------------------------------------- hikes

  async listHikes(uid) {
    const { data, error } = await req(userUrl(uid, '/hikes'))
    return error ? fail(error) : ok(values(data).sort(byDateDesc))
  },

  async getHike(uid, id) {
    return req(userUrl(uid, `/hikes/h_${id}`))
  },

  /** Create or update. A hike without an id gets one, and the saved hike comes back. */
  async saveHike(uid, hike) {
    const row = { ...hike, id: hike.id || Date.now() }
    const { error } = await req(userUrl(uid, `/hikes/h_${row.id}`), 'PUT', clean(row))
    return error ? fail(error) : ok(row)
  },

  /** Deletes the hike and its observations — the web twin of ON DELETE CASCADE. */
  async deleteHike(uid, id) {
    const { data: obs } = await this.listObservations(uid)
    await Promise.all(
      (obs || []).filter((o) => Number(o.hike_id) === Number(id))
                 .map((o) => req(userUrl(uid, `/observations/o_${o.id}`), 'DELETE'))
    )
    return req(userUrl(uid, `/hikes/h_${id}`), 'DELETE')
  },

  /** Feature (b): reset the database. */
  async deleteAllHikes(uid) {
    const a = await req(userUrl(uid, '/hikes'), 'DELETE')
    if (a.error) return a
    return req(userUrl(uid, '/observations'), 'DELETE')
  },

  // -------------------------------------------------------- observations

  async listObservations(uid) {
    const { data, error } = await req(userUrl(uid, '/observations'))
    return error ? fail(error) : ok(values(data).sort((a, b) => (b.obs_time || '').localeCompare(a.obs_time || '')))
  },

  async listObservationsByHike(uid, hikeId) {
    const { data, error } = await this.listObservations(uid)
    return error ? fail(error) : ok(data.filter((o) => Number(o.hike_id) === Number(hikeId)))
  },

  async saveObservation(uid, obs) {
    const row = { ...obs, id: obs.id || Date.now() }
    const { error } = await req(userUrl(uid, `/observations/o_${row.id}`), 'PUT', clean(row))
    return error ? fail(error) : ok(row)
  },

  deleteObservation(uid, id) {
    return req(userUrl(uid, `/observations/o_${id}`), 'DELETE')
  },

  // ----------------------------------------------------------- transfer

  /** Connection + rules check against the user's own node (the rules close the root). */
  ping(uid) {
    return req(userUrl(uid, '/syncedAt'))
  },

  /** Replaces the hikes + observations subtrees wholesale; leaves profile alone. Mirrors Android. */
  async push(uid, hikes, observations) {
    const payload = {
      hikes: Object.fromEntries(hikes.map((h) => [`h_${h.id}`, clean(h)])),
      observations: Object.fromEntries(observations.map((o) => [`o_${o.id}`, clean(o)])),
      syncedAt: Date.now(),
    }
    const { error } = await req(userUrl(uid), 'PATCH', payload)
    return error ? fail(error) : ok(hikes.length)
  },

  async pull(uid) {
    const { data, error } = await req(userUrl(uid))
    if (error) return fail(error)
    return ok({ hikes: values(data?.hikes), observations: values(data?.observations) })
  },
}

// ------------------------------------------------------------------ helpers

function byDateDesc(a, b) {
  const d = (b.hike_date || '').localeCompare(a.hike_date || '')
  return d !== 0 ? d : Number(b.id) - Number(a.id)
}

/** Everything the BMI + plan features need — the same rule as Android's Profile.isComplete(). */
export function isProfileComplete(p) {
  return !!(p && p.name?.trim() && p.gender?.trim() && p.height_cm > 0 && p.weight_kg > 0 && p.age > 0)
}

/** Feature (d): name-prefix search, the twin of HikeDao.searchByNamePrefix. */
export function searchByName(hikes, prefix) {
  const q = (prefix || '').trim().toLowerCase()
  if (!q) return hikes
  return hikes.filter((h) => (h.name || '').toLowerCase().startsWith(q))
}

/** Feature (d): advanced search. Any blank filter is skipped — same rules as HikeDao. */
export function advancedSearch(hikes, { name, location, minLen, maxLen, dateFrom, dateTo, difficulty } = {}) {
  return hikes.filter((h) => {
    if (name?.trim() && !(h.name || '').toLowerCase().includes(name.trim().toLowerCase())) return false
    if (location?.trim() && !(h.location || '').toLowerCase().includes(location.trim().toLowerCase())) return false
    if (minLen !== '' && minLen != null && Number(h.length_km) < Number(minLen)) return false
    if (maxLen !== '' && maxLen != null && Number(h.length_km) > Number(maxLen)) return false
    if (dateFrom?.trim() && (h.hike_date || '') < dateFrom.trim()) return false
    if (dateTo?.trim() && (h.hike_date || '') > dateTo.trim()) return false
    if (difficulty && h.difficulty !== difficulty) return false
    return true
  })
}
