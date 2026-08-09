import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { Api, isProfileComplete } from '../lib/api'
import { Prefs } from '../lib/store'
import { useApp } from '../lib/theme'
import { Spinner, useToast } from '../lib/ui'

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || ''
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || ''

// Google Identity Services branded sign-in button component
function GoogleButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const { c, t } = useApp()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: 320, maxWidth: '100%', alignSelf: 'center',
        height: 44, borderRadius: 4, borderWidth: 1, borderColor: c.sep,
        backgroundColor: c.card, opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <Svg width={18} height={18} viewBox="0 0 48 48">
        <Path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-3.9H24v7.1h12c-.2 1.8-1.5 4.6-4.4 6.4l6.7 5.2C42.2 35.1 45 30 45 24z" />
        <Path fill="#34A853" d="M24 46c5.9 0 10.9-1.9 14.5-5.2l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.1 15.4 46 24 46z" />
        <Path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10z" />
        <Path fill="#EA4335" d="M24 10.2c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4 29.9 2 24 2 15.4 2 8 6.9 4.4 14l7.1 5.5c1.8-5.3 6.7-9.3 12.5-9.3z" />
      </Svg>
      <Text style={{ color: c.label, fontSize: 14, fontWeight: '500' }}>{t.continueGoogle}</Text>
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
    try {
      GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        iosClientId: IOS_CLIENT_ID,
        offlineAccess: true,
      })
    } catch (e) {
      console.warn('[GoogleSignin.configure error]', e)
    }
  }, [])

  useEffect(() => {
    if (params.expired) toast(t.sessionExpired)
    if (params.revoked) toast(t.cloudRevoked)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Perform native Google Sign-In with Google account
  async function handleGoogleLogin() {
    setBusy(true)
    setErr(null)
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
      await GoogleSignin.signOut().catch(() => {})
      const res = await GoogleSignin.signIn()
      if (isSuccessResponse(res)) {
        const user = res.data.user
        const uid = user.id
        const email = user.email
        const name = user.name || email.split('@')[0]
        const photo = user.photo || undefined

        await Prefs.startSession(uid, email)
        const { data: profile, error } = await Api.signIn(uid, name, email, photo)
        if (error) {
          await Prefs.applyProfile({ name, email, avatar_path: photo })
          return router.replace('/home')
        }
        await Api.syncOnLogin(uid)
        await Prefs.applyProfile(profile || { name, email, avatar_path: photo })
        router.replace(isProfileComplete(profile || { name, email, avatar_path: photo }) ? '/home' : '/profile/edit?required=1')
        return
      }
      setBusy(false)
    } catch (error: any) {
      setBusy(false)
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // User cancelled Google account selection dialog
            break
          case statusCodes.IN_PROGRESS:
            break
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setErr('Google Play Services không khả dụng trên thiết bị này.')
            break
          default:
            setErr(error.message || t.signInFailed)
        }
      } else {
        setErr(error?.message || t.signInFailed)
      }
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
        <GoogleButton onPress={handleGoogleLogin} disabled={busy} />
      )}

      {!!err && (
        <Text style={[s.footnote, { color: c.danger, textAlign: 'center', marginTop: 16 }]}>{err}</Text>
      )}

      <Text style={[s.caption, { textAlign: 'center', marginTop: 28 }]}>{t.terms}</Text>
    </View>
  )
}
