import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Api } from '../../lib/api'
import { Prefs } from '../../lib/store'
import { useApp } from '../../lib/theme'
import { Avatar, Btn, Card, Field, Input, NavBar, Screen, Segmented, useToast } from '../../lib/ui'

export default function EditProfile() {
  const router = useRouter()
  const toast = useToast()
  const { s, t } = useApp()
  const params = useLocalSearchParams()
  const required = params.required === '1'
  const p = Prefs.all()

  const [f, setF] = useState({
    name: p.name || '', email: p.email || '', gender: p.gender || null,
    height_cm: p.height_cm ? String(p.height_cm) : '',
    weight_kg: p.weight_kg ? String(p.weight_kg) : '',
    age: p.age ? String(p.age) : '',
    avatar_path: p.avatar_path || '',
  })
  const [errs, setErrs] = useState<Record<string, string>>({})
  const set = (k: string) => (v: string) => setF({ ...f, [k]: v })

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!res.canceled && res.assets[0]?.uri) {
      setF((prev) => ({ ...prev, avatar_path: res.assets[0].uri }))
    }
  }

  async function save() {
    if (required) {
      const e: Record<string, string> = {}
      if (!f.name.trim()) e.name = t.required
      if (!(Number(f.height_cm) > 0)) e.height_cm = t.required
      if (!(Number(f.weight_kg) > 0)) e.weight_kg = t.required
      if (!(Number(f.age) > 0)) e.age = t.required
      if (!f.gender) e.gender = t.errPickGender
      setErrs(e)
      if (Object.keys(e).length) return
    }
    const profile = {
      name: f.name.trim(), email: f.email.trim(), gender: f.gender,
      height_cm: Number(f.height_cm) || 0, weight_kg: Number(f.weight_kg) || 0, age: Number(f.age) || 0,
      avatar_path: f.avatar_path || null,
    }
    await Prefs.applyProfile(profile)
    Api.saveProfile(Prefs.userId(), profile)   // Synchronizes profile changes with cloud database
    toast(t.profileSaved)
    if (required) router.replace('/home')
    else router.back()
  }

  return (
    <Screen noTabs>
      <NavBar title={required ? t.completeProfile : t.editProfile} back={!required} />

      <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 20 }}>
        <Pressable onPress={pickAvatar} style={{ alignItems: 'center', gap: 6 }}>
          <Avatar initials={Prefs.initials()} uri={f.avatar_path} size={88} />
          <Text style={[s.footnote, { fontWeight: '600' }]}>{t.changePhoto || 'Change Photo'}</Text>
        </Pressable>
      </View>

      <Card style={{ padding: 14 }}>
        <Field label={required ? t.fNameReq : t.fNameOpt} error={errs.name}>
          <Input value={f.name} onChangeText={set('name')} placeholder={t.fDisplayName} />
        </Field>
        <Field label={t.fEmail}>
          <Input value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
        </Field>
        <Field label={t.fGender} error={errs.gender}>
          <Segmented options={t.genderOptions} value={f.gender} onChange={(v) => setF({ ...f, gender: v })} />
        </Field>
        <View style={s.row2}>
          <Field label={t.fHeight} error={errs.height_cm} style={{ flex: 1 }}>
            <Input value={f.height_cm} onChangeText={set('height_cm')} keyboardType="number-pad" />
          </Field>
          <Field label={t.fWeight} error={errs.weight_kg} style={{ flex: 1 }}>
            <Input value={f.weight_kg} onChangeText={set('weight_kg')} keyboardType="number-pad" />
          </Field>
          <Field label={t.fAge} error={errs.age} style={{ flex: 1 }}>
            <Input value={f.age} onChangeText={set('age')} keyboardType="number-pad" />
          </Field>
        </View>
      </Card>

      <View style={{ height: 18 }} />
      <Btn onPress={save}>{t.save}</Btn>
    </Screen>
  )
}
