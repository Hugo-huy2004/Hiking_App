// Application design theme tokens and palette definitions
import { createContext, useContext } from 'react'
import { StyleSheet } from 'react-native'
import { STRINGS, type Dict, type Lang } from './i18n'

const LIGHT = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  fill2: '#E5E5EA',
  sep: '#C6C6C8',
  label: '#000000',
  label2: '#8A8A8E',
  label3: '#C7C7CC',
  accent: '#007AFF',

  catHikes: '#34C759',
  catNotes: '#FF9500',
  catSearch: '#007AFF',
  catStats: '#FF375F',
  catProfile: '#AF52DE',

  diffEasy: '#34C759',
  diffModerate: '#FF9500',
  diffHard: '#FF3B30',
  danger: '#FF3B30',

  glass: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  blur: 'light' as 'light' | 'dark',
  scheme: 'light' as 'light' | 'dark',
}

const DARK: typeof LIGHT = {
  ...LIGHT,
  bg: '#000000',
  card: '#1C1C1E',
  fill2: '#2C2C2E',
  sep: '#38383A',
  label: '#FFFFFF',
  label2: '#8D8D93',
  label3: '#48484A',
  accent: '#0A84FF',
  catSearch: '#0A84FF',
  diffEasy: '#30D158',
  glass: 'rgba(28, 28, 30, 0.62)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  blur: 'dark',
  scheme: 'dark',
}

type Palette = typeof LIGHT

/* --- radii / metrics, same names as the CSS custom properties --- */
export const R = { card: 12, hero: 16, input: 10, btn: 12, capsule: 28 }
const PAD = 16
const TABBAR_H = 76

export function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

function mix(hex: string, onto: string, pct: number) {
  const a = parseInt(hex.slice(1), 16)
  const b = parseInt(onto.slice(1), 16)
  const ch = (sh: number) => Math.round((((a >> sh) & 255) * pct + ((b >> sh) & 255) * (1 - pct)))
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

export function difficultyColor(c: Palette, d?: string) {
  return d === 'Easy' ? c.diffEasy : d === 'Moderate' ? c.diffModerate : d === 'Hard' ? c.diffHard : c.catHikes
}

// Generate application stylesheet for specified color palette
function makeStyles(c: Palette) {
  return StyleSheet.create({
    // ---- layout ----
    root: { flex: 1, backgroundColor: c.bg },
    screen: { paddingHorizontal: PAD, paddingBottom: TABBAR_H + 24 },
    screenNoTabs: { paddingHorizontal: PAD, paddingBottom: 32 },

    // ---- typography ----
    largeTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, color: c.label, marginTop: 12, marginBottom: 2, paddingRight: 60 },
    title: { fontSize: 22, fontWeight: '700', color: c.label },
    headline: { fontSize: 17, fontWeight: '600', color: c.label },
    body: { fontSize: 17, lineHeight: 23, color: c.label },
    secondary: { fontSize: 15, color: c.label2 },
    footnote: { fontSize: 13, color: c.label2 },
    caption: { fontSize: 12, color: c.label2 },
    sectionHeader: {
      fontSize: 12, fontWeight: '600', letterSpacing: 0.6, color: c.label2,
      textTransform: 'uppercase', marginTop: 22, marginBottom: 8, marginHorizontal: 4,
    },
    statValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: c.label },

    // ---- nav bar ----
    navbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, paddingBottom: 6, minHeight: 48 },
    back: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingRight: 8 },
    backText: { color: c.accent, fontSize: 17 },
    navAction: { color: c.accent, fontSize: 17, paddingVertical: 6, paddingHorizontal: 2 },

    // ---- grouped inset list ----
    card: { backgroundColor: c.card, borderRadius: R.card, overflow: 'hidden' },
    cardHero: { backgroundColor: c.card, borderRadius: R.hero, padding: 16 },
    cell: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
    sep: { position: 'absolute', left: 50, right: 0, bottom: 0, height: 1, backgroundColor: c.sep, opacity: 0.6 },
    cellValue: { color: c.label2, fontSize: 15 },
    chevron: { color: c.label3, fontSize: 20 },
    iconTile: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

    // ---- controls ----
    btn: { paddingVertical: 14, borderRadius: 999, backgroundColor: c.accent, alignItems: 'center' },
    btnSecondary: { backgroundColor: c.fill2 },
    btnDanger: { backgroundColor: c.danger },
    btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
    btnTextSecondary: { color: c.label },

    segmented: { flexDirection: 'row', backgroundColor: 'rgba(118, 118, 128, 0.12)', borderRadius: 9, padding: 2, gap: 2 },
    segment: { flex: 1, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 7, alignItems: 'center' },
    segmentOn: {
      backgroundColor: c.card,
      shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    segmentText: { fontSize: 14, color: c.label },
    segmentTextOn: { fontWeight: '600' },

    field: { marginBottom: 12 },
    fieldLabel: { fontSize: 13, color: c.label2, marginBottom: 5, marginHorizontal: 4 },
    input: {
      paddingVertical: 12, paddingHorizontal: 14, borderRadius: R.input,
      borderWidth: 1, borderColor: 'transparent', backgroundColor: c.card, color: c.label, fontSize: 17,
    },
    inputInvalid: { borderColor: c.danger },
    fieldError: { color: c.danger, fontSize: 13, marginTop: 5, marginHorizontal: 4 },
    row2: { flexDirection: 'row', gap: 10 },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.fill2 },
    chipOn: { backgroundColor: alpha(c.accent, 0.18) },
    chipText: { fontSize: 15, color: c.label },
    chipTextOn: { color: c.accent, fontWeight: '600' },

    tag: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999 },
    tagText: { fontSize: 12, fontWeight: '600', color: '#fff' },

    // ---- floating glass tab bar (v4) ----
    tabbar: {
      position: 'absolute', bottom: 12, left: 12, right: 12,
      flexDirection: 'row', padding: 6, gap: 2,
      borderRadius: R.capsule, borderWidth: 0.5, borderColor: c.glassBorder, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: c.scheme === 'dark' ? 0.5 : 0.1,
      shadowRadius: 30, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    },
    tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 8, paddingHorizontal: 2, borderRadius: 20 },
    tabOn: { backgroundColor: alpha(c.accent, 0.13) },
    tabLabel: { fontSize: 10, fontWeight: '500', color: c.label2 },
    tabLabelOn: { color: c.accent },

    // ---- misc ----
    fab: {
      position: 'absolute', right: 16, bottom: TABBAR_H + 20,
      width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
      backgroundColor: mix(c.catHikes, c.card, 0.18),
      shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 30, shadowOffset: { width: 0, height: 8 }, elevation: 8,
    },
    empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 16 },
    emptyText: { color: c.label2, fontSize: 17, textAlign: 'center' },

    toast: {
      position: 'absolute', bottom: TABBAR_H + 28, left: 24, right: 24, alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.85)', paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999,
    },
    toastText: { color: '#fff', fontSize: 15, textAlign: 'center' },

    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 10, paddingHorizontal: 16, paddingBottom: 24 },
    grabber: { width: 36, height: 5, borderRadius: 3, backgroundColor: c.label3, alignSelf: 'center', marginBottom: 14 },

    searchPill: {
      position: 'absolute', top: 12, left: 12, right: 12, zIndex: 500,
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16,
      borderRadius: 999, borderWidth: 0.5, borderColor: c.glassBorder, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 30, shadowOffset: { width: 0, height: 8 }, elevation: 8,
    },

    avatar: {
      width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
      backgroundColor: alpha(c.catNotes, 0.2),
    },
    avatarText: { color: c.catNotes, fontWeight: '700', fontSize: 22 },
  })
}

type Styles = ReturnType<typeof makeStyles>
export type ThemeMode = 'light' | 'dark' | 'auto'

const SHEETS = { light: makeStyles(LIGHT), dark: makeStyles(DARK) }
export const paletteFor = (dark: boolean) => (dark ? DARK : LIGHT)
export const sheetFor = (dark: boolean) => (dark ? SHEETS.dark : SHEETS.light)

export const AppCtx = createContext<{
  c: Palette
  s: Styles
  t: Dict
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  lang: Lang
  setLang: (l: Lang) => void
}>({ c: LIGHT, s: SHEETS.light, t: STRINGS.en, mode: 'auto', setMode: () => {}, lang: 'en', setLang: () => {} })

export const useApp = () => useContext(AppCtx)
