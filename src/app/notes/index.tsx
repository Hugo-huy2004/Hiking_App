import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Api } from '../../lib/api'
import { Prefs } from '../../lib/store'
import { useApp } from '../../lib/theme'
import { Card, Cell, Empty, Fab, Glyph, LargeTitle, Screen, SkeletonHikes } from '../../lib/ui'

/* Feature (c): Multiple field observations per hike (CRUD). */

export default function Observations() {
  const router = useRouter()
  const { c, t } = useApp()
  const [rows, setRows] = useState<any[] | null>(null)

  useFocusEffect(useCallback(() => {
    Api.listObservations(Prefs.userId()).then(({ data }) => setRows(data || []))
  }, []))

  if (!rows) {
    return (
      <Screen floating={<Fab onPress={() => router.push('/notes/new')} />}>
        <LargeTitle sub="Loading notes…">{t.fieldNotes}</LargeTitle>
        <SkeletonHikes count={3} />
      </Screen>
    )
  }

  return (
    <Screen floating={<Fab onPress={() => router.push('/notes/new')} />}>
      <LargeTitle sub={t.notesCount(rows.length)}>{t.fieldNotes}</LargeTitle>
      {rows.length === 0 ? (
        <Empty>{t.noFieldNotes}</Empty>
      ) : (
        <Card>
          {rows.map((o, i) => (
            <Cell
              key={o.id} icon={<Glyph name="pencil" />} tint={c.catNotes} title={o.observation}
              value={o.obs_time?.slice(0, 10)} last={i === rows.length - 1}
              onPress={() => router.push(`/notes/${o.id}`)}
            />
          ))}
        </Card>
      )}
    </Screen>
  )
}
