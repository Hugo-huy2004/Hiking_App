import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Api } from './api'
import {
  CONDITIONS, DIFFICULTIES, KIT, MOODS, PRIORITIES, Prefs, VEGETATION, VISIBILITIES, WILDLIFE, fmt,
} from './store'
import { useApp } from './theme'
import {
  Btn, Card, Chips, DateField, Field, Input, Loading, LocateButton, NavBar, PhotoField, Picker, Screen, Section, Segmented, useToast,
} from './ui'

/* Reusable Hike & Observation input forms with validation. */

const EMPTY_HIKE: Record<string, any> = {
  name: '', location: '', hike_date: fmt.today(), parking: null, length_km: '', difficulty: null,
  description: '', start_time: '', duration_hours: '', trail_type: '', weather: '', budget: '',
  equipment: '', emergency_contact: '', tags: '', priority: '', visibility: 'Private',
  favourite: 0, status: 'Planned', photo_uri: null, location_lat: null, location_lng: null,
}

export function HikeForm({ id }: { id?: string }) {
  const router = useRouter()
  const { s, t } = useApp()
  const editing = !!id
  // Preserves previous form input state on return
  const [f, setF] = useState<Record<string, any> | null>(() => (editing ? null : Prefs.getDraft() || EMPTY_HIKE))
  const [errs, setErrs] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!editing) return
    Api.getHike(Prefs.userId(), id!).then(({ data }) => setF(data ? { ...EMPTY_HIKE, ...data } : EMPTY_HIKE))
  }, [id, editing])

  if (!f) return <Loading />
  const set = (k: string, v: any) => setF({ ...f, [k]: v })

  async function review() {
    const e: Record<string, string> = {}
    if (!String(f!.name).trim()) e.name = t.required
    if (!String(f!.location).trim()) e.location = t.required
    if (!f!.hike_date) e.hike_date = t.required
    if (f!.length_km === '' || isNaN(Number(f!.length_km)) || Number(f!.length_km) <= 0) e.length_km = f!.length_km === '' ? t.required : t.errNumber
    if (!f!.difficulty) e.difficulty = t.errPickDifficulty
    if (f!.parking !== 0 && f!.parking !== 1) e.parking = t.errPickParking
    setErrs(e)
    if (Object.keys(e).length) return
    await Prefs.setDraft(f!)
    router.push('/hikes/confirm')
  }

  const kit: string[] = f.equipment ? String(f.equipment).split(',').filter(Boolean) : []

  return (
    <Screen noTabs>
      <NavBar title={editing ? t.editHike : t.newHike} />
      <Text style={[s.secondary, { marginHorizontal: 4, marginBottom: 14 }]}>
        {editing ? t.editing : t.step1}
      </Text>

      <Section title={t.secMain}>
        <Card style={{ padding: 14 }}>
          <Field label={t.fHikeName} error={errs.name}>
            <Input value={f.name} onChangeText={(v) => set('name', v)} />
          </Field>
          <Field label={t.fLocation} error={errs.location}>
            <Input value={f.location} onChangeText={(v) => set('location', v)} />
          </Field>
          <Field>
            <LocateButton onLocated={({ lat, lng, label }) => setF({
              ...f!, location_lat: lat, location_lng: lng, location: label || f!.location,
            })} />
            {!!f.location_lat && (
              <Text style={[s.footnote, { marginTop: 6, marginHorizontal: 4 }]}>
                {t.pinned(f.location_lat, f.location_lng)}
              </Text>
            )}
          </Field>
          <View style={s.row2}>
            <Field label={t.fDate} error={errs.hike_date} style={{ flex: 1 }}>
              <DateField value={f.hike_date} onChange={(v) => set('hike_date', v)} />
            </Field>
            <Field label={t.fStartTime} style={{ flex: 1 }}>
              <DateField mode="time" value={f.start_time} onChange={(v) => set('start_time', v)} />
            </Field>
          </View>
          <Field label={t.fDifficulty} error={errs.difficulty}>
            <Segmented options={DIFFICULTIES} value={f.difficulty} onChange={(v) => set('difficulty', v)} />
          </Field>
        </Card>
      </Section>

      <Section title={t.secRoute}>
        <Card style={{ padding: 14 }}>
          <View style={s.row2}>
            <Field label={t.fLength} error={errs.length_km} style={{ flex: 1 }}>
              <Input value={String(f.length_km)} onChangeText={(v) => set('length_km', v)} keyboardType="decimal-pad" />
            </Field>
            <Field label={t.fDuration} style={{ flex: 1 }}>
              <Input value={String(f.duration_hours)} onChangeText={(v) => set('duration_hours', v)} keyboardType="decimal-pad" />
            </Field>
          </View>
          <Field label={t.fTrailType}>
            <Input value={f.trail_type} onChangeText={(v) => set('trail_type', v)} />
          </Field>
          <Field label={t.fParking} error={errs.parking}>
            <Segmented
              options={[{ value: 1, label: t.yes }, { value: 0, label: t.no }]}
              value={f.parking} onChange={(v) => set('parking', v)}
            />
          </Field>
        </Card>
      </Section>

      <Section title={t.secConditions}>
        <Card style={{ padding: 14 }}>
          <Field label={t.fWeather}><Input value={f.weather} onChangeText={(v) => set('weather', v)} /></Field>
          <Field label={t.fBudget}>
            <Input value={String(f.budget)} onChangeText={(v) => set('budget', v)} keyboardType="decimal-pad" />
          </Field>
        </Card>
      </Section>

      <Section title={t.secKit}>
        <Card style={{ padding: 14 }}>
          <Field label={t.fKitList}>
            <Chips
              options={t.kitOptions || KIT} multi value={kit}
              onChange={(v: string[]) => set('equipment', v.join(','))}
            />
          </Field>
          <Field label={t.fEmergency}>
            <Input value={f.emergency_contact} onChangeText={(v) => set('emergency_contact', v)} />
          </Field>
        </Card>
      </Section>

      <Section title={t.secExtra}>
        <Card style={{ padding: 14 }}>
          <Field label={t.fTags}><Input value={f.tags} onChangeText={(v) => set('tags', v)} /></Field>
          <Field label={t.fPriority}><Segmented options={PRIORITIES} value={f.priority} onChange={(v) => set('priority', v)} /></Field>
          <Field label={t.fVisibility}><Segmented options={VISIBILITIES} value={f.visibility} onChange={(v) => set('visibility', v)} /></Field>
          <Field label={t.fDescription}>
            <Input multiline numberOfLines={3} value={f.description} onChangeText={(v) => set('description', v)} style={{ minHeight: 80 }} />
          </Field>
          <Field label={t.fPhoto}>
            <PhotoField value={f.photo_uri} onChange={(uri) => set('photo_uri', uri)} />
          </Field>
        </Card>
      </Section>

      <View style={{ height: 20 }} />
      <Btn onPress={review}>{editing ? t.reviewChanges : t.review}</Btn>
      <View style={{ height: 10 }} />
      <Btn variant="secondary" onPress={() => router.back()}>{t.cancel}</Btn>
    </Screen>
  )
}

// Add or edit hike field observation notes form component
export function ObservationForm({ id, hike }: { id?: string; hike?: string }) {
  const router = useRouter()
  const toast = useToast()
  const { t } = useApp()
  const editing = !!id
  const [hikes, setHikes] = useState<any[]>([])
  const [f, setF] = useState<Record<string, any> | null>(() => (editing ? null : {
    hike_id: hike || '', observation: '', obs_time: fmt.now(), detail: '',
    trail_condition: null, wildlife: '', vegetation: '', mood: null, rating: '', comments: '', photo_uri: null,
  }))
  const [errs, setErrs] = useState<Record<string, string>>({})

  useEffect(() => {
    Api.listHikes(Prefs.userId()).then(({ data }) => setHikes(data || []))
    if (!editing) return
    Api.listObservations(Prefs.userId()).then(({ data }) => {
      setF((data || []).find((o: any) => String(o.id) === String(id)) || null)
    })
  }, [id, editing])

  if (!f) return <Loading />
  const set = (k: string, v: any) => setF({ ...f, [k]: v })
  const csv = (k: string): string[] => (f[k] ? String(f[k]).split(',').filter(Boolean) : [])

  async function save() {
    const e: Record<string, string> = {}
    if (!String(f!.observation).trim()) e.observation = t.required
    if (!f!.obs_time) e.obs_time = t.required
    if (!f!.hike_id) e.hike_id = t.errPickHike
    setErrs(e)
    if (Object.keys(e).length) return

    const { error } = await Api.saveObservation(Prefs.userId(), {
      ...f!, hike_id: Number(f!.hike_id), rating: f!.rating ? Number(f!.rating) : null,
    })
    toast(error ? t.saveFailed(error) : editing ? t.noteUpdated : t.noteSaved)
    router.back()
  }

  return (
    <Screen noTabs>
      <NavBar title={editing ? t.editNote : t.newNote} />
      <Card style={{ padding: 14 }}>
        <Field label={t.fBelongsTo} error={errs.hike_id}>
          <Picker
            value={f.hike_id} placeholder={t.pickOne}
            options={hikes.map((h) => ({ value: h.id, label: h.name }))}
            onChange={(v) => set('hike_id', v)}
          />
        </Field>
        <Field label={t.fNoteTitle} error={errs.observation}>
          <Input value={f.observation} onChangeText={(v) => set('observation', v)} placeholder={t.notePlaceholder} />
        </Field>
        <Field label={t.fWhen} error={errs.obs_time}>
          <DateField mode="datetime" value={f.obs_time} onChange={(v) => set('obs_time', v)} />
        </Field>
        <Field label={t.fDetail}>
          <Input multiline numberOfLines={3} value={f.detail} onChangeText={(v) => set('detail', v)} style={{ minHeight: 80 }} />
        </Field>
      </Card>

      <Section title={t.secNoteConditions}>
        <Card style={{ padding: 14 }}>
          <Field label={t.fTrailCondition}>
            <Segmented options={CONDITIONS} value={f.trail_condition} onChange={(v) => set('trail_condition', v)} />
          </Field>
          <Field label={t.fWildlife}>
            <Chips options={t.wildlifeOptions || WILDLIFE} multi value={csv('wildlife')} onChange={(v: string[]) => set('wildlife', v.join(','))} />
          </Field>
          <Field label={t.fVegetation}>
            <Chips options={t.vegetationOptions || VEGETATION} multi value={csv('vegetation')} onChange={(v: string[]) => set('vegetation', v.join(','))} />
          </Field>
          <Field label={t.fMood}>
            <Segmented options={MOODS} value={f.mood} onChange={(v) => set('mood', v)} />
          </Field>
          <Field label={t.fRating}>
            <Input value={String(f.rating)} onChangeText={(v) => set('rating', v)} keyboardType="decimal-pad" placeholder="4" />
          </Field>
        </Card>
      </Section>

      <Section title={t.secAnythingElse}>
        <Card style={{ padding: 14 }}>
          <Field>
            <Input multiline numberOfLines={2} value={f.comments} onChangeText={(v) => set('comments', v)} placeholder={t.optional} style={{ minHeight: 62 }} />
          </Field>
          <Field label={t.fPhoto}>
            <PhotoField value={f.photo_uri} onChange={(uri) => set('photo_uri', uri)} />
          </Field>
        </Card>
      </Section>

      <View style={{ height: 18 }} />
      <Btn onPress={save}>{t.saveNote}</Btn>
    </Screen>
  )
}
