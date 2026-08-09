import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Image, Text, View } from 'react-native'
import { Api, isProfileComplete } from '../lib/api'
import { Prefs } from '../lib/store'
import { useApp } from '../lib/theme'
import { Spinner } from '../lib/ui'

/* Startup Routing: Splash -> Onboarding -> Login -> Profile -> Home */

export default function Splash() {
  const router = useRouter()
  const { c, s, t } = useApp()

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      if (!Prefs.isOnboarded()) return router.replace('/onboarding')
      if (!Prefs.isLoggedIn()) return router.replace('/login')
      if (Prefs.sessionExpired()) {
        Prefs.logout()
        return router.replace('/login?expired=1')
      }
      // Verifies cloud session status and profile completion on startup.
      // Timeout fallback to prevent landing freeze on network latency
      const localProfile = Prefs.toProfile()
      const { data: profile, error } = (await Promise.race([
        Api.getProfile(Prefs.userId()),
        new Promise((r) => setTimeout(() => r({ data: null, error: 'timeout' }), 5000)),
      ])) as any
      if (cancelled) return
      if (error) return router.replace('/home')          // Offline fallback gracefully proceeds to app

      const effectiveProfile = profile || (localProfile.name ? localProfile : null)
      if (!effectiveProfile) {
        return router.replace('/profile/edit?required=1')
      }

      Prefs.applyProfile(effectiveProfile)

      await Api.syncOnLogin(Prefs.userId())

      router.replace(isProfileComplete(effectiveProfile) ? '/home' : '/profile/edit?required=1')
    }, 900)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [router])

  return (
    <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{
        width: 120, height: 120, borderRadius: 60, overflow: 'hidden',
        borderWidth: 2, borderColor: c.sep, backgroundColor: c.card,
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
      }}>
        <Image
          source={require('../../assets/images/image.png')}
          style={{ width: 120, height: 120, borderRadius: 60 }}
          resizeMode="cover"
        />
      </View>
      <Text style={[s.largeTitle, { marginTop: 4, paddingRight: 0 }]}>M-Hike</Text>
      <Text style={s.secondary}>{t.tagline}</Text>
      <Spinner />
    </View>
  )
}
