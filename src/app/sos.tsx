import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Share, StatusBar, Text, View } from 'react-native'
import { callSosPhone, getCurrentSosDetails, sendSosSms, type SosDetails } from '../lib/sos'
import { Prefs } from '../lib/store'
import { useApp } from '../lib/theme'
import { Glyph, Screen, Skeleton, useToast } from '../lib/ui'

export default function SosScreen() {
  const router = useRouter()
  const toast = useToast()
  const { c } = useApp()
  const [details, setDetails] = useState<SosDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [strobe, setStrobe] = useState(false)
  const [flashBg, setFlashBg] = useState(false)

  const profile = Prefs.all()
  const emergencyPhone = profile.emergency_contact?.trim() || '115'

  useEffect(() => {
    let mounted = true
    getCurrentSosDetails(emergencyPhone).then((res) => {
      if (mounted) {
        setDetails(res)
        setLoading(false)
      }
    })
    return () => { mounted = false }
  }, [emergencyPhone])

  /* eslint-disable react-hooks/set-state-in-effect */
  // Morse Code SOS Flashing Edge Strobe (... --- ...)
  useEffect(() => {
    if (!strobe) {
      setFlashBg(false)
      return
    }
    const MORSE_PATTERN = [200, 200, 200, 200, 200, 600, 600, 200, 600, 200, 600, 600, 200, 200, 200, 200, 200, 1000]
    let step = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      setFlashBg((prev) => !prev)
      const duration = MORSE_PATTERN[step % MORSE_PATTERN.length]
      step++
      timer = setTimeout(tick, duration)
    }

    tick()
    return () => clearTimeout(timer)
  }, [strobe])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSms() {
    if (!details) return
    const ok = await sendSosSms(emergencyPhone, details.message)
    if (!ok) {
      toast('Could not open SMS application')
    }
  }

  async function handleCall() {
    await callSosPhone(emergencyPhone)
  }

  async function handleShare() {
    if (!details) return
    try {
      await Share.share({
        message: details.message,
        url: details.googleMapsUrl,
      })
    } catch {
      // ignore
    }
  }

  return (
    <Screen noTabs bg="#000000">
      <View style={{ flex: 1, backgroundColor: '#000000', paddingHorizontal: 20 }}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Flashing Red Screen Border Beacon */}
        {flashBg && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              borderWidth: 14,
              borderColor: '#FF3B30',
              zIndex: 9999,
            }}
          />
        )}

        {/* Minimalist Pure Black Top Bar */}
        <View style={{
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 17, color: c.accent, fontWeight: '600' }}>‹ Back</Text>
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 }}>
            EMERGENCY SOS
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Giant Glowing Red SOS Beacon Button */}
        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 20 }}>
          <Pressable
            onPress={() => setStrobe(!strobe)}
            style={({ pressed }) => [
              {
                width: 150, height: 150, borderRadius: 75,
                backgroundColor: strobe ? '#FF3B30' : '#E53935',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 6, borderColor: '#FFFFFF',
                shadowColor: '#E53935', shadowOpacity: 0.8, shadowRadius: 30, elevation: 16,
              },
              pressed && { transform: [{ scale: 0.94 }] },
            ]}
          >
            <Glyph name="sos" size={56} color="#FFFFFF" stroke={2.5} />
          </Pressable>

          <Text style={{ fontSize: 17, fontWeight: '800', color: strobe ? '#FF3B30' : '#FFFFFF', marginTop: 16, letterSpacing: 0.5 }}>
            {strobe ? 'BEACON SIGNAL ACTIVE' : 'TAP TO START BEACON'}
          </Text>

          <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 4, textAlign: 'center' }}>
            {strobe ? 'Flashing Red Edge Morse Code Signal (... --- ...)' : 'Flashes red edge signal for night rescuers'}
          </Text>
        </View>

        {/* GPS Coordinates HUD Section (Centered & High-Tech HUD) */}
        <View style={{ marginVertical: 20, alignItems: 'center', width: '100%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' }} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#FF3B30', letterSpacing: 1.5, textAlign: 'center', textTransform: 'uppercase' }}>
              GPS LOCATION ACQUIRED
            </Text>
          </View>

          {loading ? (
            <View style={{ width: '100%', alignItems: 'center', gap: 8, marginVertical: 10 }}>
              <Skeleton width="70%" height={26} />
              <Skeleton width="50%" height={16} />
            </View>
          ) : details ? (
            <View style={{ alignItems: 'center', width: '100%' }}>
              <Text style={{ fontFamily: 'monospace', color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', lineHeight: 34 }}>
                {details.lat >= 0 ? `${details.lat.toFixed(5)}° N` : `${Math.abs(details.lat).toFixed(5)}° S`}
              </Text>
              <Text style={{ fontFamily: 'monospace', color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', lineHeight: 34, marginTop: 2 }}>
                {details.lng >= 0 ? `${details.lng.toFixed(5)}° E` : `${Math.abs(details.lng).toFixed(5)}° W`}
              </Text>
              <Text
                style={{ fontSize: 13, color: c.accent, marginTop: 10, textAlign: 'center', fontWeight: '500' }}
                numberOfLines={1}
              >
                {details.googleMapsUrl}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 14, color: '#FF3B30', textAlign: 'center' }}>
              Could not fetch GPS location.
            </Text>
          )}
        </View>

        {/* Action Buttons Row */}
        <View style={{ gap: 12, marginVertical: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={handleSms}
              style={({ pressed }) => [
                {
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: c.accent, height: 50, borderRadius: 14, gap: 8,
                },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Glyph name="pencil" color="#FFFFFF" size={18} />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Send SMS SOS</Text>
            </Pressable>

            <Pressable
              onPress={handleCall}
              style={({ pressed }) => [
                {
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#FF3B30', height: 50, borderRadius: 14, gap: 8,
                },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Glyph name="sos" color="#FFFFFF" size={18} />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Call {emergencyPhone}</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [
              {
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#1C1C1E', height: 52, borderRadius: 14, gap: 10,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Glyph name="map" color="#FFFFFF" size={20} />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Share Location Link</Text>
          </Pressable>
        </View>

        {/* Minimalist Survival Instructions */}
        <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1C1C1E' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
            Trail Survival Checklist
          </Text>
          <Text style={{ color: '#8E8E93', fontSize: 12, lineHeight: 20, marginBottom: 4 }}>
            1. <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Stay Calm</Text>: Stop moving if lost or injured.
          </Text>
          <Text style={{ color: '#8E8E93', fontSize: 12, lineHeight: 20, marginBottom: 4 }}>
            2. <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Preserve Battery</Text>: Full black screen maximizes battery life.
          </Text>
          <Text style={{ color: '#8E8E93', fontSize: 12, lineHeight: 20 }}>
            3. <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Signal Rescuers</Text>: Flashes Morse Code SOS (... --- ...) to night search teams.
          </Text>
        </View>
      </View>
    </Screen>
  )
}
