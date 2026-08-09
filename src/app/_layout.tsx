import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useState, type JSX } from 'react'
import { AppState, useColorScheme, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Api } from '../lib/api'
import { STRINGS, setLocale, type Lang } from '../lib/i18n'
import { Prefs } from '../lib/store'
import { paletteFor, sheetFor, AppCtx, type ThemeMode } from '../lib/theme'
import { ErrorBoundary, ToastHost } from '../lib/ui'

export default function RootLayout(): JSX.Element {
  const [ready, setReady] = useState(false)
  const [mode, setModeState] = useState<ThemeMode>('auto')
  const [lang, setLangState] = useState<Lang>('en')
  const system = useColorScheme()

  useEffect(() => {
    let unsub: (() => void) | undefined
    let appStateSub: { remove: () => void } | undefined

    Prefs.init().then(() => {
      setModeState(Prefs.get('theme', 'auto'))
      const rawLang = Prefs.get('lang')
      const saved: Lang = rawLang === 'vi' ? 'vi' : 'en'
      setLocale(saved)
      setLangState(saved)
      setReady(true)

      const syncAll = () => {
        const uid = Prefs.userId()
        if (uid && uid !== 'demo') {
          Api.syncOnLogin(uid).catch(() => {})
        }
      }

      syncAll()
      unsub = Api.subscribeRealtime(Prefs.userId(), syncAll, 2500)

      appStateSub = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          syncAll()
        }
      })
    })

    return () => {
      if (unsub) unsub()
      if (appStateSub) appStateSub.remove()
    }
  }, [])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    Prefs.set('theme', m)
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLocale(l)
    setLangState(l)
    Prefs.set('lang', l)
  }, [])

  const dark = mode === 'auto' ? system === 'dark' : mode === 'dark'
  const c = paletteFor(dark)
  const s = sheetFor(dark)
  const t = STRINGS[lang]

  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />

  return (
    <AppCtx.Provider value={{ c, s, t, mode, setMode, lang, setLang }}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
          <ToastHost>
            <ErrorBoundary>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
            </ErrorBoundary>
          </ToastHost>
        </GestureHandlerRootView>
        <StatusBar style={dark ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </AppCtx.Provider>
  )
}

