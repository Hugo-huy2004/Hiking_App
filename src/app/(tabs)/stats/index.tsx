import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { Api } from '../../../lib/api'
import { localMonth } from '../../../lib/date'
import { estimateHikeCalories, minutesByWeek, trainingTotals } from '../../../lib/health'
import { L } from '../../../lib/i18n'
import { DIFFICULTIES, Prefs } from '../../../lib/store'
import { useApp } from '../../../lib/theme'
import { BarChart, Card, Glyph, LargeTitle, Loading, Ring, Screen, Section, Tag } from '../../../lib/ui'

export default function Analytics() {
  const { c, s, t } = useApp()
  const [hikes, setHikes] = useState<any[] | null>(null)
  const [sessions, setSessions] = useState<any[]>([])

  useFocusEffect(useCallback(() => {
    Api.listHikes(Prefs.userId()).then(({ data }) => setHikes(data || []))
    Api.getPlan().then(({ data }) => setSessions(data?.sessions ?? []))
  }, []))

  if (!hikes) return <Loading />

  const userWeight = Prefs.get('weight_kg', 70)
  const totalKm = hikes.reduce((sum, h) => sum + Number(h.length_km || 0), 0)
  const totalKcal = hikes.reduce((sum, h) => sum + estimateHikeCalories(h.length_km, h.difficulty, userWeight, h.duration_hours), 0)

  const doneHikes = hikes.filter((h) => (h.status || '').toLowerCase() === 'completed' || h.completed === 1).length
  const doneSessions = sessions.filter((s) => Number(s.done) === 1).length

  const totalDone = doneHikes + doneSessions
  const totalMax = hikes.length + sessions.length

  const completionPct = totalMax > 0 ? Math.round((totalDone / totalMax) * 100) : 0
  const avgKm = hikes.length > 0 ? totalKm / hikes.length : 0

  const longestHike = hikes.length > 0
    ? [...hikes].sort((a, b) => Number(b.length_km || 0) - Number(a.length_km || 0))[0]
    : null

  const byMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const key = localMonth(d)
    return {
      label: d.toLocaleDateString(L.tag, { month: 'short' }),
      value: hikes.filter((h) => (h.hike_date || '').startsWith(key)).reduce((sum, h) => sum + Number(h.length_km || 0), 0),
    }
  })
  const diff = DIFFICULTIES.map((d) => ({ label: d, value: hikes.filter((h) => h.difficulty === d).length }))

  const tt = trainingTotals(sessions)
  const weekly = minutesByWeek(sessions).map((x) => ({ label: t.weekShort(x.week), value: x.value }))

  return (
    <Screen>
      <LargeTitle sub={t.executiveReport}>{t.stats}</LargeTitle>

      {/* KPI Summary Row: Total Distance & Total Energy */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <Card style={{ flex: 1, padding: 14, borderRadius: 18, backgroundColor: c.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Glyph name="mountain" size={16} color={c.catHikes} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: c.label2, textTransform: 'uppercase' }}>
              {t.statKm}
            </Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '900', color: c.label }}>
            {Math.round(totalKm)} <Text style={{ fontSize: 13, fontWeight: '600', color: c.label2 }}>km</Text>
          </Text>
          <Text style={{ fontSize: 11, color: c.catHikes, fontWeight: '700', marginTop: 4 }}>
            Avg {avgKm.toFixed(1)} km {t.perTrip}
          </Text>
        </Card>

        <Card style={{ flex: 1, padding: 14, borderRadius: 18, backgroundColor: c.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Glyph name="sun" size={16} color="#FF9500" />
            <Text style={{ fontSize: 11, fontWeight: '800', color: c.label2, textTransform: 'uppercase' }}>
              {t.totalCalories}
            </Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#FF9500' }}>
            {totalKcal.toLocaleString()} <Text style={{ fontSize: 13, fontWeight: '600', color: c.label2 }}>kcal</Text>
          </Text>
          <Text style={{ fontSize: 11, color: c.label2, fontWeight: '600', marginTop: 4 }}>
            {t.statHikes}: {hikes.length}
          </Text>
        </Card>
      </View>

      {/* Executive Completion Ring & Progress Card */}
      <Card hero style={{ padding: 16, borderRadius: 22, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Ring value={totalDone} max={Math.max(1, totalMax)} label={`${completionPct}%`} caption={t.completionRate} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: c.label }}>
              {totalDone} / {totalMax} {t.ringCaption}
            </Text>
            <Text style={{ fontSize: 12, color: c.label2, marginTop: 4, lineHeight: 17 }}>
              {t.totalPlanned(Math.round(totalKm))}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Tag color={c.catHikes}>{t.longestHike}: {longestHike ? `${longestHike.length_km} km` : '0 km'}</Tag>
            </View>
          </View>
        </View>
      </Card>

      {/* 6-Month Distance Trend Chart */}
      <Section title={t.last6Months}>
        <Card hero style={{ padding: 16, borderRadius: 20 }}>
          <BarChart data={byMonth} />
        </Card>
      </Section>

      {/* Difficulty Breakdown Chart */}
      <Section title={t.byDifficulty}>
        <Card hero style={{ padding: 16, borderRadius: 20 }}>
          <BarChart data={diff} color={c.catHikes} unit={t.unitTrips} />
        </Card>
      </Section>

      {/* Training Schedule Analytics */}
      {tt.total > 0 && (
        <Section title={t.trainingLog}>
          <Card hero style={{ alignItems: 'center', gap: 10, padding: 16, borderRadius: 20 }}>
            <Ring
              value={tt.done} max={Math.max(1, tt.total)} color={c.catNotes}
              label={`${tt.done}/${tt.total}`} caption={t.sessionsLogged}
            />
            <Text style={s.secondary}>{t.trainedTotal(Math.round(tt.minutes), tt.km.toFixed(1))}</Text>
            {tt.unmeasured > 0 && (
              <Text style={[s.caption, { textAlign: 'center' }]}>{t.unmeasuredNote(tt.unmeasured)}</Text>
            )}
          </Card>
          {weekly.length > 0 && (
            <>
              <View style={{ height: 10 }} />
              <Card hero style={{ padding: 16, borderRadius: 20 }}>
                <BarChart data={weekly} color={c.catNotes} unit={t.unitMinutes} />
              </Card>
            </>
          )}
        </Section>
      )}

      <View style={{ height: 12 }} />
    </Screen>
  )
}
