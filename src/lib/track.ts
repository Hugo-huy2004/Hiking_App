// GPS tracking, Haversine distance, and session phase calculation.

export type Point = { lat: number; lng: number; t: number; alt?: number; heading?: number }

// Minimum displacement threshold to filter GPS jitter (meters)
const MIN_STEP_M = 8

const MAX_SPEED_KMH = 25

const EARTH_R_KM = 6371

// Haversine formula distance calculation in kilometers
export function haversineKm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Append new GPS point filtering jitter and unrealistic speed jumps
export function appendPoint(points: Point[], next: Point): Point[] {
  const last = points[points.length - 1]
  if (!last) return [next]

  const km = haversineKm(last, next)
  if (km * 1000 < MIN_STEP_M) return points

  const hours = (next.t - last.t) / 3_600_000
  if (hours > 0 && km / hours > MAX_SPEED_KMH) return points

  return [...points, next]
}

export function trackDistanceKm(points: Point[]): number {
  let sum = 0
  for (let i = 1; i < points.length; i++) sum += haversineKm(points[i - 1], points[i])
  return sum
}

export function trackHours(points: Point[]): number {
  if (points.length < 2) return 0
  return (points[points.length - 1].t - points[0].t) / 3_600_000
}

export function paceKmh(points: Point[]): number {
  const h = trackHours(points)
  return h > 0.001 ? trackDistanceKm(points) / h : 0
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
}


// Training session phase types
export type Phase = 'warmup' | 'steady' | 'halfway' | 'final' | 'done' | 'over'

const warmupFor = (targetMin: number) => Math.min(5, targetMin * 0.2)

export function phaseOf(elapsedMin: number, targetMin: number): Phase {
  if (targetMin <= 0) return 'steady'
  if (elapsedMin >= targetMin * 1.25) return 'over'
  if (elapsedMin >= targetMin) return 'done'
  if (elapsedMin < warmupFor(targetMin)) return 'warmup'
  if (elapsedMin >= targetMin * 0.8) return 'final'
  if (elapsedMin >= targetMin * 0.5) return 'halfway'
  return 'steady'
}

export const progressPct = (elapsedMin: number, targetMin: number) =>
  targetMin > 0 ? Math.min(100, Math.round((elapsedMin / targetMin) * 100)) : 0


// Auto-stop idle duration threshold (10 minutes)
export const IDLE_STOP_MS = 10 * 60_000

export function sessionCapMs(targetMin: number): number {
  return Math.max(2 * 3_600_000, targetMin * 3 * 60_000)
}

export type StopReason = 'idle' | 'cap'

// Determine if session should auto-stop due to inactivity or max duration cap
export function autoStopReason(
  elapsedMs: number, msSinceMove: number | null, targetMin: number,
): StopReason | null {
  if (elapsedMs >= sessionCapMs(targetMin)) return 'cap'
  if (msSinceMove != null && msSinceMove >= IDLE_STOP_MS) return 'idle'
  return null
}

const REST_EVERY_MIN = 45
export function minsToNextRest(elapsedMin: number): number {
  const r = REST_EVERY_MIN - (elapsedMin % REST_EVERY_MIN)
  return r === REST_EVERY_MIN && elapsedMin > 0 ? 0 : Math.ceil(r)
}
