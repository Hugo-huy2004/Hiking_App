// Local SQLite database engine.

import * as SQLite from 'expo-sqlite'
import { isValidHike, isValidObservation, isValidPlan, isValidPlanSession } from './validate.ts'

export type Row = Record<string, any>

export interface Hike {
  id?: number | string
  name: string
  location: string
  hike_date: string
  parking: number | boolean
  length_km: number | string
  difficulty: string
  description?: string | null
  start_time?: string | null
  duration_hours?: number | string | null
  trail_type?: string | null
  weather?: string | null
  budget?: number | string | null
  equipment?: string | null
  emergency_contact?: string | null
  tags?: string | null
  priority?: string | null
  visibility?: string | null
  favourite?: number | boolean
  status?: string
  location_lat?: number | null
  location_lng?: number | null
  photo_uri?: string | null
  track?: string | null
  [key: string]: any
}

export interface Observation {
  id?: number | string
  hike_id: number | string
  observation: string
  obs_time: string
  detail?: string | null
  trail_condition?: string | null
  wildlife?: string | null
  vegetation?: string | null
  mood?: string | null
  rating?: number | string | null
  comments?: string | null
  photo_uri?: string | null
  [key: string]: any
}

export interface PlanSession {
  id: string
  plan_id?: number | string
  date: string
  week: number
  target_minutes?: number | string
  minutes?: number | string
  done?: number | boolean
  started_at?: number | null
  ended_at?: number | null
  actual_minutes?: number | null
  distance_km?: number | null
  track?: string | null
  note?: string | null
  [key: string]: any
}

export interface Plan {
  id?: number | string
  start: string
  per_week?: number | string
  perWeek?: number | string
  weeks: number | string
  eta_weeks?: number | string | null
  etaWeeks?: number | string | null
  created_at?: number
  active?: number
  sessions?: PlanSession[]
  [key: string]: any
}

export interface UserProfile {
  name?: string | null
  email?: string | null
  gender?: string | null
  height_cm?: number
  weight_kg?: number
  age?: number
  avatar_path?: string | null
  avatarUri?: string | null
  emergency_contact?: string | null
  [key: string]: any
}

const HIKE_COLS = [
  'id', 'name', 'location', 'hike_date', 'parking', 'length_km', 'difficulty', 'description',
  'start_time', 'duration_hours', 'trail_type', 'weather', 'budget', 'equipment',
  'emergency_contact', 'tags', 'priority', 'visibility', 'favourite', 'status',
  'location_lat', 'location_lng', 'photo_uri', 'track',
] as const

const OBS_COLS = [
  'id', 'hike_id', 'observation', 'obs_time', 'detail', 'trail_condition',
  'wildlife', 'vegetation', 'mood', 'rating', 'comments', 'photo_uri',
] as const

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS hikes (
    id                INTEGER PRIMARY KEY,
    name              TEXT    NOT NULL,
    location          TEXT    NOT NULL,
    hike_date         TEXT    NOT NULL,
    parking           INTEGER NOT NULL DEFAULT 0,
    length_km         REAL    NOT NULL,
    difficulty        TEXT    NOT NULL,
    description       TEXT,
    start_time        TEXT,
    duration_hours    REAL,
    trail_type        TEXT,
    weather           TEXT,
    budget            REAL,
    equipment         TEXT,
    emergency_contact TEXT,
    tags              TEXT,
    priority          TEXT,
    visibility        TEXT,
    favourite         INTEGER DEFAULT 0,
    status            TEXT    DEFAULT 'Planned',
    location_lat      REAL,
    location_lng      REAL,
    photo_uri         TEXT,
    track             TEXT
  );

  -- ON DELETE CASCADE: Deleting a hike automatically deletes all related observations.
  CREATE TABLE IF NOT EXISTS observations (
    id              INTEGER PRIMARY KEY,
    hike_id         INTEGER NOT NULL REFERENCES hikes(id) ON DELETE CASCADE,
    observation     TEXT    NOT NULL,
    obs_time        TEXT    NOT NULL,
    detail          TEXT,
    trail_condition TEXT,
    wildlife        TEXT,
    vegetation      TEXT,
    mood            TEXT,
    rating          REAL,
    comments        TEXT,
    photo_uri       TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_hikes_name ON hikes(name);
  CREATE INDEX IF NOT EXISTS idx_obs_hike  ON observations(hike_id);

  -- Database metadata table for account ownership and settings.
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

  -- Training plan table for storing goal-oriented fitness blocks.
  CREATE TABLE IF NOT EXISTS plans (
    id          INTEGER PRIMARY KEY,
    start       TEXT    NOT NULL,
    per_week    INTEGER NOT NULL,
    weeks       INTEGER NOT NULL,
    eta_weeks   INTEGER,
    created_at  INTEGER NOT NULL,
    active      INTEGER NOT NULL DEFAULT 1
  );

  -- Individual training session records with targets and actual GPS results.
  CREATE TABLE IF NOT EXISTS plan_sessions (
    id             TEXT    PRIMARY KEY,
    plan_id        INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    date           TEXT    NOT NULL,
    week           INTEGER NOT NULL,
    target_minutes REAL    NOT NULL,
    done           INTEGER NOT NULL DEFAULT 0,
    started_at     INTEGER,
    ended_at       INTEGER,
    actual_minutes REAL,
    distance_km    REAL,
    track          TEXT,
    note           TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_plan ON plan_sessions(plan_id, date);
`

// Schema migration column definitions
const ADDED_COLS: Record<string, Record<string, string>> = {
  hikes: { photo_uri: 'TEXT', location_lat: 'REAL', location_lng: 'REAL', track: 'TEXT' },
  observations: { photo_uri: 'TEXT' },
}

async function migrate(d: SQLite.SQLiteDatabase) {
  for (const [table, cols] of Object.entries(ADDED_COLS)) {
    const info = await d.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)
    const have = new Set(info.map((r) => r.name))
    for (const [col, type] of Object.entries(cols)) {
      if (!have.has(col)) await d.runAsync(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`)
    }
  }
}

let opening: Promise<SQLite.SQLiteDatabase> | null = null

const db = () => (opening ??= (async () => {
  const d = await SQLite.openDatabaseAsync('mhike.db')
  await d.execAsync(SCHEMA)
  await migrate(d)
  return d
})())

function pick(row: Row, cols: readonly string[]) {
  const out: Row = {}
  for (const k of cols) if (row[k] !== undefined) out[k] = row[k]
  return out
}

// Upsert record into SQLite database table by primary key.
async function upsert(table: string, cols: readonly string[], row: Row) {
  const data = pick({ ...row, id: row.id || Date.now() }, cols)
  const keys = Object.keys(data)
  const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
  await (await db()).runAsync(sql, keys.map((k) => data[k] ?? null))
  return data
}

async function writePlan(plan: Row, sessions: Row[]) {
  const d = await db()
  const perWeek = Number(plan.per_week ?? plan.perWeek) || 3
  const weeks = Number(plan.weeks) || 12
  await d.withTransactionAsync(async () => {
    await d.runAsync('DELETE FROM plans')
    await d.runAsync(
      'INSERT INTO plans (id, start, per_week, weeks, eta_weeks, created_at, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [plan.id, plan.start, perWeek, weeks, plan.eta_weeks ?? plan.etaWeeks ?? null, plan.created_at ?? Date.now()])
    for (const x of sessions) {
      await d.runAsync(
        `INSERT INTO plan_sessions
           (id, plan_id, date, week, target_minutes, done, started_at, ended_at, actual_minutes, distance_km, track, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [x.id, plan.id, x.date, x.week, x.target_minutes ?? x.minutes ?? 30, x.done ? 1 : 0,
         x.started_at ?? null, x.ended_at ?? null, x.actual_minutes ?? null,
         x.distance_km ?? null, x.track ?? null, x.note ?? null])
    }
  })
}

export const Db = {
  // ------------------------------------------------------------- hikes

  async listHikes(): Promise<Row[]> {
    return (await db()).getAllAsync('SELECT * FROM hikes ORDER BY hike_date DESC, id DESC')
  },

  async getHike(id: any): Promise<Row | null> {
    return (await db()).getFirstAsync('SELECT * FROM hikes WHERE id = ?', [Number(id)])
  },

  saveHike(hike: Row) {
    return upsert('hikes', HIKE_COLS, hike)
  },

  async deleteHike(id: any) {
    await (await db()).runAsync('DELETE FROM hikes WHERE id = ?', [Number(id)])
  },

  async deleteAll() {
    const d = await db()
    await d.runAsync('DELETE FROM observations')
    await d.runAsync('DELETE FROM hikes')
  },

  // -------------------------------------------------------- observations

  async listObservations(): Promise<Row[]> {
    return (await db()).getAllAsync('SELECT * FROM observations ORDER BY obs_time DESC')
  },

  async listObservationsByHike(hikeId: any): Promise<Row[]> {
    return (await db()).getAllAsync(
      'SELECT * FROM observations WHERE hike_id = ? ORDER BY obs_time DESC', [Number(hikeId)])
  },

  async getObservation(id: any): Promise<Row | null> {
    return (await db()).getFirstAsync('SELECT * FROM observations WHERE id = ?', [Number(id)])
  },

  saveObservation(obs: Row) {
    return upsert('observations', OBS_COLS, { ...obs, hike_id: Number(obs.hike_id) })
  },

  async deleteObservation(id: any) {
    await (await db()).runAsync('DELETE FROM observations WHERE id = ?', [Number(id)])
  },

  // ------------------------------------------------------------ search

  async searchByName(prefix: string): Promise<Row[]> {
    const q = (prefix || '').trim()
    if (!q) return Db.listHikes()
    return (await db()).getAllAsync(
      'SELECT * FROM hikes WHERE LOWER(name) LIKE LOWER(?) ORDER BY hike_date DESC', [`${q}%`])
  },

  // Advanced multi-criteria search
  async advancedSearch(f: Row = {}): Promise<Row[]> {
    const where: string[] = []
    const args: any[] = []
    const like = (col: string, v?: string) => {
      if (v?.trim()) { where.push(`LOWER(${col}) LIKE LOWER(?)`); args.push(`%${v.trim()}%`) }
    }
    const cmp = (col: string, op: string, v: any) => {
      if (v !== '' && v != null) { where.push(`${col} ${op} ?`); args.push(v) }
    }

    like('name', f.name)
    like('location', f.location)
    cmp('length_km', '>=', f.minLen === '' ? null : Number(f.minLen))
    cmp('length_km', '<=', f.maxLen === '' ? null : Number(f.maxLen))
    cmp('hike_date', '>=', f.dateFrom?.trim() || null)
    cmp('hike_date', '<=', f.dateTo?.trim() || null)
    if (f.difficulty) { where.push('difficulty = ?'); args.push(f.difficulty) }

    const sql = `SELECT * FROM hikes${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY hike_date DESC`
    return (await db()).getAllAsync(sql, args)
  },

  // ------------------------------------------------------------- sync

  // Replace all local hikes and observations with data pulled from cloud
  async replaceAll(hikes: Row[], observations: Row[]) {
    const goodHikes = hikes.filter(isValidHike)
    const ids = new Set(goodHikes.map((h) => Number(h.id)))
    const goodObs = observations.filter((o) => isValidObservation(o) && ids.has(Number(o.hike_id)))

    const d = await db()
    const localCount = (await d.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM hikes'))?.n ?? 0

    if (goodHikes.length === 0 && localCount > 0) {
      return { skippedHikes: 0, skippedObs: 0 }
    }

    await d.withTransactionAsync(async () => {
      await d.runAsync('DELETE FROM observations')
      await d.runAsync('DELETE FROM hikes')
      for (const h of goodHikes) await upsert('hikes', HIKE_COLS, { ...h, parking: h.parking ? 1 : 0 })
      for (const o of goodObs) await upsert('observations', OBS_COLS, o)
    })

    return { skippedHikes: hikes.length - goodHikes.length, skippedObs: observations.length - goodObs.length }
  },


  async getPlan(): Promise<Row | null> {
    const d = await db()
    const plan = await d.getFirstAsync<Row>('SELECT * FROM plans WHERE active = 1 ORDER BY created_at DESC LIMIT 1')
    if (!plan) return null
    const sessions = await d.getAllAsync<Row>(
      'SELECT * FROM plan_sessions WHERE plan_id = ? ORDER BY date, id', [plan.id])
    return { ...plan, sessions }
  },

  async savePlan(plan: Row): Promise<Row> {
    const id = plan.id || Date.now()
    const perWeek = Number(plan.perWeek ?? plan.per_week) || 3
    const weeks = Number(plan.weeks) || 12
    await writePlan(
      { id, start: plan.start, per_week: perWeek, weeks, eta_weeks: plan.etaWeeks ?? plan.eta_weeks ?? null },
      (plan.sessions ?? []).map((x: Row) => ({
        id: String(x.id).includes('-') ? String(x.id) : `${id}-${x.id}`,
        plan_id: id,
        date: x.date,
        week: x.week,
        target_minutes: x.minutes ?? x.target_minutes ?? 30,
        done: x.done ? 1 : 0,
        started_at: x.started_at ?? null,
        ended_at: x.ended_at ?? null,
        actual_minutes: x.actual_minutes ?? null,
        distance_km: x.distance_km ?? null,
        track: x.track ?? null,
        note: x.note ?? null,
      })),
    )
    return (await Db.getPlan())!
  },

  // Replace active training plan with new cloud data
  async replacePlan(plan: Row | null, sessions: Row[]) {
    if (!isValidPlan(plan)) {
      await (await db()).runAsync('DELETE FROM plans')
      return { skipped: sessions.length }
    }
    const planId = Number(plan!.id)
    const normalizedPlan = {
      ...plan!,
      id: planId,
      per_week: Number(plan!.per_week ?? plan!.perWeek) || 3,
      weeks: Number(plan!.weeks) || 12,
    }
    const good = sessions.map((x) => ({
      ...x,
      plan_id: planId,
      target_minutes: x.target_minutes ?? x.minutes ?? 30,
    })).filter((x) => isValidPlanSession(x) && Number(x.plan_id) === planId)

    await writePlan(normalizedPlan, good)
    return { skipped: sessions.length - good.length }
  },

  async beginSession(id: string, startedAt: number) {
    await (await db()).runAsync(
      'UPDATE plan_sessions SET started_at = ?, ended_at = NULL WHERE id = ?', [startedAt, id])
  },

  getSession(id: string): Promise<Row | null> {
    return db().then((d) => d.getFirstAsync<Row>('SELECT * FROM plan_sessions WHERE id = ?', [id]))
  },

  async clearSession(id: string) {
    await (await db()).runAsync(
      `UPDATE plan_sessions
          SET done = 0, started_at = NULL, ended_at = NULL,
              actual_minutes = NULL, distance_km = NULL, track = NULL, note = NULL
        WHERE id = ?`, [id])
  },

  async logSession(id: string, r: {
    startedAt: number; endedAt: number; actualMinutes: number; distanceKm: number; track: string; note?: string
  }) {
    await (await db()).runAsync(
      `UPDATE plan_sessions
          SET done = 1, started_at = ?, ended_at = ?, actual_minutes = ?, distance_km = ?, track = ?, note = ?
        WHERE id = ?`,
      [r.startedAt, r.endedAt, r.actualMinutes, r.distanceKm, r.track, r.note ?? null, id])
  },

  async saveUserProfile(profile: Row) {
    await this.setMeta('user_profile', JSON.stringify(profile))
  },

  async getUserProfile(): Promise<Row | null> {
    const json = await this.getMeta('user_profile')
    return json ? JSON.parse(json) : null
  },

  async getMeta(key: string): Promise<string | null> {
    const r = await (await db()).getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key])
    return r?.value ?? null
  },

  async setMeta(key: string, value: string) {
    await (await db()).runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value])
  },

  async counts() {
    const d = await db()
    const h = await d.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM hikes')
    const o = await d.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM observations')
    return { hikes: h?.n ?? 0, observations: o?.n ?? 0 }
  },
}
