import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Image, Text, View } from 'react-native'
import { Api } from '../../lib/api'
import { Prefs } from '../../lib/store'
import { useApp } from '../../lib/theme'
import { Btn, Card, Cell, Confirm, LargeTitle, Loading, NavBar, Screen, useToast } from '../../lib/ui'

export default function ObservationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { s, t } = useApp()
  const [row, setRow] = useState<any | null>(null)
  const [hike, setHike] = useState<any | null>(null)
  const [ask, setAsk] = useState(false)

  useFocusEffect(useCallback(() => {
    Api.listObservations(Prefs.userId()).then(async ({ data }) => {
      const o = (data || []).find((x: any) => String(x.id) === String(id))
      setRow(o || null)
      if (o?.hike_id) {
        const { data: h } = await Api.getHike(Prefs.userId(), o.hike_id)
        setHike(h)
      }
    })
  }, [id]))

  if (!row) return <Loading />

  const rows: [string, any][] = ([
    [t.rBelongsTo, hike?.name],
    [t.rWhen, row.obs_time],
    [t.rTrailCondition, row.trail_condition],
    [t.rWildlife, row.wildlife],
    [t.rVegetation, row.vegetation],
    [t.rMood, row.mood],
    [t.rRating, row.rating ? `${row.rating}/5` : ''],
    [t.rComments, row.comments],
  ] as [string, any][]).filter(([, v]) => v)

  return (
    <Screen noTabs>
      <NavBar action={{ label: t.edit, onPress: () => router.push(`/notes/${row.id}/edit`) }} />
      <LargeTitle sub={row.obs_time}>{row.observation}</LargeTitle>

      {!!row.photo_uri && (
        <Image source={{ uri: row.photo_uri }} style={{ width: '100%', height: 180, borderRadius: 16, marginBottom: 14 }} resizeMode="cover" />
      )}

      {!!row.detail && (
        <Card style={{ padding: 14, marginBottom: 14 }}>
          <Text style={s.body}>{row.detail}</Text>
        </Card>
      )}

      <Card>
        {rows.map(([k, v], i) => (
          <Cell key={k} title={k} value={String(v)} chevron={false} last={i === rows.length - 1} />
        ))}
      </Card>

      <View style={{ height: 20 }} />
      <Btn variant="danger" onPress={() => setAsk(true)}>{t.deleteNote}</Btn>

      <Confirm
        open={ask} message={t.confirmDeleteNote} onCancel={() => setAsk(false)}
        onConfirm={async () => {
          await Api.deleteObservation(Prefs.userId(), row.id)
          toast(t.noteDeleted)
          router.back()
        }}
      />
    </Screen>
  )
}
