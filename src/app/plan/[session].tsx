import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { Api } from '../../lib/api'
import { TrackMap } from '../../lib/TrackMap'
import { estimateSessionCalories, restBreaks, waterLitres } from '../../lib/health'
import { fmt, Prefs } from '../../lib/store'
import { alpha, useApp } from '../../lib/theme'
import { clock, minsToNextRest, phaseOf, progressPct, type Phase } from '../../lib/track'
import { useJourney } from '../../lib/useJourney'
import { fetchWeatherByCoords, type WeatherData } from '../../lib/weather'
import { Btn, Card, Confirm, Field, Glyph, Input, LargeTitle, Loading, NavBar, Screen, Section, useToast } from '../../lib/ui'

// Active workout tracking and souvenir photo journal screen
export default function SessionJourney() {
  const { session: sessionId } = useLocalSearchParams<{ session: string }>()
  const router = useRouter()
  const toast = useToast()
  const { c, s, t, lang } = useApp()

  const [row, setRow] = useState<any | null>(null)
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [askFinish, setAskFinish] = useState(false)
  const [askRedo, setAskRedo] = useState(false)
  const [weather, setWeather] = useState<WeatherData | null>(null)

  const target = Number(row?.target_minutes) || 0
  const j = useJourney(target)

  useEffect(() => {
    Api.getSession(String(sessionId)).then(({ data }) => {
      setRow(data)
      if (data?.note) {
        try {
          const parsed = JSON.parse(data.note)
          if (parsed && typeof parsed === 'object') {
            setNote(parsed.text || '')
            setPhotos(Array.isArray(parsed.photos) ? parsed.photos : [])
          } else {
            setNote(String(data.note))
          }
        } catch {
          setNote(String(data.note))
        }
      }
      if (data && !data.done && data.started_at) j.resumeFrom(Number(data.started_at))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    const lat = j.points[j.points.length - 1]?.lat || 21.0285
    const lng = j.points[j.points.length - 1]?.lng || 105.8542
    fetchWeatherByCoords(lat, lng, lang).then(setWeather).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [j.points.length, lang])

  const elevationGain = useMemo(() => {
    if (j.points.length < 2) return 0
    let gain = 0
    for (let i = 1; i < j.points.length; i++) {
      const diff = (j.points[i].alt || 0) - (j.points[i - 1].alt || 0)
      if (diff > 0) gain += diff
    }
    return Math.round(gain)
  }, [j.points])

  if (!row) return <Loading />

  const phase: Phase = phaseOf(j.elapsedMin, target)
  const pct = progressPct(j.elapsedMin, target)
  const toRest = minsToNextRest(j.elapsedMin)

  const PHASE_TEXT: Record<Phase, string> = {
    warmup: t.phaseWarmup, steady: t.phaseSteady, halfway: t.phaseHalfway,
    final: t.phaseFinal, done: t.phaseDone, over: t.phaseOver,
  }
  const phaseColor = phase === 'done' || phase === 'over' ? c.catHikes : c.catNotes



  const addPhotoFromLibrary = async () => {
    if (photos.length >= 3) {
      toast(t.max3Photos)
      return
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      toast(t.libraryPermReq)
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    })
    if (!res.canceled && res.assets[0]?.uri) {
      setPhotos((prev) => [...prev, res.assets[0].uri].slice(0, 3))
    }
  }

  const addPhotoFromCamera = async () => {
    if (photos.length >= 3) {
      toast(t.max3Photos)
      return
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      toast(t.cameraPermReq)
      return
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    })
    if (!res.canceled && res.assets[0]?.uri) {
      setPhotos((prev) => [...prev, res.assets[0].uri].slice(0, 3))
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function finish() {
    setAskFinish(false)
    j.pause()
    const endedAt = Date.now()

    const notePayload = JSON.stringify({
      text: note.trim(),
      photos: photos.slice(0, 3),
    })

    const { error } = await Api.logSession(Prefs.userId(), String(sessionId), {
      startedAt: j.startedAt ?? endedAt,
      endedAt,
      actualMinutes: Math.round(j.elapsedMin * 10) / 10,
      distanceKm: Math.round(j.km * 100) / 100,
      track: JSON.stringify(j.points),
      note: notePayload,
    })
    toast(error ? t.saveFailed(error) : t.sessionLogged)
    router.replace('/plan')
  }

  if (row.done && !j.running && !j.startedAt) {
    const actualMin = Math.round(Number(row.actual_minutes) || 0)
    const distKm = (Number(row.distance_km) || 0).toFixed(2)
    const calories = estimateSessionCalories(actualMin, Prefs.get('weight_kg', 70))
    const startTimeStr = row.started_at ? new Date(Number(row.started_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
    const endTimeStr = row.ended_at ? new Date(Number(row.ended_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null

    return (
      <Screen noTabs>
        <NavBar title={t.hikeRecap} />
        <LargeTitle sub={fmt.date(row.date)}>{t.weekN(row.week)}</LargeTitle>

        {/* Master Artistic Completed Hike Souvenir Card */}
        <Card style={{
          padding: 20, borderRadius: 24, marginBottom: 16,
          backgroundColor: c.card,
          borderWidth: 1.5, borderColor: alpha(c.catHikes, 0.4),
          shadowColor: c.catHikes, shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
        }}>
          {/* Header Pill & Time Stamp */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: alpha(c.catHikes, 0.12), paddingVertical: 5, paddingHorizontal: 12, borderRadius: 14,
            }}>
              <Glyph name="check" size={14} color={c.catHikes} stroke={3} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: c.catHikes, letterSpacing: 0.6 }}>
                {t.completedHikeLabel}
              </Text>
            </View>

            {!!startTimeStr && !!endTimeStr && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.label2 }}>
                {startTimeStr} → {endTimeStr}
              </Text>
            )}
          </View>

          {/* Artistic Big Metrics Row */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
            backgroundColor: alpha(c.fill2, 0.7), paddingVertical: 14, borderRadius: 18,
            marginBottom: 16, borderWidth: 1, borderColor: c.sep,
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: c.label }}>{actualMin}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.label2, marginTop: 2 }}>{t.minShort.toUpperCase()}</Text>
            </View>

            <View style={{ width: 1, height: 28, backgroundColor: c.sep }} />

            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: c.catHikes }}>{distKm}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.label2, marginTop: 2 }}>KM</Text>
            </View>

            <View style={{ width: 1, height: 28, backgroundColor: c.sep }} />

            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#FF9500' }}>{calories}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.label2, marginTop: 2 }}>KCAL</Text>
            </View>
          </View>

          {/* Artistic Souvenir Photo Gallery Grid */}
          {photos.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Glyph name="camera" size={14} color={c.catHikes} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: c.catHikes, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {t.souvenirPhotos}
                </Text>
              </View>

              {photos.length === 1 && (
                <View style={{ height: 180, borderRadius: 18, overflow: 'hidden', backgroundColor: c.fill2 }}>
                  <Image source={{ uri: photos[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              )}

              {photos.length === 2 && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, height: 130, borderRadius: 16, overflow: 'hidden', backgroundColor: c.fill2 }}>
                    <Image source={{ uri: photos[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                  <View style={{ flex: 1, height: 130, borderRadius: 16, overflow: 'hidden', backgroundColor: c.fill2 }}>
                    <Image source={{ uri: photos[1] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                </View>
              )}

              {photos.length === 3 && (
                <View style={{ flexDirection: 'row', gap: 10, height: 170 }}>
                  <View style={{ flex: 1.2, borderRadius: 16, overflow: 'hidden', backgroundColor: c.fill2 }}>
                    <Image source={{ uri: photos[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                  <View style={{ flex: 1, gap: 10 }}>
                    <View style={{ flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: c.fill2 }}>
                      <Image source={{ uri: photos[1] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                    <View style={{ flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: c.fill2 }}>
                      <Image source={{ uri: photos[2] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Artistic Trail Field Journal Quote */}
          {!!note && (
            <View style={{
              backgroundColor: alpha(c.catNotes, 0.08), padding: 14, borderRadius: 16,
              borderLeftWidth: 4, borderLeftColor: c.catNotes,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Glyph name="note" size={14} color={c.catNotes} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: c.catNotes, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {t.trailJournal}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontStyle: 'italic', color: c.label, lineHeight: 20 }}>
                {`“${note}”`}
              </Text>
            </View>
          )}
        </Card>

        {/* Artistic Interactive Route Map */}
        {!!row.track && (
          <Section title={t.routeWalked}>
            <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.sep }}>
              <TrackMap track={row.track} height={220} />
            </View>
          </Section>
        )}

        <View style={{ height: 16 }} />
        <Btn variant="secondary" onPress={() => setAskRedo(true)}>{t.walkAgain}</Btn>

        <Confirm
          open={askRedo} message={t.confirmRedo} confirmLabel={t.walkAgain} danger={false}
          onCancel={() => setAskRedo(false)}
          onConfirm={async () => {
            setAskRedo(false)
            await Api.clearSession(Prefs.userId(), String(sessionId))
            const { data } = await Api.getSession(String(sessionId))
            setRow(data)
            j.reset()
            setNote('')
            setPhotos([])
            toast(t.sessionCleared)
          }}
        />
      </Screen>
    )
  }

  return (
    <Screen noTabs>
      <NavBar title={t.sessionJourney} />
      <LargeTitle sub={`${fmt.date(row.date)} · ${t.targetMinutes(Math.round(target))}`}>
        {t.weekN(row.week)}
      </LargeTitle>

      {/* Interactive Live Navigation Map (AllTrails & Outdooractive Style) */}
      <View style={{ marginBottom: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.sep }}>
        <TrackMap track={j.points} height={240} isLive />

        {/* Live Weather Overlay Badge */}
        {weather && (
          <View style={{
            position: 'absolute', top: 10, right: 10,
            backgroundColor: 'rgba(0,0,0,0.75)', paddingVertical: 5, paddingHorizontal: 10,
            borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6,
          }}>
            <Glyph name={weather.icon || 'sun'} color="#FFCC00" size={14} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
              {weather.tempC}°C · {weather.description}
            </Text>
          </View>
        )}

        {/* Live Elevation & GPS Tracking Overlay Badge */}
        <View style={{
          position: 'absolute', top: 10, left: 10,
          backgroundColor: 'rgba(0,0,0,0.75)', paddingVertical: 5, paddingHorizontal: 10,
          borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6,
        }}>
          <Glyph name="mountain" color="#34C759" size={14} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
            {t.elevGain(elevationGain)}
          </Text>
        </View>
      </View>

      <Card hero style={{ alignItems: 'center', gap: 4 }}>
        <Text style={[s.statValue, { fontSize: 52 }]}>{clock(j.elapsedMs)}</Text>
        <Text style={s.footnote}>{t.elapsed}</Text>

        <View style={{ height: 8, borderRadius: 4, backgroundColor: c.fill2, alignSelf: 'stretch', overflow: 'hidden', marginTop: 14 }}>
          <View style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: phaseColor }} />
        </View>
        <Text style={[s.headline, { color: phaseColor, marginTop: 10, textAlign: 'center' }]}>
          {PHASE_TEXT[phase]}
        </Text>

        <View style={{ flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.statValue}>{j.km.toFixed(2)}</Text>
            <Text style={s.footnote}>km</Text>
          </View>
          <View style={{ width: 1, backgroundColor: c.sep }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.statValue}>{j.pace.toFixed(1)}</Text>
            <Text style={s.footnote}>km/h</Text>
          </View>
          <View style={{ width: 1, backgroundColor: c.sep }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.statValue}>{pct}%</Text>
            <Text style={s.footnote}>{t.ofTarget}</Text>
          </View>
        </View>
      </Card>

      {row.date !== fmt.today() && !j.startedAt && !j.running && (
        <Text style={[s.footnote, { color: c.diffModerate, marginBottom: 10, marginHorizontal: 4, textAlign: 'center' }]}>
          {t.startOnlyOnDate(fmt.date(row.date))}
        </Text>
      )}

      <View style={{ height: 4 }} />

      {!j.running ? (
        <Btn disabled={row.date !== fmt.today() && !j.startedAt} onPress={j.start}>
          {j.startedAt ? t.resume : t.startSession}
        </Btn>
      ) : (
        <>
          <Btn variant="secondary" onPress={j.pause}>{t.pause}</Btn>
          <View style={{ height: 10 }} />
          <Btn variant="danger" onPress={() => setAskFinish(true)}>{t.finishSession}</Btn>
        </>
      )}

      {!!j.stopped && (
        <Text style={[s.footnote, { color: c.diffModerate, marginTop: 12, marginHorizontal: 4, lineHeight: 19 }]}>
          {j.stopped === 'idle' ? t.autoStoppedIdle : t.autoStoppedCap}
        </Text>
      )}
      {j.denied && <Text style={[s.footnote, { color: c.diffModerate, marginTop: 12, marginHorizontal: 4 }]}>{t.locationDeniedSoft}</Text>}

      {j.running && (
        <Section title={t.alongTheWay}>
          <Card style={{ padding: 14, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Glyph name="clock" size={18} color={c.catSearch} />
              <Text style={[s.footnote, { flex: 1 }]}>
                {toRest === 0 ? t.restNow : t.restIn(toRest)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Glyph name="cloud" size={18} color={c.catSearch} />
              <Text style={[s.footnote, { flex: 1 }]}>{t.drinkHint(waterLitres(j.elapsedMin / 60))}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Glyph name="check" size={18} color={c.catHikes} />
              <Text style={[s.footnote, { flex: 1 }]}>{t.restHint(restBreaks(j.elapsedMin / 60))}</Text>
            </View>
          </Card>
        </Section>
      )}

      {!!j.startedAt && (
        <Section title={t.journeyMemories}>
          <Card style={{ padding: 14, gap: 12 }}>
            <Field label={t.trailJournal}>
              <Input
                multiline
                numberOfLines={2}
                value={note}
                onChangeText={setNote}
                placeholder={t.journalPlaceholder}
                style={{ minHeight: 62 }}
              />
            </Field>

            {/* Souvenir Photo Upload Gallery (Max 3) */}
            <View style={{ marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[s.footnote, { color: c.label2, fontWeight: '600' }]}>
                  {t.souvenirPhotos}
                </Text>
                <Text style={[s.footnote, { color: c.catHikes, fontWeight: '700' }]}>
                  {photos.length}/3
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {photos.map((uri, idx) => (
                  <View key={uri + idx} style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: c.fill2, borderWidth: 1, borderColor: c.sep }}>
                    <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                    <Pressable
                      onPress={() => removePhoto(idx)}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Glyph name="x" size={12} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}

                {photos.length < 3 && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={addPhotoFromCamera}
                      style={{
                        width: 80, height: 80, borderRadius: 12,
                        borderWidth: 1.5, borderColor: c.catNotes, borderStyle: 'dashed',
                        alignItems: 'center', justifyContent: 'center', gap: 4,
                        backgroundColor: alpha(c.catNotes, 0.08),
                      }}
                    >
                      <Glyph name="camera" size={20} color={c.catNotes} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: c.catNotes }}>{t.camera}</Text>
                    </Pressable>

                    <Pressable
                      onPress={addPhotoFromLibrary}
                      style={{
                        width: 80, height: 80, borderRadius: 12,
                        borderWidth: 1.5, borderColor: c.catHikes, borderStyle: 'dashed',
                        alignItems: 'center', justifyContent: 'center', gap: 4,
                        backgroundColor: alpha(c.catHikes, 0.08),
                      }}
                    >
                      <Glyph name="plus" size={20} color={c.catHikes} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: c.catHikes }}>{t.library}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </Card>
        </Section>
      )}

      <Confirm
        open={askFinish} danger={false}
        message={t.confirmFinishSession(Math.round(j.elapsedMin), j.km.toFixed(2))}
        confirmLabel={t.finishSession}
        onCancel={() => setAskFinish(false)} onConfirm={finish}
      />
    </Screen>
  )
}
