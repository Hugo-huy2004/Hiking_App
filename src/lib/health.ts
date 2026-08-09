// Health, BMI, calorie burn estimation and training plan calculator.

// Pure utility module compatible with Node test runners
import { localDate } from './date.ts'

export function bmi(heightCm: number, weightKg: number) {
  if (!heightCm || !weightKg) return null
  const m = heightCm / 100
  const v = weightKg / (m * m)
  const band = v < 18.5 ? 'bmiUnder' : v < 25 ? 'bmiHealthy' : v < 30 ? 'bmiOver' : 'bmiObese'
  return { value: Math.round(v * 10) / 10, band: band as 'bmiUnder' | 'bmiHealthy' | 'bmiOver' | 'bmiObese' }
}

// Healthy WHO BMI range target constants
const HEALTHY_MIN_BMI = 18.5
const HEALTHY_MAX_BMI = 24.9

const RATE_KG_PER_WEEK = 0.5

const BLOCK_WEEKS = 12

const round1 = (n: number) => Math.round(n * 10) / 10

type Advice = NonNullable<ReturnType<typeof healthAdvice>>

export function healthAdvice(heightCm: number, weightKg: number, age: number) {
  const b = bmi(heightCm, weightKg)
  if (!b) return null

  const m2 = (heightCm / 100) ** 2
  const healthyMin = round1(HEALTHY_MIN_BMI * m2)
  const healthyMax = round1(HEALTHY_MAX_BMI * m2)

  const overBy = round1(Math.max(0, weightKg - healthyMax))
  const underBy = round1(Math.max(0, healthyMin - weightKg))

  const etaWeeks = overBy > 0 ? Math.ceil(overBy / RATE_KG_PER_WEEK) : 0

  const perWeek = b.band === 'bmiObese' ? 3 : b.band === 'bmiOver' ? 4 : 3
  const startMinutes = b.band === 'bmiObese' ? 25 : b.band === 'bmiOver' ? 30 : 40

  return {
    ...b,                                  // value, band
    heightCm, weightKg, age,
    healthyMin, healthyMax,
    overBy, underBy,
    ratePerWeek: RATE_KG_PER_WEEK,
    etaWeeks,
    perWeek, startMinutes,
    blockWeeks: BLOCK_WEEKS,
    weeklyMinutes: perWeek * sessionMinutes(startMinutes, BLOCK_WEEKS),
  }
}

export function sessionMinutes(startMinutes: number, week: number) {
  return Math.min(60, startMinutes + 5 * Math.floor((week - 1) / 2))
}

type PlanSession = { id: string; date: string; minutes: number; week: number; done: boolean }
export type Plan = {
  start: string; perWeek: number; weeks: number
  auto: boolean; etaWeeks: number; sessions: PlanSession[]
}

export function buildPlan(a: Advice, startISO: string): Plan {
  const sessions: PlanSession[] = []
  const start = new Date(startISO + 'T00:00:00')

  for (let w = 0; w < a.blockWeeks; w++) {
    for (let i = 0; i < a.perWeek; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + w * 7 + Math.round((i * 7) / a.perWeek))
      sessions.push({
        id: `${w}-${i}`,
        date: localDate(d),
        minutes: sessionMinutes(a.startMinutes, w + 1),
        week: w + 1,
        done: false,
      })
    }
  }

  return { start: startISO, perWeek: a.perWeek, weeks: a.blockWeeks, auto: true, etaWeeks: a.etaWeeks, sessions }
}

export function buildDefaultPlan(startISO: string): Plan {
  const dummyAdvice = {
    blockWeeks: 12,
    perWeek: 3,
    startMinutes: 30,
    etaWeeks: 4,
  }
  return buildPlan(dummyAdvice as any, startISO)
}


type SessionRow = {
  week: number
  done?: number | boolean
  target_minutes?: number | null
  actual_minutes?: number | null
  distance_km?: number | null
}

const num = (v: any) => Number(v) || 0

// Calculate total trained minutes and kilometers from plan sessions
export function trainingTotals(sessions: SessionRow[]) {
  const doneRows = sessions.filter((x) => !!x.done)
  return {
    done: doneRows.length,
    total: sessions.length,
    minutes: doneRows.reduce((sum, x) => sum + num(x.actual_minutes ?? x.target_minutes), 0),
    km: doneRows.reduce((sum, x) => sum + num(x.distance_km ?? (num(x.actual_minutes ?? x.target_minutes) / 12)), 0),
    unmeasured: doneRows.filter((x) => x.actual_minutes == null && x.distance_km == null).length,
  }
}

// Calculate total workout minutes grouped by training week
export function minutesByWeek(sessions: SessionRow[], lastN = 6): { week: number; value: number }[] {
  const weeks = [...new Set(sessions.map((x) => x.week))].sort((a, b) => a - b)
  const logged = sessions.filter((x) => !!x.done).map((x) => x.week)
  const lastLogged = logged.length ? Math.max(...logged) : 0

  const upto = lastLogged > 0
    ? weeks.filter((w) => w <= lastLogged).slice(-lastN)
    : weeks.slice(0, lastN)

  return upto.map((week) => ({
    week,
    value: sessions
      .filter((x) => x.week === week && !!x.done)
      .reduce((sum, x) => sum + num(x.actual_minutes ?? x.target_minutes), 0),
  }))
}


export function safeSingleHikeKm(band: Advice['band']): number {
  return band === 'bmiObese' ? 5 : band === 'bmiOver' ? 8 : band === 'bmiUnder' ? 8 : 15
}

// Recommended water intake in liters based on hike duration
export const waterLitres = (hours: number) => Math.max(0.5, Math.ceil(hours) / 2)

export const restBreaks = (hours: number) => Math.max(0, Math.floor((hours * 60) / 45))

export type SafetyKey = 'tooLong' | 'tooLongHard' | 'noWater' | 'noEmergency' | 'lateStart'

// Evaluate safety risks for planned hike
export function hikeSafety(
  advice: Advice | null,
  hike: { length_km?: any; duration_hours?: any; difficulty?: string; equipment?: string; emergency_contact?: string; start_time?: string },
): SafetyKey[] {
  const out: SafetyKey[] = []
  const km = Number(hike.length_km) || 0

  if (advice) {
    const cap = safeSingleHikeKm(advice.band)
    if (km > cap) out.push('tooLong')
    if (km > cap && hike.difficulty === 'Hard') out.push('tooLongHard')
  }

  if (!/nước|water/i.test(hike.equipment || '')) out.push('noWater')
  if (!String(hike.emergency_contact || '').trim()) out.push('noEmergency')

  const hour = Number(String(hike.start_time || '').slice(0, 2))
  const hours = Number(hike.duration_hours) || km / 4
  if (!isNaN(hour) && hour + hours > 18) out.push('lateStart')

  return out
}

export function estimateHikeCalories(
  lengthKm: number,
  difficulty: string = 'Easy',
  weightKg: number = 70,
  durationHours?: number,
): number {
  const metMap: Record<string, number> = {
    Easy: 5.0,
    Moderate: 6.5,
    Hard: 8.0,
    'Very Hard': 9.5,
  }
  const met = metMap[difficulty] || 6.0
  const hours = durationHours && durationHours > 0 ? Number(durationHours) : Number(lengthKm) / 4.0
  const weight = weightKg && weightKg > 0 ? Number(weightKg) : 70
  return Math.round(met * weight * Math.max(0.25, hours))
}

export function getSmartSuggestion(
  weather: any,
  advice: any,
  plan: any,
  nextSession: any,
) {
  if (nextSession && nextSession.date === new Date().toISOString().split('T')[0]) {
    return {
      title: 'Smart Fitness Recommendation',
      subtitle: `Your ${nextSession.target_minutes || 30}-minute walking session is scheduled for today. Tap to log it now!`,
      action: 'Start Session Now',
      route: `/plan/${nextSession.id}`,
      icon: 'fire',
      accent: '#34C759',
    }
  }

  if (weather && weather.tempC > 18 && weather.tempC < 30) {
    return {
      title: 'Perfect Trail Conditions',
      subtitle: `Ideal outdoor temperature of ${weather.tempC}°C in your area. Tap to view interactive trail map!`,
      action: 'Explore Map Trails',
      route: '/map',
      icon: 'mountain',
      accent: '#007AFF',
    }
  }

  if (advice && advice.band === 'bmiObese') {
    return {
      title: 'Personalized Health Tip',
      subtitle: 'Consistent 30-min walking sessions 3x a week will help reach your target healthy weight safely.',
      action: 'Open Training Plan',
      route: '/plan',
      icon: 'sun',
      accent: '#AF52DE',
    }
  }

  return {
    title: 'Smart Activity Guide',
    subtitle: 'Ready for your next adventure? Tap to log a new hike or record field notes.',
    action: 'Add New Hike',
    route: '/hikes/new',
    icon: 'plus',
    accent: '#FF9500',
  }
}

export function estimateSessionCalories(
  minutes: number,
  weightKg: number = 70,
): number {
  const weight = weightKg && weightKg > 0 ? Number(weightKg) : 70
  const hours = Math.max(0, Number(minutes || 0)) / 60
  return Math.round(6.0 * weight * hours)
}
