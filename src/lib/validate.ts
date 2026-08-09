// Data schema validation helpers for hikes, observations, and plans.

export type Row = Record<string, any>

export interface HikeRecord {
  id?: any
  name?: string
  location?: string
  hike_date?: string
  length_km?: any
  difficulty?: string
  [key: string]: any
}

export interface ObservationRecord {
  id?: any
  hike_id?: any
  observation?: string
  obs_time?: string
  [key: string]: any
}

export interface PlanRecord {
  id?: any
  start?: string
  per_week?: any
  perWeek?: any
  weeks?: any
  [key: string]: any
}

export interface PlanSessionRecord {
  id?: any
  plan_id?: any
  date?: string
  week?: any
  target_minutes?: any
  minutes?: any
  [key: string]: any
}

const filled = (v: any) => !!String(v ?? '').trim()

export function isValidHike(h: HikeRecord | null | undefined): boolean {
  if (!h || h.id == null) return false
  return filled(h.name) && filled(h.location) && filled(h.hike_date)
    && h.length_km != null && h.length_km !== '' && filled(h.difficulty)
}

export function isValidObservation(o: ObservationRecord | null | undefined): boolean {
  if (!o || o.id == null) return false
  return o.hike_id != null && filled(o.observation) && filled(o.obs_time)
}

export function isValidPlan(p: PlanRecord | null | undefined): boolean {
  if (!p || p.id == null) return false
  const perWeek = Number(p.per_week ?? p.perWeek)
  const weeks = Number(p.weeks)
  return filled(p.start) && perWeek > 0 && weeks > 0
}

export function isValidPlanSession(x: PlanSessionRecord | null | undefined): boolean {
  if (!x || !filled(x.id)) return false
  const mins = x.target_minutes ?? x.minutes
  return x.plan_id != null && filled(x.date)
    && Number.isFinite(Number(x.week)) && mins != null && mins !== ''
}

