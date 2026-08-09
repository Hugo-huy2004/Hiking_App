import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Api } from '../../../lib/api'
import { DIFFICULTIES, Prefs } from '../../../lib/store'
import { useApp } from '../../../lib/theme'
import { Card, Empty, Field, HikeCard, Input, LargeTitle, Loading, Screen, Segmented } from '../../../lib/ui'

/* Feature (d): Simple and advanced multi-criteria search. */

export default function Search() {
  const router = useRouter()
  const { s, t } = useApp()
  const [results, setResults] = useState<any[] | null>(null)
  const [q, setQ] = useState('')
  const [adv, setAdv] = useState(false)
  const [f, setF] = useState<any>({ name: '', location: '', minLen: '', maxLen: '', dateFrom: '', dateTo: '', difficulty: null })

  useEffect(() => {
    let alive = true
    const run = adv ? Api.advancedSearch(Prefs.userId(), f) : Api.searchByName(Prefs.userId(), q)
    run.then(({ data }) => { if (alive) setResults(data || []) })
    return () => { alive = false }
  }, [q, adv, f])

  // Refresh search query results on screen focus
  useFocusEffect(useCallback(() => {
    const run = adv ? Api.advancedSearch(Prefs.userId(), f) : Api.searchByName(Prefs.userId(), q)
    run.then(({ data }) => setResults(data || []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []))

  if (!results) return <Loading />
  const on = (k: string) => (v: string) => setF({ ...f, [k]: v })

  return (
    <Screen>
      <LargeTitle>{t.search}</LargeTitle>

      <Segmented
        options={[{ value: false, label: t.byName }, { value: true, label: t.advanced }]}
        value={adv} onChange={setAdv}
      />
      <View style={{ height: 12 }} />

      {!adv ? (
        <Field>
          <Input autoFocus placeholder={t.startsWith} value={q} onChangeText={setQ} />
        </Field>
      ) : (
        <Card style={{ padding: 14 }}>
          <Field label={t.fName}><Input value={f.name} onChangeText={on('name')} /></Field>
          <Field label={t.fLoc}><Input value={f.location} onChangeText={on('location')} /></Field>
          <View style={s.row2}>
            <Field label={t.fKmFrom} style={{ flex: 1 }}><Input value={f.minLen} onChangeText={on('minLen')} keyboardType="decimal-pad" /></Field>
            <Field label={t.fKmTo} style={{ flex: 1 }}><Input value={f.maxLen} onChangeText={on('maxLen')} keyboardType="decimal-pad" /></Field>
          </View>
          <View style={s.row2}>
            <Field label={t.fDateFrom} style={{ flex: 1 }}><Input value={f.dateFrom} onChangeText={on('dateFrom')} placeholder="YYYY-MM-DD" /></Field>
            <Field label={t.fDateTo} style={{ flex: 1 }}><Input value={f.dateTo} onChangeText={on('dateTo')} placeholder="YYYY-MM-DD" /></Field>
          </View>
          <Field label={t.fDiff}>
            <Segmented
              options={DIFFICULTIES} value={f.difficulty}
              onChange={(v) => setF({ ...f, difficulty: f.difficulty === v ? null : v })}
            />
          </Field>
        </Card>
      )}

      <Text style={s.sectionHeader}>{t.resultCount(results.length)}</Text>

      {results.length === 0 ? (
        <Empty>{t.noResults}</Empty>
      ) : (
        <Card>
          {results.map((h, i) => (
            <HikeCard key={h.id} hike={h} last={i === results.length - 1} onPress={() => router.push(`/hikes/${h.id}`)} />
          ))}
        </Card>
      )}
    </Screen>
  )
}
