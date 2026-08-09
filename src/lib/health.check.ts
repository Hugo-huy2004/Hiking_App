
import assert from 'node:assert/strict'
import {
  bmi, buildPlan, estimateHikeCalories, estimateSessionCalories, healthAdvice, hikeSafety, minutesByWeek, restBreaks, safeSingleHikeKm,
  sessionMinutes, trainingTotals, waterLitres,
} from './health.ts'
import {
  appendPoint, autoStopReason, clock, haversineKm, IDLE_STOP_MS, minsToNextRest, paceKmh,
  phaseOf, progressPct, sessionCapMs, trackDistanceKm, trackHours,
} from './track.ts'
import { isValidHike, isValidObservation, isValidPlan, isValidPlanSession } from './validate.ts'

assert.equal(estimateHikeCalories(10, 'Easy', 70, 2.5), 875, 'Calorie burn estimate for 2.5h Easy hike')
assert.equal(estimateSessionCalories(30, 70), 210, 'Calorie burn estimate for 30 min session')

const a = healthAdvice(185, 108, 22)!
assert.equal(a.value, 31.6, 'BMI')
assert.equal(a.band, 'bmiObese', 'dải BMI')
assert.equal(a.healthyMax, 85.2, 'cận trên khoảng khoẻ mạnh')
assert.equal(a.overBy, 22.8, 'số kg vượt ngưỡng')
assert.equal(a.underBy, 0, 'không thiếu cân')
assert.equal(a.etaWeeks, Math.ceil(22.8 / 0.5), 'số tuần dự kiến')

assert.equal(bmi(175, 55)!.band, 'bmiUnder')
assert.equal(bmi(175, 70)!.band, 'bmiHealthy')
assert.equal(bmi(175, 82)!.band, 'bmiOver')
assert.equal(bmi(175, 95)!.band, 'bmiObese')
assert.equal(bmi(0, 70), null, 'thiếu chiều cao thì trả null')

const ok = healthAdvice(175, 70, 30)!
assert.equal(ok.overBy, 0)
assert.equal(ok.etaWeeks, 0)

assert.equal(sessionMinutes(25, 1), 25)
assert.equal(sessionMinutes(25, 2), 25)
assert.equal(sessionMinutes(25, 3), 30)
assert.equal(sessionMinutes(25, 99), 60, 'phải chạm trần')

const plan = buildPlan(a, '2026-01-05')
assert.equal(plan.sessions.length, a.perWeek * a.blockWeeks, 'tổng số buổi')
assert.equal(plan.sessions[0].week, 1)
assert.equal(plan.sessions.at(-1)!.week, a.blockWeeks)
assert.equal(plan.sessions[0].date, '2026-01-05', 'buổi đầu đúng ngày bắt đầu')
const dates = plan.sessions.map((x) => x.date)
assert.deepEqual(dates, [...dates].sort(), 'ngày phải tăng dần')
assert.ok(
  plan.sessions.at(-1)!.minutes > plan.sessions[0].minutes,
  'thời lượng phải tăng dần theo tuần',
)

console.log('health.check: OK')
const fullHike = { id: 1, name: 'Snowdon', location: 'Wales', hike_date: '2026-08-01', length_km: 12, difficulty: 'Hard' }
assert.equal(isValidHike(fullHike), true, 'bản ghi đủ trường phải nhận')
assert.equal(isValidHike({ ...fullHike, length_km: 0 }), true, 'độ dài 0 vẫn hợp lệ, không phải thiếu')
assert.equal(isValidHike({ ...fullHike, name: '   ' }), false, 'tên toàn khoảng trắng = thiếu')
assert.equal(isValidHike({ ...fullHike, length_km: null }), false)
assert.equal(isValidHike({ ...fullHike, difficulty: '' }), false)
assert.equal(isValidHike({ ...fullHike, id: undefined }), false, 'thiếu id thì bỏ')
assert.equal(isValidHike(null), false)

const fullObs = { id: 9, hike_id: 1, observation: 'Deer', obs_time: '2026-08-01 07:30' }
assert.equal(isValidObservation(fullObs), true)
assert.equal(isValidObservation({ ...fullObs, hike_id: 0 }), true, 'hike_id = 0 là id hợp lệ, không phải thiếu')
assert.equal(isValidObservation({ ...fullObs, observation: '' }), false)
assert.equal(isValidObservation({ ...fullObs, hike_id: null }), false)
assert.equal(isValidObservation(undefined), false)

console.log('validate.check: OK')

const A = { lat: 21.0, lng: 105.8, t: 0 }
const B = { lat: 21.01, lng: 105.8, t: 600_000 }
assert.ok(Math.abs(haversineKm(A, B) - 1.112) < 0.01, 'haversine ~1.11 km')
assert.equal(haversineKm(A, A), 0, 'cùng một điểm = 0')

const jitter = { lat: 21.00002, lng: 105.8, t: 1000 }   // ~2 m
const before = [A]
assert.equal(appendPoint(before, jitter), before, 'điểm nhiễu bị loại thì giữ nguyên tham chiếu mảng')

assert.equal(appendPoint([A], B).length, 2, 'bước đi hợp lệ được nhận')

assert.equal(appendPoint([A], { ...B, t: 1000 }).length, 1, 'nhảy vọt vô lý bị loại')

assert.equal(appendPoint([], A).length, 1)

const path = [A, B]
assert.ok(Math.abs(trackDistanceKm(path) - 1.112) < 0.01)
assert.equal(trackDistanceKm([A]), 0, 'một điểm thì chưa đi được mét nào')
assert.ok(Math.abs(trackHours(path) - 1 / 6) < 1e-9, '10 phút = 1/6 giờ')
assert.ok(Math.abs(paceKmh(path) - 6.67) < 0.1, '1.11 km trong 10 phút ~ 6.7 km/h')
assert.equal(paceKmh([A]), 0, 'chưa đủ thời gian thì trả 0, không chia cho ~0')

assert.equal(clock(0), '00:00:00')
assert.equal(clock(3_661_000), '01:01:01')

// ------------------------------------------------------------------ safety

assert.equal(safeSingleHikeKm('bmiObese'), 5)
assert.equal(safeSingleHikeKm('bmiHealthy'), 15)

const obese = healthAdvice(185, 108, 22)!
const w = hikeSafety(obese, { length_km: 12, difficulty: 'Hard', equipment: 'Đèn pin', emergency_contact: '' })
assert.ok(w.includes('tooLong') && w.includes('tooLongHard'), 'dài + khó')
assert.ok(w.includes('noWater') && w.includes('noEmergency'))

const okHike = { length_km: 4, difficulty: 'Easy', equipment: 'Nước,Sơ cứu', emergency_contact: '0900', start_time: '07:00' }
assert.deepEqual(hikeSafety(obese, okHike), [], 'chuyến an toàn thì im lặng')

assert.ok(hikeSafety(obese, { ...okHike, start_time: '16:00', duration_hours: 4 }).includes('lateStart'))

assert.equal(waterLitres(2), 1, '2 giờ -> 1 lít')
assert.equal(waterLitres(3), 1.5, '3 giờ -> 1.5 lít')
assert.equal(waterLitres(2.5), 1.5, '2.5 giờ -> làm tròn lên 1.5 lít')
assert.equal(waterLitres(0.1), 0.5, 'tối thiểu nửa lít')
assert.equal(restBreaks(1.5), 2, '90 phút -> 2 lần nghỉ')

console.log('track+safety.check: OK')

// --------------------------------------------------------------- companion

assert.equal(phaseOf(0, 60), 'warmup')
assert.equal(phaseOf(4.9, 60), 'warmup')
assert.equal(phaseOf(5, 60), 'steady', 'hết khởi động là vào nhịp')
assert.equal(phaseOf(29, 60), 'steady')
assert.equal(phaseOf(30, 60), 'halfway', 'đúng nửa chặng')
assert.equal(phaseOf(47, 60), 'halfway')
assert.equal(phaseOf(48, 60), 'final', '80% là chặng cuối')
assert.equal(phaseOf(60, 60), 'done', 'chạm mục tiêu')
assert.equal(phaseOf(74, 60), 'done')
assert.equal(phaseOf(75, 60), 'over', 'quá 125% mục tiêu')

assert.equal(phaseOf(1, 10), 'warmup')
assert.equal(phaseOf(2, 10), 'steady', 'buổi 10 phút thì hết khởi động ở phút 2')
assert.equal(phaseOf(5, 10), 'halfway')
assert.equal(phaseOf(8, 10), 'final')
assert.equal(phaseOf(10, 10), 'done')
assert.equal(phaseOf(0, 0), 'steady', 'không có mục tiêu thì không chia chặng')

assert.equal(progressPct(30, 60), 50)
assert.equal(progressPct(90, 60), 100, 'không tràn quá 100')
assert.equal(progressPct(10, 0), 0)

assert.equal(minsToNextRest(0), 45)
assert.equal(minsToNextRest(30), 15)
assert.equal(minsToNextRest(45), 0, 'đúng mốc 45 phút là tới giờ nghỉ')
assert.equal(minsToNextRest(50), 40)

console.log('companion.check: OK')


const H = 3_600_000
assert.equal(sessionCapMs(30), 2 * H)
assert.equal(sessionCapMs(60), 3 * H)

assert.equal(autoStopReason(10 * 60_000, 30_000, 30), null)

assert.equal(autoStopReason(20 * 60_000, IDLE_STOP_MS, 30), 'idle')
assert.equal(autoStopReason(20 * 60_000, IDLE_STOP_MS - 1, 30), null, 'chưa đủ 10 phút thì chưa dừng')

assert.equal(autoStopReason(30 * 60_000, null, 30), null)
assert.equal(autoStopReason(2 * H, null, 30), 'cap')

assert.equal(autoStopReason(18 * H, null, 30), 'cap', 'để qua đêm phải bị chặn')
assert.equal(autoStopReason(18 * H, 17 * H, 30), 'cap', 'trần được xét trước idle')

console.log('autostop.check: OK')


const S = [
  { week: 1, done: 1, target_minutes: 30, actual_minutes: 28.5, distance_km: 2.4 },
  { week: 1, done: 1, target_minutes: 30, actual_minutes: null, distance_km: null },
  { week: 1, done: 0, target_minutes: 30 },
  { week: 2, done: 1, target_minutes: 35, actual_minutes: 40, distance_km: 3.6 },
  { week: 2, done: 0, target_minutes: 35 },
]

const tt = trainingTotals(S)
assert.equal(tt.total, 5)
assert.equal(tt.done, 3)
assert.ok(Math.abs(tt.minutes - 98.5) < 1e-9, 'cộng phút đo được hoặc mục tiêu nếu thiếu số đo')
assert.ok(Math.abs(tt.km - 8.5) < 1e-9)
assert.equal(tt.unmeasured, 1, 'đếm đúng 1 buổi chưa đo bằng GPS')
assert.deepEqual(trainingTotals([]), { done: 0, total: 0, minutes: 0, km: 0, unmeasured: 0 })

const bw = minutesByWeek(S)
assert.deepEqual(bw, [{ week: 1, value: 58.5 }, { week: 2, value: 40 }])
assert.equal(minutesByWeek(S, 1).length, 1, 'chỉ lấy N tuần gần nhất')
assert.deepEqual(minutesByWeek(S, 1), [{ week: 2, value: 40 }], 'lấy tuần mới nhất chứ không phải cũ nhất')
assert.deepEqual(minutesByWeek([]), [])

const long = Array.from({ length: 12 }, (_, i) => i + 1).flatMap((week) => [
  { week, done: week === 1 ? 1 : 0, target_minutes: 30, actual_minutes: week === 1 ? 26 : null },
])
assert.deepEqual(minutesByWeek(long), [{ week: 1, value: 26 }], 'không được trả về tuần 7–12 rỗng')

const none = long.map((x) => ({ ...x, done: 0, actual_minutes: null }))
assert.equal(minutesByWeek(none)[0].week, 1)

console.log('training.check: OK')


const goodPlan = { id: 1, start: '2026-08-03', per_week: 4, weeks: 12 }
assert.equal(isValidPlan(goodPlan), true)
assert.equal(isValidPlan({ ...goodPlan, per_week: 0 }), false, '0 buổi/tuần là vô nghĩa')
assert.equal(isValidPlan({ ...goodPlan, start: '' }), false)
assert.equal(isValidPlan({ ...goodPlan, id: undefined }), false)
assert.equal(isValidPlan(null), false)

const goodSess = { id: '1-0-0', plan_id: 1, date: '2026-08-03', week: 1, target_minutes: 30 }
assert.equal(isValidPlanSession(goodSess), true)
assert.equal(isValidPlanSession({ ...goodSess, target_minutes: 0 }), true, 'mục tiêu 0 phút vẫn là số hợp lệ')
assert.equal(isValidPlanSession({ ...goodSess, target_minutes: null }), false)
assert.equal(isValidPlanSession({ ...goodSess, week: 'x' }), false, 'tuần phải là số')
assert.equal(isValidPlanSession({ ...goodSess, plan_id: null }), false)
assert.equal(isValidPlanSession({ ...goodSess, id: '' }), false, 'id buổi là chuỗi, rỗng thì bỏ')

console.log('validate-plan.check: OK')
