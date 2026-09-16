import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { Api, isProfileComplete } from '../lib/api'
import { Prefs } from '../lib/store'
import { useApp } from '../lib/theme'
import { Spinner, useToast } from '../lib/ui'

function DemoButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const { c, t } = useApp()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: 320, maxWidth: '100%', alignSelf: 'center',
        height: 44, borderRadius: 4, borderWidth: 1, borderColor: c.sep,
        backgroundColor: c.primary, opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Vào trải nghiệm ngay (Demo)</Text>
    </Pressable>
  )
}

export default function Login() {
  const router = useRouter()
  const toast = useToast()
  const { c, s, t } = useApp()
  const params = useLocalSearchParams()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (params.expired) toast(t.sessionExpired)
    if (params.revoked) toast(t.cloudRevoked)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDemoLogin() {
    setBusy(true)
    setErr(null)
    try {
      const uid = 'demo-user-123'
      const email = 'demo@mhike.app'
      const name = 'Khách tham quan'
      const photo = undefined

      await Prefs.startSession(uid, email)
      const { data: profile, error } = await Api.signIn(uid, name, email, photo)
      if (error) {
        await Prefs.applyProfile({ name, email, avatar_path: photo })
        return router.replace('/home')
      }
      await Api.syncOnLogin(uid)
      await Prefs.applyProfile(profile || { name, email, avatar_path: photo })
      router.replace(isProfileComplete(profile || { name, email, avatar_path: photo }) ? '/home' : '/profile/edit?required=1')
    } catch (error: any) {
      setBusy(false)
      setErr(error?.message || t.signInFailed)
    }
  }

  return (
    <View style={[s.root, s.screenNoTabs, { justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' }]}>
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View style={{
          width: 110, height: 110, borderRadius: 55, overflow: 'hidden',
          borderWidth: 2, borderColor: c.sep, backgroundColor: c.card,
          alignItems: 'center', justifyContent: 'center', marginBottom: 12,
        }}>
          <Image
            source={require('../../assets/images/image.png')}
            style={{ width: 110, height: 110, borderRadius: 55 }}
            resizeMode="cover"
          />
        </View>
        <Text style={[s.largeTitle, { paddingRight: 0 }]}>MHike App</Text>
        <Text style={[s.secondary, { textAlign: 'center' }]}>{t.loginSub}</Text>
      </View>

      {busy ? (
        <Spinner />
      ) : (
        <DemoButton onPress={handleDemoLogin} disabled={busy} />
      )}

      {!!err && (
        <Text style={[s.footnote, { color: c.danger, textAlign: 'center', marginTop: 16 }]}>{err}</Text>
      )}

      <Text style={[s.caption, { textAlign: 'center', marginTop: 28 }]}>{t.terms}</Text>
    </View>
  )
}
