import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Image, Text, View } from 'react-native'
import { Api } from '../../../lib/api'
import { TrackMap } from '../../../lib/TrackMap'
import { Prefs, fmt } from '../../../lib/store'
import { alpha, difficultyColor, useApp } from '../../../lib/theme'
import { fetchWeatherByCoords, fetchWeatherByLocationName, type WeatherData } from '../../../lib/weather'
import { getCurrentSosDetails, sendSosSms, callSosPhone } from '../../../lib/sos'
import { estimateHikeCalories } from '../../../lib/health'
import {
  Btn, Card, Cell, Confirm, Glyph, LargeTitle, Loading, NavBar, Screen, Section, Tag, useToast,
} from '../../../lib/ui'

export default function HikeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { c, s, t, lang } = useApp()
  const [hike, setHike] = useState<any | null>(null)
  const [obs, setObs] = useState<any[]>([])
  const [ask, setAsk] = useState(false)
  const [liveWeather, setLiveWeather] = useState<WeatherData | null>(null)
  const [sosBusy, setSosBusy] = useState(false)

  useFocusEffect(useCallback(() => {
    Promise.all([
      Api.getHike(Prefs.userId(), String(id)),
      Api.listObservationsByHike(Prefs.userId(), String(id)),
    ]).then(([{ data: h }, { data: o }]) => {
      setHike(h)
      setObs(o || [])
      if (h) {
        if (h.location_lat && h.location_lng) {
          fetchWeatherByCoords(h.location_lat, h.location_lng, lang).then(setLiveWeather)
        } else if (h.location) {
          fetchWeatherByLocationName(h.location, lang).then(setLiveWeather)
        }
      }
    })
  }, [id, lang]))

  if (!hike) return <Loading />

  const toggleFav = async () => {
    const next = { ...hike, favourite: hike.favourite ? 0 : 1 }
    setHike(next)
    await Api.saveHike(Prefs.userId(), next)
  }

  return (
    <Screen noTabs>
      <NavBar action={{ label: hike.favourite ? '★' : '☆', onPress: toggleFav }} />
      <LargeTitle sub={`${hike.location} · ${fmt.date(hike.hike_date)}`}>{hike.name}</LargeTitle>

      {/* Status & Details Pills */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 14 }}>
        <Tag color={difficultyColor(c, hike.difficulty)}>{hike.difficulty}</Tag>
        <Tag color={c.label3}>{fmt.km(hike.length_km)}</Tag>
        <Tag color={hike.status === 'Completed' ? c.catHikes : c.label3}>
          {hike.status === 'Completed' ? t.completed : t.planned}
        </Tag>
      </View>

      {/* Cover Photo or Interactive Map */}
      {!!hike.photo_uri && (
        <View style={{ marginBottom: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.sep }}>
          <Image source={{ uri: hike.photo_uri }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
        </View>
      )}

      {/* Live Trail Weather Card */}
      {!!liveWeather && (
        <Card style={{ padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 42, height: 42, borderRadius: 21, backgroundColor: alpha(c.catSearch, 0.16),
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Glyph name={liveWeather.icon || 'sun'} color={c.catSearch} size={22} />
            </View>
            <View>
              <Text style={[s.headline, { fontSize: 15, fontWeight: '800', color: c.label }]}>{liveWeather.tempC}°C · {liveWeather.description}</Text>
              <Text style={[s.caption, { fontSize: 12, color: c.label2, marginTop: 2 }]}>Wind: {liveWeather.windKmH} km/h {liveWeather.cityName ? `· ${liveWeather.cityName}` : ''}</Text>
            </View>
          </View>
          <Tag color={c.catSearch}>{t.liveWeather}</Tag>
        </Card>
      )}

      {/* Trail Information Matrix */}
      <Card style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 14 }}>
        <Cell icon={<Glyph name="fire" />} tint={c.diffModerate} title={t.estEnergy} value={t.estCalories(estimateHikeCalories(hike.length_km, hike.difficulty, Prefs.get('weight_kg', 70), hike.duration_hours))} chevron={false} />
        <Cell icon={<Glyph name="clock" />} tint={c.catNotes} title={t.duration} value={hike.duration_hours ? `${hike.duration_hours} h` : t.dash} chevron={false} />
        <Cell icon={<Glyph name="parking" />} tint={c.catSearch} title={t.parking} value={hike.parking ? t.yes : t.no} chevron={false} />
        <Cell icon={<Glyph name="cloud" />} tint={c.label2} title={t.weather} value={hike.weather || t.dash} chevron={false} />
        <Cell icon={<Glyph name="money" />} tint={c.catStats} title={t.budget} value={hike.budget ? `£${hike.budget}` : t.dash} chevron={false} />
        <Cell icon={<Glyph name="alert" />} tint={c.danger} title={t.emergency} value={hike.emergency_contact || t.dash} chevron={false} last />
      </Card>

      {/* Emergency SOS Trigger Button */}
      <View style={{ marginBottom: 14 }}>
        <Btn
          variant="secondary"
          disabled={sosBusy}
          style={{ backgroundColor: alpha('#FF3B30', 0.12), borderColor: '#FF3B30', borderWidth: 1 }}
          onPress={async () => {
            setSosBusy(true)
            const targetPhone = hike.emergency_contact || '999'
            const sos = await getCurrentSosDetails(targetPhone)
            setSosBusy(false)
            if (sos) {
              await sendSosSms(targetPhone, sos.message)
            } else {
              await callSosPhone(targetPhone)
            }
          }}
        >
          {sosBusy ? t.locatingSosGps : t.trailSafetySos}
        </Btn>
      </View>

      {/* Description Section */}
      {!!hike.description && (
        <Section title={t.description}>
          <Card style={{ padding: 16, borderRadius: 18 }}>
            <Text style={[s.body, { color: c.label, lineHeight: 22 }]}>{hike.description}</Text>
          </Card>
        </Section>
      )}

      {/* Route Map Section */}
      {!!hike.track && (
        <Section title={t.routeWalked}>
          <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.sep }}>
            <TrackMap track={hike.track} height={220} />
          </View>
        </Section>
      )}

      {/* Field Notes Section */}
      <Section title={t.fieldNotesCount(obs.length)}>
        <Card style={{ borderRadius: 20, overflow: 'hidden' }}>
          {obs.map((o) => (
            <Cell
              key={o.id} icon={<Glyph name="pencil" />} tint={c.catNotes} title={o.observation}
              value={o.obs_time?.slice(11)} onPress={() => router.push(`/notes/${o.id}`)}
            />
          ))}
          <Cell icon={<Glyph name="plus" />} tint={c.catHikes} title={t.addNote} last
            onPress={() => router.push(`/notes/new?hike=${hike.id}`)} />
        </Card>
      </Section>

      {/* Action Buttons */}
      <View style={{ height: 16 }} />
      <Btn style={{ backgroundColor: c.catHikes }} onPress={() => router.push(`/hikes/${hike.id}/track`)}>
        {hike.track ? t.viewTrack : t.trackJourney}
      </Btn>
      {!!hike.track && (
        <Text style={[s.caption, { textAlign: 'center', marginTop: 8, color: c.label2 }]}>
          {t.trackedKm((Number(hike.length_km) || 0).toFixed(2))}
        </Text>
      )}
      <View style={{ height: 10 }} />
      <Btn variant="secondary" onPress={() => router.push(`/hikes/${hike.id}/edit`)}>{t.edit}</Btn>
      <View style={{ height: 10 }} />
      <Btn variant="danger" onPress={() => setAsk(true)}>{t.deleteHike}</Btn>

      <Confirm
        open={ask} message={t.confirmDeleteHike}
        onCancel={() => setAsk(false)}
        onConfirm={async () => {
          await Api.deleteHike(Prefs.userId(), hike.id)
          toast(t.hikeDeleted(hike.name))
          router.replace('/hikes')
        }}
      />
    </Screen>
  )
}
