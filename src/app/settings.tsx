import Constants from 'expo-constants'
import { useCallback, useEffect, useState } from 'react'
import { Text } from 'react-native'
import { Api } from '../lib/api'
import { Prefs } from '../lib/store'
import type { Lang } from '../lib/i18n'
import { useApp, type ThemeMode } from '../lib/theme'
import { Card, Cell, Confirm, Glyph, LargeTitle, NavBar, Screen, Section, Segmented, useToast } from '../lib/ui'

export default function Settings() {
  const toast = useToast()
  const { c, s, t, mode, setMode, lang, setLang } = useApp()
  const [counts, setCounts] = useState({ hikes: 0, notes: 0 })
  const [sub, setSub] = useState<string | null>(null)
  const [ask, setAsk] = useState(false)

  const reload = useCallback(() => {
    Api.counts().then((n) => setCounts({ hikes: n.hikes, notes: n.observations }))
  }, [])
  useEffect(reload, [reload])

  const THEMES = [
    { value: 'light', label: t.themeLight },
    { value: 'dark', label: t.themeDark },
    { value: 'auto', label: t.themeAuto },
  ]

  return (
    <Screen noTabs>
      <NavBar />
      <LargeTitle>{t.settings}</LargeTitle>

      <Section title={t.appearance}>
        <Card style={{ padding: 14 }}>
          <Segmented options={THEMES} value={mode} onChange={(v) => setMode(v as ThemeMode)} />
        </Card>
      </Section>

      <Section title={t.language}>
        <Card style={{ padding: 14 }}>
          <Segmented
            options={[{ value: 'en', label: 'English' }, { value: 'vi', label: 'Tiếng Việt' }]}
            value={lang} onChange={(v) => setLang(v as Lang)}
          />
        </Card>
      </Section>

      <Section title={t.data}>
        <Card>
          <Cell
            icon={<Glyph name="database" />} tint={c.catSearch} title={t.database}
            value={t.dbCount(counts.hikes, counts.notes)} chevron={false}
          />
          <Cell
            icon={<Glyph name="cloud" />} tint={c.catHikes} title={t.checkConnection}
            onPress={async () => {
              setSub(t.checking)
              const { error } = await Api.ping(Prefs.userId())
              setSub(error ? t.serverDown(error) : t.connected)
            }}
          />
          <Cell
            icon={<Glyph name="refresh" />} tint={c.catNotes} title={t.resync}
            onPress={async () => {
              setSub(t.loadingData)
              const { error } = await Api.pull(Prefs.userId())
              reload()
              setSub(error ? t.serverDown(error) : t.synced)
            }}
          />
          <Cell icon={<Glyph name="trash" />} tint={c.danger} title={t.wipeAll} danger last onPress={() => setAsk(true)} />
        </Card>
        <Text style={[s.footnote, { marginTop: 8, marginHorizontal: 4 }]}>{sub ?? t.backupHint}</Text>
      </Section>

      <Section title={t.about}>
        <Card>
          <Cell title={t.version} value={process.env.EXPO_PUBLIC_APP_VERSION || Constants.expoConfig?.version || '1.0.0'} chevron={false} />
          <Cell title={t.author} value={process.env.EXPO_PUBLIC_AUTHOR || t.dash} chevron={false} />
          <Cell title={t.platform} value="React Native · Expo" chevron={false} last />
        </Card>
      </Section>

      <Confirm
        open={ask} message={t.confirmWipe} confirmLabel={t.deleteAll}
        onCancel={() => setAsk(false)}
        onConfirm={async () => {
          setAsk(false)
          await Api.deleteAllHikes(Prefs.userId())
          toast(t.allDataDeleted)
          reload()
        }}
      />
    </Screen>
  )
}
