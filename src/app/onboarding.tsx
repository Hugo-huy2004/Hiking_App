import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Prefs } from '../lib/store'
import { useApp } from '../lib/theme'
import { Btn } from '../lib/ui'

export default function Onboarding() {
  const router = useRouter()
  const { c, s, t } = useApp()
  const insets = useSafeAreaInsets()
  const [i, setI] = useState(0)

  const PAGES = [
    { n: '01', title: t.ob1Title, body: t.ob1Body },
    { n: '02', title: t.ob2Title, body: t.ob2Body },
    { n: '03', title: t.ob3Title, body: t.ob3Body },
  ]

  const done = async () => {
    await Prefs.setOnboarded()
    router.replace('/login')
  }

  const p = PAGES[i]
  return (
    <View style={[s.root, s.screenNoTabs, { paddingTop: insets.top, maxWidth: 520, width: '100%', alignSelf: 'center' }]}>
      <View style={s.navbar}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={done}><Text style={s.navAction}>{t.skip}</Text></Pressable>
      </View>

      <Text style={[s.largeTitle, { color: c.accent, opacity: 0.35, fontSize: 64 }]}>{p.n}</Text>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 140, height: 140, borderRadius: 70, overflow: 'hidden',
          borderWidth: 2, borderColor: c.sep, backgroundColor: c.card,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Image
            source={require('../../assets/images/image.png')}
            style={{ width: 140, height: 140, borderRadius: 70 }}
            resizeMode="cover"
          />
        </View>
      </View>

      <Text style={s.largeTitle}>{p.title}</Text>
      <Text style={[s.secondary, { marginBottom: 24 }]}>{p.body}</Text>

      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
        {PAGES.map((_, k) => (
          <View key={k} style={{ height: 4, borderRadius: 2, flex: k === i ? 2 : 1, backgroundColor: k === i ? c.accent : c.fill2 }} />
        ))}
      </View>

      <Btn onPress={() => (i < PAGES.length - 1 ? setI(i + 1) : done())}>
        {i < PAGES.length - 1 ? t.next : t.start}
      </Btn>
    </View>
  )
}
