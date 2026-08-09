import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Api } from '../../../lib/api'
import { healthAdvice, hikeSafety, restBreaks, waterLitres, type SafetyKey } from '../../../lib/health'
import { Prefs } from '../../../lib/store'
import { useApp } from '../../../lib/theme'
import { clock } from '../../../lib/track'
import { useJourney } from '../../../lib/useJourney'
import { Btn, Card, Confirm, Glyph, LargeTitle, Loading, NavBar, Screen, Section, useToast } from '../../../lib/ui'

// Hike track replay and live navigation screen
export default function TrackHike() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { c, s, t } = useApp()

  const [hike, setHike] = useState<any | null>(null)
  const [askFinish, setAskFinish] = useState(false)

  const targetMin = (Number(hike?.duration_hours) || 0) * 60
  const j = useJourney(targetMin)

  useEffect(() => {
    Api.getHike(Prefs.userId(), String(id)).then(({ data }) => setHike(data))
  }, [id])

  if (!hike) return <Loading />

  const advice = healthAdvice(Prefs.get('height_cm', 0), Prefs.get('weight_kg', 0), Prefs.get('age', 0))
  const warnings: SafetyKey[] = hikeSafety(advice, hike)
  const hours = j.elapsedMin / 60

  const WARN_TEXT: Record<SafetyKey, string> = {
    tooLong: advice ? t.warnTooLong(Number(hike.length_km) || 0, advice.band === 'bmiObese' ? 5 : 8) : '',
    tooLongHard: t.warnTooLongHard,
    noWater: t.warnNoWater,
    noEmergency: t.warnNoEmergency,
    lateStart: t.warnLateStart,
  }

  async function finish() {
    setAskFinish(false)
    j.pause()
    const { error } = await Api.saveHike(Prefs.userId(), {
      ...hike,
      length_km: Math.round(j.km * 100) / 100 || hike.length_km,
      duration_hours: Math.round(hours * 100) / 100 || hike.duration_hours,
      status: 'Completed',
      track: JSON.stringify(j.points),
    })
    toast(error ? t.saveFailed(error) : t.journeySaved)
    router.replace(`/hikes/${hike.id}`)
  }

  return (
    <Screen noTabs>
      <NavBar title={t.trackJourney} />
      <LargeTitle sub={hike.location}>{hike.name}</LargeTitle>

      <Card hero style={{ alignItems: 'center', gap: 4 }}>
        <Text style={[s.statValue, { fontSize: 52 }]}>{clock(j.elapsedMs)}</Text>
        <Text style={s.footnote}>{t.elapsed}</Text>

        <View style={{ flexDirection: 'row', marginTop: 16, alignSelf: 'stretch' }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.statValue}>{j.km.toFixed(2)}</Text>
            <Text style={s.footnote}>km</Text>
          </View>
          <View style={{ width: 1, backgroundColor: c.sep }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.statValue}>{j.pace.toFixed(1)}</Text>
            <Text style={s.footnote}>km/h</Text>
          </View>
          <View style={{ width: 1, backgroundColor: c.sep }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.statValue}>{j.points.length}</Text>
            <Text style={s.footnote}>{t.gpsPoints}</Text>
          </View>
        </View>
      </Card>

      <View style={{ height: 14 }} />

      {!j.running ? (
        <Btn onPress={j.start}>{j.startedAt ? t.resume : t.startJourney}</Btn>
      ) : (
        <>
          <Btn variant="secondary" onPress={j.pause}>{t.pause}</Btn>
          <View style={{ height: 10 }} />
          <Btn variant="danger" onPress={() => setAskFinish(true)}>{t.finishJourney}</Btn>
        </>
      )}

      {!!j.stopped && (
        <Text style={[s.footnote, { color: c.diffModerate, marginTop: 12, marginHorizontal: 4, lineHeight: 19 }]}>
          {j.stopped === 'idle' ? t.autoStoppedIdle : t.autoStoppedCap}
        </Text>
      )}
      {j.denied && (
        <Text style={[s.footnote, { color: c.diffModerate, marginTop: 12, marginHorizontal: 4 }]}>
          {t.locationDeniedSoft}
        </Text>
      )}

      {j.running && (
        <Section title={t.staySafe}>
          <Card style={{ padding: 14, gap: 6 }}>
            <Text style={s.body}>{t.drinkHint(waterLitres(hours))}</Text>
            <Text style={s.body}>{t.restHint(restBreaks(hours))}</Text>
          </Card>
        </Section>
      )}

      {warnings.length > 0 && (
        <Section title={t.safetyChecks}>
          <Card style={{ padding: 14, gap: 8 }}>
            {warnings.map((w) => (
              <View key={w} style={{ flexDirection: 'row', gap: 8 }}>
                <Glyph name="alert" size={18} color={c.diffModerate} />
                <Text style={[s.footnote, { flex: 1, lineHeight: 19 }]}>{WARN_TEXT[w]}</Text>
              </View>
            ))}
          </Card>
          <Text style={[s.caption, { marginTop: 8, marginHorizontal: 4 }]}>{t.notMedical}</Text>
        </Section>
      )}

      <Confirm
        open={askFinish} message={t.confirmFinish(j.km.toFixed(2))} confirmLabel={t.finishJourney} danger={false}
        onCancel={() => setAskFinish(false)} onConfirm={finish}
      />
    </Screen>
  )
}
