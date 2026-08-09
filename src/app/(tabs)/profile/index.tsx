import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Api } from '../../../lib/api'
import { healthAdvice } from '../../../lib/health'
import { Prefs, bmi } from '../../../lib/store'
import { useApp } from '../../../lib/theme'
import { Avatar, Btn, Card, Cell, Glyph, Screen, Section } from '../../../lib/ui'

export default function Profile() {
  const router = useRouter()
  const { c, s, t } = useApp()
  const [counts, setCounts] = useState({ hikes: 0, km: 0, notes: 0 })
  const [p, setP] = useState(() => Prefs.all())

  useFocusEffect(useCallback(() => {
    setP(Prefs.all())
    Api.listHikes(Prefs.userId()).then(({ data }) => {
      const h = data || []
      setCounts((x) => ({ ...x, hikes: h.length, km: Math.round(h.reduce((sum: number, i: any) => sum + Number(i.length_km || 0), 0)) }))
    })
    Api.listObservations(Prefs.userId()).then(({ data }) => setCounts((x) => ({ ...x, notes: (data || []).length })))
  }, []))

  const b = bmi(p.height_cm, p.weight_kg)
  const advice = healthAdvice(p.height_cm, p.weight_kg, p.age)

  // Personalized BMI health insights and training recommendations
  const adviceText = !advice ? '' : {
    bmiObese: t.adviceObese(advice.overBy),
    bmiOver: t.adviceOver(advice.overBy),
    bmiHealthy: t.adviceHealthy,
    bmiUnder: t.adviceUnder(advice.underBy),
  }[advice.band]
  const tipText = !advice ? '' : {
    bmiObese: t.tipObese, bmiOver: t.tipOver, bmiHealthy: t.tipHealthy, bmiUnder: t.tipUnder,
  }[advice.band]
  const adviceTint = !advice ? c.label2
    : advice.band === 'bmiHealthy' ? c.catHikes
    : advice.band === 'bmiObese' ? c.diffHard
    : c.catNotes

  const stats: [string, any, string][] = [
    [t.statHikes, counts.hikes, c.catHikes],
    [t.statKm, counts.km, c.catSearch],
    [t.statNotes, counts.notes, c.catStats],
    [t.statBmi, b ? b.value : t.dash, c.catProfile],
  ]

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 }}>
        <Avatar initials={Prefs.initials()} uri={p.avatar_path} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title}>{p.name || t.someone}</Text>
          <Text style={s.secondary} numberOfLines={1}>{p.email}</Text>
        </View>
        <Pressable onPress={() => router.push('/profile/edit')}>
          <Text style={s.navAction}>{t.edit}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {stats.map(([label, v, tint]) => (
          <Card key={label} style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center' }}>
            <Text style={[s.statValue, { color: tint, fontSize: 24 }]}>{v}</Text>
            <Text style={s.footnote}>{label}</Text>
          </Card>
        ))}
      </View>

      <Section title={t.bodyProfile}>
        {advice ? (
          <Card hero>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.headline}>{t.bodyLine(advice.heightCm, advice.weightKg, advice.age)}</Text>
                <Text style={[s.secondary, { marginTop: 2 }]}>{t.bmiLine(advice.value, t[advice.band])}</Text>
              </View>
              <Pressable onPress={() => router.push('/profile/edit')} hitSlop={8}>
                <Glyph name="pencil" size={20} color={c.label2} />
              </Pressable>
            </View>

            <Text style={[s.footnote, { color: adviceTint, marginTop: 12, lineHeight: 19 }]}>
              {adviceText}
            </Text>
            <Text style={[s.footnote, { marginTop: 10, lineHeight: 19 }]}>{tipText}</Text>
            <Text style={[s.caption, { marginTop: 10 }]}>
              {t.healthyRange(advice.healthyMin, advice.healthyMax)} · {t.notMedical}
            </Text>
          </Card>
        ) : (
          <Card>
            <Cell
              icon={<Glyph name="pencil" />} tint={c.catNotes} title={t.editBodyProfile} last
              value={t.setHeightWeight} onPress={() => router.push('/profile/edit')}
            />
          </Card>
        )}
      </Section>

      <Section title={t.options}>
        <Card>
          <Cell icon={<Glyph name="sos" stroke={2.5} />} tint={c.danger} title="Emergency SOS Beacon" onPress={() => router.push('/sos')} />
          <Cell icon={<Glyph name="map" />} tint={c.catSearch} title={t.exploreMap} onPress={() => router.push('/map')} />
          <Cell icon={<Glyph name="calendar" />} tint={c.catStats} title={t.trainingPlan} onPress={() => router.push('/plan')} />
          <Cell icon={<Glyph name="pencil" />} tint={c.catNotes} title={t.allNotes} onPress={() => router.push('/notes')} />
          <Cell icon={<Glyph name="gear" />} tint={c.catProfile} title={t.settings} last onPress={() => router.push('/settings')} />
        </Card>
      </Section>

      <View style={{ height: 18 }} />
      <Btn variant="secondary" onPress={() => { Prefs.logout(); router.replace('/login') }}>{t.logout}</Btn>
    </Screen>
  )
}
