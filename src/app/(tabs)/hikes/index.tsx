import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { Api } from '../../../lib/api'
import { Prefs } from '../../../lib/store'
import { useApp } from '../../../lib/theme'
import {
  Card, Cell, Confirm, Empty, Fab, Field, HikeCard, Input, LargeTitle, Screen, Segmented, SkeletonHikes, useToast,
} from '../../../lib/ui'

/* Feature (b): Hike list overview with CRUD and search filter. */

export default function HikeList() {
  const router = useRouter()
  const toast = useToast()
  const { s, t } = useApp()
  const [hikes, setHikes] = useState<any[] | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('All')
  const [askReset, setAskReset] = useState(false)

  const reload = useCallback(async () => {
    const { data } = await Api.listHikes(Prefs.userId())
    setHikes(data || [])
  }, [])
  useFocusEffect(useCallback(() => { reload() }, [reload]))

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = (hikes || []).filter((h) => (h.name || '').toLowerCase().startsWith(needle))
    if (filter === 'Planned') list = list.filter((h) => h.status !== 'Completed')
    if (filter === 'Completed') list = list.filter((h) => h.status === 'Completed')
    if (filter === 'Favourites') list = list.filter((h) => h.favourite)
    return list
  }, [hikes, q, filter])

  if (!hikes) {
    return (
      <Screen floating={<Fab onPress={() => router.push('/hikes/new')} />}>
        <LargeTitle sub="Loading hikes…">{t.yourHikes}</LargeTitle>
        <SkeletonHikes count={4} />
      </Screen>
    )
  }

  const logged = hikes.filter((h) => h.status === 'Completed').length
  const FILTERS = [
    { value: 'All', label: t.filterAll },
    { value: 'Planned', label: t.filterPlanned },
    { value: 'Completed', label: t.filterCompleted },
    { value: 'Favourites', label: t.filterFav },
  ]

  return (
    <Screen floating={<Fab onPress={() => router.push('/hikes/new')} />}>
      <LargeTitle sub={t.hikesSub(logged, hikes.length - logged)}>{t.yourHikes}</LargeTitle>

      <Field>
        <Input placeholder={t.searchByName} value={q} onChangeText={setQ} />
      </Field>
      <Segmented options={FILTERS} value={filter} onChange={setFilter} />

      <View style={{ height: 14 }} />

      {shown.length === 0 ? (
        <Empty>{hikes.length ? t.noMatch : t.noHikesTapPlus}</Empty>
      ) : (
        <Card>
          {shown.map((h, i) => (
            <HikeCard key={h.id} hike={h} last={i === shown.length - 1} onPress={() => router.push(`/hikes/${h.id}`)} />
          ))}
        </Card>
      )}

      {hikes.length > 0 && (
        <>
          <Text style={s.sectionHeader}>{t.data}</Text>
          <Card>
            <Cell title={t.deleteAllHikes} danger chevron={false} last onPress={() => setAskReset(true)} />
          </Card>
        </>
      )}

      <Confirm
        open={askReset}
        message={t.confirmResetDb}
        confirmLabel={t.deleteAll}
        onCancel={() => setAskReset(false)}
        onConfirm={async () => {
          setAskReset(false)
          await Api.deleteAllHikes(Prefs.userId())
          toast(t.allDataDeleted)
          reload()
        }}
      />
    </Screen>
  )
}
