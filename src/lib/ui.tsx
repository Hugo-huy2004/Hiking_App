import DateTimePicker from '@react-native-community/datetimepicker'
import { BlurView } from 'expo-blur'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, Animated, Image, Modal, Platform, Pressable, ScrollView, Text, TextInput, View,
  type DimensionValue, type StyleProp, type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'
import { localDate, localDateTime } from './date'
import type { Dict } from './i18n'
import { fmt } from './store'
import { R, difficultyColor, useApp } from './theme'

/* Shared UI components */

// ----------------------------------------------------------------- icons

const GLYPHS: Record<string, string> = {
  plus: 'M12 5v14M5 12h14',
  mountain: 'M3 19h18L14 6l-3.2 5.6L8.6 8z',
  pencil: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  calendar: 'M4 7h16v13H4zM4 11h16M8 3v4M16 3v4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  parking: 'M8 19V5h4.5a3.5 3.5 0 0 1 0 7H8',
  cloud: 'M7 18a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.5 1.6A3.5 3.5 0 0 1 17.5 18z',
  money: 'M15 5H11a3 3 0 0 0-3 3v11M6 12h7M6 19h11',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1.5-1.5-3-2.4.8a7 7 0 0 0-2-1.2L14.5 4h-3l-.6 2.6a7 7 0 0 0-2 1.2L6.5 7 5 10l2 1.5v1L5 14l1.5 3 2.4-.8a7 7 0 0 0 2 1.2L11.5 20h3l.6-2.6a7 7 0 0 0 2-1.2l2.4.8L21 14l-2-1.5z',
  database: 'M12 8c4.4 0 8-1.1 8-2.5S16.4 3 12 3 4 4.1 4 5.5 7.6 8 12 8zM4 5.5v13C4 20 7.6 21 12 21s8-1 8-2.5v-13',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
  fire: 'M12 2c0 3.5-2.5 5.5-4 7.5S6 13 6 15a6 6 0 0 0 12 0c0-3.5-3-6-4.5-8.5C13 7.5 12 4.5 12 2z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  check: 'M4 13l5 5L20 6',
  circle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm10 17-5.2-5.2',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  sun: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  sos: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01',
}

export function Glyph({ name, size = 18, stroke = 1.9, color = '#fff' }: {
  name: string; size?: number; stroke?: number; color?: string
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={GLYPHS[name] || GLYPHS.circle} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ---------------------------------------------------------------- chrome

export function Screen({ children, noTabs, floating, scroll = true, bg }: {
  children: React.ReactNode; noTabs?: boolean; floating?: React.ReactNode; scroll?: boolean; bg?: string
}) {
  const { s } = useApp()
  const insets = useSafeAreaInsets()
  const pad = { paddingTop: insets.top, maxWidth: 520, width: '100%', alignSelf: 'center' } as const
  return (
    <View style={[s.root, bg ? { backgroundColor: bg } : undefined]}>
      {scroll ? (
        <ScrollView contentContainerStyle={[noTabs ? s.screenNoTabs : s.screen, pad]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, noTabs ? s.screenNoTabs : s.screen, pad]}>{children}</View>
      )}
      {floating}
    </View>
  )
}

export function NavBar({ title, back = true, onBack, action, danger }: {
  title?: string; back?: boolean; onBack?: () => void
  action?: { label: string; onPress: () => void }; danger?: boolean
}) {
  const { c, s, t } = useApp()
  const router = useRouter()
  return (
    <View style={s.navbar}>
      {back && (
        <Pressable style={s.back} onPress={onBack || (() => router.back())}>
          <Text style={[s.backText, { fontSize: 26, marginRight: 2 }]}>‹</Text>
          <Text style={s.backText}>{t.back}</Text>
        </Pressable>
      )}
      <View style={{ flex: 1 }} />
      {!!title && <Text style={s.title}>{title}</Text>}
      <View style={{ flex: 1 }} />
      {action ? (
        <Pressable onPress={action.onPress}>
          <Text style={[s.navAction, danger && { color: c.danger }]}>{action.label}</Text>
        </Pressable>
      ) : back ? <View style={{ width: 64 }} /> : null}
    </View>
  )
}

export function LargeTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  const { s } = useApp()
  return (
    <>
      <Text style={s.largeTitle}>{children}</Text>
      {!!sub && <Text style={[s.secondary, { marginBottom: 8 }]}>{sub}</Text>}
    </>
  )
}

export function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  const { s } = useApp()
  return (
    <>
      {!!title && <Text style={s.sectionHeader}>{title}</Text>}
      {children}
    </>
  )
}

export function Card({ children, hero, style }: { children: React.ReactNode; hero?: boolean; style?: StyleProp<ViewStyle> }) {
  const { s } = useApp()
  return <View style={[hero ? s.cardHero : s.card, style]}>{children}</View>
}

export function Cell({ icon, tint, title, value, onPress, chevron, danger, last }: {
  icon?: React.ReactNode; tint?: string; title: React.ReactNode; value?: React.ReactNode
  onPress?: () => void; chevron?: boolean; danger?: boolean; last?: boolean
}) {
  const { c, s } = useApp()
  const showChevron = chevron ?? !!onPress
  const body = (
    <View style={s.cell}>
      {!!icon && (
        <View style={[s.iconTile, { backgroundColor: tint || c.accent }]}>
          {typeof icon === 'string' ? <Text style={{ color: '#fff', fontSize: 15 }}>{icon}</Text> : icon}
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string'
          ? <Text style={[s.body, danger && { color: c.danger }]}>{title}</Text>
          : title}
      </View>
      {value != null && (typeof value === 'string' || typeof value === 'number'
        ? <Text style={s.cellValue}>{value}</Text>
        : value)}
      {showChevron && <Text style={s.chevron}>›</Text>}
      {!last && <View style={s.sep} />}
    </View>
  )
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body
}

export function HikeCard({ hike, onPress, last }: { hike: any; onPress: () => void; last?: boolean }) {
  const { c, s, t } = useApp()
  const diff = difficultyColor(c, hike.difficulty)
  return (
    <Pressable onPress={onPress}>
      <View style={[s.cell, { alignItems: 'flex-start' }]}>
        <View style={[s.iconTile, { backgroundColor: diff }]}>
          <Glyph name="mountain" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headline}>{hike.name}{hike.favourite ? ' ★' : ''}</Text>
          <Text style={s.footnote}>{hike.location} · {fmt.date(hike.hike_date)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            <Tag color={diff}>{hike.difficulty}</Tag>
            <Tag color={c.label3}>{fmt.km(hike.length_km)}</Tag>
            {hike.status === 'Completed' && <Tag color={c.catHikes}>{t.completed}</Tag>}
          </View>
        </View>
        <Text style={s.chevron}>›</Text>
        {!last && <View style={s.sep} />}
      </View>
    </Pressable>
  )
}

// --------------------------------------------------------------- controls

export function Btn({ children, onPress, variant, disabled, style }: {
  children: React.ReactNode; onPress?: () => void
  variant?: 'secondary' | 'danger'; disabled?: boolean; style?: StyleProp<ViewStyle>
}) {
  const { s } = useApp()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        variant === 'secondary' && s.btnSecondary,
        variant === 'danger' && s.btnDanger,
        disabled && { opacity: 0.5 },
        pressed && !disabled && { transform: [{ scale: 0.96 }] },
        style,
      ]}
    >
      <Text style={[s.btnText, variant === 'secondary' && s.btnTextSecondary]}>{children}</Text>
    </Pressable>
  )
}

type Opt = string | { value: any; label: string }

export function Segmented({ options, value, onChange }: { options: Opt[]; value: any; onChange: (v: any) => void }) {
  const { s } = useApp()
  return (
    <View style={s.segmented}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value
        const label = typeof o === 'string' ? o : o.label
        const on = value === val
        return (
          <Pressable key={String(val)} onPress={() => onChange(val)} style={[s.segment, on && s.segmentOn]}>
            <Text style={[s.segmentText, on && s.segmentTextOn]} numberOfLines={1}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Field({ label, error, children, style }: {
  label?: string; error?: string; children: React.ReactNode; style?: StyleProp<ViewStyle>
}) {
  const { s } = useApp()
  return (
    <View style={[s.field, style]}>
      {!!label && <Text style={s.fieldLabel}>{label}</Text>}
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && error ? React.cloneElement(child as any, { invalid: true }) : child)}
      {!!error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  )
}

export function Input({ invalid, style, ...props }: React.ComponentProps<typeof TextInput> & { invalid?: boolean }) {
  const { c, s } = useApp()
  return (
    <TextInput
      placeholderTextColor={c.label3}
      {...props}
      style={[s.input, invalid && s.inputInvalid, props.multiline && { minHeight: 44, textAlignVertical: 'top' }, style]}
    />
  )
}

export function Chips({ options, value, onChange, multi }: {
  options: string[]; value: any; onChange: (v: any) => void; multi?: boolean
}) {
  const { s } = useApp()
  const selected: string[] = multi ? (value || []) : value ? [value] : []
  const toggle = (v: string) => {
    if (!multi) return onChange(value === v ? null : v)
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])
  }
  return (
    <View style={s.chips}>
      {options.map((o) => {
        const on = selected.includes(o)
        return (
          <Pressable key={o} onPress={() => toggle(o)} style={[s.chip, on && s.chipOn]}>
            <Text style={[s.chipText, on && s.chipTextOn]}>{o}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  const { c, s } = useApp()
  return (
    <View style={[s.tag, { backgroundColor: color || c.label2 }]}>
      <Text style={s.tagText}>{children}</Text>
    </View>
  )
}

export function Avatar({ initials, uri, size = 64, onPress, style }: {
  initials: string; uri?: string | null; size?: number; onPress?: () => void; style?: StyleProp<ViewStyle>
}) {
  const { s } = useApp()
  const box = [s.avatar, { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' as const }, style]
  const content = uri ? (
    <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
  ) : (
    <Text style={[s.avatarText, { fontSize: size * 0.34 }]}>{initials}</Text>
  )
  return onPress
    ? <Pressable onPress={onPress} style={box}>{content}</Pressable>
    : <View style={box}>{content}</View>
}

export function Fab({ onPress }: { onPress: () => void }) {
  const { c, s } = useApp()
  return (
    <Pressable onPress={onPress} style={s.fab}>
      <Glyph name="plus" size={28} stroke={2} color={c.catHikes} />
    </Pressable>
  )
}

// ------------------------------------------------------------------ data

export function Spinner() {
  const { c } = useApp()
  return <ActivityIndicator color={c.accent} style={{ marginVertical: 24 }} />
}

export function Skeleton({ width, height, borderRadius = 8, style }: {
  width?: DimensionValue; height?: number; borderRadius?: number; style?: StyleProp<ViewStyle>
}) {
  const { c } = useApp()
  const [opacity] = useState(() => new Animated.Value(0.3))

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 650, useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height: height ?? 18,
          borderRadius,
          backgroundColor: c.fill2,
          opacity,
        },
        style,
      ]}
    />
  )
}

export function SkeletonCard() {
  return (
    <Card style={{ padding: 14, gap: 10, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <Skeleton width="100%" height={14} />
    </Card>
  )
}

export function SkeletonHikes({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 4 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  )
}

export function Loading() {
  const { s } = useApp()
  return <View style={[s.root, { justifyContent: 'center' }]}><Spinner /></View>
}

export function Empty({ children }: { children: React.ReactNode }) {
  const { s } = useApp()
  return <View style={s.empty}><Text style={s.emptyText}>{children}</Text></View>
}

// Activity progress ring component
export function Ring({ value, max, color, size = 132, label, caption }: {
  value: number; max: number; color?: string; size?: number; label?: string; caption?: string
}) {
  const { c, s } = useApp()
  const r = size / 2 - 9
  const circ = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(1, value / max) : 0
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.fill2} strokeWidth={9} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color || c.catStats} strokeWidth={9} fill="none"
          strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={s.statValue}>{label}</Text>
        {!!caption && <Text style={s.caption}>{caption}</Text>}
      </View>
    </View>
  )
}

export function BarChart({ data, color, unit }: {
  data: { label: string; value: number }[]; color?: string; unit?: string
}) {
  const { c, s, t } = useApp()
  const max = Math.max(1, ...data.map((d) => d.value))
  const TRACK = 100
  if (!data.some((d) => d.value)) {
    return <View style={{ height: 150, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={s.caption}>{t.noDataFor(unit || t.unitKm)}</Text>
    </View>
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 150, paddingVertical: 8 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <Text style={s.caption}>{d.value ? String(Math.round(d.value)) : ''}</Text>
          <View style={{
            width: '78%',
            height: Math.max(d.value ? 4 : 0, (d.value / max) * TRACK),
            backgroundColor: color || c.catStats,
            borderTopLeftRadius: 6, borderTopRightRadius: 6,
          }} />
          <Text style={s.caption}>{d.label}</Text>
        </View>
      ))}
    </View>
  )
}

// ----------------------------------------------------------------- sheet

function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const { s } = useApp()
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.sheetBackdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.grabber} />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function Confirm({ open, message, confirmLabel, danger = true, onConfirm, onCancel }: {
  open: boolean; message: string; confirmLabel?: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  const { s, t } = useApp()
  return (
    <Sheet open={open} onClose={onCancel}>
      <Text style={[s.body, { marginHorizontal: 4, marginTop: 4, marginBottom: 18 }]}>{message}</Text>
      <Btn variant={danger ? 'danger' : undefined} onPress={onConfirm}>{confirmLabel || t.del}</Btn>
      <View style={{ height: 10 }} />
      <Btn variant="secondary" onPress={onCancel}>{t.cancel}</Btn>
    </Sheet>
  )
}

// Photo upload field component
export function PhotoField({ value, onChange }: { value?: string; onChange: (uri: string | null) => void }) {
  const { c, s, t } = useApp()

  const grab = async (fromCamera: boolean) => {
    try {
      let granted = false
      if (fromCamera) {
        const current = await ImagePicker.getCameraPermissionsAsync()
        granted = current.granted
        if (!granted) {
          const req = await ImagePicker.requestCameraPermissionsAsync()
          granted = req.granted
        }
      } else {
        const current = await ImagePicker.getMediaLibraryPermissionsAsync()
        granted = current.granted
        if (!granted) {
          const req = await ImagePicker.requestMediaLibraryPermissionsAsync()
          granted = req.granted
        }
      }

      if (!granted) {
        Alert.alert(
          'Permission Required',
          fromCamera
            ? 'Camera permission is required to take photos.'
            : 'Photo library permission is required to select photos.',
        )
        return
      }

      const opts: ImagePicker.ImagePickerOptions = {
        quality: 0.7,
        allowsEditing: true,
      }

      const res = fromCamera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts)

      if (!res.canceled && res.assets?.[0]?.uri) {
        onChange(res.assets[0].uri)
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not access camera or photo library.')
    }
  }

  if (value) {
    return (
      <View style={{ gap: 8 }}>
        <Image source={{ uri: value }} style={{ width: '100%', height: 180, borderRadius: R.hero }} resizeMode="cover" />
        <Pressable onPress={() => onChange(null)} style={{ alignSelf: 'flex-start' }}>
          <Text style={[s.navAction, { color: c.danger }]}>{t.removePhoto}</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Btn variant="secondary" style={{ flex: 1 }} onPress={() => grab(true)}>{t.takePhoto}</Btn>
      <Btn variant="secondary" style={{ flex: 1 }} onPress={() => grab(false)}>{t.choosePhoto}</Btn>
    </View>
  )
}

// Current location button component
export function LocateButton({ onLocated }: {
  onLocated: (v: { lat: number; lng: number; label?: string }) => void
}) {
  const { t } = useApp()
  const [busy, setBusy] = useState(false)

  const locate = async () => {
    setBusy(true)
    try {
      const perm = await Location.requestForegroundPermissionsAsync()
      if (!perm.granted) return
      const pos = await Location.getCurrentPositionAsync({})
      const lat = +pos.coords.latitude.toFixed(5)
      const lng = +pos.coords.longitude.toFixed(5)
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }).catch(() => [])
      const label = place && [place.name, place.district, place.city, place.region].filter(Boolean).join(', ')
      onLocated({ lat, lng, label: label || undefined })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Btn variant="secondary" disabled={busy} onPress={locate}>
      {busy ? t.locating : t.useMyLocation}
    </Btn>
  )
}

// Date and time picker field component
export function DateField({ value, onChange, mode = 'date', invalid, placeholder }: {
  value?: string; onChange: (v: string) => void
  mode?: 'date' | 'time' | 'datetime'; invalid?: boolean; placeholder?: string
}) {
  const { c, s, t } = useApp()
  const isAndroid = Platform.OS === 'android'

  const [step, setStep] = useState<null | 'date' | 'time'>(null)
  const [draft, setDraft] = useState<Date | null>(null)

  const label = value
    ? mode === 'time' ? value
      : mode === 'datetime' ? `${fmt.date(value.slice(0, 10))} · ${value.slice(11, 16)}`
        : fmt.date(value)
    : placeholder || t.pickOne

  const openPicker = () => {
    setDraft(parseValue(value, mode))
    setStep(mode === 'time' ? 'time' : 'date')
  }

  const emit = (d: Date) =>
    onChange(mode === 'time' ? hhmm(d) : mode === 'datetime' ? localDateTime(d) : localDate(d))

  const handle = (e: any, d?: Date) => {
    if (e.type === 'dismissed') return setStep(null)
    if (!d) return

    if (isAndroid && mode === 'datetime' && step === 'date') {
      setDraft(d)
      setStep('time')
      return
    }

    let out = d
    if (isAndroid && mode === 'datetime' && draft) {
      out = new Date(draft)
      out.setHours(d.getHours(), d.getMinutes(), 0, 0)
    }
    emit(out)
    setDraft(out)
    if (isAndroid) setStep(null)
  }

  return (
    <>
      <Pressable onPress={openPicker} style={[s.input, invalid && s.inputInvalid, { flexDirection: 'row', alignItems: 'center' }]}>
        <Text style={{ flex: 1, fontSize: 17, color: value ? c.label : c.label3 }} numberOfLines={1}>{label}</Text>
        <Glyph name={mode === 'time' ? 'clock' : 'calendar'} size={18} color={c.label2} />
      </Pressable>

      {!!step && (
        <DateTimePicker
          value={draft ?? parseValue(value, mode)}
          mode={isAndroid ? step : mode === 'datetime' ? 'datetime' : mode}
          display={isAndroid ? 'default' : 'inline'}
          themeVariant={c.scheme}
          onChange={handle}
        />
      )}

      {!!step && !isAndroid && (
        <Pressable onPress={() => setStep(null)} style={{ alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4 }}>
          <Text style={s.navAction}>{t.done}</Text>
        </Pressable>
      )}
    </>
  )
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

function parseValue(value: string | undefined, mode: 'date' | 'time' | 'datetime') {
  const now = new Date()
  if (!value) return now
  if (mode === 'time') {
    const [h, m] = value.split(':').map(Number)
    if (!isNaN(h)) now.setHours(h, m || 0, 0, 0)
    return now
  }
  const d = new Date(value.replace(' ', 'T'))
  return isNaN(d.getTime()) ? new Date() : d
}

// Option selector dropdown sheet component
export function Picker({ value, placeholder, options, onChange, invalid }: {
  value: any; placeholder: string; options: { value: any; label: string }[]
  onChange: (v: any) => void; invalid?: boolean
}) {
  const { c, s } = useApp()
  const [open, setOpen] = useState(false)
  const current = options.find((o) => String(o.value) === String(value))
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[s.input, invalid && s.inputInvalid, { flexDirection: 'row', alignItems: 'center' }]}>
        <Text style={{ flex: 1, fontSize: 17, color: current ? c.label : c.label3 }} numberOfLines={1}>
          {current ? current.label : placeholder}
        </Text>
        <Text style={s.chevron}>⌄</Text>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <ScrollView style={{ maxHeight: 360 }}>
          <Card>
            {options.map((o, i) => (
              <Cell
                key={String(o.value)} title={o.label} last={i === options.length - 1}
                chevron={false}
                value={String(o.value) === String(value) ? <Glyph name="check" size={18} color={c.accent} /> : undefined}
                onPress={() => { onChange(o.value); setOpen(false) }}
              />
            ))}
          </Card>
        </ScrollView>
      </Sheet>
    </>
  )
}

// ----------------------------------------------------------------- toast

const ToastCtx = createContext<(m: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastHost({ children }: { children: React.ReactNode }) {
  const { s } = useApp()
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2600)
    return () => clearTimeout(t)
  }, [msg])
  return (
    <ToastCtx.Provider value={setMsg}>
      <View style={{ flex: 1 }}>
        {children}
        {!!msg && (
          <View style={s.toast} pointerEvents="none">
            <Text style={s.toastText}>{msg}</Text>
          </View>
        )}
      </View>
    </ToastCtx.Provider>
  )
}

// -------------------------------------------------------------- tab bar

const TAB_ICONS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  hikes: 'M3 19h18L14 6l-3.2 5.6L8.6 8z',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm10 17-5.2-5.2',
  stats: 'M5 20V10m7 10V4m7 16v-7',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
}

const TAB_LABELS = (t: Dict): Record<string, string> => ({
  home: t.tabHome, hikes: t.tabHikes, search: t.tabSearch, stats: t.tabStats, profile: t.tabProfile,
})

export function TabBar({ state, navigation }: any) {
  const { c, s, t } = useApp()
  const labels = TAB_LABELS(t)
  const insets = useSafeAreaInsets()
  return (
    <View style={[s.tabbar, { bottom: Math.max(12, insets.bottom), maxWidth: 496, alignSelf: 'center' }]}>
      <BlurView intensity={60} tint={c.blur}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      {state.routes.map((route: any, i: number) => {
        const on = state.index === i
        const key = route.name.split('/')[0]
        return (
          <Pressable
            key={route.key}
            style={({ pressed }) => [s.tab, on && s.tabOn, pressed && { transform: [{ scale: 0.96 }] }]}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
              if (!on && !event.defaultPrevented) navigation.navigate(route.name)
            }}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d={TAB_ICONS[key]} stroke={on ? c.accent : c.label2} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={[s.tabLabel, on && s.tabLabelOn]} numberOfLines={1}>{labels[key]}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// Glass pill overlay component
export function GlassPill({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c, s } = useApp()
  return (
    <View style={[s.searchPill, style]}>
      <BlurView intensity={40} tint={c.blur}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      {children}
    </View>
  )
}

// Error boundary component for handling unexpected crashes
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F2F2F7' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8, color: '#FF3B30' }}>An error occurred</Text>
          <Text style={{ fontSize: 14, color: '#8A8A8E', textAlign: 'center', marginBottom: 20 }}>
            {this.state.error?.message || 'Unexpected application error.'}
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, backgroundColor: '#007AFF' }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Try Again</Text>
          </Pressable>
        </View>
      )
    }
    return this.props.children
  }
}

