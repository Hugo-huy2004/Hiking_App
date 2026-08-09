import { useRouter } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { Text, View } from 'react-native'
import { Api } from '../../lib/api'
import { Prefs, fmt } from '../../lib/store'
import { difficultyColor, useApp } from '../../lib/theme'
import { Btn, Card, NavBar, Screen, Tag, useToast } from '../../lib/ui'

export default function ConfirmHike() {
  const router = useRouter()
  const toast = useToast()
  const { c, s, t } = useApp()
  const draft = useMemo(() => Prefs.getDraft(), [])

  useEffect(() => { if (!draft) router.replace('/hikes') }, [draft, router])
  if (!draft) return null

  const rows: [string, any][] = ([
    [t.rLocation, draft.location],
    [t.rDateTime, draft.start_time ? `${fmt.date(draft.hike_date)} · ${draft.start_time}` : fmt.date(draft.hike_date)],
    [t.rLengthDuration, draft.duration_hours ? `${fmt.km(draft.length_km)} · ~${draft.duration_hours} h` : fmt.km(draft.length_km)],
    [t.rTrailType, draft.trail_type],
    [t.rParking, draft.parking ? t.yes : t.no],
    [t.rWeather, draft.weather],
    [t.rBudget, draft.budget ? `£${draft.budget}` : ''],
    [t.rKit, draft.equipment],
    [t.rEmergency, draft.emergency_contact],
    [t.rPriorityVisibility, [draft.priority, draft.visibility].filter(Boolean).join(' · ')],
    [t.rTags, draft.tags],
    [t.rDescription, draft.description],
  ] as [string, any][]).filter(([, v]) => v)

  async function save() {
    const row = {
      ...draft,
      length_km: Number(draft.length_km) || 0,
      duration_hours: draft.duration_hours ? Number(draft.duration_hours) : null,
      budget: draft.budget ? Number(draft.budget) : null,
    }
    const { error } = await Api.saveHike(Prefs.userId(), row)
    await Prefs.clearDraft()
    toast(error ? t.saveFailed(error) : draft.id ? t.hikeUpdated : t.hikeSaved)
    router.replace('/hikes')
  }

  return (
    <Screen noTabs>
      <NavBar title={t.looksOk} />
      <Text style={[s.secondary, { marginHorizontal: 4, marginBottom: 14 }]}>{t.step2}</Text>

      <Card hero>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Text style={[s.title, { flex: 1 }]}>{draft.name}</Text>
          <Tag color={difficultyColor(c, draft.difficulty)}>{draft.difficulty}</Tag>
        </View>
        {rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.sep }}>
            <Text style={[s.footnote, { flex: 1 }]}>{k}</Text>
            <Text style={[s.footnote, { color: c.label, textAlign: 'right', flex: 1.4 }]}>{String(v)}</Text>
          </View>
        ))}
      </Card>

      <View style={{ height: 18 }} />
      <Btn onPress={save}>{t.saveHike}</Btn>
      <View style={{ height: 10 }} />
      <Btn variant="secondary" onPress={() => router.back()}>{t.editDetails}</Btn>
    </Screen>
  )
}
