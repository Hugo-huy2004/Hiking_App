import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, Share, Text, View } from 'react-native'
import * as Location from 'expo-location'
import { Api } from '../../../lib/api'
import { localDate } from '../../../lib/date'
import { buildDefaultPlan, buildPlan, getSmartSuggestion, healthAdvice } from '../../../lib/health'
import { L } from '../../../lib/i18n'
import { Prefs, fmt } from '../../../lib/store'
import { alpha, difficultyColor, useApp } from '../../../lib/theme'
import { fetchWeatherByCoords, type WeatherData } from '../../../lib/weather'
import { Avatar, Card, Cell, Glyph, LargeTitle, Loading, Screen, Section, Tag } from '../../../lib/ui'

/* Feature (b): Main application dashboard screen. */

export default function Home() {
  const router = useRouter()
  const { c, s, t, lang } = useApp()
  const [hikes, setHikes] = useState<any[] | null>(null)
  const [notes, setNotes] = useState<any[]>([])
  const advice = healthAdvice(Prefs.get('height_cm', 0), Prefs.get('weight_kg', 0), Prefs.get('age', 0))
  const [plan, setPlan] = useState<any | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useFocusEffect(useCallback(() => {
    const uid = Prefs.userId()
    ;(async () => {
      await Api.pull(uid)
      const [{ data: h }, { data: n }, { data: p }] = await Promise.all([
        Api.listHikes(uid),
        Api.listObservations(uid),
        Api.getPlan(),
      ])
      setHikes(h || [])
      setNotes((n || []).slice(0, 3))
      if (p) {
        setPlan(p)
      } else {
        const planToSave = advice ? buildPlan(advice, fmt.today()) : buildDefaultPlan(fmt.today())
        const { data: made } = await Api.savePlan(uid, planToSave)
        setPlan(made || planToSave)
      }
    })()

    ;(async () => {
      try {
        let lat = 21.0285
        let lng = 105.8542
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          const pos = await Location.getLastKnownPositionAsync({}) || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
          if (pos) {
            lat = pos.coords.latitude
            lng = pos.coords.longitude
          }
        }
        const w = await fetchWeatherByCoords(lat, lng, lang)
        if (w) setWeather(w)
      } catch {
        const fallback = await fetchWeatherByCoords(21.0285, 105.8542, lang)
        if (fallback) setWeather(fallback)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]))

  const week = useMemo(() => {
    if (!hikes || hikes.length === 0) return { km: 0, count: 0 }
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const iso = localDate(monday)
    const inWeek = hikes.filter((h) => (h.hike_date || '') >= iso)
    if (inWeek.length > 0) {
      return { km: inWeek.reduce((sum, h) => sum + Number(h.length_km || 0), 0), count: inWeek.length }
    }
    return { km: hikes.reduce((sum, h) => sum + Number(h.length_km || 0), 0), count: hikes.length }
  }, [hikes])

  if (!hikes) return <Loading />

  const upcoming = hikes
    .filter((h) => h.status !== 'Completed' && (h.hike_date || '') >= fmt.today())
    .sort((a, b) => (a.hike_date || '').localeCompare(b.hike_date || ''))[0]
    || hikes.filter((h) => (h.hike_date || '') >= fmt.today())[0]
    || hikes[0]

  const totalKm = Math.round(hikes.reduce((sum, h) => sum + Number(h.length_km || 0), 0))

  // Next pending training session
  const pending = (plan?.sessions ?? []).filter((x: any) => !x.done)
  const next = pending[0]
  const doneCount = (plan?.sessions ?? []).length - pending.length

  const share = () =>
    Share.share({ message: t.shareText(totalKm, hikes.length) }).catch(() => {})

  const QUICK: [string, string, string, () => void][] = [
    [t.quickNewHike, 'plus', c.catHikes, () => router.push('/hikes/new')],
    [t.quickNote, 'pencil', c.catNotes, () => router.push('/notes/new')],
    [t.quickExplore, 'map', c.catSearch, () => router.push('/map')],
    [t.quickPlan, 'calendar', c.catStats, () => router.push('/plan')],
    [t.quickShare, 'share', c.catProfile, share],
  ]

      const smartSuggestion = getSmartSuggestion(weather, advice, plan, next)

      return (
        <Screen>
          <Text style={[s.sectionHeader, { marginTop: 14, marginBottom: 0 }]}>
            {new Date().toLocaleDateString(L.tag, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>

          <View>
            <LargeTitle sub={t.welcomeSub}>{t.welcome}</LargeTitle>
            <Avatar
              initials={Prefs.initials()} size={48} onPress={() => router.push('/profile')}
              style={{ position: 'absolute', top: 6, right: 0 }}
            />
          </View>

          {/* Card 1: Ultra-Compact Smart Weather & Action Widget */}
          <Card style={{
            marginTop: 10, marginBottom: 10, padding: 12, borderRadius: 18,
            borderWidth: 1.5, borderColor: smartSuggestion.accent,
            backgroundColor: c.card,
          }}>
            {/* Top Weather & SOS Header Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Glyph name={weather?.icon || 'sun'} color={c.catSearch} size={18} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: c.label }} numberOfLines={1}>
                  {weather ? `${weather.tempC}°C · ${weather.description}` : t.trailWeather}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/sos')}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: '#FF3B30', paddingVertical: 5, paddingHorizontal: 10,
                    borderRadius: 10, gap: 4,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Glyph name="sos" color="#FFFFFF" size={12} stroke={2.5} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>SOS</Text>
              </Pressable>
            </View>

            {/* Smart Action Recommendation Row */}
            <Pressable
              onPress={() => router.push(smartSuggestion.route as any)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: alpha(smartSuggestion.accent, 0.08),
                  padding: 10, borderRadius: 14, gap: 10,
                },
                pressed && { opacity: 0.88 },
              ]}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: smartSuggestion.accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Glyph name={smartSuggestion.icon} color="#FFFFFF" size={18} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: c.label }} numberOfLines={1}>
                  {smartSuggestion.title}
                </Text>
                <Text style={{ fontSize: 11, color: c.label2, marginTop: 1 }} numberOfLines={1}>
                  {smartSuggestion.subtitle}
                </Text>
              </View>

              <View style={{
                backgroundColor: smartSuggestion.accent, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>START</Text>
              </View>
            </Pressable>
          </Card>

          {/* Card 2: Ultra-Compact Upcoming Hike & Plan Widget */}
          <Card hero style={{ marginBottom: 12, padding: 14, borderRadius: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              {/* Left Column: Upcoming Hike */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: c.catHikes, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>
                  {t.upcomingHike}
                </Text>
                {upcoming ? (
                  <Pressable onPress={() => router.push(`/hikes/${upcoming.id}`)}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: c.label }} numberOfLines={1}>{upcoming.name}</Text>
                    <Text style={{ fontSize: 11, color: c.label2, marginTop: 2 }} numberOfLines={1}>
                      {upcoming.location} · {fmt.date(upcoming.hike_date)}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                      <Tag color={difficultyColor(c, upcoming.difficulty)}>{upcoming.difficulty}</Tag>
                      <Tag color={c.label3}>{fmt.km(upcoming.length_km)}</Tag>
                    </View>
                  </Pressable>
                ) : (
                  <Text style={{ fontSize: 13, color: c.label2 }}>{t.noHikesYet}</Text>
                )}
              </View>

              {/* Vertical Separator */}
              <View style={{ width: 1, backgroundColor: c.sep, alignSelf: 'stretch' }} />

              {/* Right Column: Today's Plan Session */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: c.catNotes, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>
                  {t.hikePlan}
                </Text>
                {next ? (
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: c.label }}>{fmt.dayShort(next.date)}</Text>
                    <Text style={{ fontSize: 11, color: c.label2, marginTop: 2 }}>
                      {Math.round(Number(next.target_minutes) || 0)} min · {doneCount}/{plan?.sessions?.length || 0}
                    </Text>
                    <Pressable
                      disabled={next.date !== fmt.today()}
                      onPress={() => router.push(`/plan/${next.id}`)}
                      style={({ pressed }) => [
                        {
                          marginTop: 6, backgroundColor: next.date === fmt.today() ? c.catNotes : c.fill2,
                          paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center',
                        },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                        {next.date === fmt.today() ? t.startSession : fmt.date(next.date)}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View>
                    <Text style={{ fontSize: 13, color: c.label2 }}>{t.planAllDone}</Text>
                    <Pressable
                      onPress={() => router.push('/plan')}
                      style={{ marginTop: 6, backgroundColor: c.fill2, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: c.label }}>{t.quickPlan}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </Card>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: 4 }}>
        {QUICK.map(([label, icon, tint, onPress]) => (
          <Pressable key={label} onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{
              width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
              backgroundColor: alpha(tint, 0.16),
            }}>
              <Glyph name={icon} size={22} color={tint} />
            </View>
            <Text style={[s.caption, { color: c.label, textAlign: 'center' }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Section title={t.thisWeek}>
        <Card hero>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={s.statValue}>{Math.round(week.km)}</Text>
              <Text style={s.footnote}>{t.kmPlanned}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: c.sep }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={s.statValue}>{week.count}</Text>
              <Text style={s.footnote}>{t.trips}</Text>
            </View>
          </View>
        </Card>
      </Section>

      <Section title={t.recentNotes}>
        {notes.length === 0 ? (
          <Text style={[s.secondary, { marginHorizontal: 4 }]}>{t.noFieldNotes}</Text>
        ) : (
          <Card>
            {notes.map((o, i) => (
              <Cell
                key={o.id} icon={<Glyph name="pencil" />} tint={c.catNotes} title={o.observation}
                value={o.obs_time?.slice(0, 10)} last={i === notes.length - 1}
                onPress={() => router.push(`/notes/${o.id}`)}
              />
            ))}
          </Card>
        )}
      </Section>

      {totalKm > 0 && (
        <Section title={t.achievements}>
          <View style={s.chips}>
            <View style={[s.chip, { backgroundColor: alpha(c.catHikes, 0.18) }]}>
              <Text style={[s.chipText, { color: c.catHikes, fontWeight: '600' }]}>{t.totalKm(totalKm)}</Text>
            </View>
          </View>
        </Section>
      )}
    </Screen>
  )
}
