import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { Api } from '../lib/api'
import { Db } from '../lib/db'
import { buildDefaultPlan, buildPlan, healthAdvice } from '../lib/health'
import { Prefs, fmt } from '../lib/store'
import { useApp } from '../lib/theme'
import { Btn, Card, Cell, Glyph, LargeTitle, Loading, NavBar, Screen, Section, useToast } from '../lib/ui'

// Fitness training plan manager backed by SQLite storage
export default function Plan() {
  const router = useRouter()
  const toast = useToast()
  const { c, s, t } = useApp()
  const p = Prefs.all()
  const advice = healthAdvice(p.height_cm, p.weight_kg, p.age)

  const [plan, setPlan] = useState<any | null | undefined>(undefined)   // Loading state indicator

  const load = useCallback(async () => {
    const uid = Prefs.userId()
    if (uid && uid !== 'demo') {
      await Api.pull(uid)
    }
    const { data } = await Api.getPlan()
    if (data) return setPlan(data)

    const planToSave = advice ? buildPlan(advice, fmt.today()) : buildDefaultPlan(fmt.today())
    const { data: saved } = await Api.savePlan(uid, planToSave)
    setPlan(saved ?? planToSave)
  }, [advice])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const rebuild = async () => {
    const uid = Prefs.userId()
    const planToSave = advice ? buildPlan(advice, fmt.today()) : buildDefaultPlan(fmt.today())
    const { data: saved } = await Api.savePlan(uid, planToSave)
    const freshPlan = saved || (await Db.getPlan()) || planToSave
    setPlan(freshPlan)
    toast('New plan started & saved to database!')
  }

  if (plan === undefined) return <Loading />

  // Guard against missing body profile metrics
  if (!plan && !advice) {
    return (
      <Screen noTabs>
        <NavBar />
        <LargeTitle sub={t.walkPlanSub}>{t.walkPlan}</LargeTitle>
        <Card style={{ padding: 14 }}>
          <Text style={[s.secondary, { marginBottom: 12 }]}>{t.needBodyProfile}</Text>
          <Btn onPress={() => router.push('/profile/edit')}>{t.fillProfile}</Btn>
        </Card>
      </Screen>
    )
  }

  const sessions: any[] = plan?.sessions ?? []
  const done = sessions.filter((x) => x.done).length
  const loggedMin = sessions.reduce((sum, x) => sum + (Number(x.actual_minutes) || 0), 0)
  const loggedKm = sessions.reduce((sum, x) => sum + (Number(x.distance_km) || 0), 0)

  return (
    <Screen noTabs>
      <NavBar />
      <LargeTitle sub={t.walkPlanSub}>{t.walkPlan}</LargeTitle>

      {!!advice && (
        <Card hero style={{ marginBottom: 14 }}>
          <Text style={[s.sectionHeader, { marginTop: 0, marginBottom: 0, marginHorizontal: 0 }]}>{t.yourBmi}</Text>
          <Text style={s.statValue}>{advice.value}</Text>
          <Text style={s.secondary}>{t[advice.band]}</Text>
          <Text style={[s.footnote, { marginTop: 6 }]}>{t.healthyRange(advice.healthyMin, advice.healthyMax)}</Text>
          {advice.etaWeeks > 0 && (
            <Text style={[s.footnote, { color: c.catNotes, marginTop: 10, lineHeight: 19 }]}>
              {t.etaToHealthy(advice.etaWeeks, Math.round(advice.etaWeeks / 4.345))}
            </Text>
          )}
        </Card>
      )}

      <Card hero style={{ marginBottom: 14 }}>
        <Text style={[s.sectionHeader, { marginTop: 0, marginBottom: 4, marginHorizontal: 0 }]}>{t.autoPlan}</Text>
        {!!advice && (
          <>
            <Text style={s.secondary}>{t.planFromProfile}</Text>
            <Text style={[s.headline, { marginTop: 8 }]}>
              {t.cycleLine(advice.perWeek, advice.startMinutes, advice.blockWeeks)}
            </Text>
            <Text style={[s.footnote, { marginTop: 4 }]}>{t.rampNote}</Text>
          </>
        )}

        <Text style={[s.statValue, { marginTop: 10 }]}>{done}/{sessions.length}</Text>
        <Text style={s.footnote}>{t.sessionsLogged}</Text>
        {loggedMin > 0 && (
          <Text style={[s.footnote, { marginTop: 6, color: c.catHikes }]}>
            {t.totalWalked(Math.round(loggedMin), loggedKm.toFixed(1))}
          </Text>
        )}
      </Card>

      {Array.from(new Set(sessions.map((x) => x.week))).map((w) => {
        const rows = sessions.filter((x) => x.week === w)
        return (
          <Section key={String(w)} title={t.weekN(w)}>
            <Card>
              {rows.map((x, i) => (
                <Cell
                  key={x.id}
                  icon={<Glyph name={x.done ? 'check' : 'circle'} />}
                  tint={x.done ? c.catHikes : c.label3}
                  title={fmt.date(x.date)}
                  value={x.done && x.actual_minutes != null
                    ? `${Math.round(Number(x.actual_minutes))} ${t.minShort} · ${(Number(x.distance_km) || 0).toFixed(1)} km`
                    : t.minutesShort(Math.round(Number(x.target_minutes) || 0))}
                  last={i === rows.length - 1}
                  onPress={() => router.push(`/plan/${x.id}`)}
                />
              ))}
            </Card>
          </Section>
        )
      })}

      <Text style={[s.caption, { marginTop: 14, marginHorizontal: 4 }]}>{t.notMedical}</Text>
      <View style={{ height: 14 }} />
      {advice
        ? <Btn variant="secondary" onPress={rebuild}>{t.newPlan}</Btn>
        : <Btn variant="secondary" onPress={() => router.push('/profile/edit')}>{t.fillProfile}</Btn>}
    </Screen>
  )
}
